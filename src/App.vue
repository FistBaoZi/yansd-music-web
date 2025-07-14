<template>
  <div id="app">
    <!-- 头部导航 -->
    <header class="header">
      <div class="container">
        <h1 class="logo">🎵 烟神殿音乐</h1>
        <p class="subtitle">基于 GD Studio API 的音乐平台</p>
      </div>
    </header>

    <!-- 搜索区域 -->
    <section class="search-section">
      <div class="container">
        <div class="search-box">
          <div class="search-input-container">
            <input 
              v-model="searchKeyword" 
              @keyup.enter="searchMusic"
              placeholder="搜索歌曲、歌手或专辑..." 
              class="search-input"
            />
            <button @click="searchMusic" class="search-icon-btn" :disabled="loading">
              <span class="search-icon">🔍</span>
            </button>
          </div>
          <select v-model="selectedSource" class="source-select">
            <option value="netease">网易云音乐</option>
            <option value="kuwo">酷我音乐</option>
            <option value="joox">JOOX</option>
            <option value="tencent">QQ音乐</option>
            <option value="migu">咪咕音乐</option>
          </select>
          <button @click="searchMusic" class="search-btn" :disabled="loading">
            {{ loading ? '搜索中...' : '搜索' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 底部音乐播放器 -->
    <div class="bottom-player" v-if="currentSong">
      <div class="player-content">
        <!-- 左侧：歌曲信息 -->
        <div class="player-left">
          <div class="player-album-cover">
            <img :src="currentSongCover" :alt="currentSong.album" @error="handleCoverError" />
          </div>
          <div class="player-song-info">
            <div class="player-song-title">{{ currentSong.name }}</div>
            <div class="player-artist">{{ Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : currentSong.artist }}</div>
          </div>
        </div>

        <!-- 中间：播放控制 -->
        <div class="player-center">
          <div class="player-controls">
            <button @click="playPrevious" class="control-btn" title="上一首">⏮</button>
            <button @click="togglePlayPause" class="control-btn play-btn" :title="isPlaying ? '暂停' : '播放'">
              {{ isPlaying ? '⏸' : '▶' }}
            </button>
            <button @click="playNext" class="control-btn" title="下一首">⏭</button>
          </div>
          <div class="progress-container">
            <span class="time">{{ formatTime(currentTime) }}</span>
            <div class="progress-bar">
              <div class="progress" :style="{ width: progressPercentage + '%' }"></div>
              <input 
                type="range" 
                min="0" 
                :max="duration" 
                :value="currentTime"
                @input="seek"
                class="progress-input"
              />
            </div>
            <span class="time">{{ formatTime(duration) }}</span>
          </div>
        </div>

        <!-- 右侧：音量和其他控制 -->
        <div class="player-right">
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
          <button @click="downloadSong(currentSong)" class="control-btn" title="下载">📥</button>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <section class="results-section" v-if="searchResults.length > 0">
      <div class="container">
        <!-- 主要内容区域 -->
        <div class="main-content">
          <!-- 左侧歌曲列表 -->
          <div class="left-panel">
            <div class="list-header">
              <h2>搜索结果 ({{ searchResults.length }} 首)</h2>
              <div class="batch-controls">
                <button 
                  @click="toggleSelectMode" 
                  class="batch-btn"
                  :class="{ 'active': isSelectMode }"
                >
                  {{ isSelectMode ? '取消选择' : '批量选择' }}
                </button>
                <button 
                  v-if="isSelectMode" 
                  @click="selectAll" 
                  class="batch-btn"
                >
                  {{ selectedSongs.length === searchResults.length ? '取消全选' : '全选' }}
                </button>
                <button 
                  v-if="isSelectMode && selectedSongs.length > 0" 
                  @click="batchDownload" 
                  class="batch-btn download-btn"
                  :disabled="batchDownloadProgress !== ''"
                >
                  下载选中 ({{ selectedSongs.length }})
                </button>
              </div>
            </div>
            <div class="song-list">
              <div 
                v-for="(song, index) in searchResults" 
                :key="song.id"
                class="song-item"
                :class="{ 'active': currentSong?.id === song.id, 'playing': isPlaying && currentSong?.id === song.id, 'selected': selectedSongs.includes(song.id) }"
                @click="handleSongClick(song)"
              >
                <div class="song-checkbox" v-if="isSelectMode" @click.stop="toggleSongSelection(song.id)">
                  <input type="checkbox" :checked="selectedSongs.includes(song.id)" />
                </div>
                <div class="song-index">{{ index + 1 }}</div>
                <div class="song-info">
                  <div class="song-title">{{ song.name }}</div>
                  <div class="song-artist">{{ Array.isArray(song.artist) ? song.artist.join(', ') : song.artist }}</div>
                </div>
                <div class="song-album">{{ song.album }}</div>
                <div class="song-duration">{{ formatDuration(song.duration) }}</div>
                <div class="song-actions" v-if="!isSelectMode">
                  <button @click.stop="playSong(song)" class="action-btn" :title="isPlaying && currentSong?.id === song.id ? '暂停' : '播放'">
                    {{ isPlaying && currentSong?.id === song.id ? '⏸️' : '▶️' }}
                  </button>
                  <button @click.stop="downloadSong(song)" class="action-btn" title="下载">📥</button>
                </div>
              </div>
            </div>
            
            <!-- 分页 -->
            <div class="pagination" v-if="totalPages > 1">
              <button 
                @click="loadPage(currentPage - 1)" 
                :disabled="currentPage <= 1"
                class="page-btn"
              >
                上一页
              </button>
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              <button 
                @click="loadPage(currentPage + 1)" 
                :disabled="currentPage >= totalPages"
                class="page-btn"
              >
                下一页
              </button>
            </div>
          </div>

          <!-- 右侧歌曲信息和歌词 -->
          <div class="right-panel" v-if="currentSong">
            <div class="song-detail">
              <div class="album-cover-large">
                <img :src="currentSongCover" :alt="currentSong.album" @error="handleCoverError" />
              </div>
              <div class="song-meta">
                <h3 class="song-title-large">{{ currentSong.name }}</h3>
                <p class="artist-large">{{ Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : currentSong.artist }}</p>
                <p class="album-large">{{ currentSong.album }}</p>
                <div class="song-source">{{ getSourceName(currentSong.source) }}</div>
              </div>
            </div>
            
            <div class="lyrics-section">
              <div class="lyrics-header">
                <h4>歌词</h4>
                <button @click="loadCurrentLyrics" class="refresh-lyrics-btn">🔄</button>
              </div>
              <div class="lyrics-content">
                <div v-if="parsedLyrics.length > 0" class="parsed-lyrics">
                  <div 
                    v-for="(line, index) in parsedLyrics" 
                    :key="index"
                    :data-lyric-index="index"
                    class="lyric-line"
                    :class="{ 
                      'current': index === currentLyricIndex,
                      'passed': index < currentLyricIndex,
                      'upcoming': index > currentLyricIndex
                    }"
                    @click="seekToLyric(line.time)"
                  >
                    <span class="lyric-text">{{ line.text }}</span>
                  </div>
                </div>
                <div v-else-if="currentLyrics.lyric" class="lyric-text">
                  <div class="original-lyrics">
                    <div 
                      v-for="(line, index) in currentLyrics.lyric.split('\n')" 
                      :key="index"
                      class="lyric-line-static"
                    >
                      {{ line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim() }}
                    </div>
                  </div>
                </div>
                <div v-if="currentLyrics.tlyric" class="lyric-translation">
                  <h5>翻译</h5>
                  <pre>{{ currentLyrics.tlyric }}</pre>
                </div>
                <div v-if="!currentLyrics.lyric && !currentLyrics.tlyric" class="no-lyrics">
                  <p>暂无歌词</p>
                  <button @click="loadCurrentLyrics" class="load-lyrics-btn">加载歌词</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p v-if="batchDownloadProgress">{{ batchDownloadProgress }}</p>
      <p v-else-if="downloadProgress">{{ downloadProgress }}</p>
      <p v-else>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && searchResults.length === 0 && hasSearched" class="empty-state">
      <div class="container">
        <h3>未找到相关音乐</h3>
        <p>请尝试其他关键词或音乐源</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { searchMusic as apiSearchMusic, getMusicUrl, getMusicPic, getMusicLyric, MUSIC_SOURCES } from './api/music.js'
import axios from 'axios'

// 响应式数据
const searchKeyword = ref('')
const selectedSource = ref('netease')
const searchResults = ref([])
const currentSong = ref(null)
const isPlaying = ref(false)
const loading = ref(false)
const hasSearched = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = ref(20)
const downloadProgress = ref('') // 添加下载进度提示

// 批量下载相关数据
const selectedSongs = ref([])
const isSelectMode = ref(false)
const batchDownloadProgress = ref('')

// 播放器相关数据
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.7)
const progressPercentage = ref(0)
const currentSongCover = ref('')
const currentLyrics = ref({ lyric: '', tlyric: '' })
const parsedLyrics = ref([])
const currentLyricIndex = ref(-1)

