<template>
  <div id="app">
    <div class="modal-error" v-show="isLoading">
      {{ textModal }}
    </div>
    <Settings
      v-bind:settings="settings"
      v-bind:open="openSettings"
      v-on:nRepairChange="nRepairChange"
      v-on:closeSettings="closeSettings"
      v-on:changeVibrations="changeVibrations"
      v-on:debugModeChange="debugModeChange" />
    <div class="canvas-video">
      <div class="real-canvas-video maxCanvasSize"
        v-bind:style="{
          width: this.realVideoDim.width + 'px',
          height: this.realVideoDim.height + 'px',
          marginTop: - this.realVideoDim.height / 2 + 'px',
          marginLeft: - this.realVideoDim.width / 2 + 'px',
        }">
        <div class="tooltip" v-show="message" @click="cleanMessage">
          <div class="text">
            <div class="">
              {{ message }}
            </div>
            -------
            <div class="">
              {{ findingTime }}s - {{ decodingTime }}s
            </div>
          </div>
        </div>
        <div v-show="suggestion && !message" class="suggestion">
          <div class="text">
            {{ suggestion }}
          </div>
        </div>
        <div class="point"
          v-bind:style="{ left: point.x + '%', top: point.y + '%' }"
          :class="{'is-tracking': isTracking, 'has-message': message}"
          >
        </div>
      </div>
      <video ref="video" id="videoInput" class="maxCanvasSize" autoplay="true" playsinline></video>
      <div class="pre-controls">
        <div class="icon" @click="openSettings = true">
          <svg version="1.1" viewBox="0 0 24 24" xml:space="preserve" width="24" height="24"><title>preferences</title><g stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" fill="#ffffff" stroke="#ffffff"><line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="4" x2="23" y2="4"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="4" x2="4" y2="4"></line> <rect x="4" y="1" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="22" y1="12" x2="23" y2="12"></line> <line data-color="color-2" fill="none" stroke-miterlimit="10" x1="1" y1="12" x2="14" y2="12"></line> <rect data-color="color-2" x="14" y="9" fill="none" stroke-miterlimit="10" width="4" height="6"></rect> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="12" y1="20" x2="23" y2="20"></line> <line fill="none" stroke="#ffffff" stroke-miterlimit="10" x1="1" y1="20" x2="4" y2="20"></line> <rect x="4" y="17" fill="none" stroke="#ffffff" stroke-miterlimit="10" width="4" height="6"></rect></g></svg>
        </div>
        <div class="text">
          Gyro: {{gyroscope && gyroscope.acc}} n: {{gyroscope && gyroscope.still}}
        </div>
        <div class="icon" @click="toggleTorch">
          <div class="" v-show="isTorchOn">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 48 48" xml:space="preserve" width="24" height="24"><title>flash 21</title><g class="nc-icon-wrapper"><path fill="#EFD358" d="M19.99951,45c-0.16113,0-0.32373-0.03906-0.47314-0.11914c-0.40283-0.2168-0.60742-0.67969-0.49658-1.12354 L22.71924,29H6c-0.39648,0-0.75586-0.23438-0.91553-0.59717C4.9248,28.03955,4.99512,27.6167,5.2627,27.32422l22-24 c0.30957-0.3374,0.80811-0.42188,1.21094-0.20508s0.60742,0.67969,0.49658,1.12354L25.28076,19H42 c0.39648,0,0.75586,0.23438,0.91553,0.59717c0.15967,0.36328,0.08936,0.78613-0.17822,1.07861l-22,24 C20.54248,44.8877,20.27295,45,19.99951,45z"/></g></svg>
          </div>
          <div class="" v-show="!isTorchOn">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 64 64" xml:space="preserve" width="24" height="24"><title>flash 21</title><g class="nc-icon-wrapper" stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" fill="#ffffff" stroke="#ffffff"><polygon fill="none" stroke="#ffffff" stroke-miterlimit="10" points="38,6 9,38 30,38 26,58 55,26 34,26 "/></g></svg>
          </div>
        </div>
        <div class="icon" @click="toggleMode">
          <div v-show="!isRecordingMotion">
            M
            <div class="small">manual</div>
          </div>
          <div v-show="isRecordingMotion">
            A
            <div class="small">auto</div>
          </div>
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
        <div class="">
          For better results take a picture using the native camera here:
        </div>
        <input @change="imgUpload" type="file" id="fileInput" accept="image/*" capture="environment" />
        <button @click="cropAndReadCode">Decodifica</button>
        <img id="imageSrc" :src="imgElementSrc" alt="No Image" />
      </div>
    </div>
    <canvas class="maxCanvasSize" id="my-canvas-contours" />
    <canvas class="maxCanvasSize" id="my-canvas-video-1" />
    <canvas class="maxCanvasSize" id="my-canvas-video-2" />
    <canvas class="maxCanvasSize" id="my-canvas-gray" />
    <canvas class="maxCanvasSize" id="my-canvas-bit" />
    <button @click="step">Step</button>
  </div>
