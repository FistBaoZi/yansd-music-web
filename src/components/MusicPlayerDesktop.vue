<template>
  <div class="music-player-desktop">
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

<script>
import { useMusicPlayer } from '../composables/useMusicPlayer.js'

export default {
  name: 'MusicPlayerDesktop',
  setup() {
    return useMusicPlayer()
  }
}
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

.music-player-desktop {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
  color: white;
  overflow: hidden;
}

/* 隐藏所有滚动条轨道 */
* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

*::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
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
  height: 80vh;
}

.current-song {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 300px;
  position: relative;
}

.lyrics-content {
  flex: 1;
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
</style>
