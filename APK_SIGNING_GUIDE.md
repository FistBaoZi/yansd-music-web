# APK 签名配置指南

## 快速开始 - 使用简化版工作流

项目中有两个工作流文件：

1. **build-android-simple.yml** - 简化版本，构建未签名的APK（推荐先使用这个）
2. **build-android.yml** - 完整版本，包含APK签名功能

### 第一步：使用简化版本

简化版本会构建未签名的APK，虽然不能直接在生产环境使用，但可以：
- 验证构建流程是否正常
- 在开发设备上测试应用功能
- 通过Android Studio进行签名

### 第二步：配置APK签名（可选）

如果需要发布到Google Play或其他应用商店，需要配置签名：

#### 1. 生成签名密钥

```bash
# 生成keystore文件
keytool -genkey -v -keystore yansd-music.keystore -alias yansd-music -keyalg RSA -keysize 2048 -validity 10000

# 输入必要信息：
# - 密钥库密码
# - 密钥密码  
# - 您的姓名和组织信息
```

#### 2. 配置GitHub Secrets

在GitHub仓库的 Settings → Secrets and variables → Actions 中添加：

- `SIGNING_KEY`: keystore文件的base64编码
  ```bash
  # Linux/Mac
  base64 -w 0 yansd-music.keystore
  
  # Windows (PowerShell)
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("yansd-music.keystore"))
  ```
  
- `ALIAS`: yansd-music
- `KEY_STORE_PASSWORD`: keystore密码
- `KEY_PASSWORD`: 密钥密码

#### 3. 启用完整版工作流

配置完secrets后，可以删除或重命名 `build-android-simple.yml`，使用 `build-android.yml`。

## 构建触发方式

### 自动触发
- **推送到main分支**: 构建APK并上传为Artifact
- **创建Pull Request**: 构建debug版本进行测试
- **创建版本标签**: 构建并发布到GitHub Releases

### 手动触发
在GitHub Actions页面点击"Run workflow"按钮

## 发布新版本

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

这会触发构建并自动创建GitHub Release。

## 故障排除

### 常见问题

1. **构建失败**: 检查GitHub Actions日志
2. **签名失败**: 验证Secrets配置是否正确
3. **APK无法安装**: 
   - 未签名APK需要开启"允许安装未知来源应用"
   - 检查Android版本兼容性（最低API 24）

### 测试未签名APK

未签名的APK可以用于开发测试：

1. 在Android设备上开启"开发者选项"
2. 启用"USB调试"和"允许安装未知来源应用"
3. 通过ADB安装：`adb install yansd-music-v*.apk`

## 应用信息

- **包名**: com.yansd.music
- **应用名**: YanSD Music
- **最低Android版本**: 7.0 (API 24)
- **目标Android版本**: 最新版本

## 下一步

1. 先使用简化版工作流测试构建
2. 验证APK在设备上正常运行
3. 根据需要配置签名
4. 发布到应用商店或GitHub Releases
