<template>
  <div id="app">
    <!-- 根据设备类型渲染不同的组件，通过props传递共享状态 -->
    <MusicPlayerDesktop 
      v-if="deviceType === 'desktop'" 
      :shared-state="musicPlayerState"
    />
    <MusicPlayerMobile 
      v-else 
      :shared-state="musicPlayerState"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue'
import MusicPlayerDesktop from './components/MusicPlayerDesktop.vue'
import MusicPlayerMobile from './components/MusicPlayerMobile.vue'
import { getDeviceType, watchDeviceType } from './utils/deviceDetection.js'
import { useMusicPlayer } from './composables/useMusicPlayer.js'

// 设备类型检测
const deviceType = ref(getDeviceType())

// 创建全局的音乐播放器状态
const musicPlayerState = useMusicPlayer()

// 通过provide/inject向子组件提供状态
provide('musicPlayerState', musicPlayerState)

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
