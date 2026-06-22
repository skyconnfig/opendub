/**
 * Edge TTS Engine - 使用 Microsoft Edge 的免费 TTS 服务
 * 无需 API Key，无需 Windows，支持多种高质量语音
 */

const { EdgeTTS } = require('node-edge-tts');
const path = require('path');

// Edge TTS Voice Mapping
// Maps language codes to appropriate Edge TTS voices
const edgeTTSVoiceMap = {
    'en': 'en-US-JennyNeural',           // English (US) - Female
    'en-us': 'en-US-JennyNeural',
    'en-gb': 'en-GB-SoniaNeural',        // English (UK) - Female
    'zh': 'zh-CN-XiaoxiaoNeural',        // Chinese (Mandarin) - Female
    'zh-cn': 'zh-CN-XiaoxiaoNeural',    // 晓晓 - 中文女声
    'zh-tw': 'zh-TW-HsiaoChenNeural',    // Chinese (Taiwan) - Female
    'ja': 'ja-JP-NanamiNeural',          // Japanese - Female
    'ko': 'ko-KR-SunHiNeural',           // Korean - Female
    'es': 'es-ES-ElviraNeural',          // Spanish - Female
    'es-es': 'es-ES-ElviraNeural',
    'es-mx': 'es-MX-DaliaNeural',         // Spanish (Mexico) - Female
    'fr': 'fr-FR-DeniseNeural',          // French - Female
    'fr-fr': 'fr-FR-DeniseNeural',
    'de': 'de-DE-KatjaNeural',           // German - Female
    'it': 'it-IT-ElsaNeural',            // Italian - Female
    'pt': 'pt-BR-FranciscaNeural',       // Portuguese (Brazil) - Female
    'pt-br': 'pt-BR-FranciscaNeural',
    'pt-pt': 'pt-PT-FernandaNeural',     // Portuguese (Portugal) - Female
    'ru': 'ru-RU-SvetlanaNeural',        // Russian - Female
    'ar': 'ar-SA-ZariyahNeural',          // Arabic - Female
    'hi': 'hi-IN-SwaraNeural',           // Hindi - Female
    'th': 'th-TH-PremwadeeNeural',      // Thai - Female
    'vi': 'vi-VN-HoaiMyNeural',          // Vietnamese - Female
    'tr': 'tr-TR-EmelNeural',           // Turkish - Female
    'nl': 'nl-NL-ColetteNeural',         // Dutch - Female
    'pl': 'pl-PL-ZofiaNeural',           // Polish - Female
    'sv': 'sv-SE-SofieNeural',           // Swedish - Female
    'da': 'da-DK-ChristelNeural',        // Danish - Female
    'fi': 'fi-FI-SelmaNeural',           // Finnish - Female
    'el': 'el-GR-AthinaNeural',          // Greek - Female
    'he': 'he-IL-HilaNeural',            // Hebrew - Female
    'id': 'id-ID-GadisNeural',           // Indonesian - Female
    'ms': 'ms-MY-YasminNeural',          // Malay - Female
    'tl': 'fil-PH-BlessicaNeural',       // Filipino - Female
    'ur': 'ur-PK-UzmaNeural',            // Urdu - Female
    'bn': 'bn-BD-NabanitaNeural',        // Bengali - Female
    'ta': 'ta-IN-PallaviNeural',         // Tamil - Female
    'te': 'te-IN-ShrutiNeural',          // Telugu - Female
    'mr': 'mr-IN-AarohiNeural',         // Marathi - Female
    'gu': 'gu-IN-DhwaniNeural',          // Gujarati - Female
    'kn': 'kn-IN-SapnaNeural',          // Kannada - Female
    'ml': 'ml-IN-SobhanaNeural',         // Malayalam - Female
    'pa': 'pa-IN-GurpreetNeural'         // Punjabi - Male
};

// Default voice for unsupported languages
const DEFAULT_EDGE_TTS_VOICE = 'en-US-JennyNeural';

/**
 * Generate audio using Edge TTS (free, high quality)
 * @param {string} text - Text to synthesize
 * @param {string} language - Target language (e.g., 'chinese', 'spanish')
 * @param {string} outputPath - Output file path
 * @param {string} [voiceName] - Optional specific voice name
 * @returns {Promise<string>} - Path to generated audio file
 */
const generateAudio = async (text, language, outputPath, voiceName = null) => {
    return new Promise((resolve, reject) => {
        // Skip empty or very short text
        if (!text || text.trim().length < 2) {
            return reject(new Error('Text too short for TTS'));
        }

        try {
            const tts = new EdgeTTS();
            
            // Determine voice
            let voice = voiceName;
            if (!voice) {
                // Try to find matching voice from mapping
                const langKey = language.toLowerCase().replace(/[\s-]/g, '-');
                voice = edgeTTSVoiceMap[langKey] || edgeTTSVoiceMap[language.toLowerCase()] || DEFAULT_EDGE_TTS_VOICE;
            }
            
            // Set Edge TTS parameters
            tts.voice = voice;
            tts.rate = '0%';   // Normal speed
            tts.pitch = '0%';  // Normal pitch
            tts.volume = '0%'; // Normal volume
            
            // Extract language code from voice (e.g., 'zh-CN' from 'zh-CN-XiaoxiaoNeural')
            const langCode = voice.split('-').slice(0, 2).join('-');
            tts.lang = langCode;
            
            console.log(`  🎤 Edge TTS: Generating audio with voice ${voice}`);
            
            // Generate audio
            tts.ttsPromise(text.trim(), outputPath)
                .then(() => {
                    console.log(`  ✅ Edge TTS: Audio generated successfully -> ${path.basename(outputPath)}`);
                    resolve(outputPath);
                })
                .catch((err) => {
                    console.error(`  ❌ Edge TTS error for voice ${voice}:`, err.message);
                    reject(err);
                });
                
        } catch (error) {
            console.error('Edge TTS creation error:', error);
            reject(error);
        }
    });
};

/**
 * Get available voices for a language
 * @param {string} language - Language code
 * @returns {Array<string>} - List of available voice names
 */
const getVoicesForLanguage = (language) => {
    const langKey = language.toLowerCase().replace(/[\s-]/g, '-');
    const voice = edgeTTSVoiceMap[langKey] || edgeTTSVoiceMap[language.toLowerCase()];
    
    if (voice) {
        return [voice];
    }
    
    // Return default voice if no match found
    return [DEFAULT_EDGE_TTS_VOICE];
};

/**
 * List all available voices (for debugging)
 * @returns {Object} - Voice mapping
 */
const getAllVoices = () => {
    return { ...edgeTTSVoiceMap };
};

module.exports = {
    generateAudio,
    getVoicesForLanguage,
    getAllVoices,
    DEFAULT_EDGE_TTS_VOICE
};
