<template>
  <div id="app">
    <div class="canvas-video">

      <video ref="video" id="videoInput" autoplay="true"></video>
      <div id="p0" class="point"></div>
      <div id="p1" class="point"></div>
      <div id="p2" class="point"></div>
      <div id="p3" class="point"></div>
      <div class="pre-controls">
        light: {{ basicLight }}
      </div>
      <div class="controls">
        <div @click="analyzeLight" class="gallery">
          <canvas id="canvasTransform"></canvas>
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
      levels: 5,
      timer: null
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
        this.stream = await navigator.mediaDevices.getUserMedia(settings)

        let {width, height} = this.stream.getTracks()[0].getSettings()
        this.video.height = height
        this.video.width = width

        this.video.srcObject = this.stream
        this.capture = new cv.VideoCapture(this.video)
        this.maskFinder = new MaskFinder(this.capture)
        this.isRecording = true

        this.analyzeLight()
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
      console.log(this.basicLight)
      let timeRefresh = 10
      const level = this.basicLight
      let tmp = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
      this.capture.read(tmp)
      cv.cvtColor(tmp, tmp, cv.COLOR_RGBA2GRAY, 0)
      cv.threshold(tmp, tmp, level, 255, cv.THRESH_BINARY)
      const whitePixels = cv.countNonZero(tmp)
      tmp.delete()
      const totalPixels = this.video.height * this.video.width
      const perc = whitePixels / totalPixels
      console.log(perc)
      if (perc < 0.2 && this.basicLight > 10) {
        this.basicLight -= 10
      } else if (perc > 0.3 && this.basicLight < 200) {
        this.basicLight += 10
      } else {
        // good percent!
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
}
.controls{
  height: 15vh;
  border-top: 1px solid rgba(255,255,255,.1);
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.2)
}
.gallery{
  margin: 2vh;
  border: 2px solid rgba(255,255,255,.4);
  height: 8vh;
}
#canvasTransform{
  height: 8vh;
  width: 8vh;
}
.tools canvas{
  height: 200px;
  width: 350px;
}
</style>
