<template>
  <div class="music-player" :class="{ 'minimized': isMinimized }">
    <!-- 收起/展开控制区 -->
    <div class="drawer-toggle" @click="toggleMinimize">
      <span v-if="isMinimized">◀</span>
      <span v-else>▶</span>
    </div>

    <!-- 播放器头部 -->
    <div class="player-header">
      <div class="album-cover">
        <img 
          :src="albumCoverUrl" 
          :alt="song.name" 
          @error="handleImageError"
        />
        <div class="cover-overlay"></div>
      </div>

      <div class="song-details">
        <h3 class="song-title" :title="song.name">{{ song.name }}</h3>
        <p class="artist-name" :title="artistNames">{{ artistNames }}</p>
        <p class="album-name" :title="song.album">{{ song.album }}</p>
      </div>
    </div>

    <!-- 播放控制区 -->
    <div class="player-controls">
      <div class="progress-container">
        <div class="time current">{{ formatTime(currentTime) }}</div>
        <div class="progress-bar">
          <div 
            class="progress" 
            :style="{ width: progressPercentage + '%' }"
          ></div>
          <input 
            type="range" 
            min="0" 
            :max="duration" 
            :value="currentTime"
            @input="seek"
            class="progress-input"
          />
        </div>
        <div class="time duration">{{ formatTime(duration) }}</div>
      </div>
      
      <div class="control-buttons">
        <button 
          @click="$emit('previous')" 
          class="control-btn previous-btn"
          title="上一首"
        >
          ⏮
        </button>

        <button 
          @click="$emit('play-pause')" 
          class="control-btn play-pause-btn"
          :title="isPlaying ? '暂停' : '播放'"
        >
          {{ isPlaying ? '⏸' : '▶' }}
        </button>
        
        <button 
          @click="$emit('next')" 
          class="control-btn next-btn"
          title="下一首"
        >
          ⏭
        </button>
      </div>

      <div class="extra-controls">
        <div class="volume-control">
          <span class="volume-icon">🔊</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model="volume" 
            @input="changeVolume"
            class="volume-slider"
          />
        </div>
        
        <button 
          @click="$emit('download', song)" 
          class="download-btn"
          title="下载"
        >
          📥
        </button>
        
        <button 
          @click="toggleLyrics" 
          class="lyrics-toggle-btn"
          :class="{ 'active': showLyrics }"
          title="歌词"
        >
          �
        </button>
      </div>
    </div>

    <!-- 歌词显示区域 -->
    <div class="lyrics-container" :class="{ 'show': showLyrics }">
      <div class="lyrics-header">
        <h4>歌词</h4>
      </div>
      <div class="lyrics-content">
        <div v-if="lyrics.lyric" class="lyric-text">
          <pre>{{ lyrics.lyric }}</pre>
        </div>
        <div v-if="lyrics.tlyric" class="lyric-translation">
          <h5>翻译</h5>
          <pre>{{ lyrics.tlyric }}</pre>
        </div>
        <div v-if="!lyrics.lyric && !lyrics.tlyric" class="no-lyrics">
          <p>暂无歌词</p>
          <button @click="loadLyrics" class="load-lyrics-btn">加载歌词</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getMusicPic, getMusicLyric } from '../api/music.js'

