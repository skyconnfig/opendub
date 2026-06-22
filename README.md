# 🎙️ DubFlow - AI驱动的YouTube视频配音

使用AI配音技术将任何YouTube视频转化为多种语言。DubFlow自动提取字幕，翻译内容，生成自然流畅的语音，并制作出专业的配音视频。

![DubFlow Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-v18+-blue) ![Next.js](https://img.shields.io/badge/Next.js-v13+-black)

## ✨ 功能特色

- 🎬 **YouTube视频处理**：无缝下载和处理YouTube视频
- 📝 **智能字幕提取**：多策略获取（youtube-transcript → yt-dlp → Whisper API），支持代理
- 🌍 **多语言翻译**：支持40+种语言，使用 OpenAI 兼容接口（Agnes AI / DeepSeek / OpenAI）
- 🔊 **自然语音生成**：**Edge TTS** 免费高质量神经网络语音（100+ 语音）
- ⏰ **精准音频对齐**：保持原始时间同步
- 🎭 **专业视频合并**：将配音音频与原始视频合并
- 📊 **实时进度跟踪**：圆形进度环 + 进度条 + 步骤指示器
- 🔧 **代理支持**：支持 HTTP/SOCKS5 代理，解决网络限制问题
- 🚀 **异步处理**：后端异步处理，前端实时轮询进度
- 🎨 **现代UI/UX**：精美渐变界面，流畅动画
- 📄 **SRT字幕生成**：自动生成翻译后的SRT字幕文件

## 🎯 支持语言

### 翻译支持（40+ 语言）
通过 OpenAI 兼容接口（Agnes AI / DeepSeek）支持所有主流语言。

### 语音合成支持（Edge TTS - 100+ 语音）

| 语言 | 推荐语音 | 语音名称 |
|------|----------|----------|
| 中文（简体） | 女声 | `zh-CN-XiaoxiaoNeural` (晓晓) |
| 中文（简体） | 男声 | `zh-CN-YunxiNeural` (云希) |
| 中文（台湾） | 女声 | `zh-TW-HsiaoChenNeural` |
| 英语（美国） | 女声 | `en-US-JennyNeural` |
| 英语（英国） | 女声 | `en-GB-SoniaNeural` |
| 日语 | 女声 | `ja-JP-NanamiNeural` |
| 韩语 | 女声 | `ko-KR-SunHiNeural` |
| 西班牙语 | 女声 | `es-ES-ElviraNeural` |
| 法语 | 女声 | `fr-FR-DeniseNeural` |
| 德语 | 女声 | `de-DE-KatjaNeural` |
| 更多... | - | 查看 `Backend/tts-engine.js` |

## 🏗️ 架构

### 后端 (Node.js/Express) - 端口 3002

- **字幕提取**：多策略获取
  1. `youtube-transcript` npm 包（优先）
  2. `yt-dlp` 后备方案
  3. Whisper API 兜底（需配置）
- **翻译服务**：**OpenAI 兼容接口**（优先级）：
  1. **Agnes AI**（推荐 - 低成本/免费）
  2. **DeepSeek**（低成本替代）
  3. **OpenAI**（原始方案 - 较高成本）
  4. RapidAPI（已弃用，仅作后备）
- **音频处理**：FFmpeg 音频处理和合并
- **视频处理**：yt-dlp 可靠视频下载
- **语音合成**：**Edge TTS**（免费，100+ 高质量神经网络语音）
- **异步处理**：返回 202 + jobId，后台处理任务
- **进度跟踪**：内存存储实时进度（5% → 100%）
- **字幕生成**：自动生成翻译后的 SRT 字幕文件

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
- yt-dlp 安装
- **翻译API密钥**（任选其一）：
  - Agnes AI API Key（推荐 - 低成本/免费）
  - DeepSeek API Key（低成本替代）
  - OpenAI API Key（较高成本）
- **代理软件**（访问YouTube必需）：V2Ray / Clash / Shadowsocks

### 安装

#### 1. 克隆仓库

```bash
git clone https://github.com/skyconnfig/opendub.git
cd opendub
```

#### 2. 安装后端依赖

```bash
cd Backend
npm install
```

**安装的NPM包：**
- `express` - Web 框架
- `cors` - 跨域支持
- `axios` - HTTP 客户端
- `fluent-ffmpeg` - 音频/视频处理
- `youtube-transcript` - 字幕提取
- `node-edge-tts` - **Edge TTS 语音合成**（免费）
- `uuid` - 唯一ID生成

#### 3. 安装前端依赖

```bash
cd ../Frontend
npm install
```

#### 4. 设置环境变量

**步骤 1：复制配置模板**
```bash
cd ../Backend
cp .env.example .env
```

**步骤 2：编辑 `.env` 文件**

```env
# ==========================================
# 服务器配置
# ==========================================
PORT=3002

# ==========================================
# 翻译引擎配置（OpenAI 兼容接口）
# ==========================================
# 选项 1：Agnes AI（推荐 - 低成本/免费）
AGNES_API_KEY=sk-your_agnes_key_here
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
AGNES_MODEL=agnes-2.0-flash

# 选项 2：DeepSeek（低成本替代）
# DEEPSEEK_API_KEY=sk-your_deepseek_key_here

# 选项 3：OpenAI（原始方案 - 较高成本）
# OPENAI_API_KEY=sk-your_openai_key_here

# ==========================================
# 语音合成配置（Edge TTS - 免费）
# ==========================================
# Edge TTS 无需 API Key！开箱即用！

# 默认语音（中文）
# 可选：zh-CN-XiaoxiaoNeural（晓晓 - 推荐）
#       zh-CN-YunxiNeural（云希）
EDGE_TTS_DEFAULT_VOICE=zh-CN-XiaoxiaoNeural

# ==========================================
# 代理配置（访问 YouTube 必需）
# ==========================================
# HTTP 代理示例（Clash）：
PROXY_URL=http://127.0.0.1:7890

# SOCKS5 代理示例（V2Ray）：
# PROXY_URL=socks5://127.0.0.1:10808

# ==========================================
# 调试配置
# ==========================================
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
curl -x http://127.0.0.1:7890 https://www.youtube.com

# 如果返回 HTML，代理工作正常
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
node server.js
```

后端将运行在 http://localhost:3002

### 启动前端开发服务器

```bash
cd ../Frontend
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
    "srtUrl": "/downloads/uuid/translated_subtitles.srt",
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
  "message": "代理连接正常 (http://127.0.0.1:7890)",
  "proxyUrl": "http://127.0.0.1:7890"
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
  "translateStatus": "Agnes AI Connected",
  "ttsStatus": "Edge TTS Ready (Free)"
}
```

## 🔧 配置

### 环境变量

| 变量 | 描述 | 是否必须 | 默认值 |
|------|-------|----------|---------|
| `PORT` | 后端服务器端口 | 否 | 3002 |
| `AGNES_API_KEY` | Agnes AI API 密钥 | **推荐** | - |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 可选 | - |
| `OPENAI_API_KEY` | OpenAI API 密钥 | 可选 | - |
| `PROXY_URL` | 代理URL（HTTP 或 SOCKS5） | **是** | - |
| `EDGE_TTS_DEFAULT_VOICE` | 默认 Edge TTS 语音 | 否 | `zh-CN-XiaoxiaoNeural` |
| `DEBUG` | 调试模式 | 否 | `false` |

### 自定义选项

- **翻译批次大小**：调整后端代码中的 `batchSize`（默认 20 条）
- **语音选择**：修改 `Backend/tts-engine.js` 中的 `edgeTTSVoiceMap`
- **重试逻辑**：配置字幕获取的重试次数和延迟
- **音频质量**：修改 FFmpeg 设置，获取不同音频质量

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
- 视频使用自动生成字幕（可能不可用）

**解决方法：**
```bash
# 1. 检查代理是否工作
curl -x http://127.0.0.1:7890 https://www.youtube.com

# 2. 使用有手动字幕的视频测试
# 推荐测试视频（Rick Astley - Never Gonna Give You Up）：
# https://www.youtube.com/watch?v=dQw4w9WgXcQ

# 3. 查看友好错误提示
# 应用会显示推荐测试视频列表
```

#### 2. 翻译失败（所有翻译都返回原文或出现错误）

**原因：**
- API 密钥无效或配额用完
- API 基础URL配置错误
- 网络连接问题

**解决方法：**
```bash
# 1. 检查 API 密钥
echo $AGNES_API_KEY

# 2. 检查 .env 配置
cat Backend/.env | grep -E "AGNES|DEEPSEEK|OPENAI"

# 3. 查看后端日志
# 翻译错误会显示在终端中
```

#### 3. 语音生成失败

**原因：**
- Edge TTS 包未正确安装
- 网络连接问题（Edge TTS 需要访问微软服务器）

**解决方法：**
```bash
# 1. 重新安装 Edge TTS
cd Backend
npm uninstall node-edge-tts
npm install node-edge-tts

# 2. 检查网络连接
curl -I https://speech.platform.bing.com

# 3. 查看后端日志
# Edge TTS 错误会显示在终端中
```

#### 4. 视频下载问题

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

#### 5. FFmpeg 错误

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

#### 6. 代理连接失败

**原因：**
- 代理软件未启动
- 代理端口配置错误
- 代理类型错误（HTTP vs SOCKS5）

**解决方法：**
```bash
# 1. 检查代理软件是否运行
netstat -ano | findstr :7890

# 2. 检查代理类型
# HTTP 代理：
PROXY_URL=http://127.0.0.1:7890

# SOCKS5 代理（V2Ray/Clash）：
PROXY_URL=socks5://127.0.0.1:10808

# 3. 测试代理
curl -x http://127.0.0.1:7890 https://www.youtube.com
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
- Edge TTS 语音生成日志

## 🏆 最佳实践

### 1. 翻译引擎选择

**推荐顺序：**

| 优先级 | 引擎 | 成本 | 质量 | 推荐场景 |
|--------|------|------|------|------------|
| 1 | **Agnes AI** | 免费/极低 | 高 | 生产环境（推荐） |
| 2 | **DeepSeek** | 低 | 高 | 成本敏感场景 |
| 3 | **OpenAI** | 中高 | 最高 | 预算充足场景 |

**配置示例：**

```env
# 推荐：Agnes AI（免费/低成本）
AGNES_API_KEY=sk-your_key_here
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
AGNES_MODEL=agnes-2.0-flash

# 或者：DeepSeek（低成本）
DEEPSEEK_API_KEY=sk-your_key_here

# 或者：OpenAI（高质量）
OPENAI_API_KEY=sk-your_key_here
```

### 2. 语音选择建议

**中文视频：**
- **女声**：`zh-CN-XiaoxiaoNeural`（晓晓 - 推荐）
- **男声**：`zh-CN-YunxiNeural`（云希）

**英文视频：**
- **女声**：`en-US-JennyNeural`（推荐）
- **男声**：`en-US-GuyNeural`

**其他语言：**
- 日语：`ja-JP-NanamiNeural`
- 韩语：`ko-KR-SunHiNeural`
- 西班牙语：`es-ES-ElviraNeural`
- 法语：`fr-FR-DeniseNeural`

查看完整语音列表：`Backend/tts-engine.js`

### 3. 性能优化

**翻译批次大小：**
```javascript
// 在 server.js 中修改 batchSize
const batchSize = 20; // 默认 20 条/批
```

**建议：**
- 短视频（< 5分钟）：`batchSize = 20`
- 长视频（> 5分钟）：`batchSize = 10`（避免超时）

**并发控制：**
- Edge TTS 语音生成是串行的（避免API限制）
- 翻译是并行的（批次内并行，批次间串行）

### 4. 错误处理

**翻译失败策略：**
- 单个字幕翻译失败不会影响整体流程
- 失败的翻译会保留原文
- `translationErrors` 字段显示失败数量

**无字幕视频处理：**
- 应用会显示友好错误提示
- 推荐有字幕的测试视频
- 未来版本将支持 Whisper API 自动生成字幕

### 5. 代理配置

**HTTP 代理（推荐）：**
```env
PROXY_URL=http://127.0.0.1:7890
```

**SOCKS5 代理（V2Ray）：**
```env
PROXY_URL=socks5://127.0.0.1:10808
```

**测试代理连接：**
```bash
# 后端提供代理状态端点
curl http://localhost:3002/api/proxy-status
```

### 6. 字幕获取策略

**三层兜底机制：**

1. **第一层**：`youtube-transcript` npm 包（最快）
2. **第二层**：`yt-dlp` 字幕下载（最可靠）
3. **第三层**：Whisper API 自动生成（需配置，未来支持）

**自动切换**：如果第一层失败，自动尝试第二层。

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
cd Backend && node server.js

# 终端 2：启动前端
cd Frontend && npm run dev

# 4. 访问 http://localhost:3000
```

## 📝 更新日志

### v1.2.0 (2026-06-22)

**🎉 重大更新：Edge TTS 集成 + OpenAI 兼容翻译引擎**

**新增功能：**
- ✨ **Edge TTS 集成**：免费高质量神经网络语音合成（100+ 语音）
- ✨ **OpenAI 兼容翻译**：支持 Agnes AI、DeepSeek、OpenAI
- ✨ **SRT 字幕生成**：自动生成翻译后的 SRT 字幕文件
- ✨ **多策略字幕获取**：3层兜底机制（youtube-transcript → yt-dlp → Whisper API）
- ✨ **tts-engine.js 模块**：独立的 TTS 引擎封装
- ✨ **.env.example 模板**：完整的配置模板和文档

**修复：**
- 🐛 修复 `util.promisify` 引用错误
- 🐛 修复翻译失败后卡住的问题（添加 `failFast: true`）
- 🐛 修复 `.env` 变量名错误（`OPENAI_API_KEY` → `AGNES_API_KEY`）
- 🐛 修复 `process.env.OPENAI_API_KEY` 判断逻辑

**优化：**
- ⚡ 移除 `gTTS` 依赖（已被 Edge TTS 替代）
- ⚡ 优化翻译批次处理（默认 20 条/批）
- ⚡ 改进错误处理和用户反馈
- ⚡ 添加翻译重试机制

**技术栈更新：**
- 语音合成：~~`gTTS`~~ → **`Edge TTS`** (免费)
- 翻译引擎：~~`RapidAPI`~~ → **`OpenAI 兼容接口`** (Agnes AI / DeepSeek)

### v1.1.0 (2026-06-22)

**新增功能：**
- ✨ 实时进度条显示（圆形进度环 + 进度条）
- ✨ 代理状态检查端点（`/api/proxy-status`）
- ✨ 异步处理（避免前端超时）
- ✨ 步骤指示器（4个阶段可视化）
- ✨ 精美进度动画（SVG + CSS）

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

- [youtube-transcript](https://github.com/KhalidLukman/youtube-transcript) 用于字幕提取
- [Agnes AI](https://agnes-ai.com/) 用于低成本翻译服务
- [DeepSeek](https://www.deepseek.com/) 用于低成本翻译服务
- [OpenAI](https://openai.com/) 用于翻译 API 兼容接口
- [Edge TTS](https://github.com/rany2/edge-tts) 用于免费高质量语音合成
- [FFmpeg](https://ffmpeg.org/) 用于视频/音频处理
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) 用于可靠的 YouTube 下载
- [undici](https://github.com/nodejs/undici) 用于代理支持
- [Next.js](https://nextjs.org/) 用于前端框架
- [Tailwind CSS](https://tailwindcss.com/) 用于样式

## 📞 支持

如果您遇到任何问题或有功能建议，请：

1. **查看文档**：阅读本文档的故障排除部分
2. **搜索问题**：在 [GitHub Issues](https://github.com/skyconnfig/opendub/issues) 中搜索类似问题
3. **创建新问题**：如果找不到解决方案，请创建新的 Issue
4. **联系维护者**：通过 GitHub 联系项目维护者

## 🌟 展示您的配音视频

如果您使用 DubFlow 创建了出色的配音视频，我们很乐意看到！

请在 [GitHub Discussions](https://github.com/skyconnfig/opendub/discussions) 中分享您的作品！

---

**用 ❤️ 为全球内容创作者制作**

**作者：** skyconnfig  
**仓库：** https://github.com/skyconnfig/opendub  
**最后更新：** 2026-06-22
