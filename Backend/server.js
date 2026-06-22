const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios'); // Added for RapidAPI requests
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');

// Import TTS engine (Edge TTS integration)
const { generateAudio } = require('./tts-engine');

// Import enhanced transcript fetching
const { fetchTranscript, validateTranscriptAvailability } = require('./transcript-fetcher');

const app = express();
const PORT = process.env.PORT || 3002;  // Fixed: use 3002 as default to match .env
const execAsync = promisify(exec);

// Job progress tracking
const jobProgress = {};

// Middleware
app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Load environment variables
require('dotenv').config();

// RapidAPI Configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'google-translator9.p.rapidapi.com';

// Initialize RapidAPI Translator
let translatorAvailable = false;
if (RAPIDAPI_KEY) {
    translatorAvailable = true;
    console.log('✅ RapidAPI Translator initialized');
} else {
    console.error('❌ RapidAPI key not found. Please set RAPIDAPI_KEY in your environment variables');
}

// Ensure downloads directory exists
const ensureDownloadsDir = async () => {
    const downloadsDir = path.join(__dirname, 'downloads');
    try {
        await fs.access(downloadsDir);
    } catch {
        await fs.mkdir(downloadsDir, { recursive: true });
    }
};

// Default voice for unsupported languages
// Create silence audio file
const createSilence = async (duration, outputPath) => {
    // Pure Node.js WAV generator - no ffmpeg lavfi dependency
    const safeDuration = Math.max(0.1, Math.min(duration, 3600));
    const sampleRate = 22050;
    const channels = 2;
    const bitsPerSample = 16;
    const numSamples = Math.ceil(sampleRate * safeDuration);
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const dataSize = numSamples * channels * bitsPerSample / 8;

    const buffer = Buffer.alloc(44 + dataSize); // 44-byte WAV header + silence

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4); // ChunkSize
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    // Data region is all zeros (silence) - Buffer.alloc already zero-filled

    try {
        const fsSync = require('fs');
        fsSync.writeFileSync(outputPath, buffer);
        console.log(`Created silence (pure WAV): ${safeDuration}s -> ${outputPath} (${Math.round(buffer.length / 1024)}KB)`);
        return outputPath;
    } catch (err) {
        console.error('Silence WAV creation failed:', err.message);
        throw err;
    }
};

// Concatenate audio files
const concatenateAudio = async (audioFiles, outputPath) => {
    return new Promise((resolve, reject) => {
        // Check if we have any audio files
        if (!audioFiles || audioFiles.length === 0) {
            return reject(new Error('No audio files to concatenate'));
        }
        
        // If only one file, just copy it
        if (audioFiles.length === 1) {
            const command = ffmpeg(audioFiles[0])
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', reject)
                .run();
            return;
        }
        
        const command = ffmpeg();
        
        // Add all input files
        audioFiles.forEach(file => {
            command.input(file);
        });
        
        // Create filter complex for concatenation
        const filterComplex = audioFiles.map((_, index) => `[${index}:0]`).join('') + 
                             `concat=n=${audioFiles.length}:v=0:a=1[out]`;
        
        command
            .complexFilter(filterComplex)
            .outputOptions(['-map', '[out]'])
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                console.error('FFmpeg concatenation error:', err);
                reject(err);
            })
            .run();
    });
};

// Download video using yt-dlp (more reliable than ytdl-core)
const downloadVideoOnly = async (videoId, outputPath) => {
    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Use yt-dlp which is more reliable than ytdl-core
        const command = `yt-dlp -f "bestvideo[ext=mp4]" --no-audio -o "${outputPath}" "${videoUrl}"`;
        
        console.log('Executing:', command);
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes('WARNING')) {
            console.error('yt-dlp stderr:', stderr);
        }
        
        // Check if file was created
        try {
            await fs.access(outputPath);
            return outputPath;
        } catch {
            throw new Error('Video file was not created successfully');
        }
        
    } catch (error) {
        console.error('yt-dlp error:', error);
        
        // Fallback: try with different format
        try {
            const fallbackCommand = `yt-dlp -f "best[ext=mp4]" --no-audio -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`;
            console.log('Trying fallback:', fallbackCommand);
            await execAsync(fallbackCommand);
            
            // Check if file was created
            await fs.access(outputPath);
            return outputPath;
        } catch (fallbackError) {
            throw new Error(`Failed to download video: ${error.message}. Fallback also failed: ${fallbackError.message}`);
        }
    }
};

