<template>
  <div id="app">
    <Settings
      v-bind:settings="settings"
      v-bind:open="openSettings"
      v-on:stopLight="stopAnalyzeLight"
      v-on:startLight="startRecording"
      v-on:changeLevels="changeLevelsLight"
      v-on:changeInitialLight="changeInitialLight"
      v-on:nRepairChange="nRepairChange"
      v-on:closeSettings="closeSettings"
      v-on:changeVibrations="changeVibrations" />
    <div class="canvas-video">
      <div class="real-canvas-video maxCanvasSize"
        v-bind:style="{
          width: this.realVideoDim.width + 'px',
          height: this.realVideoDim.height + 'px',
          marginTop: - this.realVideoDim.height / 2 + 'px',
          marginLeft: - this.realVideoDim.width / 2 + 'px',
        }">
        <div v-show="suggestion" class="suggestion">
          <div class="text">
            {{ suggestion }}
          </div>
        </div>
        <div class="point"
          v-bind:style="{ left: point.x + '%', top: point.y + '%' }"
          :class="{'is-tracking': isTracking, 'has-message': message}"
          @click="showMessage=!showMessage"
          >
          <div class="tooltip" v-show="showMessage">
            Messsaggio: {{ message }}
          </div>
        </div>
      </div>
      <video ref="video" id="videoInput" class="maxCanvasSize" autoplay="true" playsinline></video>
      <div class="pre-controls">
        <div class="icon" @click="openSettings = true">
          <svg version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="24" height="24"><title>preferences</title><g stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" fill="#ffffff" stroke="#ffffff"><line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="4" x2="23" y2="4"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="4" x2="4" y2="4"></line> <rect x="4" y="1" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="22" y1="12" x2="23" y2="12"></line> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="1" y1="12" x2="14" y2="12"></line> <rect data-color="color-2" x="14" y="9" fill="none" stroke-miterlimit="10" width="4" height="6"></rect> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="20" x2="23" y2="20"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="20" x2="4" y2="20"></line> <rect x="4" y="17" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect></g></svg>
        </div>
        <div class="text">
          light: {{ settings.basicLight }} ({{ percLight }}%) Gyro: {{gyroscope && gyroscope.acc}} Fermo: {{gyroscope && gyroscope.still}}
        </div>
        <div class="icon" @click="trackImage">
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
    <canvas class="maxCanvasSize" id="my-canvas-video" />
    <canvas class="maxCanvasSize" id="my-canvas-video-1" />
    <canvas class="maxCanvasSize" id="my-canvas-video-2" />
    <canvas class="maxCanvasSize" id="my-canvas-video-3" />
    <button @click="step">Step</button>
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
      videoWidth: 0,
      videoHeight: 0,
      capture: null,
      maskFinder: null,
      isRecording: false,
      isMagic: false,
      percLight: 0,
      goodLight: true,
      timer: null,
      openCropImage: false,
      galleryFlash: false,
      imgElementSrc: null,
      settings: {
        nRepair: parseInt(this.$cookies.get('nRepair')) || 1,
        overrideLight: false,
        basicLight: parseInt(this.$cookies.get('basicLight')) || 70,
        levelsLight: parseInt(this.$cookies.get('levelsLight')) || 5,
        galleryFlash: false,
        maxVibration: parseInt(this.$cookies.get('maxVibration')) || 30
      },
      timeoutTracking: null,
      point: {
        x: 50,
        y: 50
      },
      realVideoDim: {
        width: 0,
        height: 0
      },
      openSettings: false,
      message: null,
      showMessage: false,
      isTracking: false,
      gyroscope: null,
      suggestion: null
    }
  },
  mounted () {
    this.startRecording()
  },
  computed: {
    rangeLevels: function () {
      return [...Array(this.settings.levelsLight).keys()]
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
            self.videoHeight = this.videoHeight
            self.videoWidth = this.videoWidth
            self.realVideoDim = self.videoDimensions(self.video)
            console.log(self.realVideoDim)

            self.capture = new cv.VideoCapture(self.video)
            self.maskFinder = new MaskFinder(self.capture, self.settings.levelsLight)
            self.isRecording = true
            // self.analyzeLight()
          }
        } catch (error) {
          alert(error)
        }

        if (window.DeviceMotionEvent !== undefined) {
          this.gyroscope = {
            isMoving: true,
            acc: 1,
            still: 0
          }
          this.startMotionListener()
        } else {
          console.log('device motion not supported')
        }
      } else {
        alert('browser o dispositivo non supportato!')
      }
    },
    videoDimensions (video) {
      // Ratio of the video's intrisic dimensions
      let videoRatio = video.videoWidth / video.videoHeight
      console.log(videoRatio)
      // The width and height of the video element
      let width = video.offsetWidth
      let height = video.offsetHeight
      // The ratio of the element's width to its height
      let elementRatio = width / height
      // If the video element is short and wide
      if (elementRatio > videoRatio) {
        width = height * videoRatio
      } else {
        height = width / videoRatio
      }
      return {
        width: width,
        height: height
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
      let timeRefresh = 50
      const lightIntensity = parseInt(this.settings.basicLight)
      let tmp = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
      this.capture.read(tmp)
      cv.cvtColor(tmp, tmp, cv.COLOR_RGBA2GRAY, 0)
      cv.threshold(tmp, tmp, lightIntensity, 255, cv.THRESH_BINARY)
      const whitePixels = cv.countNonZero(tmp)
      const totalPixels = this.video.height * this.video.width
      const perc = parseInt(whitePixels / totalPixels * 100)
      this.percLight = perc

      if (perc < 20 && this.settings.basicLight > 10) {
        this.goodLight = false
        this.settings.basicLight -= 10
      } else if (perc > 25 && this.settings.basicLight < 240) {
        this.goodLight = false
        this.settings.basicLight += 9
      } else {
        this.goodLight = true
        this.maskFinder.setInitialLight(this.settings.basicLight)
        if (this.settings.basicLight <= 10) {
          this.suggestion = 'probably too dark'
        } else if (this.settings.basicLight >= 240) {
          this.suggestion = 'probably too light'
        }
        timeRefresh = 150
      }
      cv.imshow('my-canvas-video', tmp)

      tmp.delete()

      this.timer = window.setTimeout(() => {
        this.analyzeLight()
      }, timeRefresh)
    },
    startMotionListener () {
      this.gyroscope.still = 0
      window.addEventListener('devicemotion', this.processMotion)
    },
    stopMotionListener () {
      window.removeEventListener('devicemotion', this.processMotion)
    },
    processMotion (event) {
      const acc = Math.abs(event.acceleration.x) + Math.abs(event.acceleration.y) + Math.abs(event.acceleration.z)
      const percAcc = parseInt(acc * 100)
      if (!this.goodLight) {
        return 0
      }
      if (percAcc < this.settings.maxVibration) {
        this.gyroscope.still += 1
        if (this.gyroscope.still > 30) {
          if (!this.isTracking) {
            this.gyroscope.still = 0
            this.searchMask()
          } else if (!this.message) {
            this.gyroscope.still = 0
            this.tryFullDecoding()
          }
        }
      } else {
        this.gyroscope.still = 0
        if (!this.isTracking && !this.message) {
          this.suggestion = 'inquadra il codice'
        }
      }
      this.gyroscope.acc = percAcc
    },
    readMotionData (event) {
      console.log('reading')
    },
    stopAnalyzeLight () {
      console.log('stop light!')
      window.clearTimeout(this.timer)
      this.timer = null
    },
    stopRecording () {
      this.isRecording = false
      this.stopAnalyzeLight()
      this.stopTracking()
      this.stopMotionListener()
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
    searchMask () {
      this.stopTracking()
      let shot = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
      this.capture.read(shot)
      let mask = this.maskFinder.search(shot)
      if (mask) {
        let {tl, br} = mask.rect
        this.maskFinder.studyPortion(shot, tl.x, tl.y, br.x, br.y)
        this.startTracking()
        console.log(mask.sizeRate)
        if (mask.cropped) {
          this.decodeImage(mask.cropped)
        } else {
          this.suggestion = 'avvicinati di più per decodificare'
        }
      }
    },
    tryFullDecoding () {
      // the algorithm is still tracking the object
      let shot = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
      this.capture.read(shot)
      let mask = this.maskFinder.search(shot)
      if (mask && mask.cropped) {
        this.decodeImage(mask.cropped)
      }
    },
    snapshot () {
      this.isMagic = true
      this.stopTracking()
      window.setTimeout(() => {
        let shot = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
        this.capture.read(shot)
        let mask = this.maskFinder.search(shot)
        if (mask) {
          console.log(mask)
          let {tl, br} = mask.rect
          this.maskFinder.studyPortion(shot, tl.x, tl.y, br.x, br.y)
          this.startTracking()
          if (mask.cropped) {
            this.decodeImage(mask.cropped)
          }
        } else {
          this.stopTracking()
        }
        this.isMagic = false
      }, 100)
    },
    startTracking () {
      console.log('> TRACKING')
      this.isTracking = true
      this.point = this.maskFinder.processVideo()
      if (!this.point || this.nearEdge(this.point)) {
        console.log('too near edge. Stopping')
        this.stopTracking()
      } else {
        this.timeoutTracking = window.setTimeout(() => {
          this.startTracking()
        }, 10)
      }
    },
    nearEdge (point) {
      if (
        point.x > 90 ||
        point.x < 10 ||
        point.y > 90 ||
        point.y < 10
      ) {
        console.log(point)
        return true
      }
      return false
    },
    stopTracking () {
      console.log('>> STOP TRACKING')
      this.isTracking = false
      this.message = null
      window.clearTimeout(this.timeoutTracking)
    },
    async takeGalleryFlash () {
      return new Promise((resolve) => {
        this.galleryFlash = true
        window.setTimeout(() => {
          this.galleryFlash = false
          resolve()
        }, 300)
      })
    },
    imgUpload (e) {
      const file = e.target.files[0]
      this.imgElementSrc = URL.createObjectURL(file)
    },
    decodeImage (image) {
      this.takeGalleryFlash()
      cv.imshow('canvasTransform', image)
      this.message = Kircher.decode(image, this.settings.nRepair)
      image.delete()
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
        code = Kircher.decode(croppedImage.cropped, this.settings.nRepair)
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
    },
    trackImage () {
      this.maskFinder.trackPortion()
    },
    step () {
      this.maskFinder.processVideo()
    },
    changeVibrations () {
      const value = this.settings.maxVibration
      this.$cookies.set('maxVibration', value)
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
  font-family: 'Oswald', sans-serif;
}
.canvas-video{
  background-color: black;
  position: relative;
  max-height: 100vh;
}
.maxCanvasSize{
  max-width: 100vw;
  max-height: 100vh;
  margin: 0 auto;
  display: block;
}
video{
  background: black;
}
.real-canvas-video{
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 100;
  background-color: rgba(0,0,0,.2);
}
.real-canvas-video .suggestion{
  position: absolute;
  top: 1rem;
  width: 100%;
  text-align: center;
}
.real-canvas-video .suggestion .text{
  padding: .5rem 1rem;
  background-color: rgba(0,0,0,.5);
  color: white;
  display: inline-block;
}
.point{
  position: absolute;
  top: 50%;
  left: 50%;
  margin-left: -50px;
  margin-top: -50px;
  height: 100px;
  width: 100px;
  background-color: rgba(0,0,0,.05);
}
.point:after{
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -10px;
  margin-left: -10px;
  width: 20px;
  height: 20px;
  border-radius: 100%;
  background-color: lightgray;
  opacity: .2;
}
.point.is-tracking:after{
  background-color: yellow;
  opacity: 1;
}
.point.is-tracking.has-message:after{
  background-color: greenyellow;
}
.point .tooltip{
  position: absolute;
  top: 0;
  left: 0;
  padding: 1rem;
  background: white;
}
.pre-controls{
  position: absolute;
  bottom: 15vh;
  width: 100%;
  text-align: center;
  color: white;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  color: #9369ff;
  z-index: 300;
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
  z-index: 300;
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
