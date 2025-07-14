# Docker 部署说明

## 前置条件

在使用 GitHub Actions 工作流之前，您需要配置以下 Secrets（如果要使用对应的镜像仓库）：

### GitHub Container Registry (推荐，无需额外配置)
- 使用 `GITHUB_TOKEN`，自动可用

### Docker Hub
在仓库的 Settings > Secrets and variables > Actions 中添加：
- `DOCKERHUB_USERNAME`: Docker Hub 用户名
- `DOCKERHUB_TOKEN`: Docker Hub 访问令牌

### 阿里云容器镜像服务
在仓库的 Settings > Secrets and variables > Actions 中添加：
- `ALIYUN_REGISTRY`: 阿里云镜像仓库地址 (例如: registry.cn-hangzhou.aliyuncs.com)
- `ALIYUN_USERNAME`: 阿里云账号用户名
- `ALIYUN_PASSWORD`: 阿里云账号密码
- `ALIYUN_NAMESPACE`: 阿里云镜像命名空间

## 使用工作流

1. 进入仓库的 Actions 页面
2. 选择 "Build and Push Docker Image" 工作流
3. 点击 "Run workflow"
4. 输入版本号（例如：v1.0.0）
5. 选择镜像仓库类型
6. 点击 "Run workflow" 开始构建

## 本地构建测试

### 构建镜像
```bash
docker build -t yansdmusic:latest .
```

### 运行容器
```bash
docker run -d --name yansdmusic -p 8080:8080 yansdmusic:latest
```

### 使用 Docker Compose
```bash
docker-compose up -d
```

## 部署到生产环境

### 直接运行
```bash
docker run -d \
  --name yansdmusic \
  -p 80:8080 \
  --restart unless-stopped \
  ghcr.io/yourusername/yansdmusic:v1.0.0
```

### 使用 Docker Compose（生产环境）
```yaml
version: '3.8'
services:
  yansdmusic:
    image: ghcr.io/yourusername/yansdmusic:v1.0.0
    container_name: yansdmusic
    ports:
      - "80:8080"
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

### 使用 Nginx 反向代理
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 镜像特性

- **基础镜像**: nginx:alpine
- **多架构支持**: linux/amd64, linux/arm64
- **压缩优化**: 启用 gzip 压缩
- **缓存策略**: 静态资源长期缓存
- **安全配置**: 安全头部设置
- **健康检查**: 内置健康检查机制
- **非 root 用户**: 以非特权用户运行

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| TZ | 时区设置 | Asia/Shanghai |

## 端口说明

- **容器端口**: 8080
- **建议映射**: 
  - 开发环境: 8080:8080
  - 生产环境: 80:8080

## 故障排除

### 检查容器状态
```bash
docker ps
docker logs yansdmusic
```

### 进入容器调试
```bash
docker exec -it yansdmusic sh
```

### 检查健康状态
```bash
docker inspect yansdmusic | grep -A 10 Health
```

## 更新部署

### 拉取新版本
```bash
docker pull ghcr.io/yourusername/yansdmusic:v1.1.0
```

### 滚动更新
```bash
# 停止旧容器
docker stop yansdmusic
docker rm yansdmusic

# 启动新容器
docker run -d \
  --name yansdmusic \
  -p 80:8080 \
  --restart unless-stopped \
  ghcr.io/yourusername/yansdmusic:v1.1.0
```

## 监控和日志

### 查看实时日志
```bash
docker logs -f yansdmusic
```

### 监控资源使用
```bash
docker stats yansdmusic
```
