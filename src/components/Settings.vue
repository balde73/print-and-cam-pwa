<template>
  <div class="modal" :class="{'is-open': isOpen}">
    <div class="modal-content">
      <div class="inline-input">
        <label>Repair number</label>
        <input v-model.number="settings.nRepair" />
      </div>
      <div class="inline-input">
        <label>Override light</label>
        <input type="checkbox" @change="toggleLight" v-model="settings.overrideLight" />
      </div>
      <div class="inline-input">
        <label>Initial light</label>
        <input type="number" @change="$emit('changeInitialLight')" v-model.number="settings.basicLight" />
      </div>
      <div class="inline-input">
        <label>Light levels</label>
        <input type="number" @change="$emit('changeLevels')" v-model.number="settings.levelsLight" />
      </div>
      <div @click="$emit('closeSettings')" class="">
        <button>
          CHIUDI
        </button>
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
  mounted () {
    console.log(this.settings)
  },
  computed: {
    isOpen () {
      return this.open
    }
  },
  methods: {
    toggleLight () {
      const event = this.settings.overrideLight ? 'stopLight' : 'startLight'
      this.$emit(event)
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
}
.modal.is-open{
  width: 100%;
  height: 100%;
}
.modal-content{
  width: 95%;
  max-width: 350px;
  margin: 0 auto;
}
.inline-input{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
label{

}
input{
  padding: .5rem;
  display: block;
  border: 0;
  border-bottom: 1px solid rgba(0,0,0,.1);
}
</style>