// Alternative: Download video using youtube-dl
const downloadVideoWithYoutubeDl = async (videoId, outputPath) => {
    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const command = `youtube-dl -f "bestvideo[ext=mp4]" --no-audio -o "${outputPath}" "${videoUrl}"`;
        
        console.log('Executing youtube-dl:', command);
        await execAsync(command);
        
        // Check if file was created
        await fs.access(outputPath);
        return outputPath;
    } catch (error) {
        throw new Error(`youtube-dl failed: ${error.message}`);
    }
};

// Merge video and audio
const mergeVideoAudio = async (videoPath, audioPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions(['-c:v', 'copy', '-c:a', 'aac', '-strict', 'experimental', '-shortest'])
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .run();
    });
};

// New endpoint to check transcript availability
app.post('/api/check-transcript', async (req, res) => {
    const { videoUrl } = req.body;
    
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }
        
        console.log(`🔍 Checking transcript for video: ${videoId}`);
        const result = await validateTranscriptAvailability(videoId);
        
        res.json(result);
        
    } catch (error) {
        console.error('Error checking transcript:', error);
        res.status(500).json({
            error: 'Failed to check transcript availability',
            details: error.message
        });
    }
});

// Main dubbing endpoint - ASYNC with progress tracking
app.post('/api/dub-video', async (req, res) => {
    const { videoUrl, targetLanguage } = req.body;
    const jobId = uuidv4();
    
    // Initialize job progress
    jobProgress[jobId] = {
        status: 'starting',
        progress: 0,
        message: '正在初始化...',
        error: null,
        result: null
    };
    
    // Immediately return jobId
    res.status(202).json({
        success: true,
        jobId,
        message: '视频处理已开始，请轮询进度'
    });
    
    // Process in background
    processDubbingJob(jobId, videoUrl, targetLanguage).catch(err => {
        console.error(`Job ${jobId} failed:`, err);
        jobProgress[jobId].status = 'failed';
        jobProgress[jobId].error = err.message;
    });
});

