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
        <!-- 专辑封面 -->
        <div class="album-cover">
          <img :src="currentSongCover" :alt="currentSong?.album || ''" @error="handleCoverError" />
        </div>

        <!-- 歌曲信息 -->
        <div class="song-details">
          <h2 class="song-title">{{ currentSong?.name || '' }}</h2>
          <p class="song-artist">{{ Array.isArray(currentSong?.artist) ? currentSong?.artist.join(', ') : (currentSong?.artist || '') }}</p>
          <p class="song-album">{{ currentSong?.album || '' }}</p>
        </div>

        <!-- 进度条 -->
        <div class="progress-section">
          <div class="time-display">
            <span class="current-time">{{ formatTime(currentTime) }}</span>
            <span class="total-time">{{ formatTime(duration) }}</span>
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

        <!-- 播放控制 -->
        <div class="player-controls">
          <button @click="playPrevious" class="control-btn">⏮️</button>
          <button @click="togglePlayPause" class="control-btn play-btn">
            {{ isPlaying ? '⏸️' : '▶️' }}
          </button>
          <button @click="playNext" class="control-btn">⏭️</button>
        </div>

        <!-- 音量控制 -->
        <div class="volume-section">
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

        <!-- 歌词 -->
        <div class="lyrics-section">
          <h3 class="lyrics-title">歌词</h3>
          <div class="lyrics-content">
            <div v-if="parsedLyrics.length > 0" class="parsed-lyrics">
              <div 
                v-for="(line, index) in parsedLyrics" 
                :key="index"
                class="lyric-line"
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
            <div v-else-if="currentLyrics.lyric" class="static-lyrics">
              <div 
                v-for="(line, index) in currentLyrics.lyric.split('\n')" 
                :key="index"
                class="lyric-line"
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
    </main>

    <!-- 底部迷你播放器 -->
    <footer class="mini-player" v-if="currentSong && currentView !== 'player'">
      <div class="mini-progress" :style="{ width: progressPercentage + '%' }"></div>
      <div class="mini-player-content" @click="currentView = 'player'">
        <div class="mini-cover">
          <img :src="currentSongCover" :alt="currentSong?.album || ''" @error="handleCoverError" />
        </div>
        <div class="mini-info">
          <div class="mini-title">{{ currentSong?.name || '' }}</div>
          <div class="mini-artist">{{ Array.isArray(currentSong?.artist) ? currentSong?.artist.join(', ') : (currentSong?.artist || '') }}</div>
        </div>
        <div class="mini-controls" @click.stop>
          <button @click="togglePlayPause" class="mini-play-btn">
            {{ isPlaying ? '⏸️' : '▶️' }}
          </button>
          <button @click="playNext" class="mini-next-btn">⏭️</button>
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
  </div>
</template>

<script>
import { useMusicPlayer } from '../composables/useMusicPlayer.js'

export default {
  name: 'MusicPlayerMobile',
  setup() {
    return useMusicPlayer()
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
  padding: 2rem 1.5rem;
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
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
</style>
