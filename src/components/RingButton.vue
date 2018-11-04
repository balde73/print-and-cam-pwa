<template>
  <div class="ring-button" :class="[className, active]">
    <div class="inner-ring">
    </div>
  </div>
</template>

<script>
export default {
  props: {
    'status': Boolean,
    'active': String
  },
  mounted () {
    console.log('ehi' + this.active)
  },
  computed: {
    className: function () {
      return this.status ? 'active' : ''
    }
  }
}
</script>

<style scoped>
.ring-button{
  position: relative;
  color: white;
  display: block;
  border-radius: 100%;
  border: 2px solid rgba(255,255,255,.4);;
  height: 8vh;
  width: 8vh;
  margin: 2vh;
}
.ring-button:before{
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -3.5vh;
  margin-left: -3.5vh;
  height: 7vh;
  width: 7vh;
  border-radius: 100%;
  transition: .3s linear;
}
.is-recording:before{
  background-color: brown
}
.is-recording.active:before{
  border-radius: 0;
  height: 4vh;
  width: 4vh;
  margin-top: -2vh;
  margin-left: -2vh;
}
.is-magic:before{
  background-color: aquamarine;
}
.is-magic.active:before{
  opacity: .2;
}
</style>