// Background job processing function
async function processDubbingJob(jobId, videoUrl, targetLanguage) {
    try {
        await ensureDownloadsDir();
        
        console.log(`🎬 [${jobId}] Starting dubbing process...`);
        jobProgress[jobId].status = 'processing';
        jobProgress[jobId].message = '正在提取视频ID...';
        jobProgress[jobId].progress = 5;
        
        // Step 1: Extract video ID
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }
        
        console.log(`📹 [${jobId}] Video ID extracted: ${videoId}`);
        jobProgress[jobId].message = '正在提取字幕...';
        jobProgress[jobId].progress = 10;
        
        // Step 2: Fetch transcript
        console.log(`📝 [${jobId}] Fetching transcript...`);
        let transcript;
        try {
            transcript = await fetchTranscript(videoId);
        } catch (transcriptError) {
            throw new Error(`Transcript fetching failed: ${transcriptError.message}`);
        }
        
        if (!transcript || transcript.length === 0) {
            throw new Error('Empty transcript - video may not have captions');
        }
        
        console.log(`✅ [${jobId}] Fetched ${transcript.length} transcript segments`);
        jobProgress[jobId].message = '正在翻译内容...';
        jobProgress[jobId].progress = 30;
        
        // Step 3: Translate
        console.log(`🌐 [${jobId}] Translating transcript...`);
        let translatedTranscript;
        let translationErrors = 0;

        // Try Agnes AI / OpenAI first (more reliable)
        if (process.env.AGNES_API_KEY || process.env.OPENAI_API_KEY) {
            try {
                console.log(`🌐 [${jobId}] Trying OpenAI translation...`);
                translatedTranscript = await translateWithOpenAI(transcript, targetLanguage);
                if (translatedTranscript && translatedTranscript.length > 0) {
                    translationErrors = translatedTranscript.filter(item =>
                        item.text === item.translatedText && item.text.trim().length >= 2
                    ).length;
                    console.log(`✅ [${jobId}] OpenAI translation completed. ${translationErrors} errors.`);
                } else {
                    throw new Error('OpenAI returned empty result');
                }
            } catch (openaiError) {
                console.error(`⚠️ [${jobId}] OpenAI translation failed, trying RapidAPI:`, openaiError.message);
                translatedTranscript = null; // Reset to try RapidAPI
            }
        }

        // Fallback to RapidAPI if OpenAI failed or not configured
        if (!translatedTranscript) {
            try {
                console.log(`🌐 [${jobId}] Trying RapidAPI translation...`);
                translatedTranscript = await batchTranslateText(transcript, targetLanguage);
                translationErrors = translatedTranscript.filter(item =>
                    item.text === item.translatedText && item.text.trim().length >= 2
                ).length;
                console.log(`✅ [${jobId}] RapidAPI translation completed. ${translationErrors} errors.`);
            } catch (translateError) {
                console.error(`⚠️ [${jobId}] All translation failed, using original:`, translateError.message);
                translatedTranscript = transcript.map(item => ({
                    ...item,
                    translatedText: item.text
                }));
                translationErrors = transcript.length;
            }
        }
        
        jobProgress[jobId].message = '正在生成语音...';
        jobProgress[jobId].progress = 50;
        
        // Step 4: Generate audio clips
        console.log(`🔊 [${jobId}] Generating audio clips...`);
        const audioClips = [];
        const tempDir = path.join(__dirname, 'downloads', jobId);
        await fs.mkdir(tempDir, { recursive: true });
        
        let successfulClips = 0;
        const totalClips = translatedTranscript.length;
        
        for (let i = 0; i < translatedTranscript.length; i++) {
            const item = translatedTranscript[i];
            
            if (!item.translatedText || item.translatedText.trim().length < 2) {
                continue;
            }
            
            const audioPath = path.join(tempDir, `line_${i}.wav`);
            
            try {
                await generateAudio(item.translatedText, targetLanguage, audioPath);
                audioClips.push({
                    path: audioPath,
                    start: item.start,
                    duration: item.duration,
                    index: i
                });
                successfulClips++;
                
                // Update progress (50% to 70%)
                const audioProgress = 50 + Math.floor((i / totalClips) * 20);
                jobProgress[jobId].progress = audioProgress;
                jobProgress[jobId].message = `正在生成语音... (${successfulClips}/${totalClips})`;
                
            } catch (audioError) {
                console.error(`⚠️ [${jobId}] Audio gen failed for line ${i}:`, audioError.message);
                try {
                    const silenceDuration = Math.max(item.duration, 0.5);
                    const silencePath = path.join(tempDir, `silence_${i}.wav`);
                    await createSilence(silenceDuration, silencePath);
                    audioClips.push({
                        path: silencePath,
                        start: item.start,
                        duration: silenceDuration,
                        index: i
                    });
                    successfulClips++;
                } catch (silenceError) {
                    console.error(`⚠️ [${jobId}] Silence creation failed for line ${i}`);
                }
            }
        }
        
        if (audioClips.length === 0) {
            throw new Error('No audio clips were generated successfully.');
        }
        
        console.log(`✅ [${jobId}] Generated ${audioClips.length} audio clips`);
        jobProgress[jobId].message = '正在对齐音频...';
        jobProgress[jobId].progress = 72;
        
        // Step 5: Align and concatenate audio
        console.log(`⏰ [${jobId}] Aligning audio...`);
        audioClips.sort((a, b) => a.start - b.start);
        
        const alignedAudioFiles = [];
        let currentTime = 0;
        
        for (let i = 0; i < audioClips.length; i++) {
            const clip = audioClips[i];
            if (clip.start > currentTime + 0.1) {
                const silenceDuration = clip.start - currentTime;
                const silencePath = path.join(tempDir, `gap_${i}_${Date.now()}.wav`);
                try {
                    await createSilence(silenceDuration, silencePath);
                    alignedAudioFiles.push(silencePath);
                } catch (err) {
                    console.error(`⚠️ [${jobId}] Gap silence failed:`, err.message);
                }
            }
            alignedAudioFiles.push(clip.path);
            currentTime = clip.start + clip.duration;
        }
        
        jobProgress[jobId].message = '正在合并音频...';
        jobProgress[jobId].progress = 75;
        
        console.log(`🔗 [${jobId}] Concatenating audio...`);
        const finalAudioPath = path.join(tempDir, 'final_audio.wav');
        
        try {
            await concatenateAudio(alignedAudioFiles, finalAudioPath);
        } catch (concatError) {
            console.error(`⚠️ [${jobId}] Concat failed, using silence:`, concatError.message);
            const totalDuration = Math.max(...audioClips.map(c => c.start + c.duration));
            await createSilence(totalDuration || 10, finalAudioPath);
        }
        
        jobProgress[jobId].message = '正在下载视频...';
        jobProgress[jobId].progress = 80;
        
        // Step 6: Download video
        console.log(`📥 [${jobId}] Downloading video...`);
        const videoPath = path.join(tempDir, 'video.mp4');
        
        try {
            await downloadVideoOnly(videoId, videoPath);
        } catch (error) {
            console.error(`⚠️ [${jobId}] yt-dlp failed, trying youtube-dl:`, error.message);
            try {
                await downloadVideoWithYoutubeDl(videoId, videoPath);
            } catch (fallbackError) {
                throw new Error(`Video download failed: ${error.message}`);
            }
        }
        
        jobProgress[jobId].message = '正在合并视频和音频...';
        jobProgress[jobId].progress = 90;
        
        // Step 7: Merge video and audio
        console.log(`🎬 [${jobId}] Merging video and audio...`);
        const finalVideoPath = path.join(tempDir, 'dubbed_video.mp4');
        await mergeVideoAudio(videoPath, finalAudioPath, finalVideoPath);
        
        console.log(`✅ [${jobId}] Dubbing completed successfully!`);
        jobProgress[jobId].status = 'completed';
        jobProgress[jobId].progress = 100;
        jobProgress[jobId].message = '处理完成！';
        jobProgress[jobId].result = {
            jobId,
            downloadUrl: `/downloads/${jobId}/dubbed_video.mp4`,
            message: 'Video dubbed successfully!',
            transcriptSegments: transcript.length,
            translationErrors
        };
        
    } catch (error) {
        console.error(`❌ [${jobId}] Error:`, error);
        jobProgress[jobId].status = 'failed';
        jobProgress[jobId].error = error.message;
        jobProgress[jobId].message = `处理失败: ${error.message}`;
    }
}

