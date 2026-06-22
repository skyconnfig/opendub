# 🎙️ DubFlow - AI驱动的YouTube视频配音

使用AI配音技术将任何YouTube视频转化为多种语言。DubFlow自动提取字幕，翻译内容，生成自然流畅的语音，并制作出专业的配音视频。

![DubFlow Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-v18+-blue) ![Next.js](https://img.shields.io/badge/Next.js-v13+-black)

## ✨ 功能特色

- 🎬 **YouTube视频处理**：无缝下载和处理YouTube视频
- 📝 **智能字幕提取**：高级字幕获取，多种备用策略，支持代理
- 🌍 **多语言翻译**：支持16+种语言，使用RapidAPI Google翻译
- 🔊 **自然语音生成**：高质量文本转语音，使用Google TTS
- ⏰ **精准音频对齐**：保持原始时间同步
- 🎭 **专业视频合并**：将配音音频与原始视频合并
- 📊 **实时进度跟踪**：圆形进度环 + 进度条 + 步骤指示器
- 🔧 **代理支持**：支持HTTP/SOCKS5代理，解决网络限制问题
- 🚀 **异步处理**：后端异步处理，前端实时轮询进度
- 🎨 **现代UI/UX**：精美渐变界面，流畅动画

## 🎯 支持语言

| 语言 | 代码 | 示例 |
|------|------|------|
| 西班牙语 | `spanish` | Español |
| 法语 | `french` | Français |
| 德语 | `german` | Deutsch |
| 意大利语 | `italian` | Italiano |
| 葡萄牙语 | `portuguese` | Português |
| 俄语 | `russian` | Русский |
| 日语 | `japanese` | 日本語 |
| 韩语 | `korean` | 한국어 |
| 中文 | `chinese` | 中文 |
| 印地语 | `hindi` | हिंदी |
| 阿拉伯语 | `arabic` | العربية |
| 荷兰语 | `dutch` | Nederlands |
| 波兰语 | `polish` | Polski |
| 土耳其语 | `turkish` | Türkçe |
| 泰语 | `thai` | ไทย |
| 越南语 | `vietnamese` | Tiếng Việt |

## 🏗️ 架构

### 后端 (Node.js/Express) - 端口 3002

- **字幕提取**：使用 `youtube-transcript` 包，支持代理
- **翻译服务**：RapidAPI Google翻译集成，支持批量翻译
- **音频处理**：FFmpeg 音频处理和合并
- **视频处理**：yt-dlp 可靠视频下载
- **语音合成**：Google TTS (gTTS) 自然语音生成
- **异步处理**：返回 202 + jobId，后台处理任务
- **进度跟踪**：内存存储实时进度（5% → 100%）

### 前端 (Next.js/React) - 端口 3000

- **现代UI**：Tailwind CSS，渐变动画
- **实时更新**：每2秒轮询进度端点
- **进度可视化**：
  - 圆形进度环（SVG）
  - 渐变进度条
  - 步骤指示器（4个阶段）
  - 实时状态消息
- **响应式设计**：移动优先，精美动画
- **错误处理**：全面的错误信息和用户指南

## 🚀 快速开始

### 系统要求

- Node.js v18 或更高版本
- npm 或 yarn
- FFmpeg 安装在系统上
- yt-dlp 或 youtube-dl 安装
- RapidAPI 账户，包含 Google 翻译权限
- **代理软件**（访问YouTube必需）：V2Ray / Clash / Shadowsocks

### 安装

#### 1. 克隆仓库

```bash
git clone https://github.com/skyconfig/opendub.git
cd opendub
```

#### 2. 安装后端依赖

```bash
cd Backend
npm install
```

#### 3. 安装前端依赖

```bash
cd ../Frontend
npm install
```

#### 4. 设置环境变量

在 `Backend` 目录创建 `.env` 文件：

```env
# 服务器端口
PORT=3002

# RapidAPI Google翻译密钥
RAPIDAPI_KEY=your_rapidapi_key_here

# 代理URL（访问YouTube必需）
# HTTP代理示例：
PROXY_URL=http://127.0.0.1:10808

# SOCKS5代理示例（如果是V2Ray/Clash）：
# PROXY_URL=socks5://127.0.0.1:10808

# 调试模式
DEBUG=true
```

#### 5. 安装系统依赖

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

1. 从 https://ffmpeg.org/download.html 下载 FFmpeg
2. 从 https://github.com/yt-dlp/yt-dlp 下载 yt-dlp
3. 将两者添加到系统 PATH

#### 6. 配置代理（重要！）

DubFlow 需要代理才能访问 YouTube。

**检查代理是否工作：**

```bash
# 测试代理
curl -x http://127.0.0.1:10808 https://www.youtube.com

# 如果返回HTML，代理工作正常
```

**常见代理软件端口：**

| 软件 | 默认端口 | 类型 |
|------|----------|------|
| V2Ray | 10808 | SOCKS5 |
| Clash | 7890 | HTTP |
| Shadowsocks | 1080 | SOCKS5 |

## 🔥 运行应用

### 启动后端服务器

```bash
cd Backend
npm start
```

后端将运行在 http://localhost:3002

### 启动前端开发服务器

```bash
cd Frontend
npm run dev
```

前端将运行在 http://localhost:3000

### 打开浏览器

访问 http://localhost:3000

## 📚 API 文档

### POST /api/dub-video

**异步**处理YouTube视频进行配音（返回 202 + jobId）

**请求体：**

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "targetLanguage": "chinese"
}
```

**响应（202 Accepted）：**

```json
{
  "success": true,
  "jobId": "uuid-here",
  "message": "视频处理已开始，请轮询进度"
}
```

### GET /api/job-progress/:jobId

实时查询任务进度（前端每2秒轮询一次）

**响应：**

```json
{
  "status": "processing",
  "progress": 45,
  "message": "正在生成语音... (23/50)",
  "error": null,
  "result": null
}
```

**状态说明：**

| 状态 | 进度 | 描述 |
|------|------|------|
| `starting` | 0% | 初始化 |
| `processing` | 5% | 提取视频ID |
| `processing` | 10% | 提取字幕 |
| `processing` | 30% | 翻译内容 |
| `processing` | 50-70% | 生成语音 |
| `processing` | 72% | 对齐音频 |
| `processing` | 75% | 合并音频 |
| `processing` | 80% | 下载视频 |
| `processing` | 90% | 合并视频和音频 |
| `completed` | 100% | 处理完成 |
| `failed` | N/A | 处理失败 |

**完成响应：**

```json
{
  "status": "completed",
  "progress": 100,
  "message": "处理完成！",
  "error": null,
  "result": {
    "jobId": "uuid-here",
    "downloadUrl": "/downloads/uuid/dubbed_video.mp4",
    "message": "Video dubbed successfully!",
    "transcriptSegments": 150,
    "translationErrors": 0
  }
}
```

### GET /api/proxy-status

检查代理连接状态

**响应（已连接）：**

```json
{
  "configured": true,
  "status": "connected",
  "message": "代理连接正常 (http://127.0.0.1:10808)",
  "proxyUrl": "http://127.0.0.1:10808"
}
```

**响应（未配置）：**

```json
{
  "configured": false,
  "status": "not_configured",
  "message": "PROXY_URL 未配置在 .env 文件中"
}
```

### POST /api/check-transcript

验证字幕可用性（处理前检查）

**请求体：**

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

### GET /api/health

健康检查端点

**响应：**

```json
{
  "status": "OK",
  "message": "YouTube Dubbing API is running",
  "translateStatus": "RapidAPI Connected"
}
```

## 🔧 配置

### 环境变量

| 变量 | 描述 | 是否必须 | 默认值 |
|------|-------|----------|---------|
| `PORT` | 后端服务器端口 | 否 | 3002 |
| `RAPIDAPI_KEY` | RapidAPI 密钥，用于 Google 翻译 | **是** | - |
| `PROXY_URL` | 代理URL（HTTP 或 SOCKS5） | **是** | - |
| `DEBUG` | 调试模式 | 否 | false |

### 自定义选项

- **批处理大小**：调整后端代码中的翻译批处理大小（默认10）
- **重试逻辑**：配置字幕获取的重试次数和延迟
- **音频质量**：修改 FFmpeg 设置，获取不同音频质量
- **语言支持**：通过更新 `server.js` 中的 `getRapidApiLanguageCode()` 添加新语言

## 🎨 前端自定义

前端使用 Tailwind CSS 进行样式设置。关键自定义选项：

- **颜色方案**：修改组件中的渐变颜色
  ```jsx
  // 示例：修改按钮渐变
  className="bg-gradient-to-r from-purple-500 to-pink-500"
  ```

- **动画**：调整动画延迟和持续时间
  ```jsx
  className="animate-spin delay-300"
  ```

- **布局**：自定义响应式网格系统
  ```jsx
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  ```

- **进度指示器**：修改加载状态和进度显示
  ```jsx
  // 在 YouTubeDubber.js 中修改步骤
  const steps = ['提取字幕', '翻译内容', '生成语音', '合并视频'];
  ```

## 🐛 故障排除

### 常见问题

#### 1. "未找到字幕" 错误

**原因：**
- 视频未启用字幕
- 代理未工作，无法访问YouTube

**解决方法：**
```bash
# 1. 检查代理是否工作
curl -x http://127.0.0.1:10808 https://www.youtube.com

