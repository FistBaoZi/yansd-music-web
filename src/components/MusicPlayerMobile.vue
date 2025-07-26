<template>
  <div class="music-player-mobile">
    <!-- 顶部搜索栏 -->
    <header class="top-bar">
      <div class="search-container">
        <div class="search-row">
          <div class="search-input-wrapper">
            <input 
              v-model="searchKeyword" 
              @keyup.enter="searchMusic"
              placeholder="搜索歌曲、歌手..." 
              class="search-input"
            />
            <button @click="searchMusic" class="search-btn" :disabled="loading">
              <span class="search-icon">🔍</span>
            </button>
          </div>
          <select v-model="selectedSource" class="source-select">
            <option value="netease">网易云</option>
            <option value="kuwo">酷我</option>
            <option value="joox">JOOX</option>
            <option value="tencent">QQ音乐</option>
            <option value="migu">咪咕</option>
          </select>
        </div>
      </div>
    </header>

    <!-- 导航标签 -->
    <nav class="nav-tabs">
      <button 
        class="nav-tab" 
        :class="{ active: currentView === 'search' }"
        @click="currentView = 'search'"
      >
        歌曲搜索
      </button>
      <button 
        class="nav-tab" 
        :class="{ active: currentView === 'history' }"
        @click="currentView = 'history'"
      >
        播放记录
      </button>
      <button 
        class="nav-tab" 
        :class="{ active: currentView === 'player' && currentSong }"
        @click="currentView = 'player'"
        v-if="currentSong"
      >
        正在播放
      </button>
    </nav>

    <!-- 搜索视图 -->
    <main class="main-container" v-show="currentView === 'search'">
      <!-- 批量操作栏 -->
      <div class="batch-controls" v-if="searchResults.length > 0">
        <label class="select-all-label">
          <input 
            type="checkbox" 
            :checked="isAllSelected" 
            @change="toggleSelectAll"
            class="select-all-checkbox"
          />
          <span>全选</span>
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
          class="clear-btn"
        >
          取消
        </button>
      </div>

      <!-- 歌曲列表 -->
      <div class="song-list" @scroll="handleScroll" v-if="searchResults.length > 0">
        <div 
          v-for="(song, index) in searchResults" 
          :key="song.id"
          class="song-card"
          :class="{ 'playing': isPlaying && currentSong?.id === song.id, 'selected': selectedSongs.includes(song.id) }"
        >
          <div class="song-card-header">
            <label class="song-select">
              <input 
                type="checkbox" 
                :checked="selectedSongs.includes(song.id)"
                @change="toggleSongSelection(song.id)"
                class="song-checkbox"
              />
            </label>
            <div class="song-number">{{ index + 1 }}</div>
            <div class="song-actions">
              <button @click="playSong(song)" class="action-btn play-btn">
                {{ isPlaying && currentSong?.id === song.id ? '⏸️' : '▶️' }}
              </button>
              <button @click="downloadSong(song)" class="action-btn download-btn">📥</button>
            </div>
          </div>
          <div class="song-info" @click="playSong(song)">
            <div class="song-title">{{ song.name }}</div>
            <div class="song-meta">
              <span class="song-artist">{{ Array.isArray(song.artist) ? song.artist.join(', ') : song.artist }}</span>
              <span class="song-separator">•</span>
              <span class="song-album">{{ song.album }}</span>
            </div>
          </div>
        </div>
        
        <!-- 加载更多 -->
        <div class="load-more-container">
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
      </div>

      <!-- 搜索空状态 -->
      <div v-if="!loading && searchResults.length === 0 && hasSearched" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>未找到相关音乐</h3>
        <p>请尝试其他关键词或音乐源</p>
      </div>
      
      <!-- 默认状态 -->
      <div v-if="!loading && !hasSearched" class="empty-state">
        <div class="empty-icon">🎵</div>
        <h3>欢迎使用音乐搜索</h3>
        <p>在上方搜索框中输入歌曲、歌手或专辑名称开始搜索</p>
      </div>
    </main>

    <!-- 播放历史视图 -->
    <main class="main-container" v-show="currentView === 'history'">
      <div class="song-list" v-if="playHistory.length > 0">
        <div 
          v-for="(historyItem, index) in playHistory" 
          :key="`${historyItem.song.id}-${historyItem.playTime}`"
          class="song-card"
          :class="{ 'playing': isPlaying && currentSong?.id === historyItem.song.id }"
        >
          <div class="song-card-header">
            <div class="song-number">{{ index + 1 }}</div>
            <div class="play-time">{{ formatPlayTime(historyItem.playTime) }}</div>
            <div class="song-actions">
              <button @click="playSong(historyItem.song)" class="action-btn play-btn">
                {{ isPlaying && currentSong?.id === historyItem.song.id ? '⏸️' : '▶️' }}
              </button>
              <button @click="downloadSong(historyItem.song)" class="action-btn download-btn">📥</button>
              <button @click="removeFromHistory(index)" class="action-btn delete-btn">🗑️</button>
            </div>
          </div>
          <div class="song-info" @click="playSong(historyItem.song)">
            <div class="song-title">{{ historyItem.song.name }}</div>
            <div class="song-meta">
              <span class="song-artist">{{ Array.isArray(historyItem.song.artist) ? historyItem.song.artist.join(', ') : historyItem.song.artist }}</span>
              <span class="song-separator">•</span>
              <span class="song-album">{{ historyItem.song.album }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 播放历史为空状态 -->
      <div v-if="!loading && playHistory.length === 0" class="empty-state">
        <div class="empty-icon">📜</div>
        <h3>暂无播放记录</h3>
        <p>开始播放音乐后，这里会显示你的播放历史</p>
      </div>
    </main>

    <!-- 播放器视图 -->
    <main class="main-container player-view" v-show="currentView === 'player' && currentSong">
      <div class="player-container">
        <!-- 封面和歌词左右布局容器 -->
        <div class="cover-lyrics-wrapper">
          <!-- 左侧专辑封面 -->
          <div class="album-cover-section">
            <div class="album-cover-mobile">
              <img 
                :src="currentSongCover" 
                :alt="currentSong?.album || ''" 
                @error="handleCoverError" 
                :class="{ 'rotating': isPlaying }"
              />
            </div>
          </div>

          <!-- 右侧歌词区域 -->
          <div class="lyrics-section-wrapper">
            <div class="lyrics-section-mobile">
              <div class="lyrics-content-mobile">
                <div v-if="parsedLyrics.length > 0" class="parsed-lyrics-mobile">
                  <div class="lyrics-viewport">
                    <!-- 显示所有歌词，允许滚动查看 -->
                    <div 
                      v-for="(line, index) in parsedLyrics"
                      :key="index"
                      class="lyric-line-mobile"
                      :class="{ 
                        'current': index === currentLyricIndex,
                        'passed': index < currentLyricIndex,
                        'upcoming': index > currentLyricIndex
                      }"
                      @click="seekToLyric(line.time)"
                    >
                      {{ line.text }}
                    </div>
                  </div>
                </div>
                <div v-else-if="currentLyrics.lyric" class="static-lyrics-mobile">
                  <div 
                    v-for="(line, index) in currentLyrics.lyric.split('\n')" 
                    :key="index"
                    class="lyric-line-mobile"
                  >
                    {{ line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim() }}
                  </div>
                </div>
                <div v-else class="no-lyrics-mobile">
                  <p>暂无歌词</p>
                  <button @click="loadCurrentLyrics" class="load-lyrics-btn-mobile">加载歌词</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="progress-section-mobile">
          <div class="time-display-mobile">
            <span class="current-time-mobile">{{ formatTime(currentTime) }}</span>
            <span class="total-time-mobile">{{ formatTime(duration) }}</span>
          </div>
          <div class="progress-bar-mobile">
            <div class="progress-mobile" :style="{ width: progressPercentage + '%' }"></div>
            <input 
              type="range" 
              min="0" 
              :max="duration" 
              :value="currentTime"
              @input="seek"
              class="progress-input-mobile"
            />
          </div>
        </div>

        <!-- 底部播放控制 - 移除音量控制 -->
        <div class="player-controls-mobile">
          <button @click="playPrevious" class="control-btn-mobile">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="togglePlayPause" class="control-btn-mobile play-btn-mobile">
            <svg v-if="!isPlaying" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m7 4 10 6L7 16V4z" fill="currentColor"/>
            </svg>
            <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="playNext" class="control-btn-mobile">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </main>

    <!-- 底部迷你播放器 - 已移除，按照用户要求不在搜索和历史页面显示 -->

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p v-if="batchDownloadProgress">{{ batchDownloadProgress }}</p>
      <p v-else-if="downloadProgress">{{ downloadProgress }}</p>
      <p v-else>加载中...</p>
    </div>
  </div>
