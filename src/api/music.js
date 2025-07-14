// GD Studio 音乐 API 接口
const API_BASE_URL = 'https://music-api.gdstudio.xyz/api.php'

// 构建API请求URL
const buildApiUrl = (params) => {
  const url = new URL(API_BASE_URL)
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key])
    }
  })
  return url.toString()
}

// 发送API请求
const apiRequest = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// 搜索音乐
export const searchMusic = async ({ source = 'netease', keyword, count = 20, page = 1 }) => {
  const url = buildApiUrl({
    types: 'search',
    source,
    name: keyword,
    count,
    pages: page
  })
  
  const data = await apiRequest(url)
  
  // 处理返回数据格式
  if (Array.isArray(data)) {
    return data.map(item => ({
      id: item.id,
      name: item.name,
      artist: Array.isArray(item.artist) ? item.artist : [item.artist],
      album: item.album,
      pic_id: item.pic_id,
      lyric_id: item.lyric_id,
      source: item.source || source
    }))
  }
  
  return []
}

// 获取音乐播放链接
export const getMusicUrl = async ({ source = 'netease', id, br = 320 }) => {
  const url = buildApiUrl({
    types: 'url',
    source,
    id,
    br
  })
  
  try {
    const data = await apiRequest(url)
    return data.url || null
  } catch (error) {
    console.error('获取音乐链接失败:', error)
    return null
  }
}

// 获取专辑图片
export const getMusicPic = async ({ source = 'netease', id, size = 300 }) => {
  const url = buildApiUrl({
    types: 'pic',
    source,
    id,
    size
  })
  
  try {
    const data = await apiRequest(url)
    return data.url || null
  } catch (error) {
    console.error('获取专辑图片失败:', error)
    return null
  }
}

// 获取歌词
export const getMusicLyric = async ({ source = 'netease', id }) => {
  const url = buildApiUrl({
    types: 'lyric',
    source,
    id
  })
  
  try {
    const data = await apiRequest(url)
    return {
      lyric: data.lyric || '',
      tlyric: data.tlyric || ''
    }
  } catch (error) {
    console.error('获取歌词失败:', error)
    return { lyric: '', tlyric: '' }
  }
}

// 音乐源列表
export const MUSIC_SOURCES = [
  { value: 'netease', label: '网易云音乐', stable: true },
  { value: 'kuwo', label: '酷我音乐', stable: true },
  { value: 'joox', label: 'JOOX', stable: true },
  { value: 'tencent', label: 'QQ音乐', stable: false },
  { value: 'migu', label: '咪咕音乐', stable: false },
  { value: 'kugou', label: '酷狗音乐', stable: false },
  { value: 'deezer', label: 'Deezer', stable: false },
  { value: 'spotify', label: 'Spotify', stable: false },
  { value: 'apple', label: 'Apple Music', stable: false },
  { value: 'ytmusic', label: 'YouTube Music', stable: false }
]

// 音质选项
export const QUALITY_OPTIONS = [
  { value: 128, label: '标准 (128kbps)' },
  { value: 192, label: '较高 (192kbps)' },
  { value: 320, label: '高品质 (320kbps)' },
  { value: 740, label: '无损 (740kbps)' },
  { value: 999, label: '母带 (999kbps)' }
]
