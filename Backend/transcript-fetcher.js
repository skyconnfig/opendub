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
const fetchTranscriptWithWhisper = async (videoId) => {
    const apiKey = process.env.AGNES_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log(`  [Whisper] No AGNES_API_KEY or OPENAI_API_KEY, skipping...`);
        return null;
    }

    console.log(`  [Whisper] Downloading audio for ${videoId}...`);
    const audioPath = path.join(tmpDir, `${videoId}.mp3`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        // Download audio only
        const args = [
            '--force-overwrite',
            '-x', '--audio-format', 'mp3',
            '--no-warnings',
        ];
        if (process.env.PROXY_URL) {
            args.push('--proxy', process.env.PROXY_URL);
        }
        args.push('-o', audioPath, videoUrl);

        await new Promise((resolve, reject) => {
            const proc = require('child_process').spawn('yt-dlp', args, { stdio: 'ignore' });
            proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`yt-dlp exited ${code}`)));
            proc.on('error', reject);
            setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('yt-dlp timed out')); }, 60000);
        });

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
        // Clean up audio file
        try { fsSync.unlinkSync(audioPath); } catch (e) {}
    }
};

// Main: fetch transcript using youtube-transcript package
const fetchTranscript = async (videoId) => {
    if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
        throw new Error('Invalid YouTube video ID');
    }

    console.log(`📝 fetchTranscript(${videoId}) via youtube-transcript...`);

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
        const segments = await fetchTranscriptWithYtDlp(videoId);
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
            const segments = await fetchTranscriptWithWhisper(videoId);
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
    helpMsg += `可能原因：\n`;
    helpMsg += `  1. 视频作者已禁用字幕功能\n`;
    helpMsg += `  2. 视频没有任何字幕（自动生成或手动上传）\n`;
    helpMsg += `  3. 代理连接不稳定，请稍后重试\n\n`;

    // Check if Whisper is available
    const whisperKey = process.env.AGNES_API_KEY || process.env.OPENAI_API_KEY;
    if (!whisperKey) {
        helpMsg += `💡 解决方案：在 .env 中配置 AGNES_API_KEY 或 OPENAI_API_KEY\n`;
        helpMsg += `   配置后，系统会自动用 Whisper AI 语音识别提取字幕。\n\n`;
    }

    helpMsg += `推荐测试视频（100% 有字幕）：\n`;
    helpMsg += `  • https://www.youtube.com/watch?v=dQw4w9WgXcQ （Rick Astley）\n`;
    helpMsg += `  • https://www.youtube.com/watch?v=8jPQjjsBbIc （TED 演讲）\n`;
    helpMsg += `  • https://www.youtube.com/watch?v=C8EKiG581xc （国家地理）\n\n`;
    helpMsg += `技术详情：${errors.slice(0, 3).join('; ')}`;

    throw new Error(helpMsg);
};

// Fallback: use yt-dlp to download subtitles
const fetchTranscriptWithYtDlp = async (videoId) => {
    const { spawn } = require('child_process');
    
    const outputBase = path.join(tmpDir, videoId);
    
    // Try auto-generated subtitles first
    const args = ['--force-overwrite', '--write-auto-sub', '--skip-download', '--sub-format', 'srt', '--no-warnings'];
    
    if (process.env.PROXY_URL) {
        args.push('--proxy', process.env.PROXY_URL);
    }
    
    args.push('-o', outputBase, `https://www.youtube.com/watch?v=${videoId}`);
    
    return new Promise((resolve, reject) => {
        console.log(`  [yt-dlp] Running: yt-dlp ${args.join(' ')}`);
        const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
        
        // Timeout after 30 seconds
        setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error('yt-dlp timed out after 30000ms'));
        }, 30000);
    });
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
