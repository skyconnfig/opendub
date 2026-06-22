/**
 * kokoro-tts-wrapper.js
 * 封装 Python kokoro-tts TTS 引擎
 * 支持 50+ 种高质量语音，包括中文、英文、日语等
 * 
 * 使用方式：
 *   const { generateAudioWithKokoro } = require('./kokoro-tts-wrapper');
 *   await generateAudioWithKokoro('你好世界', 'zf_xiaoxiao', 'output.wav');
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// kokoro-tts 模型文件目录（相对于 Backend 目录）
const KOKORO_MODELS_DIR = path.join(__dirname, 'kokoro-models');
const KOKORO_MODEL_PATH = path.join(KOKORO_MODELS_DIR, 'kokoro-v1.0.onnx');
const KOKORO_VOICES_PATH = path.join(KOKORO_MODELS_DIR, 'voices-v1.0.bin');

// Python 解释器路径（使用 Python 3.12）
const PYTHON_CMD = 'py';
const PYTHON_ARGS = ['-3.12'];

// 默认语音映射（语言代码 → kokoro 语音名称）
const kokoroVoiceMap = {
    // 中文（简体）- 重点支持
    'zh': 'zf_xiaoxiao',           // 中文女声 - 晓晓（推荐）
    'zh-cn': 'zf_xiaoxiao',
    'chinese': 'zf_xiaoxiao',
    
    // 英语（美式）
    'en': 'af_sarah',               // 美式英语女声 - Sarah（推荐）
    'en-us': 'af_sarah',
    'english': 'af_sarah',
    
    // 英语（英式）
    'en-gb': 'bf_emma',             // 英式英语女声 - Emma
    'british': 'bf_emma',
    
    // 日语
    'ja': 'jf_alpha',               // 日语女声 - Alpha
    'jp': 'jf_alpha',
    'japanese': 'jf_alpha',
    
    // 法语
    'fr': 'ff_siwis',              // 法式法语女声 - Siwis
    'french': 'ff_siwis',
    
    // 印地语
    'hi': 'hf_alpha',              // 印地语女声 - Alpha
    'hindi': 'hf_alpha',
    
    // 西班牙语（占位，kokoro 可能不支持）
    'es': 'af_sarah',              // 回退到英语
    'spanish': 'af_sarah',
};

// 所有支持的语音列表（用于验证）
const SUPPORTED_VOICES = [
    'af_alloy', 'af_aoede', 'af_bella', 'af_heart', 'af_jessica',
    'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky',
    'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam',
    'am_michael', 'am_onyx', 'am_puck', 'am_santa',
    'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily',
    'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis',
    'ef_dora', 'em_alex', 'em_santa',
    'ff_siwis',
    'hf_alpha', 'hf_beta', 'hm_omega', 'hm_psi',
    'if_sara', 'im_nicola',
    'jf_alpha', 'jf_gongitsune', 'jf_nezumi', 'jf_tebukuro',
    'jm_kumo',
    'pf_dora', 'pm_alex', 'pm_santa',
    'zf_xiaobei', 'zf_xiaoni', 'zf_xiaoxiao', 'zf_xiaoyi'
];

/**
 * 使用 kokoro-tts 生成音频
 * @param {string} text - 要合成的文本
 * @param {string} language - 目标语言（如 'chinese', 'english'）
 * @param {string} outputPath - 输出音频文件路径
 * @param {string} [voiceName] - 可选：指定语音名称（如 'zf_xiaoxiao'）
 * @returns {Promise<string>} - 生成的音频文件路径
 */