</template>

<script>
import { inject } from 'vue'

export default {
  name: 'MusicPlayerMobile',
  props: {
    sharedState: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    // 优先使用props传递的状态，如果没有则使用inject
    const musicPlayerState = props.sharedState || inject('musicPlayerState')
    
    if (!musicPlayerState) {
      console.error('MusicPlayerMobile: No music player state provided')
      return {}
    }
    
    return musicPlayerState
  }
}
</script>

<style scoped>
.music-player-mobile {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
  color: white;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 隐藏滚动条 */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

*::-webkit-scrollbar {
  display: none;
}

/* 顶部搜索栏 */
.top-bar {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.search-container {
  display: flex;
  flex-direction: column;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  padding: 0.75rem 1rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: white;
  font-size: 1rem;
  margin-right: 0.5rem;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.search-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.source-select {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  flex-shrink: 0;
  min-width: 100px;
}

.source-select option {
  background: #2c3e50;
  color: white;
}

/* 导航标签 */
.nav-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-tab {
  flex: 1;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  padding: 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 2px solid transparent;
}

.nav-tab.active {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border-bottom-color: #1976d2;
}

/* 主容器 */
.main-container {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 80px; /* 为迷你播放器留空间 */
}

.main-container.player-view {
  padding-bottom: 0;
  overflow: hidden; /* 播放器视图完全禁止滚动 */
  height: calc(100vh - 120px); /* 固定高度 */
}

/* 批量操作栏 */
.batch-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.select-all-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #1976d2;
}

.batch-download-btn {
  background: #1976d2;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.batch-download-btn:hover:not(:disabled) {
  background: #1565c0;
}

.batch-download-btn:disabled {
  background: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.clear-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background: #d32f2f;
}

/* 歌曲列表 */
.song-list {
  padding: 0.5rem;
}

.song-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 0.5rem;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.song-card.playing {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.2);
}

.song-card.selected {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.1);
}

