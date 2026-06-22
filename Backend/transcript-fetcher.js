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

// Main: fetch transcript using youtube-transcript package
const fetchTranscript = async (videoId) => {
    if (!videoId || typeof videoId !== 'string' || videoId.length !== 11) {
        throw new Error('Invalid YouTube video ID');
    }

    console.log(`📝 fetchTranscript(${videoId}) via youtube-transcript...`);

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
        console.log(`  en failed: ${err.message}`);
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
        console.log(`  auto-sub failed: ${err.message}`);
    }

    // Strategy 3: fallback to yt-dlp (if available)
    console.log(`  Trying yt-dlp fallback...`);
    try {
        const segments = await fetchTranscriptWithYtDlp(videoId);
        if (segments && segments.length > 0) {
            console.log(`  ✅ Got ${segments.length} segments via yt-dlp fallback`);
            return segments;
        }
    } catch (err) {
        console.log(`  yt-dlp fallback failed: ${err.message}`);
    }

    throw new Error(
        `No subtitles found for video ${videoId}. ` +
        `The video may not have subtitles enabled, or the proxy may not be working. ` +
        `Try a different video with manual subtitles.`
    );
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
