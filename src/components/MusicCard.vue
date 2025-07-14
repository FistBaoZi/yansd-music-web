<template>
  <div class="music-card" :class="{ 'playing': isPlaying, 'current': isCurrent }">
    <!-- 专辑封面 -->
    <div class="album-cover" @click="$emit('play', song)">
      <img 
        :src="albumCoverUrl" 
        :alt="song.album"
        @error="handleImageError"
        class="cover-image"
      />
      <div class="play-overlay">
        <button 
          @click.stop="$emit('play', song)" 
          class="play-btn"
          :class="{ 'playing': isPlaying }"
        >
          <span v-if="isPlaying">⏸️</span>
          <span v-else>▶️</span>
        </button>
      </div>
    </div>

    <!-- 歌曲信息 -->
    <div class="song-info">
      <h3 class="song-title" :title="song.name">{{ song.name }}</h3>
      <p class="artist-name" :title="artistNames">{{ artistNames }}</p>
      <p class="album-name" :title="song.album">{{ song.album }}</p>
      <div class="source-badge">{{ getSourceName(song.source) }}</div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button 
        @click="$emit('play', song)" 
        class="action-btn play-action"
        :title="isPlaying ? '暂停' : '播放'"
      >
        <span v-if="isPlaying">⏸️</span>
        <span v-else>▶️</span>
      </button>
      
      <button 
        @click="$emit('download', song)" 
        class="action-btn download-btn"
        title="下载"
      >
        📥
      </button>
      
      <button 
        @click="showLyrics = !showLyrics" 
        class="action-btn lyrics-btn"
        title="歌词"
      >
        📝
      </button>
    </div>

    <!-- 歌词面板 -->
    <div v-if="showLyrics" class="lyrics-panel">
      <div class="lyrics-header">
        <h4>歌词</h4>
        <button @click="showLyrics = false" class="close-btn">✕</button>
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
import { ref, computed, watch } from 'vue'
import { getMusicPic, getMusicLyric, MUSIC_SOURCES } from '../api/music.js'

// Props
const props = defineProps({
  song: {
    type: Object,
    required: true
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  isPlaying: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['play', 'download'])

// 响应式数据
const albumCoverUrl = ref('')
const lyrics = ref({ lyric: '', tlyric: '' })
const showLyrics = ref(false)
const imageError = ref(false)

// 计算属性
const artistNames = computed(() => {
  return Array.isArray(props.song.artist) 
    ? props.song.artist.join(', ') 
    : props.song.artist || '未知艺术家'
})

// 获取音乐源名称
const getSourceName = (source) => {
  const sourceInfo = MUSIC_SOURCES.find(s => s.value === source)
  return sourceInfo ? sourceInfo.label : source.toUpperCase()
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

// 监听歌曲变化，重新加载封面
watch(() => props.song, () => {
  imageError.value = false
  loadAlbumCover()
}, { immediate: true })

// 监听歌词面板显示状态
watch(showLyrics, (newVal) => {
  if (newVal && !lyrics.value.lyric && !lyrics.value.tlyric) {
    loadLyrics()
  }
})
</script>

<style scoped>
.music-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.music-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.music-card.current {
  border: 2px solid #1976d2;
}

.music-card.playing {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

/* 专辑封面 */
.album-cover {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.music-card:hover .cover-image {
  transform: scale(1.05);
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.music-card:hover .play-overlay,
.music-card.playing .play-overlay {
  opacity: 1;
}

.play-btn {
  background: white;
  border: none;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.play-btn:hover {
  transform: scale(1.1);
}

.play-btn.playing {
  background: #1976d2;
  color: white;
}

/* 歌曲信息 */
.song-info {
  padding: 1rem;
}

.song-title {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name {
  color: #666;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-name {
  color: #999;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-badge {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: space-around;
  padding: 0.5rem 1rem 1rem;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: background-color 0.3s ease;
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #f5f5f5;
}

.play-action.playing {
  background: #e3f2fd;
  color: #1976d2;
}

.download-btn:hover {
  background: #e8f5e8;
}

.lyrics-btn:hover {
  background: #fff3e0;
}

/* 歌词面板 */
.lyrics-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.lyrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.lyrics-header h4 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: #666;
}

.close-btn:hover {
  background: #e0e0e0;
}

.lyrics-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  max-height: 300px;
}

.lyric-text pre,
.lyric-translation pre {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #333;
  margin: 0;
}

.lyric-translation {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.lyric-translation h5 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.no-lyrics {
  text-align: center;
  color: #999;
  padding: 2rem;
}

.load-lyrics-btn {
  background: #1976d2;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
  transition: background-color 0.3s ease;
}

.load-lyrics-btn:hover {
  background: #1565c0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .album-cover {
    height: 150px;
  }
  
  .play-btn {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .song-info {
    padding: 0.75rem;
  }
  
  .action-buttons {
    padding: 0.5rem;
  }
  
  .action-btn {
    min-width: 35px;
    height: 35px;
    font-size: 1rem;
  }
}
</style>
