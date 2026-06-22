# 🎙️ DubFlow - AI驱动的YouTube视频配音

使用AI配音技术将任何YouTube视频转化为多种语言。DubFlow自动提取字幕，翻译内容，生成自然流畅的语音，并制作出专业的配音视频。

![DubFlow Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-v18+-blue) ![Next.js](https://img.shields.io/badge/Next.js-v13+-black) 
### 🏠 Home Page
![HomePage](images/Screenshot%202025-06-08%20162120.png)

### 🎬 Dubbing a YouTube Video
![Dubbing a YouTube video](images/Screenshot%202025-06-08%20162211.png)

### 🌐 Language Selection
![Language Selection](images/Screenshot%202025-06-08%20162227.png)

### ⚙️ Processing
![Processing](images/Screenshot%202025-06-08%20162256.png)

### 📺 Dubbed Video Display
![Dubbed Video display](images/Screenshot%202025-06-08%20162539.png)



## ✨ 功能特色

- 🎬 **YouTube视频处理**：无缝下载和处理YouTube视频
- 📝 **智能字幕提取**：高级字幕获取，多种备用策略
- 🌍 **多语言翻译**：支持16+种语言，使用RapidAPI Google翻译
- 🔊 **自然语音生成**：高质量文本转语音，使用Google TTS
- ⏰ **精准音频对齐**：保持原始时间同步
- 🎭 **专业视频合并**：将配音音频与原始视频合并
- 📊 **Real-time Progress Tracking**: Live updates during processing
- 🚀 **Modern UI/UX**: Beautiful gradient interface with animations

## 🎯 支持语言

- 西班牙语 (Español)
- 法语 (Français)
- 德语 (Deutsch)
- 意大利语 (Italiano)
- 葡萄牙语 (Português)
- 俄语 (Русский)
- 日语 (日本語)
- 韩语 (한국어)
- 中文 (中文)
- 印地语 (हिंदी)
- 阿拉伯语 (العربية)
- 荷兰语 (Nederlands)
- 波兰语 (Polski)
- 土耳其语 (Türkçe)
- 泰语 (ไทย)
- 越南语 (Tiếng Việt)

## 🏗️ 架构

### 后端 (Node.js/Express)
- **字幕提取**：增强重试逻辑，多种备用方法
- **翻译服务**：RapidAPI Google翻译集成
- **音频处理**：FFmpeg音频处理和合并
- **视频处理**：yt-dlp/youtube-dl可靠视频下载
- **语音合成**：Google TTS (gTTS)自然语音生成

### 前端 (Next.js/React)
- **现代UI**：Tailwind CSS，渐变动画
- **实时更新**：实时进度跟踪和状态更新
- **响应式设计**：移动优先，精美动画
- **错误处理**：全面的错误信息和用户指南

## 🚀 快速开始

### 系统要求

- Node.js v18 或更高版本
- npm 或 yarn
- FFmpeg 安装在系统上
- yt-dlp 或 youtube-dl 安装
- RapidAPI 账户，包含 Google 翻译权限

### 安装

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/dubflow.git
   cd dubflow
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   npm install
   ```

3. **安装前端依赖**
   ```bash
   cd ../frontend
   npm install
   ```

4. **设置环境变量**
   
   在后端目录创建 `.env` 文件：
   ```env
   PORT=3001
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```

5. **安装系统依赖**
   
   **在 macOS 上：**
   ```bash
   brew install ffmpeg yt-dlp
   ```
   
   **在 Ubuntu/Debian 上：**
   ```bash
   sudo apt update
   sudo apt install ffmpeg yt-dlp
   ```
   
   **在 Windows 上：**
   - 从 https://ffmpeg.org/download.html 下载 FFmpeg
   - 从 https://github.com/yt-dlp/yt-dlp 下载 yt-dlp

### 运行应用

1. **启动后端服务器**
   ```bash
   cd backend
   npm start
   ```
   后端将运行在 http://localhost:3001

2. **启动前端开发服务器**
   ```bash
   cd frontend
   npm run dev
   ```
   前端将运行在 http://localhost:3000

3. **打开浏览器** 并访问 http://localhost:3000

## 📚 API 文档

### POST /api/dub-video
处理YouTube视频进行配音。

**请求体：**
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "targetLanguage": "spanish"
}
```

**响应：**
```json
{
  "success": true,
  "jobId": "uuid-here",
  "downloadUrl": "/downloads/uuid/dubbed_video.mp4",
  "message": "视频配音成功！",
  "transcriptSegments": 150,
  "translationErrors": 0
}
```

### POST /api/check-transcript
验证字幕可用性，处理前检查。

**请求体：**
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

### GET /api/job-status/:jobId
检查配音任务状态。

**响应：**
```json
{
  "status": "completed",
  "downloadUrl": "/downloads/jobId/dubbed_video.mp4"
}
```

### GET /api/health
健康检查端点。

## 🔧 配置

### 环境变量

| 变量 | 描述 | 是否必须 | 默认值 |
|------|-------------|----------|---------|
| `PORT` | 后端服务器端口 | 否 | 3001 |
| `RAPIDAPI_KEY` | RapidAPI 密钥，用于 Google 翻译 | 是 | - |

### 自定义选项

- **批处理大小**：调整后端代码中的翻译批处理大小
- **重试逻辑**：配置字幕获取的重试次数和延迟
- **音频质量**：修改 FFmpeg 设置，获取不同音频质量
- **语言支持**：通过更新语言映射添加新语言

## 🎨 前端自定义

前端使用 Tailwind CSS 进行样式设置。关键自定义选项：

- **颜色方案**：修改组件中的渐变颜色
- **动画**：调整动画延迟和持续时间
- **布局**：自定义响应式网格系统
- **进度指示器**：修改加载状态和进度显示

## 🐛 故障排除

### 常见问题

1. **"未找到字幕" 错误**
   - 确保视频已启用字幕
   - 尝试使用手动字幕而不是自动生成的字幕
   - 检查视频是否公开可访问

2. **翻译失败**
   - 验证 RapidAPI 密钥是否正确且有效
   - 检查 RapidAPI 订阅限制
   - 监控 API 速率限制

3. **视频下载问题**
   - 确保 yt-dlp 已安装并更新
   - 检查视频是否在您的地区可用
   - 尝试不同的视频格式或质量设置

4. **FFmpeg 错误**
   - 验证 FFmpeg 是否正确安装
   - 检查系统 PATH 配置
   - 确保有足够的磁盘空间进行处理

### 调试模式

通过设置启用调试日志：
```env
DEBUG=true
```

## 🤝 贡献

我们欢迎贡献！请按照以下步骤操作：

1. 分叉仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m '添加惊艳功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开拉取请求

### 开发指南

- 遵循 ESLint 配置
- 编写描述性的提交消息
- 为新功能添加测试
- 按需更新文档

## 📜 许可证

本项目受 MIT 许可证授权 - 请参阅 [LICENSE](LICENSE) 文件获取详细信息。

## 🙏 鸣谢

- [youtube-transcript](https://github.com/Kakulukian/youtube-transcript) 用于字幕提取
- [RapidAPI](https://rapidapi.com/) 用于翻译服务
- [FFmpeg](https://ffmpeg.org/) 用于视频/音频处理
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) 用于可靠的 YouTube 下载
- [Google TTS](https://github.com/zlargon/google-tts) 用于语音合成




**用 ❤️ 为全球内容创作者制作**