# 2. 使用有手动字幕的视频测试
# 推荐测试视频（Rick Astley - Never Gonna Give You Up）：
# https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

#### 2. 翻译失败（所有翻译都返回原文）

**原因：**
- RapidAPI 密钥无效或配额用完
- RapidAPI 订阅计划不支持该端点

**解决方法：**
```bash
# 1. 检查 RapidAPI 密钥
echo $RAPIDAPI_KEY

# 2. 访问 RapidAPI 仪表板检查配额
# https://rapidapi.com/google-translator9/api/google-translator9
```

#### 3. 视频下载问题

**原因：**
- yt-dlp 未安装或未在 PATH 中
- 视频在您的地区不可用
- 代理未工作

**解决方法：**
```bash
# 1. 检查 yt-dlp 是否安装
yt-dlp --version

# 2. 手动测试下载
yt-dlp -F "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# 3. 如果使用代理，确保 yt-dlp 也使用代理
# 在 .env 中设置 PROXY_URL，代码会自动传递给 yt-dlp
```

#### 4. FFmpeg 错误

**原因：**
- FFmpeg 未正确安装
- 系统 PATH 配置错误

**解决方法：**
```bash
# 1. 检查 FFmpeg 是否安装
ffmpeg -version

# 2. 在 Windows 上，确保 ffmpeg.exe 在 PATH 中
# 3. 确保有足够的磁盘空间进行处理
```

