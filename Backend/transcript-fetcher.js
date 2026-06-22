// transcript-fetcher.js
// Uses youtube-transcript package (fetch goes through proxy via undici)
require('dotenv').config();

const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

// 配置 fetch 走代理（必须在加载 youtube-transcript 之前设置）
if (process.env.PROXY_URL) {
    try {
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        setGlobalDispatcher(new ProxyAgent({ uri: process.env.PROXY_URL }));
        console.log(`[transcript-fetcher] ✅ fetch → proxy: ${process.env.PROXY_URL}`);
    } catch (err) {
        console.warn(`[transcript-fetcher] ⚠️ Cannot set proxy for fetch: ${err.message}`);
    }
} else {
    console.log(`[transcript-fetcher] No PROXY_URL set`);
}

const tmpDir = path.join(__dirname, 'downloads', 'subs');
fsSync.mkdirSync(tmpDir, { recursive: true });
console.log(`[transcript-fetcher] tmpDir = ${tmpDir}`);

// Parse SRT subtitle format (fallback if youtube-transcript fails)
const parseSrt = (content) => {
    const blocks = content.trim().split(/\n\n/);
    return blocks.map(block => {
        const lines = block.split('\n');
        if (lines.length < 2) return null;
        const timeLine = lines[1];
        if (!timeLine || !timeLine.includes(' --> ')) return null;
        const [startStr, endStr] = timeLine.split(' --> ');
        const text = lines.slice(2).join(' ').replace(/<[^>]+>/g, '').trim();
        if (!text) return null;
        return {
            text,
            start: srtTimeToSec(startStr),
            duration: srtTimeToSec(endStr) - srtTimeToSec(startStr),
        };
    }).filter(Boolean);
};

const srtTimeToSec = (str) => {
    const [hms, ms] = str.split(',');
    const parts = hms.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + (parseInt(ms) || 0) / 1000;
};