</template>

<script>
import RingButton from './components/RingButton'
import MaskFinder from './classes/MaskFinder.js'
import Kircher from './classes/Kircher.js'
import Settings from './components/Settings.vue'

export default {
  name: 'app',
  components: {
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
      openCropImage: false,
      galleryFlash: false,
      imgElementSrc: null,
      settings: {
        nRepair: parseInt(this.$cookies.get('nRepair')) || 1,
        galleryFlash: false,
        maxVibration: parseInt(this.$cookies.get('maxVibration')) || 50,
        debugMode: true
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
      isTorchOn: false,
      isRecordingMotion: false,
      gyroscope: null,
      suggestion: null,
      errors: 0,
      decodingTime: 0,
      findingTime: 0,
      isLoading: true,
      textModal: 'Loading...'
    }
  },
  mounted () {
    this.startRecording()
  },
  methods: {
    async startRecording () {
      this.video = this.$refs.video
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
          this.video.srcObject = this.stream

          let self = this
          this.video.onloadedmetadata = function () {
            self.isLoading = false

            self.video.height = this.videoHeight
            self.video.width = this.videoWidth
            self.videoHeight = this.videoHeight
            self.videoWidth = this.videoWidth
            self.realVideoDim = self.videoDimensions(self.video)
            console.log(self.realVideoDim)

            self.capture = new cv.VideoCapture(self.video)
            self.maskFinder = new MaskFinder(self.capture)
            self.isRecording = true

            window.setTimeout(() => (
              self.changeTorchValue(true)
            ), 100)
          }
        } catch (error) {
          alert(error)
          this.textModal = ':('
        }
      } else {
        this.textModal = 'Browser non supportato :('
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
    startMotionListener () {
      if (window.DeviceMotionEvent !== undefined) {
        this.gyroscope = {
          isMoving: true,
          acc: 1,
          still: 0
        }
        this.isRecordingMotion = true
        window.addEventListener('devicemotion', this.processMotion)
      } else {
        alert('device motion not supported. Abort auto-shots')
      }
    },
    stopMotionListener () {
      this.isRecordingMotion = false
      window.removeEventListener('devicemotion', this.processMotion)
    },
    processMotion (event) {
      const acc = Math.abs(event.acceleration.x) + Math.abs(event.acceleration.y) + Math.abs(event.acceleration.z)
      const percAcc = parseInt(acc * 100)
      if (percAcc < this.settings.maxVibration) {
        this.gyroscope.still += 1
        if (this.gyroscope.still > 5) {
          if (!this.isTracking) {
            this.gyroscope.still = 0
            this.searchMask()
          } else if (!this.message && this.gyroscope.still > 10) {
            this.gyroscope.still = 0
            this.shotAndFullDecode()
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
    toggleTorch () {
      this.changeTorchValue(!this.isTorchOn)
    },
    changeTorchValue (torchValue) {
      let track = this.stream.getVideoTracks()[0]

      track.applyConstraints({
        advanced: [{torch: torchValue}]
      })
        .then(() => {
          this.isTorchOn = torchValue
          console.log('flash value is now: ' + torchValue)
        })
        .catch(e => {
          console.log(e)
          console.log('impossible to start flash')
        })
    },
    stopRecording () {
      this.isRecording = false
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
        this.maskFinder.studyPortion(shot, mask.rect)
        this.startTracking()
        this.suggestion = 'avvicinati per decodificare'
      }
    },
    shotAndFullDecode () {
      let shot = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4)
      this.capture.read(shot)
      this.tryFullDecode(shot)
    },
    tryFullDecode (shot) {
      // the algorithm is still tracking the object
      const startTime = new Date()
      let mask = this.maskFinder.search(shot, 100)
      if (mask && mask.cropped) {
        const intermediateTime = new Date()
        this.findingTime = (intermediateTime - startTime) / 1000
        console.log(this.findingTime)
        this.suggestion = 'codice trovato'
        this.decodeImage(mask.cropped)
        this.decodingTime = (new Date() - intermediateTime) / 1000
      } else {
        this.suggestion = 'più vicino'
      }
    },
    snapshot () {
      this.isMagic = true
      this.stopTracking()
      window.setTimeout(() => {
        this.shotAndFullDecode()
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
    cleanMessage () {
      this.message = null
    },
    toggleMode () {
      if (this.isRecordingMotion) {
        this.startManualMode()
      } else {
        this.startAutomaticMode()
      }
    },
    startAutomaticMode () {
      this.startMotionListener()
    },
    startManualMode () {
      this.stopMotionListener()
      this.stopTracking()
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
      this.message = Kircher.decode(image)
    },
    countErrors (message) {
      // just for testing!
      const maxSizeEncoded = parseInt(64 * 64 / (this.settings.nRepair * 8))
      let st = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque interdum nec dolor non consectetur. Nam vel euismod mauris. Aliquam sit amet ligula in est rutrum auctor ut ac lorem. Duis blandit convallis pulvinar. Pellentesque sed vestibulum purus. Curabitur lacinia luctus orci ac molestie. Morbi gravida hendrerit neque, non consequat dui eleifend id. Morbi tincidunt nisi enim, vel laoreet magna rutrum vel. Quisque vel ultrices lacus. Sed id diam eget justo rutrum rutrum. Nulla maximus augue ex, at viverra sem venenatis id. Morbi id orci vel enim luctus condimentum. Cras metus neque, ultricies ut condimentum in, euismod in est. Etiam maximus neque vel velit suscipit semper. Pellentesque nec velit odio'
      if (st.length > maxSizeEncoded) {
        // cut the encoding
        st = st.substring(0, maxSizeEncoded)
      }
      let encoding = Kircher.encodeBinaryString(st)
      let code = Kircher.encodeBinaryString(message)
      let errors = 0
      for (let i = 0; i < code.length; i++) {
        if (code[i] !== encoding[i]) {
          errors += 1
        }
      }
      let errorsString = 0
      for (let i = 0; i < message.length; i++) {
        if (message[i] !== st[i]) {
          errorsString += 1
        }
      }
      this.errors = errors + '/' + maxSizeEncoded * 8 + ' - ' + errorsString + '/' + maxSizeEncoded
      console.log(this.errors)
    },
    readCode () {
      let image = cv.imread('imageSrc')
      let code = Kircher.decode(image, this.settings.nRepair)
      this.countErrors(code)
      alert(code)
      image.delete()
    },
    cropAndReadCode () {
      let image = cv.imread('imageSrc')
      this.tryFullDecode(image)
    },
    closeSettings () {
      this.openSettings = false
    },
    nRepairChange () {
      this.$cookies.set('nRepair', this.settings.nRepair)
    },
    trackImage () {
      this.maskFinder.shotAndTrack()
      // this.maskFinder.trackPortion()
    },
    step () {
      this.maskFinder.processVideo()
    },
    changeVibrations () {
      const value = this.settings.maxVibration
      this.$cookies.set('maxVibration', value)
    },
    debugModeChange () {
      const value = this.settings.debugMode
      this.maskFinder.setDebugMode(value)
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
  left: 0;
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
.tooltip{
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 1rem;
  box-sizing: border-box;
  border: 1px solid black;
}
.tooltip .text{
  background-color: white;
  max-width: 300px;
  border-radius: 30px;
  padding: 1rem;
  margin: 0 auto;
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
  background: black;
}
.pre-controls .icon{
  padding: 0 1rem;
}
.pre-controls .icon .small{
  font-size: .6rem;
}
.pre-controls .text{
  flex: 1;
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
  background: black;
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
#imageSrc{
  opacity: 0;
  position: fixed;
  bottom: -10px;
  z-index: -10;
}
.modal-error{
  position: fixed;
  top: 0;
  height: 100vh;
  width: 100vw;
  background-color: darkslateblue;
  color: white;
  font-size: 3rem;
  text-align: center;
  padding-top: 20vh;
  z-index: 1000;
}
</style>