#### 5. 代理连接失败

**原因：**
- 代理软件未启动
- 代理端口配置错误
- 代理类型错误（HTTP vs SOCKS5）

**解决方法：**
```bash
# 1. 检查代理软件是否运行
netstat -ano | findstr :10808

# 2. 检查代理类型
# HTTP 代理：
PROXY_URL=http://127.0.0.1:10808

# SOCKS5 代理（V2Ray/Clash）：
PROXY_URL=socks5://127.0.0.1:10808

# 3. 测试代理
curl -x http://127.0.0.1:10808 https://www.youtube.com
```

### 调试模式

通过设置启用调试日志：

```env
# 在 .env 文件中
DEBUG=true
```

这将输出详细的调试信息，包括：
- 字幕提取过程
- 翻译请求和响应
- 音频生成进度
- 视频下载状态
- 代理连接状态

## 🤝 贡献

我们欢迎贡献！请按照以下步骤操作：

### 贡献流程

1. **Fork 仓库**
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   git clone https://github.com/yourusername/opendub.git
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **提交您的更改**
   ```bash
   git commit -m '添加惊艳功能'
   ```

4. **推送到分支**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **打开拉取请求**
   - 访问 GitHub 仓库
   - 点击 "New Pull Request"
   - 描述您的更改

### 开发指南

