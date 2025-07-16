<template>
  <div id="app">
    <!-- 根据设备类型渲染不同的组件 -->
    <MusicPlayerDesktop v-if="deviceType === 'desktop'" />
    <MusicPlayerMobile v-else />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import MusicPlayerDesktop from './components/MusicPlayerDesktop.vue'
import MusicPlayerMobile from './components/MusicPlayerMobile.vue'
import { getDeviceType, watchDeviceType } from './utils/deviceDetection.js'

// 设备类型检测
const deviceType = ref(getDeviceType())

// 监听设备类型变化
let unwatch = null

// 组件挂载时设置监听
onMounted(() => {
  // 监听屏幕尺寸变化自动切换设备类型
  unwatch = watchDeviceType((newDeviceType) => {
    deviceType.value = newDeviceType
  })
})

// 组件卸载时清理监听
onUnmounted(() => {
  if (unwatch) {
    unwatch()
  }
})
</script>

<style scoped>
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
