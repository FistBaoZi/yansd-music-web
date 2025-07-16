import { ref, onMounted, nextTick } from 'vue'
import { searchMusic as apiSearchMusic, getMusicUrl, getMusicPic, getMusicLyric, MUSIC_SOURCES } from '../api/music.js'
import axios from 'axios'

export function useMusicPlayer() {
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
  const downloadProgress = ref('')
  const currentView = ref('search')
  const playHistory = ref([])
  const isLoadingMore = ref(false)
  const hasMoreData = ref(true)

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

  return {
    // 数据
    searchKeyword,
    selectedSource,
    searchResults,
    currentSong,
    isPlaying,
    loading,
    hasSearched,
    currentPage,
    totalPages,
    pageSize,
    downloadProgress,
    currentView,
    playHistory,
    isLoadingMore,
    hasMoreData,
    selectedSongs,
    isSelectMode,
    batchDownloadProgress,
    isAllSelected,
    currentTime,
    duration,
    volume,
    progressPercentage,
    currentSongCover,
    currentLyrics,
    parsedLyrics,
    currentLyricIndex,

    // 方法
    searchMusic,
    loadMoreMusic,
    handleScroll,
    playSong,
    togglePlayPause,
    playNext,
    playPrevious,
    downloadSong,
    handleSongClick,
    toggleSongSelection,
    toggleSelectAll,
    clearSelection,
    downloadSelectedSongs,
    formatDuration,
    formatTime,
    getSourceName,
    addToPlayHistory,
    removeFromHistory,
    clearPlayHistory,
    formatPlayTime,
    updateProgress,
    seek,
    changeVolume,
    loadAlbumCover,
    handleCoverError,
    loadCurrentLyrics,
    seekToLyric
  }
}
