<template>
  <div class="modal" :class="{'is-open': isOpen}">
    <div class="modal-content">
      <div class="inline-input">
        Version: 1.1.5
      </div>
      <div class="inline-input">
        <label>QR-Code size</label>
        <select @change="$emit('qrCodeChange')" v-model.number="settings.qrCodeSize">
          <option v-bind:value="29">29 (default)</option>
          <option v-bind:value="37">37</option>
          <option v-bind:value="49">49</option>
          <option v-bind:value="61">61</option>
        </select>
      </div>
      <div class="inline-input">
        <label>Debug Mode</label>
        <input type="checkbox" @change="$emit('debugModeChange')" v-model="settings.debugMode" />
      </div>
      <div class="inline-input">
        <label>Experimental track (for A mode)</label>
        <input type="checkbox" v-model="settings.iWantToTrack" />
      </div>
      <div class="inline-input">
        <label>Max vibration</label>
        <input type="number" min="1" max="200" @change="$emit('changeVibrations')" v-model.number="settings.maxVibration" />
      </div>
      <div @click="$emit('closeSettings')" class="">
        <div class="btn">
          CHIUDI
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    'settings': Object,
    'open': Boolean
  },
  computed: {
    isOpen () {
      return this.open
    }
  }
}
</script>

<style scoped>
*{
  box-sizing: border-box;
}
.modal{
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  background-color: white;
  z-index: 1000;
  overflow: hidden;
  font-size: 1.2rem;
}
.modal.is-open{
  width: 100%;
  height: 100%;
}
.modal-content{
  width: 95%;
  padding-top: 20vh;
  max-width: 350px;
  margin: 0 auto;
}
.inline-input{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
}
label{
  font-weight: bolder;
}
input{
  padding: .5rem;
  display: block;
  border: 0;
  font-size: 1.2rem;
  border-bottom: 1px solid rgba(0,0,0,.1);
}
.btn{
  border: 1px solid rgba(0,0,0,.2);
  padding: 1rem;
  text-align: center;
  background-color: rgba(0,0,0,.1);
  cursor: pointer;
}
select{
  padding: .5rem 1rem;
  font-size: 1.2rem;
}
</style>

