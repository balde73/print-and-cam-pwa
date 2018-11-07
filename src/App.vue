<template>
  <div id="app">
    <Settings
      v-bind:settings="settings"
      v-bind:open="openSettings"
      v-on:stopLight="stopAnalyzeLight"
      v-on:startLight="startRecordingLight"
      v-on:changeLevels="changeLevelsLight"
      v-on:changeInitialLight="changeInitialLight"
      v-on:nRepairChange="nRepairChange"
      v-on:closeSettings="closeSettings" />
    <div class="canvas-video">
      <video ref="video" id="videoInput" autoplay="true" playsinline></video>
      <div class="pre-controls">
        <div class="icon" @click="openSettings = true">
          <svg version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="24" height="24"><title>preferences</title><g stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" fill="#ffffff" stroke="#ffffff"><line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="4" x2="23" y2="4"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="4" x2="4" y2="4"></line> <rect x="4" y="1" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="22" y1="12" x2="23" y2="12"></line> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="1" y1="12" x2="14" y2="12"></line> <rect data-color="color-2" x="14" y="9" fill="none" stroke-miterlimit="10" width="4" height="6"></rect> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="20" x2="23" y2="20"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="20" x2="4" y2="20"></line> <rect x="4" y="17" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect></g></svg>
        </div>
        <div class="text">
          light: {{ settings.basicLight }} ({{ percLight }}%)
        </div>
        <div class="icon">
          <svg version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="24" height="24"><title>barcode qr</title><g stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" fill="#ffffff" stroke="#ffffff"><polygon fill="none" stroke="#ffffff" stroke-miterlimit="10" points="10,10 1,10 1,1 10,1 10,1 "></polygon> <polygon fill="none" stroke="#ffffff" stroke-miterlimit="10" points="23,10 14,10 14,1 14,1 23,1 "></polygon> <polygon fill="none" stroke="#ffffff" stroke-miterlimit="10" points="10,23 1,23 1,14 10,14 10,14 "></polygon> <polyline fill="none" stroke="#ffffff" stroke-miterlimit="10" points="23,19 23,14 19,14 19,17 15,17 15,14 "></polyline> <polyline fill="none" stroke="#ffffff" stroke-miterlimit="10" points="23,23 15,23 15,21 "></polyline> <polygon data-color="color-2" fill="none" stroke-miterlimit="10" points=" 6,6 5,6 5,5 6,5 6,6 "></polygon> <polygon data-color="color-2" fill="none" stroke-miterlimit="10" points=" 19,6 18,6 18,6 18,5 19,5 "></polygon> <polygon data-color="color-2" fill="none" stroke-miterlimit="10" points=" 6,19 5,19 5,18 6,18 6,19 "></polygon></g></svg>
        </div>
      </div>
      <div class="controls">
        <div class="gallery" :class="{'open': openCropImage, 'flash': galleryFlash}" >
          <canvas @click="openCropImage = !openCropImage" id="canvasTransform"></canvas>
        </div>
        <RingButton @click.native="toggleRecording" active="is-recording" v-bind:status="isRecording" />
        <RingButton @click.native="snapshot" active="is-magic" v-bind:status="isMagic" />
      </div>
    </div>
    <div class="">
      <div class="">
        Carica foto: <input @change="imgUpload" type="file" id="fileInput" name="file" />
        <button @click="readCode">Leggi</button>
        <button @click="cropAndReadCode">Taglia e leggi</button>
        <img id="imageSrc" :src="imgElementSrc" alt="No Image" />
      </div>
    </div>
    <div id="bw-threshold-box" class="tools">
      <canvas v-for="level in rangeLevels" v-bind:key="`id-${level}`" :id="`bw-threshold-${level}`" />
    </div>
  </div>
</template>

<script>
import Hello from './components/Hello'
import RingButton from './components/RingButton'
import MaskFinder from './classes/MaskFinder.js'
import Kircher from './classes/Kircher.js'
import Settings from './components/Settings.vue'