// Strategy 5: use Whisper API to transcribe video audio (when all subtitle methods fail)
const fetchTranscriptWithWhisper = async (videoId, options = {}) => {
    const { cookies } = options || {};
    const apiKey = process.env.AGNES_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log(`  [Whisper] No AGNES_API_KEY or OPENAI_API_KEY, skipping...`);
        return null;
    }

    console.log(`  [Whisper] Downloading audio for ${videoId}...`);
    const audioPath = path.join(tmpDir, `${videoId}.mp3`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        // Download audio only - with multi-browser cookie fallback
        const baseAudioArgs = [
            '--force-overwrite',
            '-x', '--audio-format', 'mp3',
            '--no-warnings',
        ];
        if (process.env.PROXY_URL) {
            baseAudioArgs.push('--proxy', process.env.PROXY_URL);
        }

        // Helper to run yt-dlp audio download
        const downloadAudio = async (extraArgs) => {
            const fullArgs = [...baseAudioArgs, ...extraArgs, '-o', audioPath, videoUrl];
            await new Promise((resolve, reject) => {
                console.log(`  [Whisper] Audio download args: yt-dlp ${fullArgs.filter(a => !a.includes('cookies')).join(' ')}`);
                const proc = require('child_process').spawn('yt-dlp', fullArgs, { stdio: 'ignore' });
                proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`yt-dlp exited ${code}`)));
                proc.on('error', reject);
                setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('yt-dlp timed out')); }, 60000);
            });
        };

        // Try manual cookies first
        let cookieFile = null;
        if (cookies && cookies.trim()) {
            cookieFile = path.join(tmpDir, `${videoId}_cookies.txt`);
            fsSync.writeFileSync(cookieFile, cookies.trim(), 'utf8');
            console.log(`  [Whisper] Using manual cookies`);
            try { await downloadAudio(['--cookies', cookieFile]); }
            finally { try { fsSync.unlinkSync(cookieFile); } catch(e) {} }
        } else {
            // Try each browser
            const browsers = ['chrome', 'edge', 'firefox'];
            let audioOk = false;
            for (const browser of browsers) {
                try {
                    console.log(`  [Whisper] Trying --cookies-from-browser ${browser}...`);
                    await downloadAudio(['--cookies-from-browser', browser]);
                    audioOk = true;
                    break;
                } catch (err) {
                    console.log(`  [Whisper] ${browser} failed: ${(err.message||'').substring(0, 100)}`);
                    if (!(err.message || '').toLowerCase().includes('cookie')) throw err;
                }
            }
            if (!audioOk) throw new Error('All browser cookie methods failed for audio download');
        }

        if (!fsSync.existsSync(audioPath)) {
            throw new Error('Audio download failed - file not found');
        }

        console.log(`  [Whisper] Calling OpenAI Whisper API...`);
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fsSync.createReadStream(audioPath));
        form.append('model', 'whisper-1');
        form.append('response_format', 'verbose_json');
        form.append('timestamp_granularities', 'segment');

        // Support both Agnes AI and OpenAI
        const apiKey = process.env.AGNES_API_KEY || process.env.OPENAI_API_KEY;
        const baseUrl = (process.env.AGNES_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const provider = process.env.AGNES_API_KEY ? 'Agnes AI' : 'OpenAI';

        if (!apiKey) {
            throw new Error('No API key (AGNES_API_KEY or OPENAI_API_KEY) for Whisper');
        }

        const axios = require('axios');
        console.log(`  [Whisper] Using ${provider} API: ${baseUrl}/audio/transcriptions`);
        const response = await axios.post(`${baseUrl}/audio/transcriptions`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${apiKey}`,
            },
            maxBodyLength: Infinity,
            timeout: 120000,
        });

        const segments = response.data.segments || [];
        if (segments.length === 0) {
            throw new Error('Whisper returned empty segments');
        }

        const result = segments.map(seg => ({
            text: seg.text.trim(),
            start: seg.start,
            duration: seg.end - seg.start,
        }));

        console.log(`  ✅ [Whisper] Got ${result.length} segments`);
        return result;

    } catch (err) {
        console.log(`  [Whisper] Failed: ${err.message}`);
        throw err;
    } finally {
        // Clean up audio file and cookie file
        try { fsSync.unlinkSync(audioPath); } catch (e) {}
        try { fsSync.unlinkSync(path.join(tmpDir, `${videoId}_cookies.txt`)); } catch (e) {}
    }
};

// Main: fetch transcript using youtube-transcript package
const fetchTranscript = async (videoId, options = {}) => {
    if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
        throw new Error('Invalid YouTube video ID');
    }

    const { cookies } = options;
    console.log(`📝 fetchTranscript(${videoId})${cookies ? ' [with cookies]' : ''}...`);

    const errors = []; // Collect all errors for better debugging

    // Strategy 1: try english subtitles first
    try {
        console.log(`  Trying lang=en...`);
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        if (transcript && transcript.length > 0) {
            const segments = transcript.map(item => ({
                text: item.text,
                start: item.offset / 1000, // ms to seconds
                duration: item.duration / 1000,
            }));
            console.log(`  ✅ Got ${segments.length} segments (lang=en)`);
            return segments;
        }
    } catch (err) {
        const msg = err.message;
        console.log(`  en failed: ${msg}`);
        errors.push(`en: ${msg}`);
        // DON'T throw on "disabled" - continue to yt-dlp & Whisper fallbacks!
    }

    // Strategy 2: try auto-generated subtitles (no lang specified)
    try {
        console.log(`  Trying auto-generated subtitles...`);
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        if (transcript && transcript.length > 0) {
            const segments = transcript.map(item => ({
                text: item.text,
                start: item.offset / 1000,
                duration: item.duration / 1000,
            }));
            console.log(`  ✅ Got ${segments.length} auto-generated segments`);
            return segments;
        }
    } catch (err) {
        const msg = err.message;
        console.log(`  auto-sub failed: ${msg}`);
        errors.push(`auto: ${msg}`);
        // DON'T throw on "disabled" - continue to yt-dlp & Whisper fallbacks!
    }

    // Strategy 3: try more language variants
    const langList = ['zh-Hans', 'zh-Hant', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru'];
    for (const lang of langList) {
        try {
            console.log(`  Trying lang=${lang}...`);
            const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
            if (transcript && transcript.length > 0) {
                const segments = transcript.map(item => ({
                    text: item.text,
                    start: item.offset / 1000,
                    duration: item.duration / 1000,
                }));
                console.log(`  ✅ Got ${segments.length} segments (lang=${lang})`);
                return segments;
            }
        } catch (err) {
            const msg = err.message;
            errors.push(`${lang}: ${msg}`);
            // Skip other langs if disabled
            if (msg.includes('Transcript is disabled')) break;
        }
    }

    // Strategy 4: fallback to yt-dlp (if available)
    console.log(`  Trying yt-dlp fallback...`);
    try {
        const segments = await fetchTranscriptWithYtDlp(videoId, { cookies });
        if (segments && segments.length > 0) {
            console.log(`  ✅ Got ${segments.length} segments via yt-dlp fallback`);
            return segments;
        }
    } catch (err) {
        console.log(`  yt-dlp fallback failed: ${err.message}`);
        errors.push(`yt-dlp: ${err.message}`);
    }

    // Strategy 5: fallback to Whisper API (transcribe audio directly)
    const whisperApiKey = process.env.AGNES_API_KEY || process.env.OPENAI_API_KEY;
    if (whisperApiKey) {
        console.log(`  Trying Whisper API fallback...`);
        try {
            const segments = await fetchTranscriptWithWhisper(videoId, { cookies });
            if (segments && segments.length > 0) {
                console.log(`  ✅ Got ${segments.length} segments via Whisper API`);
                return segments;
            }
        } catch (err) {
            console.log(`  Whisper API failed: ${err.message}`);
            errors.push(`whisper: ${err.message}`);
        }
    } else {
        console.log(`  [Whisper] Skipped - no AGNES_API_KEY or OPENAI_API_KEY`);
        errors.push(`whisper: No API key set (add AGNES_API_KEY or OPENAI_API_KEY to .env to enable speech-to-text fallback)`);
    }

    // All strategies failed - build helpful error
    let helpMsg = `无法获取视频 ${videoId} 的字幕。\n\n`;
    helpMsg += `原因：该视频需要 YouTube 登录验证（作者禁用了公开字幕）\n\n`;

    helpMsg += `🔧 请按以下步骤操作（二选一）：\n\n`;
    helpMsg += `方案 A — 自动检测（推荐）：\n`;
    helpMsg += `  1. 关闭所有 Chrome/Edge 浏览器窗口\n`;
    helpMsg += `  2. 重新点「开始配音」\n`;
    helpMsg += `  系统会自动读取浏览器的 YouTube 登录状态\n\n`;

    helpMsg += `方案 B — 手动粘贴 Cookie：\n`;
    helpMsg += `  1. 安装浏览器扩展 "Get cookies.txt"\n`;
    helpMsg += `  2. 打开 YouTube 并确认已登录\n`;
    helpMsg += `  3. 点击扩展图标 → 导出 Cookies（Netscape 格式）\n`;
    helpMsg += `  4. 在本页「⚙️ 高级选项」中粘贴 Cookie\n`;
    helpMsg += `  5. 重新点「开始配音」\n\n`;

    helpMsg += `推荐测试视频（100% 有字幕）：\n`;
    helpMsg += `  • https://www.youtube.com/watch?v=dQw4w9WgXcQ （Rick Astley）\n`;
    helpMsg += `  • https://www.youtube.com/watch?v=8jPQjjsBbIc （TED 演讲）\n`;
    helpMsg += `  • https://www.youtube.com/watch?v=C8EKiG581xc （国家地理）\n\n`;
    helpMsg += `技术详情（共 ${errors.length} 个策略尝试）：\n`;
    errors.forEach((e, i) => {
        helpMsg += `  ${i + 1}. ${e}\n`;
    });

    throw new Error(helpMsg);
};

// Fallback: use yt-dlp to download subtitles
const fetchTranscriptWithYtDlp = async (videoId, options = {}) => {
    const { spawn } = require('child_process');
    const { cookies } = options || {};

    const outputBase = path.join(tmpDir, videoId);

    // Try auto-generated subtitles first
    const baseArgs = ['--force-overwrite', '--write-auto-sub', '--skip-download', '--sub-format', 'srt', '--no-warnings'];

    if (process.env.PROXY_URL) {
        baseArgs.push('--proxy', process.env.PROXY_URL);
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Helper: run yt-dlp and parse result
    const runYtDlp = async (extraArgs) => {
        const fullArgs = [...baseArgs, ...extraArgs, '-o', outputBase, videoUrl];

        return new Promise((resolve, reject) => {
            console.log(`  [yt-dlp] Running: yt-dlp ${fullArgs.filter(a => !a.includes('cookies')).join(' ')}`);
            const proc = spawn('yt-dlp', fullArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (d) => { stdout += d.toString(); });
            proc.stderr.on('data', (d) => { stderr += d.toString(); });

            proc.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const files = await fs.readdir(tmpDir);
                        const subFile = files.find(f => f.includes(videoId) && f.endsWith('.srt'));
                        if (subFile) {
                            const content = await fs.readFile(path.join(tmpDir, subFile), 'utf8');
                            const segments = parseSrt(content);
                            if (segments && segments.length > 0) {
                                resolve(segments);
                                return;
                            }
                        }
                        reject(new Error('Subtitle file not found or empty'));
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error(`yt-dlp exited ${code}: ${stderr || stdout || 'unknown error'}`));
                }
            });

            proc.on('error', reject);
            setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('yt-dlp timed out')); }, 30000);
        });
    };

    // Priority 1: User-provided cookies (manual paste)
    if (cookies && cookies.trim()) {
        const cookieFile = path.join(tmpDir, `${videoId}_cookies.txt`);
        fsSync.writeFileSync(cookieFile, cookies.trim(), 'utf8');
        console.log(`  [yt-dlp] Using manual cookies`);
        try {
            return await runYtDlp(['--cookies', cookieFile]);
        } finally {
            try { fsSync.unlinkSync(cookieFile); } catch (e) {}
        }
    }

    // Priority 2: Auto-extract from browser (try multiple browsers in order)
    const browsers = ['chrome', 'edge', 'firefox'];
    let lastError = null;

    for (const browser of browsers) {
        try {
            console.log(`  [yt-dlp] Trying --cookies-from-browser ${browser}...`);
            return await runYtDlp(['--cookies-from-browser', browser]);
        } catch (err) {
            lastError = err;
            const msg = err.message || '';
            console.log(`  [yt-dlp] ${browser} failed: ${msg.substring(0, 120)}`);

            // If it's not a cookie-related error, no point trying other browsers
            if (!msg.toLowerCase().includes('cookie')) {
                throw err;
            }
        }
    }

    throw lastError || new Error('All browser cookie extraction methods failed');
};

// Validate transcript availability (for /api/check-transcript endpoint)
const validateTranscriptAvailability = async (videoId) => {
    try {
        console.log(`validateTranscriptAvailability(${videoId})...`);
        const transcript = await fetchTranscript(videoId);
        return {
            available: true,
            segmentCount: transcript.length,
            totalDuration: Math.max(...transcript.map(t => t.start + t.duration)),
            preview: transcript.slice(0, 3).map(t => t.text).join(' ')
        };
    } catch (error) {
        console.log(`validateTranscriptAvailability(${videoId}) failed: ${error.message}`);
        return {
            available: false,
            error: error.message
        };
    }
};

module.exports = {
    fetchTranscript,
    validateTranscriptAvailability
};