// Get job status endpoint
app.get('/api/job-status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const jobDir = path.join(__dirname, 'downloads', jobId);
    const finalVideo = path.join(jobDir, 'dubbed_video.mp4');
    
    try {
        await fs.access(finalVideo);
        res.json({
            status: 'completed',
            downloadUrl: `/downloads/${jobId}/dubbed_video.mp4`
        });
    } catch {
        res.json({
            status: 'processing'
        });
    }
});

// Get job progress endpoint (for real-time progress tracking)
app.get('/api/job-progress/:jobId', (req, res) => {
    const { jobId } = req.params;
    
    if (!jobProgress[jobId]) {
        return res.status(404).json({
            error: 'Job not found',
            jobId
        });
    }
    
    res.json(jobProgress[jobId]);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'YouTube Dubbing API is running',
        translateStatus: translatorAvailable ? 'RapidAPI Connected' : 'Not Connected'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: error.message
    });
});

// Proxy status check endpoint
app.get('/api/proxy-status', async (req, res) => {
    const proxyUrl = process.env.PROXY_URL;
    
    if (!proxyUrl) {
        return res.json({
            configured: false,
            status: 'not_configured',
            message: 'PROXY_URL 未配置在 .env 文件中'
        });
    }
    
    try {
        // Test proxy by checking if we can resolve DNS through it
        // Use a simple approach: check if yt-dlp can use the proxy
        const { exec } = require('child_process');
        const execPromise = promisify(exec);  // Use promisify imported at top
        
        console.log(`🔍 Testing proxy: ${proxyUrl}`);
        
        // Try to use yt-dlp with proxy to fetch video info (lightweight test)
        const testCommand = `yt-dlp --proxy "${proxyUrl}" --print-json --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 2>&1`;
        
        const { stdout, stderr } = await execPromise(testCommand, { timeout: 10000 });
        
        if (stdout && stdout.includes('"title"')) {
            return res.json({
                configured: true,
                status: 'connected',
                message: `代理连接正常 (${proxyUrl})`,
                proxyUrl
            });
        } else {
            throw new Error(stderr || 'Proxy test failed');
        }
        
    } catch (error) {
        console.error('Proxy test failed:', error.message);
        
        return res.json({
            configured: true,
            status: 'disconnected',
            message: `代理连接失败: ${error.message}`,
            proxyUrl,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 YouTube Dubbing API server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔑 RapidAPI Translator Status: ${translatorAvailable ? '✅ Connected' : '❌ Not Connected'}`);
});

module.exports = app;