export default {
  name: 'app',
  components: {
    Hello,
    RingButton,
    Settings
  },
  data () {
    return {
      stream: null,
      video: null,
      capture: null,
      maskFinder: null,
      isRecording: false,
      isMagic: false,
      percLight: 0,
      timer: null,
      openCropImage: false,
      galleryFlash: false,
      imgElementSrc: null,
      settings: {
        nRepair: parseInt(this.$cookies.get('nRepair')) || 1,
        overrideLight: false,
        basicLight: parseInt(this.$cookies.get('basicLight')) || 70,
        levelsLight: parseInt(this.$cookies.get('levelsLight')) || 5,
        galleryFlash: false
      },
      openSettings: false
    }
  },
  mounted () {
    this.startRecordingLight()
  },
  computed: {
    rangeLevels: function () {
      return [...Array(this.settings.levelsLight).keys()]
    }
  },
  methods: {
    async startRecordingLight () {
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
            self.maskFinder = new MaskFinder(self.capture, self.settings.levelsLight)
            self.isRecording = true
            self.analyzeLight()
          }
        } catch (error) {
          alert(error)
        }
      } else {
        alert('browser o dispositivo non supportato!')
      }
    },
    toggleAnalyzeLight () {
      if (this.timer != null) {
        this.stopAnalyzeLight()
      } else {
        this.analyzeLight()
      }
    },
    analyzeLight () {
      let timeRefresh = 10
      const lightIntensity = parseInt(this.settings.basicLight)
      let tmp = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
      this.capture.read(tmp)
      cv.cvtColor(tmp, tmp, cv.COLOR_RGBA2GRAY, 0)
      cv.threshold(tmp, tmp, lightIntensity, 255, cv.THRESH_BINARY)
      const whitePixels = cv.countNonZero(tmp)
      tmp.delete()
      const totalPixels = this.video.height * this.video.width
      const perc = parseInt(whitePixels / totalPixels * 100)
      this.percLight = perc
      if (perc < 20 && this.settings.basicLight > 10) {
        this.settings.basicLight -= 10
      } else if (perc > 30 && this.settings.basicLight < 200) {
        this.settings.basicLight += 10
      } else {
        // good light!
        this.maskFinder.setInitialLight(this.settings.basicLight)
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
        this.startRecordingLight()
      }
    },
    snapshot () {
      this.isMagic = true
      window.setTimeout(() => {
        let shot = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
        this.capture.read(shot)
        let mask = this.maskFinder.search(shot)
        if (mask) {
          this.takeGalleryFlash()
          let code = Kircher.decode(mask, this.settings.nRepair)
          alert(code)
          mask.delete()
        }
        this.isMagic = false
      }, 100)
    },
    async takeGalleryFlash () {
      this.galleryFlash = true
      window.setTimeout(() => {
        this.galleryFlash = false
      }, 300)
    },
    imgUpload (e) {
      const file = e.target.files[0]
      this.imgElementSrc = URL.createObjectURL(file)
    },
    readCode () {
      let image = cv.imread('imageSrc')
      let code = Kircher.decode(image, this.settings.nRepair)
      alert(code)
      image.delete()
    },
    cropAndReadCode () {
      let image = cv.imread('imageSrc')
      this.maskFinder.setInitialLight(80)
      let croppedImage = this.maskFinder.search(image)
      let code = null
      if (croppedImage) {
        code = Kircher.decode(croppedImage, this.settings.nRepair)
      }
      alert(code)
      return code
    },
    changeLevelsLight () {
      const value = this.settings.levelsLight
      this.$cookies.set('levelsLight', value)
      this.maskFinder.setLevels(value)
    },
    changeInitialLight () {
      const value = this.settings.basicLight
      this.$cookies.set('basicLight', value)
      this.maskFinder.setInitialLight(value)
    },
    closeSettings () {
      this.openSettings = false
    },
    nRepairChange () {
      this.$cookies.set('nRepair', this.settings.nRepair)
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
  position: relative;
}
video{
  background: black;
  height: 100vh;
  width: 100vw;
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
  position: absolute;
  bottom: 15vh;
  height: 5vh;
  width: 100%;
  text-align: center;
  color: white;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  color: #9369ff;
  background-color: rgba(0,0,0,.7)
}
.pre-controls .icon{
  padding: 0 2rem;
}
.controls{
  position: absolute;
  bottom: 0;
  left: 0;
  height: 15vh;
  width: 100%;
  border-top: 1px solid rgba(255,255,255,.1);
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.9)
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
.gallery.flash{
  background-color: white;
}
.gallery.flash canvas{
  opacity: 0;
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
