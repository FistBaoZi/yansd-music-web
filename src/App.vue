<template>
  <div id="app">
    <!-- 顶部搜索栏 -->
    <header class="top-bar">
      <div class="container">
        <div class="search-container">
          <div class="search-box">
            <div class="search-input-wrapper">
              <input 
                v-model="searchKeyword" 
                @keyup.enter="searchMusic"
                placeholder="搜索歌曲、歌手或专辑..." 
                class="search-input"
              />
              <button @click="searchMusic" class="search-btn" :disabled="loading">
                <span class="search-icon">🔍</span>
              </button>
            </div>
            <div class="search-controls">
              <select v-model="selectedSource" class="source-select">
                <option value="netease">网易云</option>
                <option value="kuwo">酷我</option>
                <option value="joox">JOOX</option>
                <option value="tencent">QQ音乐</option>
                <option value="migu">咪咕</option>
              </select>
              <div class="control-tabs">
                <button 
                  class="tab-btn" 
                  :class="{ active: currentView === 'search' }"
                  @click="currentView = 'search'"
                >
                  歌曲搜索
                </button>
                <button 
                  class="tab-btn" 
                  :class="{ active: currentView === 'history' }"
                  @click="currentView = 'history'"
                >
                  播放记录
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-container" v-if="(currentView === 'search' && searchResults.length > 0) || (currentView === 'history' && playHistory.length > 0)">
      <div class="container">
        <div class="content-wrapper">
          <!-- 左侧歌曲列表 -->
          <div class="left-panel">
            <div class="panel-header">
              <div class="header-row">
                <div class="header-controls" v-if="currentView === 'search'">
                  <label class="checkbox-container">
                    <input 
                      type="checkbox" 
                      :checked="isAllSelected" 
                      @change="toggleSelectAll"
                      class="select-all-checkbox"
                    />
                    <span class="checkmark"></span>
                  </label>
                  <button 
                    v-if="selectedSongs.length > 0" 
                    @click="downloadSelectedSongs" 
                    class="batch-download-btn"
                    :disabled="loading"
                  >
                    批量下载 ({{ selectedSongs.length }})
                  </button>
                  <button 
                    v-if="selectedSongs.length > 0" 
                    @click="clearSelection" 
                    class="clear-selection-btn"
                  >
                    取消选择
                  </button>
                </div>
                <span class="header-item">{{ currentView === 'search' ? '歌曲' : '播放记录' }}</span>
                <span class="header-item">歌手</span>
                <span class="header-item">专辑</span>
                <span class="header-item" v-if="currentView === 'history'">播放时间</span>
              </div>
            </div>
            <div class="song-list" @scroll="handleScroll">
              <!-- 搜索结果列表 -->
              <div 
                v-if="currentView === 'search'"
                v-for="(song, index) in searchResults" 
                :key="song.id"
                class="song-row"
                :class="{ 'active': currentSong?.id === song.id, 'playing': isPlaying && currentSong?.id === song.id, 'selected': selectedSongs.includes(song.id) }"
                @click="handleSongClick(song)"
              >
                <div class="song-selection" @click.stop>
                  <label class="checkbox-container">
                    <input 
                      type="checkbox" 
                      :checked="selectedSongs.includes(song.id)"
                      @change="toggleSongSelection(song.id)"
                      class="song-checkbox"
                    />
                    <span class="checkmark"></span>
                  </label>
                </div>
                <div class="song-number">{{ index + 1 }}</div>
                <div class="song-info">
                  <div class="song-title">{{ song.name }}</div>
                  <div class="song-artist">{{ Array.isArray(song.artist) ? song.artist.join(', ') : song.artist }}</div>
                </div>
                <div class="song-album">{{ song.album }}</div>
                <div class="song-actions">
                  <button @click.stop="playSong(song)" class="action-btn">
                    {{ isPlaying && currentSong?.id === song.id ? '⏸️' : '▶️' }}
                  </button>
                  <button @click.stop="downloadSong(song)" class="action-btn">📥</button>
                </div>
              </div>
              
              <!-- 加载更多提示 -->
              <div v-if="currentView === 'search' && searchResults.length > 0" class="load-more-container">
                <div v-if="isLoadingMore" class="loading-more">
                  <div class="loading-spinner"></div>
                  <span>加载更多中...</span>
                </div>
                <div v-else-if="!hasMoreData" class="no-more-data">
                  <span>已加载全部结果</span>
                </div>
                <div v-else-if="hasMoreData" class="load-more-hint">
                  <span>向下滚动加载更多</span>
                </div>
              </div>
              
              <!-- 播放历史列表 -->
              <div 
                v-if="currentView === 'history'"
                v-for="(historyItem, index) in playHistory" 
                :key="`${historyItem.song.id}-${historyItem.playTime}`"
                class="song-row"
                :class="{ 'active': currentSong?.id === historyItem.song.id, 'playing': isPlaying && currentSong?.id === historyItem.song.id }"
                @click="handleSongClick(historyItem.song)"
              >
                <div class="song-number">{{ index + 1 }}</div>
                <div class="song-info">
                  <div class="song-title">{{ historyItem.song.name }}</div>
                  <div class="song-artist">{{ Array.isArray(historyItem.song.artist) ? historyItem.song.artist.join(', ') : historyItem.song.artist }}</div>
                </div>
                <div class="song-album">{{ historyItem.song.album }}</div>
                <div class="play-time">{{ formatPlayTime(historyItem.playTime) }}</div>
                <div class="song-actions">
                  <button @click.stop="playSong(historyItem.song)" class="action-btn">
                    {{ isPlaying && currentSong?.id === historyItem.song.id ? '⏸️' : '▶️' }}
                  </button>
                  <button @click.stop="downloadSong(historyItem.song)" class="action-btn">📥</button>
                  <button @click.stop="removeFromHistory(index)" class="action-btn" title="从历史记录中移除">🗑️</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧歌曲信息和歌词 -->
          <div class="right-panel">
            <div class="current-song" v-if="currentSong">
              <div class="album-artwork">
                <img :src="currentSongCover" :alt="currentSong.album" @error="handleCoverError" />
              </div>
              <div class="song-meta">
                <div class="song-details">
                  <h3 class="current-title">{{ currentSong.name }}</h3>
                  <p class="current-artist">{{ Array.isArray(currentSong.artist) ? currentSong.artist.join(', ') : currentSong.artist }}</p>
                  <p class="current-album">{{ currentSong.album }}</p>
                </div>
              </div>
            </div>
            
            <div class="lyrics-panel" v-if="currentSong">
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
                <div v-else-if="currentLyrics.lyric" class="static-lyrics">
                  <div 
                    v-for="(line, index) in currentLyrics.lyric.split('\n')" 
                    :key="index"
                    class="lyric-line-static"
                  >
                    {{ line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim() }}
                  </div>
                </div>
                <div v-else class="no-lyrics">
                  <p>暂无歌词</p>
                  <button @click="loadCurrentLyrics" class="load-lyrics-btn">加载歌词</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部播放器 -->
    <footer class="player-bar" v-if="currentSong">
      <div class="container">
        <div class="player-content">
          <div class="player-info">
            <div class="current-track">
              <span class="track-title">{{ currentSong.name }}</span>
              <span class="track-time">{{ formatTime(currentTime) }}</span>
              <span class="track-duration">{{ formatTime(duration) }}</span>
            </div>
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
          </div>
          <div class="player-controls">
            <button @click="playPrevious" class="control-btn">⏮</button>
            <button @click="togglePlayPause" class="control-btn play-btn">
              {{ isPlaying ? '⏸' : '▶' }}
            </button>
            <button @click="playNext" class="control-btn">⏭</button>
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
          </div>
        </div>
      </div>
    </footer>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p v-if="batchDownloadProgress">{{ batchDownloadProgress }}</p>
      <p v-else-if="downloadProgress">{{ downloadProgress }}</p>
      <p v-else>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && currentView === 'search' && searchResults.length === 0 && hasSearched" class="empty-state">
      <div class="container">
        <h3>未找到相关音乐</h3>
        <p>请尝试其他关键词或音乐源</p>
      </div>
    </div>
    
    <!-- 播放历史为空状态 -->
    <div v-if="!loading && currentView === 'history' && playHistory.length === 0" class="empty-state">
      <div class="container">
        <h3>暂无播放记录</h3>
        <p>开始播放音乐后，这里会显示你的播放历史</p>
      </div>
    </div>
    
    <!-- 默认状态 -->
    <div v-if="!loading && currentView === 'search' && !hasSearched" class="empty-state">
      <div class="container">
        <h3>欢迎使用音乐搜索</h3>
        <p>在上方搜索框中输入歌曲、歌手或专辑名称开始搜索</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
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
const pageSize = ref(50)
const downloadProgress = ref('') // 添加下载进度提示
const currentView = ref('search') // 当前视图：'search' 或 'history'
const playHistory = ref([]) // 播放历史记录
const isLoadingMore = ref(false) // 是否正在加载更多
const hasMoreData = ref(true) // 是否还有更多数据