// Props
const props = defineProps({
  song: {
    type: Object,
    required: true
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['play-pause', 'next', 'previous', 'download'])

// 响应式数据
const albumCoverUrl = ref('')
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.7)
const isMinimized = ref(true) // 默认最小化
const showLyrics = ref(false)
const lyrics = ref({ lyric: '', tlyric: '' })
const imageError = ref(false)

// 计算属性
const progressPercentage = computed(() => {
  return duration.value ? (currentTime.value / duration.value) * 100 : 0
})

const artistNames = computed(() => {
  return Array.isArray(props.song.artist) 
    ? props.song.artist.join(', ') 
    : props.song.artist || '未知艺术家'
})

// 获取音频元素
const getAudioElement = () => {
  return document.querySelector('audio')
}

// 更新音频进度
const updateProgress = () => {
  const audio = getAudioElement()
  if (audio) {
    currentTime.value = audio.currentTime
    duration.value = audio.duration || 0
  }
}

// 时间格式化
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 跳转播放位置
const seek = (event) => {
  const audio = getAudioElement()
  if (audio) {
    audio.currentTime = event.target.value
    currentTime.value = audio.currentTime
  }
}

// 调节音量
const changeVolume = () => {
  const audio = getAudioElement()
  if (audio) {
    audio.volume = volume.value
  }
}

// 最小化/展开播放器
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

// 显示/隐藏歌词
const toggleLyrics = () => {
  showLyrics.value = !showLyrics.value
  if (showLyrics.value && !lyrics.value.lyric && !lyrics.value.tlyric) {
    loadLyrics()
  }
}

// 处理图片加载错误
const handleImageError = () => {
  imageError.value = true
  albumCoverUrl.value = '/default-album-cover.svg' // 使用默认封面
}

// 加载专辑封面
const loadAlbumCover = async () => {
  if (!props.song.pic_id || imageError.value) return
  
  try {
    const picUrl = await getMusicPic({
      source: props.song.source,
      id: props.song.pic_id,
      size: 300
    })
    
    if (picUrl) {
      albumCoverUrl.value = picUrl
    } else {
      handleImageError()
    }
  } catch (error) {
    console.error('加载专辑封面失败:', error)
    handleImageError()
  }
}

// 加载歌词
const loadLyrics = async () => {
  if (!props.song.lyric_id) return
  
  try {
    const lyricData = await getMusicLyric({
      source: props.song.source,
      id: props.song.lyric_id
    })
    
    lyrics.value = lyricData
  } catch (error) {
    console.error('加载歌词失败:', error)
  }
}

// 设置初始音量
const setInitialVolume = () => {
  const audio = getAudioElement()
  if (audio) {
    audio.volume = volume.value
  }
}

// 监听歌曲变化，重新加载封面
watch(() => props.song, () => {
  imageError.value = false
  loadAlbumCover()
  lyrics.value = { lyric: '', tlyric: '' }
}, { immediate: true })

// 组件挂载和卸载
onMounted(() => {
  // 设置定时器更新进度
  const progressInterval = setInterval(updateProgress, 500)
  setInitialVolume()
  showLyrics.value = true // 默认显示歌词
  loadLyrics() // 自动加载歌词
  
  // 卸载时清理定时器
  onUnmounted(() => {
    clearInterval(progressInterval)
  })
})
</script>

<style scoped>
.music-player {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: 500px; /* 增加宽度从400px到500px */
  background: rgba(25, 118, 210, 0.95);
  backdrop-filter: blur(10px);
  color: white;
  box-shadow: -2px 0 10px rgba(0,0,0,0.2);
  z-index: 100;
  transition: all 0.3s ease;
  transform: translateX(0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.music-player.minimized {
  transform: translateX(calc(100% - 60px));
}

/* 添加新的抽屉式播放器样式 */
.drawer-toggle {
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 60px;
  background: rgba(25, 118, 210, 0.9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 0 5px rgba(0,0,0,0.2);
  z-index: 10;
  transition: all 0.3s ease;
}

.drawer-toggle:hover {
  background: rgba(25, 118, 210, 1);
}

.player-header {
  padding: 1.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.album-cover {
  width: 120px; /* 增加专辑封面尺寸 */
  height: 120px; /* 增加专辑封面尺寸 */
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.song-details {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 1.2rem; /* 增加字体大小 */
  font-weight: bold;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name,
.album-name {
  font-size: 0.9rem; /* 增加字体大小 */
  margin: 0.3rem 0; /* 增加间距 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
}

/* 播放器控制区域 */
.player-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time {
  font-size: 0.8rem;
  min-width: 40px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: white;
  border-radius: 3px;
  pointer-events: none;
}

.progress-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.control-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.control-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.4rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255,255,255,0.1);
}

.play-pause-btn {
  background: white;
  color: #1976d2;
  font-size: 1.2rem;
}

.play-pause-btn:hover {
  background: rgba(255,255,255,0.9);
}

.extra-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-icon {
  font-size: 1.2rem;
}

.volume-slider {
  width: 100px;
  cursor: pointer;
}

.minimize-btn,
.download-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.minimize-btn:hover,
.download-btn:hover {
  background: rgba(255,255,255,0.1);
}

/* 歌词区域 */
.lyrics-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  max-height: 0;
  transition: all 0.5s ease;
}

.lyrics-container.show {
  opacity: 1;
  max-height: 100%;
}

.lyrics-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem; /* 增加内边距 */
  font-size: 1.05rem; /* 增加歌词字体大小 */
  line-height: 1.8; /* 增加行高，使歌词更易读 */
}

.lyrics-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lyrics-header h4 {
  margin: 0;
  font-size: 0.9rem;
}

.lyrics-toggle-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.lyrics-toggle-btn.active {
  background: rgba(255,255,255,0.2);
}

.lyric-text pre,
.lyric-translation pre {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 1rem;
  margin: 0;
  line-height: 1.8; 
  letter-spacing: 0.5px;
}

.lyric-translation {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.lyric-translation h5 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  opacity: 0.8;
}

.no-lyrics {
  text-align: center;
  padding: 2rem 1rem;
  font-size: 1rem;
}

.load-lyrics-btn {
  background: white;
  color: #1976d2;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;
  transition: opacity 0.2s;
  font-weight: bold;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .player-main {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.75rem;
  }
  
  .album-cover {
    width: 50px;
    height: 50px;
  }
  
  .control-btn {
    width: 36px;
    height: 36px;
    font-size: 1.2rem;
  }
  
  .play-pause-btn {
    font-size: 1rem;
  }
  
  .volume-slider {
    width: 60px;
  }
  
  .time {
    min-width: 32px;
    font-size: 0.7rem;
  }
  
  .music-player.minimized {
    max-height: 60px;
  }
  
  .music-player {
    width: 380px; /* 增加移动设备宽度从300px到380px */
  }
  
  .album-cover {
    width: 80px;
    height: 80px;
  }
}
</style>
