# Android APK 构建说明

## GitHub Secrets 配置

为了成功构建和签名APK文件，您需要在GitHub仓库的Settings -> Secrets and variables -> Actions中添加以下secrets：

### 1. 生成签名密钥

首先，您需要生成一个Android签名密钥：

```bash
keytool -genkey -v -keystore yansd-music.keystore -alias yansd-music -keyalg RSA -keysize 2048 -validity 10000
```

### 2. 配置GitHub Secrets

在GitHub仓库中添加以下secrets：

- `SIGNING_KEY`: 将keystore文件转换为base64字符串
  ```bash
  base64 -w 0 yansd-music.keystore
  ```
  
- `ALIAS`: 密钥别名（例如：yansd-music）

- `KEY_STORE_PASSWORD`: keystore密码

- `KEY_PASSWORD`: 密钥密码

## 构建触发条件

APK构建会在以下情况下自动触发：

1. **推送到main分支**：每次推送到main分支都会构建APK
2. **创建标签**：创建以"v"开头的标签时会构建并发布到Releases
3. **Pull Request**：向main分支提交PR时会构建APK进行测试
4. **手动触发**：可以在GitHub Actions页面手动触发构建

## 发布流程

1. 在项目中创建一个新的版本标签：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Actions会自动：
   - 安装依赖
   - 构建Web应用
   - 设置Android开发环境
   - 初始化Capacitor
   - 构建APK
   - 签名APK
   - 创建GitHub Release并上传APK

## 构建产物

- **每次构建**：APK文件会作为构建产物(Artifact)上传，可以在Actions页面下载
- **标签构建**：APK文件会自动发布到GitHub Releases

## 应用权限

应用会请求以下Android权限：
- `INTERNET`: 访问网络API
- `ACCESS_NETWORK_STATE`: 检查网络状态
- `ACCESS_WIFI_STATE`: 检查WiFi状态

## 应用信息

- **应用包名**: com.yansd.music
- **应用名称**: YanSD Music
- **支持的Android版本**: API 24+ (Android 7.0+)

## 故障排除

如果构建失败，请检查：

1. **Secrets配置**：确保所有必需的secrets都已正确配置
2. **依赖版本**：确认Node.js和Java版本兼容性
3. **构建日志**：查看GitHub Actions构建日志获取详细错误信息

## 本地开发（可选）

如果需要在本地进行Android开发：

```bash
# 安装依赖
npm install

# 构建Web应用
npm run build

# 添加Android平台
npx cap add android

# 同步资源
npx cap sync android

# 在Android Studio中打开项目
npx cap open android
```