// 批量下载相关数据
const selectedSongs = ref([])
const isSelectMode = ref(false)
const batchDownloadProgress = ref('')
const isAllSelected = ref(false)

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
  
  // 清空之前的选择
  selectedSongs.value = []
  isAllSelected.value = false
  
  loading.value = true
  hasSearched.value = true
  currentPage.value = 1
  hasMoreData.value = true
  
  try {
    const results = await apiSearchMusic({
      source: selectedSource.value,
      keyword: searchKeyword.value,
      count: pageSize.value,
      page: currentPage.value
    })
    
    searchResults.value = results || []
    totalPages.value = Math.ceil(searchResults.value.length / pageSize.value)
    
    // 如果返回的结果少于请求的数量，说明没有更多数据了
    if (!results || results.length < pageSize.value) {
      hasMoreData.value = false
    }
  } catch (error) {
    console.error('搜索失败:', error)
    searchResults.value = []
    hasMoreData.value = false
  } finally {
    loading.value = false
  }
}

// 加载更多音乐
const loadMoreMusic = async () => {
  if (isLoadingMore.value || !hasMoreData.value || !searchKeyword.value.trim()) return
  
  isLoadingMore.value = true
  currentPage.value += 1
  
  try {
    const results = await apiSearchMusic({
      source: selectedSource.value,
      keyword: searchKeyword.value,
      count: pageSize.value,
      page: currentPage.value
    })
    
    if (results && results.length > 0) {
      // 将新结果添加到现有结果中
      searchResults.value = [...searchResults.value, ...results]
      
      // 更新全选状态
      isAllSelected.value = selectedSongs.value.length === searchResults.value.length && searchResults.value.length > 0
      
      // 如果返回的结果少于请求的数量，说明没有更多数据了
      if (results.length < pageSize.value) {
        hasMoreData.value = false
      }
    } else {
      hasMoreData.value = false
    }
  } catch (error) {
    console.error('加载更多失败:', error)
    currentPage.value -= 1 // 回退页码
  } finally {
    isLoadingMore.value = false
  }
}

