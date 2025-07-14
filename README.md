# 烟神殿音乐 (YansD Music)

一个简洁的在线音乐播放平台，基于Vue 3和Vite构建。

## 功能特点

- 🎵 支持多个音乐平台搜索(网易云音乐、酷我音乐、JOOX等)
- 🎧 在线音乐播放，带进度条和音量控制
- 📝 歌词显示功能，支持多语言歌词和实时滚动
- 💾 音乐下载功能，支持最高品质和歌词文件
- � 批量下载功能
- �📱 响应式设计，适配移动端
- 🐳 Docker 容器化部署

## 技术栈

- Vue 3 - 前端框架
- Vite - 构建工具
- Axios - HTTP 客户端
- Web Audio API - 音频处理
- GD Studio API - 音乐数据来源
- Docker - 容器化部署
- Nginx - Web 服务器

## 开始使用

### 本地开发

1. 克隆项目
```bash
git clone https://github.com/your-username/yansd-music.git
cd yansd-music
```

2. 安装依赖
```bash
npm install
```

3. 运行开发服务器
```bash
npm run dev
```

4. 构建生产版本
```bash
npm run build
```

### Docker 部署

#### 方式一：使用预构建镜像
```bash
# 拉取镜像
docker pull ghcr.io/yourusername/yansdmusic:latest

# 运行容器
docker run -d --name yansdmusic -p 80:8080 ghcr.io/yourusername/yansdmusic:latest
```

#### 方式二：本地构建
```bash
# 构建镜像
docker build -t yansdmusic:latest .

# 运行容器
docker run -d --name yansdmusic -p 80:8080 yansdmusic:latest
```

#### 方式三：使用 Docker Compose
```bash
docker-compose up -d
```

### GitHub Actions 自动构建

本项目配置了 GitHub Actions 工作流，支持自动构建 Docker 镜像并推送到镜像仓库。

1. 进入仓库的 Actions 页面
2. 选择 "Build and Push Docker Image" 工作流
3. 点击 "Run workflow"
4. 输入版本号和选择镜像仓库
5. 等待构建完成

详细部署说明请参考 [DOCKER.md](./DOCKER.md)

## API 来源

本项目使用了GD Studio提供的开放音乐API，支持多个音乐平台的资源获取。

## 免责声明

本项目仅供个人学习研究使用，不得用于商业用途。项目中使用的音乐资源版权归各自所有者所有，请尊重版权。

## 许可证

MIT
