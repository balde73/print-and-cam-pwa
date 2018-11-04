<template>
  <div id="app">
    <div class="canvas-video">
      <video ref="video" id="videoInput" autoplay="true"></video>
      <div id="p0" class="point"></div>
      <div id="p1" class="point"></div>
      <div id="p2" class="point"></div>
      <div id="p3" class="point"></div>
      <div class="controls">
        <div class="gallery">
          <canvas id="canvasTransform"></canvas>
        </div>
        <RingButton @click.native="toggleRecording" active="is-recording" v-bind:status="isRecording" />
        <RingButton @click.native="snapshot" active="is-magic" v-bind:status="isMagic" />
      </div>
    </div>
    <Hello />
    <div id="bw-threshold-box" class="tools">
      <canvas v-for="level in levels" v-bind:key="level" :id="`bw-threshold-${level}`" />
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
      levels: [50, 100, 120, 140, 160, 180, 200, 220, 250]
    }
  },
  mounted () {
    this.startRecording()
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
        this.maskFinder = new MaskFinder(this.capture, this.levels)
        this.isRecording = true
      }
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
}
video{
  height: 90vh;
  width: 100vw;
  background: black;
}
#canvasTransform{
  max-height: 300px;
}
.canvas-video{
  position: relative;
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
.controls{
  position: absolute;
  bottom: 0;
  z-index: 100;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.2)
}
.gallery{
  margin: 2vh;
  border: 1px solid white;
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