- **代码风格**：遵循 ESLint 配置
- **提交消息**：编写描述性的提交消息
- **测试**：为新功能添加测试
- **文档**：按需更新文档
- **性能**：确保新增功能不会影响性能

### 开发环境设置

```bash
# 1. 安装依赖
cd Backend && npm install
cd ../Frontend && npm install

# 2. 设置环境变量
cp Backend/.env.example Backend/.env
# 编辑 .env 文件，填入您的 API 密钥

# 3. 启动开发服务器
# 终端 1：启动后端
cd Backend && npm start

# 终端 2：启动前端
cd Frontend && npm run dev

# 4. 访问 http://localhost:3000
```

## 📝 更新日志

### v1.1.0 (2026-06-22)

**新增功能：**
- ✨ 实时进度条显示（圆形进度环 + 进度条）
- 🔧 代理状态检查端点（`/api/proxy-status`）
- 🚀 异步处理（避免前端超时）
- 📊 步骤指示器（4个阶段可视化）
- 🎨 精美进度动画（SVG + CSS）

**修复：**
- 🐛 修复 `server.js` 端口默认值（3001 → 3002）
- 🐛 修复 `transcript-fetcher.js` 代理配置
- 🐛 修复前端轮询逻辑
- 🐛 修复进度显示时机问题

**优化：**
- ⚡ 改进字幕提取策略（3种备用方法）
- ⚡ 优化翻译批处理（减少API调用）
- ⚡ 改进错误处理和用户反馈

### v1.0.0 (2026-06-08)

**首次发布：**
- 🎬 YouTube 视频处理
- 📝 智能字幕提取
- 🌍 多语言翻译（16+ 语言）
- 🔊 自然语音生成
- ⏰ 精准音频对齐
- 🎭 专业视频合并

## 📄 许可证

本项目受 MIT 许可证授权 - 请参阅 [LICENSE](LICENSE) 文件获取详细信息。

## 🙏 鸣谢

- [youtube-transcript](https://github.com/Kakulukian/youtube-transcript) 用于字幕提取
- [RapidAPI](https://rapidapi.com/) 用于翻译服务
- [FFmpeg](https://ffmpeg.org/) 用于视频/音频处理
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) 用于可靠的 YouTube 下载
- [Google TTS](https://github.com/zlargon/google-tts) 用于语音合成
- [undici](https://github.com/nodejs/undici) 用于代理支持
- [Next.js](https://nextjs.org/) 用于前端框架
- [Tailwind CSS](https://tailwindcss.com/) 用于样式

## 📞 支持

如果您遇到任何问题或有功能建议，请：

1. **查看文档**：阅读本文档的故障排除部分
2. **搜索问题**：在 [GitHub Issues](https://github.com/skyconfig/opendub/issues) 中搜索类似问题
3. **创建新问题**：如果找不到解决方案，请创建新的 Issue
4. **联系维护者**：通过 GitHub 联系项目维护者

## 🌟 展示您的配音视频

如果您使用 DubFlow 创建了出色的配音视频，我们很乐意看到！

请在 [GitHub Discussions](https://github.com/skyconfig/opendub/discussions) 中分享您的作品！

---

**用 ❤️ 为全球内容创作者制作**

**作者：** skyconfig  
**仓库：** https://github.com/skyconfig/opendub  
**最后更新：** 2026-06-22