const generateAudioWithKokoro = async (text, language, outputPath, voiceName = null) => {
    return new Promise((resolve, reject) => {
        // 验证输入
        if (!text || text.trim().length < 2) {
            return reject(new Error('Text too short for TTS'));
        }
        
        // 确定语音
        let voice = voiceName;
        if (!voice) {
            const langKey = language.toLowerCase().replace(/[\s-]/g, '-');
            voice = kokoroVoiceMap[langKey] || kokoroVoiceMap[language.toLowerCase()] || 'af_sarah';
        }
        
        // 验证语音是否支持
        if (!SUPPORTED_VOICES.includes(voice)) {
            console.warn(`  ⚠️  Unsupported voice: ${voice}, falling back to af_sarah`);
            voice = 'af_sarah';
        }
        
        console.log(`  🎤 Kokoro TTS: Generating audio with voice ${voice}`);
        console.log(`  📝 Text length: ${text.length} characters`);
        
        // 创建临时文本文件（kokoro-tts 需要输入文件）
        const tempDir = os.tmpdir();
        const tempId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const tempTextFile = path.join(tempDir, `kokoro_input_${tempId}.txt`);
        
        try {
            // 将文本和输出路径都转换为绝对路径
            const absTextFile = path.resolve(tempTextFile);
            const absOutputPath = path.resolve(outputPath);
            
            // 写入临时文本文件
            fs.writeFileSync(absTextFile, text.trim(), 'utf8');
            console.log(`  📄 Temp text file: ${absTextFile}`);
            
            // 确保输出目录存在
            const outputDir = path.dirname(absOutputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // 构建 kokoro-tts 命令参数
            // 用法: python -m kokoro_tts <input> <output> [options]
            const args = [
                absTextFile,
                absOutputPath,
                '--model', KOKORO_MODEL_PATH,
                '--voices', KOKORO_VOICES_PATH,
                '--voice', voice,
                '--format', 'wav',
                '--speed', '1.0'
            ];
            
            console.log(`  🚀 Running: py -3.12 -m kokoro_tts ${path.basename(absTextFile)} ${path.basename(absOutputPath)} ...`);
            
            // 启动 Python 进程
            const proc = spawn(PYTHON_CMD, [...PYTHON_ARGS, '-m', 'kokoro_tts', ...args], {
                cwd: KOKORO_MODELS_DIR,  // 在模型目录运行
                env: {
                    ...process.env,
                    HTTP_PROXY: process.env.HTTP_PROXY || 'http://127.0.0.1:10808',
                    HTTPS_PROXY: process.env.HTTPS_PROXY || 'http://127.0.0.1:10808'
                },
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            proc.on('close', (code) => {
                // 清理临时文件
                try {
                    if (fs.existsSync(tempTextFile)) {
                        fs.unlinkSync(tempTextFile);
                    }
                } catch (cleanupErr) {
                    console.warn('  ⚠️  Failed to cleanup temp file:', cleanupErr.message);
                }
                
                if (code === 0) {
                    // 验证输出文件是否存在
                    if (fs.existsSync(outputPath)) {
                        const stats = fs.statSync(outputPath);
                        console.log(`  ✅ Kokoro TTS: Audio generated successfully -> ${path.basename(outputPath)} (${stats.size} bytes)`);
                        resolve(outputPath);
                    } else {
                        reject(new Error(`Output file not found: ${outputPath}`));
                    }
                } else {
                    console.error(`  ❌ Kokoro TTS error (code ${code}):`, stderr || stdout);
                    reject(new Error(`Kokoro TTS failed with code ${code}: ${stderr || stdout}`));
                }
            });
            
            proc.on('error', (err) => {
                console.error('  ❌ Failed to start Kokoro TTS process:', err.message);
                
                // 清理临时文件
                try {
                    if (fs.existsSync(tempTextFile)) {
                        fs.unlinkSync(tempTextFile);
                    }
                } catch (cleanupErr) {
                    // Ignore cleanup errors
                }
                
                reject(err);
            });
            
        } catch (error) {
            console.error('  ❌ Kokoro TTS preparation error:', error.message);
            
            // 清理临时文件
            try {
                if (fs.existsSync(tempTextFile)) {
                    fs.unlinkSync(tempTextFile);
                }
            } catch (cleanupErr) {
                // Ignore cleanup errors
            }
            
            reject(error);
        }
    });
};

/**
 * 获取指定语言的可用语音列表
 * @param {string} language - 语言代码
 * @returns {Array<string>} - 语音名称列表
 */
const getKokoroVoicesForLanguage = (language) => {
    const langKey = language.toLowerCase().replace(/[\s-]/g, '-');
    const voice = kokoroVoiceMap[langKey] || kokoroVoiceMap[language.toLowerCase()];
    
    if (voice) {
        return [voice];
    }
    
    // 返回默认语音
    return ['af_sarah'];
};

/**
 * 获取所有支持的语音列表
 * @returns {Array<string>} - 所有语音名称
 */
const getAllKokoroVoices = () => {
    return [...SUPPORTED_VOICES];
};

/**
 * 检查 kokoro-tts 是否可用
 * @returns {Promise<boolean>} - 是否可用
 */
const isKokoroAvailable = async () => {
    return new Promise((resolve) => {
        try {
            // 检查模型文件是否存在
            if (!fs.existsSync(KOKORO_MODEL_PATH)) {
                console.warn(`  ⚠️  Kokoro model file not found: ${KOKORO_MODEL_PATH}`);
                resolve(false);
                return;
            }
            
            if (!fs.existsSync(KOKORO_VOICES_PATH)) {
                console.warn(`  ⚠️  Kokoro voices file not found: ${KOKORO_VOICES_PATH}`);
                resolve(false);
                return;
            }
            
            // 尝试运行 kokoro-tts --help
            const proc = spawn(PYTHON_CMD, [...PYTHON_ARGS, '-m', 'kokoro_tts', '--help'], {
                cwd: KOKORO_MODELS_DIR
            });
            
            proc.on('close', (code) => {
                resolve(code === 0);
            });
            
            proc.on('error', () => {
                resolve(false);
            });
            
            // 超时 5 秒
            setTimeout(() => {
                proc.kill();
                resolve(false);
            }, 5000);
            
        } catch (error) {
            resolve(false);
        }
    });
};

module.exports = {
    generateAudioWithKokoro,
    getKokoroVoicesForLanguage,
    getAllKokoroVoices,
    isKokoroAvailable,
    kokoroVoiceMap
};