.song-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem;
}

.song-select {
  display: flex;
  align-items: center;
}

.song-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #1976d2;
}

.song-number {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  min-width: 20px;
}

.song-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.play-btn {
  background: #1976d2;
  color: white;
}

.play-btn:hover {
  background: #1565c0;
}

.song-info {
  padding: 0 1rem 1rem;
  cursor: pointer;
}

.song-title {
  color: white;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.song-meta {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}

.song-artist {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-separator {
  margin: 0 0.5rem;
  opacity: 0.5;
}

.song-album {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.play-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
}

/* 播放器视图 */
.player-container {
  padding: 0.5rem 1rem 7rem;
  text-align: center;
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 0.8rem;
  position: relative;
  box-sizing: border-box;
}

.album-cover {
  position: relative;
  width: 250px;
  height: 250px;
  margin: 0 auto 2rem;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-details {
  margin-bottom: 2rem;
}

.song-details .song-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.song-details .song-artist {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.25rem;
}

.song-details .song-album {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
}

/* 进度条 */
.progress-section {
  margin-bottom: 2rem;
}

.time-display {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.progress-bar {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.progress {
  height: 100%;
  background: #1976d2;
  border-radius: 3px;
  transition: width 0.1s ease;
}

.progress-input {
  position: absolute;
  top: -10px;
  left: 0;
  width: 100%;
  height: 26px;
  opacity: 0;
  cursor: pointer;
}

/* 播放控制 */
.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.player-controls .play-btn {
  width: 60px;
  height: 60px;
  font-size: 1.4rem;
  background: #1976d2;
  color: white;
}

.player-controls .play-btn:hover {
  background: #1565c0;
}

/* 音量控制 */
.volume-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.volume-icon {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
}

.volume-slider {
  width: 120px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #1976d2;
  border-radius: 50%;
  cursor: pointer;
}

/* 歌词部分 */
.lyrics-section {
  text-align: left;
}

.lyrics-title {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
}

.lyrics-content {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
}

.lyric-line {
  padding: 0.5rem 0;
  line-height: 1.6;
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 0.25rem;
  transition: all 0.3s ease;
  opacity: 0.7;
}

.lyric-line:hover {
  background: rgba(255, 255, 255, 0.1);
  opacity: 1;
}

.lyric-line.current {
  background: rgba(25, 118, 210, 0.2);
  color: #1976d2;
  opacity: 1;
  font-weight: 500;
}

.lyric-line.passed {
  opacity: 0.5;
}

.no-lyrics {
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
}

.load-lyrics-btn {
  background: #1976d2;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.load-lyrics-btn:hover {
  background: #1565c0;
}

/* 迷你播放器 */
.mini-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 100;
  color: #333;
}

.mini-progress {
  height: 2px;
  background: #1976d2;
  transition: width 0.1s ease;
}

.mini-player-content {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.mini-cover {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.mini-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-info {
  flex: 1;
  min-width: 0;
}

.mini-title {
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.mini-artist {
  color: #666;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-controls {
  display: flex;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.mini-play-btn,
.mini-next-btn {
  background: none;
  border: none;
  color: #333;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.mini-play-btn:hover,
.mini-next-btn:hover {
  background: rgba(0,0,0,0.1);
}

/* 加载更多 */
.load-more-container {
  padding: 1rem;
  text-align: center;
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
  border-top: 2px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.no-more-data,
.load-more-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
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
  background: rgba(0,0,0,0.5);
  padding: 2rem;
  border-radius: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 3D歌词动画效果 */
@keyframes glow {
  0%, 100% { 
    text-shadow: 
      0 2px 6px rgba(0,0,0,0.4),
      0 0 15px rgba(25, 118, 210, 0.3);
  }
  50% { 
    text-shadow: 
      0 2px 8px rgba(0,0,0,0.6),
      0 0 20px rgba(25, 118, 210, 0.5),
      0 0 25px rgba(25, 118, 210, 0.2);
  }
}

/* 响应式适配 - 针对不同屏幕尺寸 */
@media screen and (max-width: 360px) {
  .cover-lyrics-wrapper {
    gap: 0.5rem;
    padding: 0.3rem 0;
  }
  
  .album-cover-section {
    width: 100px;
    min-width: 100px;
    max-width: 100px;
  }
  
  .album-cover-mobile {
    width: 90px;
    height: 90px;
  }
  
  .lyrics-content-mobile {
    padding: 0.8rem 0.4rem;
    transform: rotateY(-2deg) rotateX(0.5deg);
  }
  
  .lyric-line-mobile {
    font-size: 0.75rem;
    padding: 0.4rem 0.2rem;
  }
  
  .lyric-line-mobile.current {
    font-size: 0.9rem;
  }
}

@media screen and (min-width: 361px) and (max-width: 414px) {
  .cover-lyrics-wrapper {
    gap: 0.8rem;
  }
  
  .album-cover-section {
    width: 120px;
    min-width: 120px;
    max-width: 120px;
  }
  
  .album-cover-mobile {
    width: 105px;
    height: 105px;
  }
}

@media screen and (min-width: 415px) {
  .cover-lyrics-wrapper {
    gap: 1.2rem;
  }
  
  .album-cover-section {
    width: 140px;
    min-width: 140px;
    max-width: 140px;
  }
  
  .album-cover-mobile {
    width: 120px;
    height: 120px;
  }
  
  .lyric-line-mobile {
    font-size: 0.85rem;
  }
  
  .lyric-line-mobile.current {
    font-size: 1.05rem;
  }
}

/* 针对特定设备的兼容性修复 */
@media screen and (device-width: 375px) and (device-height: 812px) {
  /* iPhone X/XS 适配 */
  .cover-lyrics-wrapper {
    padding: 0.4rem 0;
  }
}

@media screen and (device-width: 414px) and (device-height: 896px) {
  /* iPhone XR/11 适配 */
  .album-cover-mobile {
    width: 115px;
    height: 115px;
  }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin-bottom: 1rem;
  color: white;
  font-size: 1.2rem;
}

.empty-state p {
  font-size: 0.9rem;
  line-height: 1.5;
}

/* 移动端播放器优化样式 */
/* 封面和歌词的左右布局容器 */
.cover-lyrics-wrapper {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0.5rem 0;
  box-sizing: border-box;
}

/* 左侧封面区域 */
.album-cover-section {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 130px;
  min-width: 130px;
  max-width: 130px;
}

.album-cover-mobile {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 
    0 8px 25px rgba(0,0,0,0.4),
    0 0 0 2px rgba(255, 255, 255, 0.1),
    0 0 0 4px rgba(25, 118, 210, 0.2);
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.1);
}

.album-cover-mobile:hover {
  transform: scale(1.03);
  box-shadow: 
    0 12px 35px rgba(0,0,0,0.5),
    0 0 0 2px rgba(255, 255, 255, 0.2),
    0 0 0 4px rgba(25, 118, 210, 0.3);
}

.album-cover-mobile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  display: block;
}

.album-cover-mobile img.rotating {
  animation: spin 15s linear infinite;
}

/* 右侧歌词区域 */
.lyrics-section-wrapper {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.lyrics-section-mobile {
  flex: 1;
  height: 100%;
  perspective: 800px;
  overflow: hidden;
  position: relative;
}

.lyrics-content-mobile {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  text-align: center;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1rem 0.6rem;
  box-sizing: border-box;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* 减少3D变换强度，提高兼容性 */
  transform: rotateY(-2deg) rotateX(0.5deg);
  box-shadow: 
    inset 0 0 15px rgba(255, 255, 255, 0.1),
    0 6px 20px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  /* 添加回退支持 */
  -webkit-transform: rotateY(-2deg) rotateX(0.5deg);
  -moz-transform: rotateY(-2deg) rotateX(0.5deg);
  -ms-transform: rotateY(-2deg) rotateX(0.5deg);
}

/* 为不支持3D变换的设备提供回退 */
@media screen and (max-device-width: 480px) and (-webkit-max-device-pixel-ratio: 1) {
  .lyrics-content-mobile {
    transform: none;
    -webkit-transform: none;
    perspective: none;
  }
  
  .lyrics-section-mobile {
    perspective: none;
  }
  
  .lyric-line-mobile {
    transform: none !important;
  }
  
  .lyric-line-mobile.current {
    transform: scale(1.02) !important;
  }
}

.lyrics-content-mobile::-webkit-scrollbar {
  display: none;
}

.parsed-lyrics-mobile,
.static-lyrics-mobile {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  padding-top: 0.5rem;
}

.lyrics-viewport {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.lyric-line-mobile {
  padding: 0.5rem 0.3rem;
  line-height: 1.3;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  opacity: 0.4;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: normal;
  word-wrap: break-word;
  max-width: 95%;
  text-align: center;
  transform-style: preserve-3d;
  will-change: transform, opacity;
}

.lyric-line-mobile:hover {
  transform: translateZ(3px) scale(1.01);
  background: rgba(255, 255, 255, 0.06);
  opacity: 0.7;
}

.lyric-line-mobile.current {
  opacity: 1;
  font-weight: 700;
  font-size: 1rem;
  color: #ffffff;
  text-shadow: 
    0 2px 6px rgba(0,0,0,0.4),
    0 0 15px rgba(25, 118, 210, 0.3);
  transform: translateZ(8px) scale(1.04);
  margin: 0.8rem 0;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.15), rgba(25, 118, 210, 0.08));
  border: 1px solid rgba(25, 118, 210, 0.25);
  box-shadow: 
    0 3px 15px rgba(25, 118, 210, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  animation: glow 2.5s ease-in-out infinite;
}

.lyric-line-mobile.passed {
  opacity: 0.25;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  transform: translateZ(-2px) scale(0.96);
}

.lyric-line-mobile.upcoming {
  opacity: 0.35;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  transform: translateZ(1px) scale(0.98);
}

.no-lyrics-mobile {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  transform: translateZ(5px);
  padding: 1.5rem;
}

.load-lyrics-btn-mobile {
  background: linear-gradient(135deg, #1976d2, #1565c0);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  margin-top: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 12px rgba(25, 118, 210, 0.3);
  transform: translateZ(3px);
  font-size: 0.85rem;
}

.load-lyrics-btn-mobile:hover {
  background: linear-gradient(135deg, #1565c0, #0d47a1);
  transform: translateZ(5px) scale(1.02);
  box-shadow: 0 5px 16px rgba(25, 118, 210, 0.4);
}

/* 移动端进度条 - 更加紧凑 */
.progress-section-mobile {
  margin-bottom: 0.5rem; /* 减少边距 */
  flex-shrink: 0;
}

.time-display-mobile {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.2rem; /* 减少边距 */
  font-size: 0.75rem; /* 稍微缩小字体 */
  color: rgba(255, 255, 255, 0.7);
}

.progress-bar-mobile {
  position: relative;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.progress-mobile {
  height: 100%;
  background: #1976d2;
  border-radius: 2px;
  transition: width 0.1s ease;
}

.progress-input-mobile {
  position: absolute;
  top: -8px;
  left: 0;
  width: 100%;
  height: 20px;
  opacity: 0;
  cursor: pointer;
}

/* 移动端底部播放控制 - 相对定位在容器底部 */
.player-controls-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2.5rem;
  position: relative; /* 改为相对定位 */
  margin-top: auto; /* 推到容器底部 */
  background: transparent;
  backdrop-filter: none;
  border-radius: 25px;
  padding: 0.8rem 2rem;
  box-shadow: none;
  flex-shrink: 0; /* 防止收缩 */
}

.control-btn-mobile {
  background: transparent; /* 改为透明背景 */
  border: 1px solid rgba(255, 255, 255, 0.3); /* 添加淡边框 */
  border-radius: 50%;
  width: 52px;
  height: 52px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
}

.control-btn-mobile:hover {
  background: rgba(255, 255, 255, 0.1); /* 悬停时轻微背景 */
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.05);
}

.play-btn-mobile {
  width: 64px;
  height: 64px;
  background: rgba(25, 118, 210, 0.8) !important; /* 播放按钮保留半透明背景 */
  border: 2px solid rgba(25, 118, 210, 0.6) !important;
  color: white !important;
}

.play-btn-mobile:hover {
  background: rgba(21, 101, 192, 0.9) !important;
  border-color: rgba(21, 101, 192, 0.8) !important;
  transform: scale(1.08);
}

.control-btn-mobile svg {
  width: 100%;
  height: 100%;
}
</style>