// 音频对象
let audioPlayer = null

// 搜索音乐
const searchMusic = async () => {
  if (!searchKeyword.value.trim()) return
  
  loading.value = true
  hasSearched.value = true
  currentPage.value = 1
  
  try {
    const results = await apiSearchMusic({
      source: selectedSource.value,
      keyword: searchKeyword.value,
      count: pageSize.value,
      page: currentPage.value
    })
    
    searchResults.value = results || []
    totalPages.value = Math.ceil(searchResults.value.length / pageSize.value)
  } catch (error) {
    console.error('搜索失败:', error)
    searchResults.value = []
  } finally {
    loading.value = false
  }
}

// 播放歌曲
const playSong = async (song) => {
  try {
    // 如果是同一首歌，只切换播放状态
    if (currentSong.value?.id === song.id) {
      togglePlayPause()
      return
    }

    loading.value = true
    currentSong.value = song
    
    // 加载专辑封面和歌词
    loadAlbumCover(song)
    loadCurrentLyrics()
    
    // 获取音乐URL
    const musicUrl = await getMusicUrl({
      source: song.source,
      id: song.id,
      br: 320
    })
    
    if (musicUrl) {
      // 停止当前播放
      if (audioPlayer) {
        audioPlayer.pause()
        audioPlayer = null
      }
      
      // 创建新的音频对象
      audioPlayer = new Audio(musicUrl)
      audioPlayer.volume = volume.value
      audioPlayer.play()
      isPlaying.value = true
      
      // 监听播放结束事件
      audioPlayer.addEventListener('ended', () => {
        playNext()
      })
      
      // 监听时间更新
      audioPlayer.addEventListener('timeupdate', updateProgress)
    }
  } catch (error) {
    console.error('播放失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换播放暂停
const togglePlayPause = () => {
  if (!audioPlayer || !currentSong.value) return
  
  if (isPlaying.value) {
    audioPlayer.pause()
    isPlaying.value = false
  } else {
    audioPlayer.play()
    isPlaying.value = true
  }
}

// 下一首
const playNext = () => {
  const currentIndex = searchResults.value.findIndex(song => song.id === currentSong.value?.id)
  const nextIndex = (currentIndex + 1) % searchResults.value.length
  if (searchResults.value[nextIndex]) {
    playSong(searchResults.value[nextIndex])
  }
}

// 上一首
const playPrevious = () => {
  const currentIndex = searchResults.value.findIndex(song => song.id === currentSong.value?.id)
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : searchResults.value.length - 1
  if (searchResults.value[prevIndex]) {
    playSong(searchResults.value[prevIndex])
  }
}

// 下载歌曲
const downloadSong = async (song) => {
  try {
    loading.value = true
    downloadProgress.value = '正在准备下载...'
    
    // 生成文件名
    const artistName = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist
    const fileName = `${song.name} - ${artistName}`.replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符
    
    downloadProgress.value = '正在获取最高品质音频链接...'
    
    // 下载音频文件 - 尝试最高品质
    const qualities = [999, 740, 320, 192, 128] // 从最高品质开始尝试
    let musicUrl = null
    let selectedQuality = null
    
    for (const quality of qualities) {
      try {
        downloadProgress.value = `正在尝试 ${quality}kbps 品质...`
        musicUrl = await getMusicUrl({
          source: song.source,
          id: song.id,
          br: quality
        })
        if (musicUrl) {
          selectedQuality = quality
          console.log(`成功获取 ${quality}kbps 品质的音频链接`)
          break
        }
      } catch (error) {
        console.warn(`${quality}kbps 品质获取失败，尝试下一个品质`)
      }
    }
    
    if (musicUrl) {
      downloadProgress.value = `正在下载音频文件 (${selectedQuality}kbps)...`
      
      try {
        // 使用 axios 下载音频文件
        const audioResponse = await axios({
          method: 'get',
          url: musicUrl,
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              downloadProgress.value = `正在下载音频文件 (${selectedQuality}kbps): ${percentCompleted}%`
            }
          }
        })
        
        // 创建 Blob URL 并触发下载
        const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const audioLink = document.createElement('a')
        audioLink.href = audioUrl
        audioLink.download = `${fileName}.mp3`
        audioLink.style.display = 'none'
        document.body.appendChild(audioLink)
        audioLink.click()
        document.body.removeChild(audioLink)
        
        // 清理临时URL
        URL.revokeObjectURL(audioUrl)
        
        console.log(`音频文件下载完成: ${fileName}.mp3 (${selectedQuality}kbps)`)
      } catch (error) {
        console.error('音频文件下载失败:', error)
        downloadProgress.value = ''
        alert('音频文件下载失败，请稍后重试')
        return
      }
    } else {
      downloadProgress.value = ''
      console.error('无法获取音频下载链接')
      alert('无法获取音频下载链接，请稍后重试')
      return
    }
    
    // 下载歌词文件
    if (song.lyric_id) {
      try {
        downloadProgress.value = '正在下载歌词文件...'
        
        const lyricData = await getMusicLyric({
          source: song.source,
          id: song.lyric_id
        })
        
        if (lyricData.lyric || lyricData.tlyric) {
          let lyricContent = ''
          
          // 添加歌曲信息头部
          lyricContent += `歌曲: ${song.name}\n`
          lyricContent += `歌手: ${artistName}\n`
          lyricContent += `专辑: ${song.album || '未知专辑'}\n`
          lyricContent += `来源: ${getSourceName(song.source)}\n`
          lyricContent += `音质: ${selectedQuality}kbps\n`
          lyricContent += `下载时间: ${new Date().toLocaleString('zh-CN')}\n`
          lyricContent += '\n' + '='.repeat(50) + '\n\n'
          
          // 添加原文歌词
          if (lyricData.lyric) {
            lyricContent += '【原文歌词】\n\n'
            lyricContent += lyricData.lyric
            lyricContent += '\n\n'
          }
          
          // 添加翻译歌词
          if (lyricData.tlyric) {
            lyricContent += '【翻译歌词】\n\n'
            lyricContent += lyricData.tlyric
            lyricContent += '\n'
          }
          
          // 创建并下载歌词文件
          const lyricBlob = new Blob([lyricContent], { type: 'text/plain;charset=utf-8' })
          const lyricUrl = URL.createObjectURL(lyricBlob)
          
          const lyricLink = document.createElement('a')
          lyricLink.href = lyricUrl
          lyricLink.download = `${fileName}.lrc`
          lyricLink.style.display = 'none'
          document.body.appendChild(lyricLink)
          lyricLink.click()
          document.body.removeChild(lyricLink)
          
          // 清理临时URL
          URL.revokeObjectURL(lyricUrl)
          
          console.log(`歌词文件下载完成: ${fileName}.lrc`)
        } else {
          console.log('该歌曲暂无歌词')
        }
      } catch (error) {
        console.error('下载歌词失败:', error)
      }
    } else {
      console.log('该歌曲没有歌词ID')
    }
    
    downloadProgress.value = '下载完成！'
    
    // 显示下载完成提示
    setTimeout(() => {
      alert(`下载完成！\n\n音频文件: ${fileName}.mp3 (${selectedQuality}kbps)\n歌词文件: ${fileName}.lrc\n\n文件已保存到您的下载文件夹`)
      downloadProgress.value = ''
    }, 500)
    
  } catch (error) {
    console.error('下载失败:', error)
    downloadProgress.value = ''
    alert('下载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 分页加载
const loadPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  searchMusic()
}

// 批量下载相关函数
const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedSongs.value = []
  }
}

const toggleSongSelection = (songId) => {
  const index = selectedSongs.value.indexOf(songId)
  if (index > -1) {
    selectedSongs.value.splice(index, 1)
  } else {
    selectedSongs.value.push(songId)
  }
}

const selectAll = () => {
  if (selectedSongs.value.length === searchResults.value.length) {
    selectedSongs.value = []
  } else {
    selectedSongs.value = searchResults.value.map(song => song.id)
  }
}

const handleSongClick = (song) => {
  if (isSelectMode.value) {
    toggleSongSelection(song.id)
  } else {
    playSong(song)
  }
}

const batchDownload = async () => {
  if (selectedSongs.value.length === 0) {
    alert('请先选择要下载的歌曲')
    return
  }

  try {
    loading.value = true
    const selectedSongObjects = searchResults.value.filter(song => selectedSongs.value.includes(song.id))
    const totalSongs = selectedSongObjects.length
    let completedSongs = 0
    let successCount = 0
    let failedSongs = []

    for (let i = 0; i < selectedSongObjects.length; i++) {
      const song = selectedSongObjects[i]
      batchDownloadProgress.value = `正在下载第 ${i + 1}/${totalSongs} 首: ${song.name}`

      try {
        await downloadSingleSong(song)
        successCount++
      } catch (error) {
        console.error(`下载失败: ${song.name}`, error)
        failedSongs.push(song.name)
      }
      
      completedSongs++
    }

    // 显示批量下载结果
    let resultMessage = `批量下载完成！\n\n成功下载: ${successCount} 首`
    if (failedSongs.length > 0) {
      resultMessage += `\n失败: ${failedSongs.length} 首`
      resultMessage += `\n失败的歌曲: ${failedSongs.join(', ')}`
    }
    
    alert(resultMessage)
    
    // 退出选择模式
    isSelectMode.value = false
    selectedSongs.value = []

  } catch (error) {
    console.error('批量下载失败:', error)
    alert('批量下载失败，请稍后重试')
  } finally {
    loading.value = false
    batchDownloadProgress.value = ''
  }
}

// 单个歌曲下载函数（不显示加载状态）
const downloadSingleSong = async (song) => {
  // 生成文件名
  const artistName = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist
  const fileName = `${song.name} - ${artistName}`.replace(/[<>:"/\\|?*]/g, '_')
  
  // 下载音频文件 - 尝试最高品质
  const qualities = [999, 740, 320, 192, 128]
  let musicUrl = null
  let selectedQuality = null
  
  for (const quality of qualities) {
    try {
      musicUrl = await getMusicUrl({
        source: song.source,
        id: song.id,
        br: quality
      })
      if (musicUrl) {
        selectedQuality = quality
        break
      }
    } catch (error) {
      console.warn(`${quality}kbps 品质获取失败，尝试下一个品质`)
    }
  }
  
  if (!musicUrl) {
    throw new Error('无法获取音频下载链接')
  }

  // 使用 axios 下载音频文件
  const audioResponse = await axios({
    method: 'get',
    url: musicUrl,
    responseType: 'blob'
  })
  
  // 创建 Blob URL 并触发下载
  const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' })
  const audioUrl = URL.createObjectURL(audioBlob)
  
  const audioLink = document.createElement('a')
  audioLink.href = audioUrl
  audioLink.download = `${fileName}.mp3`
  audioLink.style.display = 'none'
  document.body.appendChild(audioLink)
  audioLink.click()
  document.body.removeChild(audioLink)
  
  // 清理临时URL
  URL.revokeObjectURL(audioUrl)
  
  // 下载歌词文件
  if (song.lyric_id) {
    try {
      const lyricData = await getMusicLyric({
        source: song.source,
        id: song.lyric_id
      })
      
      if (lyricData.lyric || lyricData.tlyric) {
        let lyricContent = ''
        
        // 添加歌曲信息头部
        lyricContent += `歌曲: ${song.name}\n`
        lyricContent += `歌手: ${artistName}\n`
        lyricContent += `专辑: ${song.album || '未知专辑'}\n`
        lyricContent += `来源: ${getSourceName(song.source)}\n`
        lyricContent += `音质: ${selectedQuality}kbps\n`
        lyricContent += `下载时间: ${new Date().toLocaleString('zh-CN')}\n`
        lyricContent += '\n' + '='.repeat(50) + '\n\n'
        
        // 添加原文歌词
        if (lyricData.lyric) {
          lyricContent += '【原文歌词】\n\n'
          lyricContent += lyricData.lyric
          lyricContent += '\n\n'
        }
        
        // 添加翻译歌词
        if (lyricData.tlyric) {
          lyricContent += '【翻译歌词】\n\n'
          lyricContent += lyricData.tlyric
          lyricContent += '\n'
        }
        
        // 创建并下载歌词文件
        const lyricBlob = new Blob([lyricContent], { type: 'text/plain;charset=utf-8' })
        const lyricUrl = URL.createObjectURL(lyricBlob)
        
        const lyricLink = document.createElement('a')
        lyricLink.href = lyricUrl
        lyricLink.download = `${fileName}.lrc`
        lyricLink.style.display = 'none'
        document.body.appendChild(lyricLink)
        lyricLink.click()
        document.body.removeChild(lyricLink)
        
        // 清理临时URL
        URL.revokeObjectURL(lyricUrl)
      }
    } catch (error) {
      console.error('下载歌词失败:', error)
    }
  }
}

// 工具方法
const formatDuration = (duration) => {
  if (!duration) return '--:--'
  const mins = Math.floor(duration / 60)
  const secs = Math.floor(duration % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getSourceName = (source) => {
  const sourceInfo = MUSIC_SOURCES.find(s => s.value === source)
  return sourceInfo ? sourceInfo.label : source.toUpperCase()
}

// 更新播放进度
const updateProgress = () => {
  if (audioPlayer) {
    currentTime.value = audioPlayer.currentTime
    duration.value = audioPlayer.duration || 0
    progressPercentage.value = duration.value ? (currentTime.value / duration.value) * 100 : 0
    
    // 更新当前歌词
    updateCurrentLyric()
  }
}

// 跳转播放位置
const seek = (event) => {
  if (audioPlayer) {
    audioPlayer.currentTime = event.target.value
    currentTime.value = audioPlayer.currentTime
  }
}

// 调节音量
const changeVolume = () => {
  if (audioPlayer) {
    audioPlayer.volume = volume.value
  }
}

// 加载专辑封面
const loadAlbumCover = async (song) => {
  if (!song.pic_id) {
    currentSongCover.value = '/default-album-cover.svg'
    return
  }
  
  try {
    const picUrl = await getMusicPic({
      source: song.source,
      id: song.pic_id,
      size: 300
    })
    
    currentSongCover.value = picUrl || '/default-album-cover.svg'
  } catch (error) {
    console.error('加载专辑封面失败:', error)
    currentSongCover.value = '/default-album-cover.svg'
  }
}

// 处理封面加载错误
const handleCoverError = () => {
  currentSongCover.value = '/default-album-cover.svg'
}

// 加载当前歌曲歌词
const loadCurrentLyrics = async () => {
  if (!currentSong.value || !currentSong.value.lyric_id) {
    currentLyrics.value = { lyric: '', tlyric: '' }
    parsedLyrics.value = []
    currentLyricIndex.value = -1
    return
  }
  
  try {
    const lyricData = await getMusicLyric({
      source: currentSong.value.source,
      id: currentSong.value.lyric_id
    })
    
    currentLyrics.value = lyricData
    
    // 解析歌词
    parsedLyrics.value = parseLyrics(lyricData.lyric)
    currentLyricIndex.value = -1
    
  } catch (error) {
    console.error('加载歌词失败:', error)
    currentLyrics.value = { lyric: '', tlyric: '' }
    parsedLyrics.value = []
    currentLyricIndex.value = -1
  }
}

// 解析歌词时间戳
const parseLyrics = (lyricText) => {
  if (!lyricText) return []
  
  const lines = lyricText.split('\n')
  const parsedLines = []
  
  for (const line of lines) {
    // 匹配时间戳格式 [mm:ss.xxx] 或 [mm:ss.xx] 或 [mm:ss]
    const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/)
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1])
      const seconds = parseInt(timeMatch[2])
      // 处理毫秒部分 - 支持2位或3位数
      let milliseconds = 0
      if (timeMatch[3]) {
        const msStr = timeMatch[3]
        if (msStr.length === 2) {
          milliseconds = parseInt(msStr) * 10  // 两位数毫秒，乘以10
        } else if (msStr.length === 3) {
          milliseconds = parseInt(msStr)       // 三位数毫秒，直接使用
        }
      }
      
      const text = timeMatch[4].trim()
      
      // 过滤掉作词、作曲、编曲等信息行和空行
      const isMetadata = text.includes('作词') || text.includes('作曲') || text.includes('编曲') || 
                        text.includes('制作人') || text.includes('录音') || text.includes('混音') ||
                        text.includes('母带') || text.includes('发行') || text === ''
      
      if (text && !isMetadata) { // 只添加非空且非元数据的歌词
        const time = minutes * 60 + seconds + milliseconds / 1000
        parsedLines.push({
          time,
          text,
          minutes,
          seconds: seconds + milliseconds / 1000
        })
      }
    }
  }
  
  // 按时间排序
  return parsedLines.sort((a, b) => a.time - b.time)
}

// 根据当前播放时间找到对应的歌词行
const updateCurrentLyric = () => {
  if (parsedLyrics.value.length === 0) {
    currentLyricIndex.value = -1
    return
  }
  
  const current = currentTime.value
  let index = -1
  
  for (let i = 0; i < parsedLyrics.value.length; i++) {
    if (current >= parsedLyrics.value[i].time) {
      index = i
    } else {
      break
    }
  }
  
  if (currentLyricIndex.value !== index) {
    currentLyricIndex.value = index
    
    // 滚动到当前歌词
    if (index >= 0) {
      const lyricElement = document.querySelector(`[data-lyric-index="${index}"]`)
      if (lyricElement) {
        lyricElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }
  }
}

// 格式化歌词时间显示
const formatLyricTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 点击歌词跳转到对应时间
const seekToLyric = (time) => {
  if (audioPlayer) {
    audioPlayer.currentTime = time
    currentTime.value = time
    updateCurrentLyric()
  }
}

// 组件挂载时的初始化
onMounted(() => {
  // 设置定时器更新进度 - 提高频率以获得更好的歌词同步
  const progressInterval = setInterval(() => {
    if (audioPlayer && !audioPlayer.paused) {
      updateProgress()
    }
  }, 200) // 从1000ms改为200ms，提高歌词同步精度
  
  // 页面卸载时清理音频
  window.addEventListener('beforeunload', () => {
    if (audioPlayer) {
      audioPlayer.pause()
      audioPlayer = null
    }
    clearInterval(progressInterval)
  })
})
</script>

<style scoped>
/* 全局样式变量 */
:root {
  --primary-color: #1976d2;
  --primary-hover: #1565c0;
  --secondary-color: #f44336;
  --background-color: #f5f5f5;
  --card-background: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --shadow: 0 2px 8px rgba(0,0,0,0.1);
  --border-radius: 8px;
  --animation-duration: 0.3s;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 头部样式 */
.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 2rem 0;
  text-align: center;
  color: white;
}

.logo {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

/* 搜索区域 */
.search-section {
  padding: 3rem 0;
}

.search-box {
  display: flex;
  gap: 1rem;
  background: white;
  padding: 1rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  max-width: 800px;
  margin: 0 auto;
}

.search-input-container {
  flex: 1;
  display: flex;
  position: relative;
  background: #f8f9fa;
  border-radius: 4px;
  overflow: hidden;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  padding: 0.75rem;
  background: transparent;
}

.search-icon-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: color 0.3s;
}

.search-icon-btn:hover {
  color: #1976d2;
}

.source-select {
  border: none;
  outline: none;
  padding: 0.75rem;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
}

.search-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.search-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 主要内容区域 */
.main-content {
  display: flex;
  gap: 2rem;
  height: calc(100vh - 300px);
  overflow: hidden;
}

/* 左侧歌曲列表 */
.left-panel {
  flex: 1;
  background: white;
  border-radius: var(--border-radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.list-header h2 {
  color: var(--text-primary);
  font-size: 1.5rem;
  margin: 0;
}

.batch-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.batch-btn {
  background: #f8f9fa;
  color: var(--text-primary);
  border: 1px solid #e0e0e0;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.batch-btn:hover {
  background: #e9ecef;
  border-color: #ced4da;
}

.batch-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.batch-btn.download-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.batch-btn.download-btn:hover:not(:disabled) {
  background: #218838;
  border-color: #1e7e34;
}

.batch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.song-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.song-item:hover {
  background: #f8f9fa;
}

.song-item.active {
  background: #e3f2fd;
  border-color: #1976d2;
}

.song-item.playing {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.song-item.selected {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  border-color: #9c27b0;
}

.song-checkbox {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.song-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.song-index {
  width: 40px;
  text-align: center;
  color: var(--text-secondary);
  font-weight: bold;
}

.song-item.playing .song-index {
  color: #1976d2;
}

.song-info {
  flex: 1;
  min-width: 0;
  margin-left: 1rem;
}

.song-title {
  font-weight: bold;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.song-artist {
  color: var(--text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-album {
  width: 200px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-duration {
  width: 60px;
  text-align: right;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.song-actions {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.song-item:hover .song-actions,
.song-item.active .song-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background: rgba(25, 118, 210, 0.1);
}

/* 右侧歌曲信息和歌词 */
.right-panel {
  width: 400px;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.song-detail {
  padding: 2rem;
  border-bottom: 1px solid #f0f0f0;
  text-align: center;
}

.album-cover-large {
  width: 200px;
  height: 200px;
  margin: 0 auto 1.5rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.album-cover-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-title-large {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  word-break: break-all;
}

.artist-large {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
}

.album-large {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.song-source {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.3rem 0.8rem;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 500;
}

.lyrics-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lyrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  background: #f8f9fa;
}

.lyrics-header h4 {
  margin: 0;
  color: var(--text-primary);
}

.refresh-lyrics-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.refresh-lyrics-btn:hover {
  background: rgba(25, 118, 210, 0.1);
}

.lyrics-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  font-size: 1rem;
  line-height: 1.8;
  scroll-behavior: smooth; /* 添加平滑滚动 */
}

/* 解析后的歌词样式 */
.parsed-lyrics {
  max-height: 100%;
}

.lyric-line {
  display: flex;
  align-items: center;
  justify-content: center; /* 居中显示歌词 */
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.6;
  text-align: center;
}

.lyric-line:hover {
  background: rgba(25, 118, 210, 0.1);
  opacity: 1;
}

.lyric-line.current {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  opacity: 1;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
  font-weight: 600;
  color: #1976d2;
}

.lyric-line.passed {
  opacity: 0.4;
}

.lyric-line.upcoming {
  opacity: 0.7;
}

.lyric-text {
  flex: 1;
  font-size: 1.1rem; /* 增大字体 */
  line-height: 1.6;
  text-align: center;
}

/* 静态歌词样式 */
.original-lyrics {
  max-height: 100%;
}

.lyric-line-static {
  padding: 0.5rem 1rem;
  margin-bottom: 0.3rem;
  border-radius: 6px;
  font-size: 1rem;
  line-height: 1.6;
  text-align: center;
  color: var(--text-primary);
  opacity: 0.8;
  transition: opacity 0.2s;
}

.lyric-line-static:hover {
  opacity: 1;
  background: rgba(25, 118, 210, 0.05);
}

/* 过滤掉空行 */
.lyric-line-static:empty {
  display: none;
}

.lyric-text pre,
.lyric-translation pre {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 1rem;
  margin: 0;
  line-height: 1.8;
  color: var(--text-primary);
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #1976d2;
}

.lyric-translation {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.lyric-translation h5 {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.no-lyrics {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.load-lyrics-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.load-lyrics-btn:hover {
  background: var(--primary-hover);
}

/* 底部播放器 */
.bottom-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  z-index: 100;
  padding: 1rem 2rem;
}

.player-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.player-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 300px;
}

.player-album-cover {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.player-album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-song-info {
  flex: 1;
  min-width: 0;
}

.player-song-title {
  font-weight: bold;
  color: var(--text-primary);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.player-artist {
  color: var(--text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(25, 118, 210, 0.1);
  color: var(--primary-color);
}

.play-btn {
  background: var(--primary-color);
  color: white;
  font-size: 1rem;
  width: 40px;
  height: 40px;
}

.play-btn:hover {
  background: var(--primary-hover);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 500px;
}

.time {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: center;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}

.progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--primary-color);
  border-radius: 2px;
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

.player-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 200px;
  justify-content: flex-end;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-icon {
  font-size: 1rem;
  color: var(--text-secondary);
}

.volume-slider {
  width: 80px;
  cursor: pointer;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.page-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: var(--text-secondary);
  font-weight: bold;
}

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  background: white;
  padding: 4rem 0;
  text-align: center;
  color: var(--text-secondary);
}

.empty-state h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    height: auto;
  }
  
  .right-panel {
    width: 100%;
    order: -1;
  }
  
  .album-cover-large {
    width: 150px;
    height: 150px;
  }
  
  .player-content {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .player-left,
  .player-right {
    width: 100%;
  }
  
  .player-right {
    justify-content: center;
  }
  
  .search-box {
    flex-direction: column;
  }
  
  .logo {
    font-size: 2rem;
  }
  
  .container {
    padding: 0 15px;
  }
  
  .song-album {
    display: none;
  }
  
  .song-duration {
    width: 50px;
  }
  
  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.8rem;
  }
  
  .batch-controls {
    justify-content: center;
  }
  
  .batch-btn {
    flex: 1;
    min-width: 80px;
  }
}
</style>
