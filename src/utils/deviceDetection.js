/**
 * 检测当前设备是否为移动端
 * @returns {boolean} 是否为移动端
 */
export function isMobile() {
  // 检查用户代理字符串
  const userAgent = navigator.userAgent.toLowerCase()
  
  // 移动设备关键词
  const mobileKeywords = [
    'mobile', 'android', 'iphone', 'ipad', 'ipod', 
    'blackberry', 'windows phone', 'opera mini',
    'webos', 'symbian', 'kindle'
  ]
  
  // 检查是否包含移动设备关键词
  const isMobileUserAgent = mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  )
  
  // 检查屏幕尺寸
  const isMobileScreen = window.innerWidth <= 768
  
  // 检查触摸支持
  const isTouchDevice = 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    navigator.msMaxTouchPoints > 0
  
  // 综合判断
  return isMobileUserAgent || (isMobileScreen && isTouchDevice)
}

/**
 * 检测当前设备是否为平板
 * @returns {boolean} 是否为平板
 */
export function isTablet() {
  const userAgent = navigator.userAgent.toLowerCase()
  
  // 平板设备关键词
  const tabletKeywords = ['ipad', 'tablet', 'kindle']
  
  const isTabletUserAgent = tabletKeywords.some(keyword => 
    userAgent.includes(keyword)
  )
  
  // 平板屏幕尺寸判断
  const isTabletScreen = window.innerWidth > 768 && window.innerWidth <= 1024
  
  // 触摸支持
  const isTouchDevice = 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    navigator.msMaxTouchPoints > 0
  
  return isTabletUserAgent || (isTabletScreen && isTouchDevice)
}

/**
 * 检测当前设备是否为桌面端
 * @returns {boolean} 是否为桌面端
 */
export function isDesktop() {
  return !isMobile() && !isTablet()
}

/**
 * 获取设备类型
 * @returns {'mobile' | 'tablet' | 'desktop'} 设备类型
 */
export function getDeviceType() {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

/**
 * 响应式监听屏幕尺寸变化
 * @param {function} callback 回调函数
 * @returns {function} 取消监听的函数
 */
export function watchDeviceType(callback) {
  let currentDeviceType = getDeviceType()
  
  const handleResize = () => {
    const newDeviceType = getDeviceType()
    if (newDeviceType !== currentDeviceType) {
      currentDeviceType = newDeviceType
      callback(newDeviceType)
    }
  }
  
  window.addEventListener('resize', handleResize)
  
  // 返回取消监听的函数
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}