// 处理滚动事件
const handleScroll = (event) => {
  if (currentView.value !== 'search') return
  
  const { scrollTop, scrollHeight, clientHeight } = event.target
  
  // 当滚动到距离底部50px时开始加载更多
  if (scrollHeight - scrollTop - clientHeight < 50 && hasMoreData.value && !isLoadingMore.value) {
    loadMoreMusic()
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
    
    // 添加到播放历史
    addToPlayHistory(song)
    
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
  const currentList = currentView.value === 'search' ? searchResults.value : playHistory.value.map(item => item.song)
  const currentIndex = currentList.findIndex(item => {
    const song = currentView.value === 'search' ? item : item
    return song.id === currentSong.value?.id
  })
  const nextIndex = (currentIndex + 1) % currentList.length
  if (currentList[nextIndex]) {
    const nextSong = currentView.value === 'search' ? currentList[nextIndex] : currentList[nextIndex]
    playSong(nextSong)
  }
}

// 上一首
const playPrevious = () => {
  const currentList = currentView.value === 'search' ? searchResults.value : playHistory.value.map(item => item.song)
  const currentIndex = currentList.findIndex(item => {
    const song = currentView.value === 'search' ? item : item
    return song.id === currentSong.value?.id
  })
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentList.length - 1
  if (currentList[prevIndex]) {
    const prevSong = currentView.value === 'search' ? currentList[prevIndex] : currentList[prevIndex]
    playSong(prevSong)
  }
}

// 下载歌曲
const downloadSong = async (song) => {
  try {
    loading.value = true
    downloadProgress.value = '正在准备下载...'
    
    // 生成文件名
    const artistName = Array.isArray(song.artist) ? song.artist.join(', ') : song.artist
    const fileName = `${song.name} - ${artistName}`.replace(/[<>:"/\\|?*]/g, '_')
    
    downloadProgress.value = '正在获取最高品质音频链接...'
    
    // 下载音频文件 - 尝试最高品质
    const qualities = [999, 740, 320, 192, 128]
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
          break
        }
      } catch (error) {
        console.warn(`${quality}kbps 品质获取失败，尝试下一个品质`)
      }
    }
    
    if (musicUrl) {
      downloadProgress.value = `正在下载音频文件 (${selectedQuality}kbps)...`
      
      try {
        const audioResponse = await axios({
          method: 'get',
          url: musicUrl,
          responseType: 'blob'
        })
        
        const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const audioLink = document.createElement('a')
        audioLink.href = audioUrl
        audioLink.download = `${fileName}.mp3`
        audioLink.style.display = 'none'
        document.body.appendChild(audioLink)
        audioLink.click()
        document.body.removeChild(audioLink)
        
        URL.revokeObjectURL(audioUrl)
      } catch (error) {
        console.error('音频文件下载失败:', error)
        downloadProgress.value = ''
        alert('音频文件下载失败，请稍后重试')
        return
      }
    } else {
      downloadProgress.value = ''
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
          
          lyricContent += `歌曲: ${song.name}\n`
          lyricContent += `歌手: ${artistName}\n`
          lyricContent += `专辑: ${song.album || '未知专辑'}\n`
          lyricContent += `来源: ${getSourceName(song.source)}\n`
          lyricContent += `音质: ${selectedQuality}kbps\n`
          lyricContent += `下载时间: ${new Date().toLocaleString('zh-CN')}\n`
          lyricContent += '\n' + '='.repeat(50) + '\n\n'
          
          if (lyricData.lyric) {
            lyricContent += '【原文歌词】\n\n'
            lyricContent += lyricData.lyric
            lyricContent += '\n\n'
          }
          
          if (lyricData.tlyric) {
            lyricContent += '【翻译歌词】\n\n'
            lyricContent += lyricData.tlyric
            lyricContent += '\n'
          }
          
          const lyricBlob = new Blob([lyricContent], { type: 'text/plain;charset=utf-8' })
          const lyricUrl = URL.createObjectURL(lyricBlob)
          
          const lyricLink = document.createElement('a')
          lyricLink.href = lyricUrl
          lyricLink.download = `${fileName}.lrc`
          lyricLink.style.display = 'none'
          document.body.appendChild(lyricLink)
          lyricLink.click()
          document.body.removeChild(lyricLink)
          
          URL.revokeObjectURL(lyricUrl)
        }
      } catch (error) {
        console.error('下载歌词失败:', error)
      }
    }
    
    downloadProgress.value = '下载完成！'
    
    setTimeout(() => {
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

// 处理歌曲点击
const handleSongClick = (song) => {
  playSong(song)
}

// 批量选择相关功能
const toggleSongSelection = (songId) => {
  const index = selectedSongs.value.indexOf(songId)
  if (index > -1) {
    selectedSongs.value.splice(index, 1)
  } else {
    selectedSongs.value.push(songId)
  }
  
  // 更新全选状态
  isAllSelected.value = selectedSongs.value.length === searchResults.value.length && searchResults.value.length > 0
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedSongs.value = []
    isAllSelected.value = false
  } else {
    selectedSongs.value = searchResults.value.map(song => song.id)
    isAllSelected.value = true
  }
}

const clearSelection = () => {
  selectedSongs.value = []
  isAllSelected.value = false
}

// 批量下载歌曲
const downloadSelectedSongs = async () => {
  if (selectedSongs.value.length === 0) return
  
  const selectedSongList = searchResults.value.filter(song => selectedSongs.value.includes(song.id))
  
  try {
    loading.value = true
    batchDownloadProgress.value = `准备批量下载 ${selectedSongList.length} 首歌曲...`
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < selectedSongList.length; i++) {
      const song = selectedSongList[i]
      batchDownloadProgress.value = `正在下载第 ${i + 1}/${selectedSongList.length} 首: ${song.name}`
      
      try {
        await downloadSingleSong(song)
        successCount++
      } catch (error) {
        console.error(`下载 ${song.name} 失败:`, error)
        failCount++
      }
      
      // 添加短暂延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    batchDownloadProgress.value = `批量下载完成！成功 ${successCount} 首，失败 ${failCount} 首`
    
    // 下载完成后清空选择
    setTimeout(() => {
      clearSelection()
      batchDownloadProgress.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('批量下载失败:', error)
    batchDownloadProgress.value = '批量下载失败，请稍后重试'
    setTimeout(() => {
      batchDownloadProgress.value = ''
    }, 3000)
  } finally {
    loading.value = false
  }
}

// 单首歌曲下载（用于批量下载）
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
  
  if (musicUrl) {
    try {
      const audioResponse = await axios({
        method: 'get',
        url: musicUrl,
        responseType: 'blob'
      })
      
      const audioBlob = new Blob([audioResponse.data], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audioLink = document.createElement('a')
      audioLink.href = audioUrl
      audioLink.download = `${fileName}.mp3`
      audioLink.style.display = 'none'
      document.body.appendChild(audioLink)
      audioLink.click()
      document.body.removeChild(audioLink)
      
      URL.revokeObjectURL(audioUrl)
    } catch (error) {
      throw new Error('音频文件下载失败')
    }
  } else {
    throw new Error('无法获取音频下载链接')
  }
  
  // 下载歌词文件（可选）
  if (song.lyric_id) {
    try {
      const lyricData = await getMusicLyric({
        source: song.source,
        id: song.lyric_id
      })
      
      if (lyricData.lyric || lyricData.tlyric) {
        let lyricContent = ''
        
        lyricContent += `歌曲: ${song.name}\n`
        lyricContent += `歌手: ${artistName}\n`
        lyricContent += `专辑: ${song.album || '未知专辑'}\n`
        lyricContent += `来源: ${getSourceName(song.source)}\n`
        lyricContent += `音质: ${selectedQuality}kbps\n`
        lyricContent += `下载时间: ${new Date().toLocaleString('zh-CN')}\n`
        lyricContent += '\n' + '='.repeat(50) + '\n\n'
        
        if (lyricData.lyric) {
          lyricContent += '【原文歌词】\n\n'
          lyricContent += lyricData.lyric
          lyricContent += '\n\n'
        }
        
        if (lyricData.tlyric) {
          lyricContent += '【翻译歌词】\n\n'
          lyricContent += lyricData.tlyric
          lyricContent += '\n'
        }
        
        const lyricBlob = new Blob([lyricContent], { type: 'text/plain;charset=utf-8' })
        const lyricUrl = URL.createObjectURL(lyricBlob)
        
        const lyricLink = document.createElement('a')
        lyricLink.href = lyricUrl
        lyricLink.download = `${fileName}.lrc`
        lyricLink.style.display = 'none'
        document.body.appendChild(lyricLink)
        lyricLink.click()
        document.body.removeChild(lyricLink)
        
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

// 添加到播放历史
const addToPlayHistory = (song) => {
  const historyItem = {
    song: { ...song },
    playTime: new Date().toISOString()
  }
  
  // 检查是否已经存在相同歌曲，如果存在则移除旧记录
  const existingIndex = playHistory.value.findIndex(item => item.song.id === song.id)
  if (existingIndex !== -1) {
    playHistory.value.splice(existingIndex, 1)
  }
  
  // 将新记录添加到开头
  playHistory.value.unshift(historyItem)
  
  // 限制历史记录数量为50条
  if (playHistory.value.length > 50) {
    playHistory.value = playHistory.value.slice(0, 50)
  }
  
  // 保存到本地存储
  savePlayHistoryToLocal()
}

// 从播放历史中移除
const removeFromHistory = (index) => {
  playHistory.value.splice(index, 1)
  savePlayHistoryToLocal()
}

// 清空播放历史
const clearPlayHistory = () => {
  playHistory.value = []
  savePlayHistoryToLocal()
}

// 保存播放历史到本地存储
const savePlayHistoryToLocal = () => {
  try {
    localStorage.setItem('music-play-history', JSON.stringify(playHistory.value))
  } catch (error) {
    console.error('保存播放历史失败:', error)
  }
}

// 从本地存储加载播放历史
const loadPlayHistoryFromLocal = () => {
  try {
    const saved = localStorage.getItem('music-play-history')
    if (saved) {
      playHistory.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载播放历史失败:', error)
    playHistory.value = []
  }
}

// 格式化播放时间
const formatPlayTime = (timeStr) => {
  const date = new Date(timeStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
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
      size: 500
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
    return
  }
  
  try {
    const lyricData = await getMusicLyric({
      source: currentSong.value.source,
      id: currentSong.value.lyric_id
    })
    
    currentLyrics.value = {
      lyric: lyricData.lyric || '',
      tlyric: lyricData.tlyric || ''
    }
    
    // 解析歌词时间戳
    if (lyricData.lyric) {
      parsedLyrics.value = parseLyrics(lyricData.lyric)
    }
    
  } catch (error) {
    console.error('加载歌词失败:', error)
    currentLyrics.value = { lyric: '', tlyric: '' }
    parsedLyrics.value = []
  }
}

// 解析歌词时间戳
const parseLyrics = (lyricText) => {
  if (!lyricText) return []
  
  const lines = lyricText.split('\n')
  const parsedLines = []
  
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/)
    if (match) {
      const minutes = parseInt(match[1])
      const seconds = parseInt(match[2])
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0
      const text = match[4].trim()
      
      if (text) {
        parsedLines.push({
          time: minutes * 60 + seconds + milliseconds / 1000,
          text,
          minutes,
          seconds: seconds + milliseconds / 1000
        })
      }
    }
  }
  
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
    scrollToCurrentLyric()
  }
}

// 独立的滚动函数
const scrollToCurrentLyric = () => {
  if (currentLyricIndex.value < 0) return
  
  // 等待下一个事件循环，确保DOM已更新
  nextTick(() => {
    const lyricsContainer = document.querySelector('.lyrics-content')
    const currentLyricElement = document.querySelector(`.lyric-line:nth-child(${currentLyricIndex.value + 1})`)
    
    if (currentLyricElement && lyricsContainer) {
      // 获取元素相对于容器的位置
      const elementTop = currentLyricElement.offsetTop
      const containerHeight = lyricsContainer.clientHeight
      
      // 计算滚动位置，让当前歌词显示在容器中央
      const scrollTop = elementTop - (containerHeight / 2)
      
      // 直接设置容器的scrollTop
      lyricsContainer.scrollTop = Math.max(0, scrollTop)
      
      console.log('歌词滚动到:', {
        index: currentLyricIndex.value,
        text: parsedLyrics.value[currentLyricIndex.value]?.text,
        elementTop,
        scrollTop: lyricsContainer.scrollTop
      })
    }
  })
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
  // 加载播放历史
  loadPlayHistoryFromLocal()
  
  // 设置定时器更新进度
  const progressInterval = setInterval(() => {
    if (audioPlayer && !audioPlayer.paused) {
      updateProgress()
    }
  }, 200)
  
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
  --panel-background: rgba(255, 255, 255, 0.1);
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  --border-color: rgba(255, 255, 255, 0.2);
  --hover-color: rgba(255, 255, 255, 0.1);
  --active-color: rgba(255, 255, 255, 0.2);
  --shadow: 0 2px 8px rgba(0,0,0,0.1);
  --border-radius: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 隐藏所有滚动条轨道 */
* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

*::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

#app {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
  color: white;
  overflow: hidden;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 顶部搜索栏 */
.top-bar {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  height: 80px;
  display: flex;
  align-items: center;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius);
  padding: 0.5rem;
  flex: 1;
  max-width: 400px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: white;
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.source-select {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  outline: none;
}

.source-select:focus {
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.3);
}

.source-select option {
  background: #2c3e50 !important;
  color: white !important;
  padding: 0.5rem;
  border: none;
}

.source-select option:hover {
  background: var(--primary-color) !important;
  color: white !important;
}

.source-select option:checked,
.source-select option:selected {
  background: var(--primary-color) !important;
  color: white !important;
}

.control-tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: var(--hover-color);
  color: white;
}

.tab-btn.active {
  background: var(--active-color);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

/* 主要内容区域 */
.main-container {
  height: calc(100vh - 160px);
  overflow: hidden;
  padding: 1rem 0;
}

.content-wrapper {
  display: flex;
  gap: 2rem;
  height: 100%;
  padding: 0 2rem;
}

/* 左侧歌曲列表 */
.left-panel {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius);
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  height: 80vh;
}

.panel-header {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
}

.header-row {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-right: 2rem;
}

.batch-download-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.batch-download-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.batch-download-btn:disabled {
  background: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.clear-selection-btn {
  background: var(--secondary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.clear-selection-btn:hover {
  background: #d32f2f;
}

/* 复选框样式 */
.checkbox-container {
  position: relative;
  display: inline-block;
  cursor: pointer;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 3px;
  transition: all 0.3s ease;
}

.checkbox-container:hover .checkmark {
  background: rgba(255, 255, 255, 0.3);
  border-color: var(--primary-color);
}

.checkbox-container input:checked ~ .checkmark {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-container input:checked ~ .checkmark:after {
  display: block;
}

.select-all-checkbox {
  margin-right: 0.5rem;
}

.song-checkbox {
  margin-right: 0.5rem;
}

.header-item {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 500;
}

.song-list {
  overflow-y: auto;
  height: calc(100% - 60px);
  padding: 1rem 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.song-list::-webkit-scrollbar {
  display: none;
}

.song-row {
  display: flex;
  align-items: center;
  padding: 0.75rem 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.song-row:hover {
  background: var(--hover-color);
}

.song-row.active {
  background: var(--active-color);
}

.song-row.playing {
  background: linear-gradient(90deg, var(--active-color), rgba(25, 118, 210, 0.15));
  color: var(--primary-color);
}

.song-row.selected {
  background: rgba(25, 118, 210, 0.1);
  border-left: 3px solid var(--primary-color);
}

.song-selection {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-number {
  width: 40px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.song-info {
  flex: 1;
  min-width: 0;
  margin-left: 1rem;
}

.song-title {
  color: white;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.song-artist {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-album {
  width: 200px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.play-time {
  width: 120px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-actions {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.song-row:hover .song-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}

/* 加载更多相关样式 */
.load-more-container {
  padding: 1rem 2rem;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.no-more-data {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

.load-more-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
}

/* 右侧面板 */
.right-panel {
  width: 400px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius);
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 80vh /* 固定高度 */
}

.current-song {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; /* 防止压缩 */
}

.album-artwork {
  width: 150px;
  height: 150px;
  margin: 0 auto 1rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.album-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-details {
  text-align: center;
}

.current-title {
  color: white;
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  word-break: break-all;
}

.current-artist {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  margin-bottom: 0.3rem;
}

.current-album {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
}

/* 歌词面板 */
.lyrics-panel {
  flex: 1; /* 占用剩余空间 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 300px; /* 最小高度 */
  position: relative;
}

.lyrics-content {
  flex: 1; /* 占用歌词面板的全部高度 */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.lyrics-content::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.parsed-lyrics {
  min-height: 100%;
  padding-top: 40%;
  padding-bottom: 40%;
}

.lyric-line {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.6;
  text-align: center;
}

.lyric-line:hover {
  background: var(--hover-color);
  opacity: 1;
}

.lyric-line.current {
  background: var(--active-color);
  opacity: 1;
  transform: scale(1.02);
  color: var(--primary-color);
  font-weight: 600;
}

.lyric-line.passed {
  opacity: 0.4;
}

.lyric-line.upcoming {
  opacity: 0.7;
}

.lyric-text {
  flex: 1;
  font-size: 1.1rem;
  line-height: 1.6;
  text-align: center;
}

.static-lyrics {
  min-height: 100%;
  padding-top: 40%;
  padding-bottom: 40%;
}

.lyric-line-static {
  padding: 0.5rem 1rem;
  margin-bottom: 0.3rem;
  border-radius: 6px;
  font-size: 1rem;
  line-height: 1.6;
  text-align: center;
  color: white;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.lyric-line-static:hover {
  opacity: 1;
  background: var(--hover-color);
}

.lyric-line-static:empty {
  display: none;
}

.no-lyrics {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.6);
}

.load-lyrics-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  margin-top: 1rem;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.load-lyrics-btn:hover {
  background: var(--primary-hover);
}

/* 底部播放器 */
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border-top: 1px solid var(--border-color);
  padding: 1rem 0;
  z-index: 100;
  height: 80px;
  display: flex;
  align-items: center;
}

.player-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.player-info {
  flex: 1;
}

.current-track {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.track-title {
  color: white;
  font-weight: 500;
  font-size: 1rem;
}

.track-time,
.track-duration {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.progress-bar {
  position: relative;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
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
  transition: width 0.1s ease;
}

.progress-input {
  position: absolute;
  top: -8px;
  left: 0;
  width: 100%;
  height: 20px;
  opacity: 0;
  cursor: pointer;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}

.play-btn {
  background: var(--primary-color);
  color: white;
  font-size: 1rem;
  width: 44px;
  height: 44px;
}

.play-btn:hover {
  background: var(--primary-hover);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-icon {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
}

.volume-slider {
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
}

/* 加载状态 */
.loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.6);
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.empty-state h3 {
  margin-bottom: 1rem;
  color: white;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .content-wrapper {
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }
  
  .right-panel {
    width: 100%;
    height: 300px;
    min-height: 300px;
  }
  
  .control-tabs {
    display: none;
  }
  
  .main-container {
    height: calc(100vh - 160px);
    padding: 1rem 0;
  }
}

@media (max-width: 768px) {
  .search-controls {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .current-track {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .player-controls {
    gap: 0.5rem;
  }
  
  .album-artwork {
    width: 150px;
    height: 150px;
  }
  
  .top-bar {
    height: 100px;
  }
  
  .main-container {
    height: calc(100vh - 180px);
    padding: 1rem 0;
  }
  
  .content-wrapper {
    padding: 0 1rem;
  }
  
  .empty-state {
    height: calc(100vh - 100px);
  }
}
</style>
