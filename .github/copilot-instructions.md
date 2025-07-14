# Copilot 指令

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

这是一个Vue3 + Vite的音乐平台项目，实现搜索、播放、下载功能。

## 项目特点
- 使用Vue3 Composition API
- 不使用任何组件库，采用原生CSS样式
- 集成GD Studio音乐API
- 支持多音乐源（netease、kuwo、joox等）
- 响应式设计，美观现代的UI

## API文档
- 搜索API: `https://music-api.gdstudio.xyz/api.php?types=search&source=[MUSIC SOURCE]&name=[KEYWORD]&count=[PAGE LENGTH]&pages=[PAGE NUM]`
- 获取歌曲: `https://music-api.gdstudio.xyz/api.php?types=url&source=[MUSIC SOURCE]&id=[TRACK ID]&br=[128/192/320/740/999]`
- 获取专辑图: `https://music-api.gdstudio.xyz/api.php?types=pic&source=[MUSIC SOURCE]&id=[PIC ID]&size=[300/500]`
- 获取歌词: `https://music-api.gdstudio.xyz/api.php?types=lyric&source=[MUSIC SOURCE]&id=[LYRIC ID]`

## 开发指南
- 使用JavaScript而非TypeScript
- 采用现代CSS技术（Grid、Flexbox、CSS Variables）
- 代码简洁、可读性强
- 注重用户体验和性能优化
