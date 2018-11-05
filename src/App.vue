<template>
  <div id="app">
    <div class="canvas-video">
      <video ref="video" id="videoInput" autoplay="true"></video>
      <div class="pre-controls">
        <div class="icon">
          <svg version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="24" height="24"><title>preferences</title><g stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" fill="#ffffff" stroke="#ffffff"><line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="4" x2="23" y2="4"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="4" x2="4" y2="4"></line> <rect x="4" y="1" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="22" y1="12" x2="23" y2="12"></line> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="1" y1="12" x2="14" y2="12"></line> <rect data-color="color-2" x="14" y="9" fill="none" stroke-miterlimit="10" width="4" height="6"></rect> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="20" x2="23" y2="20"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="20" x2="4" y2="20"></line> <rect x="4" y="17" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect></g></svg>
        </div>
        <div class="text">
          light: {{ basicLight }} ({{ percLight }}%)
        </div>
        <div class="icon">
          <svg version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="24" height="24"><title>barcode qr</title><g stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" fill="#ffffff" stroke="#ffffff"><polygon fill="none" stroke="#ffffff" stroke-miterlimit="10" points="10,10 1,10 1,1 10,1 10,1 "></polygon> <polygon fill="none" stroke="#ffffff" stroke-miterlimit="10" points="23,10 14,10 14,1 14,1 23,1 "></polygon> <polygon fill="none" stroke="#ffffff" stroke-miterlimit="10" points="10,23 1,23 1,14 10,14 10,14 "></polygon> <polyline fill="none" stroke="#ffffff" stroke-miterlimit="10" points="23,19 23,14 19,14 19,17 15,17 15,14 "></polyline> <polyline fill="none" stroke="#ffffff" stroke-miterlimit="10" points="23,23 15,23 15,21 "></polyline> <polygon data-color="color-2" fill="none" stroke-miterlimit="10" points=" 6,6 5,6 5,5 6,5 6,6 "></polygon> <polygon data-color="color-2" fill="none" stroke-miterlimit="10" points=" 19,6 18,6 18,6 18,5 19,5 "></polygon> <polygon data-color="color-2" fill="none" stroke-miterlimit="10" points=" 6,19 5,19 5,18 6,18 6,19 "></polygon></g></svg>
        </div>
      </div>
      <div class="controls">
        <div class="gallery" :class="{'open': openCropImage}" >
          <canvas @click="openCropImage = !openCropImage" id="canvasTransform"></canvas>
        </div>
        <RingButton @click.native="toggleRecording" active="is-recording" v-bind:status="isRecording" />
        <RingButton @click.native="snapshot" active="is-magic" v-bind:status="isMagic" />
      </div>
    </div>
    <Hello />
    <div id="bw-threshold-box" class="tools">
      <canvas v-for="level in rangeLevels" v-bind:key="`id-${level}`" :id="`bw-threshold-${level}`" />
    </div>
  </div>
</template>

<script>
import Hello from './components/Hello'
import RingButton from './components/RingButton'
import MaskFinder from './classes/MaskFinder.js'

export default {
  name: 'app',
  components: {
    Hello,
    RingButton
  },
  data () {
    return {
      stream: null,
      video: null,
      capture: null,
      maskFinder: null,
      isRecording: false,
      isMagic: false,
      basicLight: 0,
      percLight: 0,
      levels: 5,
      timer: null,
      openCropImage: false
    }
  },
  mounted () {
    this.startRecording()
  },
  computed: {
    rangeLevels: function () {
      return [...Array(this.levels).keys()]
    }
  },
  methods: {
    async startRecording () {
      this.video = this.$refs.video
      if (navigator.mediaDevices.getUserMedia) {
        const settings = {
          video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            facingMode: 'environment'
          },
          audio: false
        }
        try {
          this.stream = await navigator.mediaDevices.getUserMedia(settings)
          this.video.src = window.URL.createObjectURL(this.stream)

          let self = this
          this.video.onloadedmetadata = function () {
            self.video.height = this.videoHeight
            self.video.width = this.videoWidth

            self.capture = new cv.VideoCapture(self.video)
            self.maskFinder = new MaskFinder(self.capture)
            self.isRecording = true
            self.analyzeLight()
          }
        } catch (error) {
          alert(error)
        }
      }
    },
    toggleAnalyzeLight () {
      console.log(this.timer)
      if (this.timer != null) {
        this.stopAnalyzeLight()
      } else {
        this.analyzeLight()
      }
    },
    analyzeLight () {
      let timeRefresh = 10
      const level = this.basicLight
      let tmp = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
      this.capture.read(tmp)
      cv.cvtColor(tmp, tmp, cv.COLOR_RGBA2GRAY, 0)
      cv.threshold(tmp, tmp, level, 255, cv.THRESH_BINARY)
      const whitePixels = cv.countNonZero(tmp)
      tmp.delete()
      const totalPixels = this.video.height * this.video.width
      const perc = parseInt(whitePixels / totalPixels * 100)
      this.percLight = perc
      if (perc < 20 && this.basicLight > 10) {
        this.basicLight -= 10
      } else if (perc > 30 && this.basicLight < 200) {
        this.basicLight += 10
      } else {
        // good light!
        this.maskFinder.setInitialLight(this.basicLight)
        timeRefresh = 1000
      }
      this.timer = window.setTimeout(() => {
        this.analyzeLight()
      }, timeRefresh)
    },
    stopAnalyzeLight () {
      console.log('stop!')
      window.clearTimeout(this.timer)
      this.timer = null
    },
    stopRecording () {
      this.isRecording = false
      this.stream.getVideoTracks().forEach(function (track) {
        track.stop()
      })
    },
    toggleRecording () {
      if (this.isRecording) {
        this.stopRecording()
      } else {
        this.startRecording()
      }
    },
    snapshot () {
      this.isMagic = true
      window.setTimeout(() => {
        this.maskFinder.search()
        this.isMagic = false
      }, 100)
    }
  }
}
</script>

<style>
html, body{
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow-x: hidden;
}
.canvas-video{
  background-color: black;
}
video{
  background: black;
  height: 80vh;
  width: 100vw;
}
#canvasTransform{
  max-height: 300px;
}
.canvas-video .point{
  position: absolute;
  height: 10px;
  width: 10px;
  border-radius: 100%;
  background-color: greenyellow;
  -webkit-transition: .5s linear;
  transition: .5s linear;
}
.pre-controls{
  height: 5vh;
  text-align: center;
  color: white;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  color: #9369ff;
}
.pre-controls .icon{
  padding: 0 2rem;
}
.controls{
  height: 15vh;
  border-top: 1px solid rgba(255,255,255,.1);
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.1)
}
.gallery{
  margin: 2vh;
  border: 2px solid white;
  background-color: rgba(255,255,255,.05);
  height: 8vh;
  width: 8vh;
  border-radius: 100%;
  overflow: hidden;
}
.gallery canvas{
  max-height: 8vh;
  max-width: 8vh;
}
.gallery.open{
  overflow: auto;
}
.gallery.open canvas{
  position: absolute;
  top: 0;
  left: 0;
  max-width: 100vw;
  max-height: none;
}
.tools canvas{
  max-height: 50vw;
}
</style>
