'use client';

import { useState } from 'react';
import { Play, Download, Globe, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function YouTubeDubber() {
  const [videoUrl, setVideoUrl] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('spanish');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [polling, setPolling] = useState(false);

  const languages = [
    { code: 'spanish', name: '西班牙语 (Español)' },
    { code: 'french', name: '法语 (Français)' },
    { code: 'german', name: '德语 (Deutsch)' },
    { code: 'italian', name: '意大利语 (Italiano)' },
    { code: 'portuguese', name: '葡萄牙语 (Português)' },
    { code: 'russian', name: '俄语 (Русский)' },
    { code: 'japanese', name: '日语 (日本語)' },
    { code: 'korean', name: '韩语 (한국어)' },
    { code: 'chinese', name: '中文 (中文)' },
    { code: 'hindi', name: '印地语 (हिंदी)' },
    { code: 'arabic', name: '阿拉伯语 (العربية)' },
    { code: 'dutch', name: '荷兰语 (Nederlands)' },
    { code: 'polish', name: '波兰语 (Polski)' },
    { code: 'turkish', name: '土耳其语 (Türkçe)' },
    { code: 'thai', name: '泰语 (ไทย)' },
    { code: 'vietnamese', name: '越南语 (Tiếng Việt)' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);
    setProgress(null);
    setJobId(null);

    try {
      const response = await fetch('http://localhost:3002/api/dub-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          targetLanguage
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '视频处理失败');
      }

      const data = await response.json();
      setJobId(data.jobId);
      setPolling(true);
      
      // Start polling for progress
      pollProgress(data.jobId);
      
    } catch (err) {
      setError(err.message || '出了点问题，请重试。');
      setIsLoading(false);
    }
  };

  const pollProgress = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3002/api/job-progress/${jobId}`);
        const data = await response.json();
        
        setProgress(data);
        
        if (data.status === 'completed') {
          clearInterval(interval);
          setPolling(false);
          setIsLoading(false);
          setResult(data.result);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setPolling(false);
          setIsLoading(false);
          setError(data.error || '处理失败');
        }
      } catch (err) {
        console.error('Progress polling error:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const resetForm = () => {
    setVideoUrl('');
    setTargetLanguage('spanish');
    setResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
          🎙️ YouTube 视频配音
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          使用AI技术将任何YouTube视频转化为多种语言
        </p>
      </div>

        {!result ? (
         
          <div className="max-w-2xl mx-auto">
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* YouTube 视频链接 */}
                <div>
                  <label className="block text-white text-sm font-medium mb-3">
                    🎬 YouTube 视频链接
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
                      required
                    />
                    <Play className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>

                {/* 语言选择 */}
                <div>
                  <label className="block text-white text-sm font-medium mb-3">
                    🌍 目标语言
                  </label>
                  <div className="relative">
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 appearance-none"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <Globe className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                {/* 错误信息 */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={isLoading || !videoUrl.trim()}
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>正在处理...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <Zap className="w-5 h-5" />
                      <span>开始配音</span>
                    </div>
                  )}
                </button>
              </form>
            </div>

            {/* 进度显示 */}
            {(isLoading || polling) && (
              <div className="mt-8 backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
                <div className="text-center">
                  {/* 进度环 */}
                  <div className="w-24 h-24 mx-auto mb-6 relative">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        className="text-white/10"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="42"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-purple-400 transition-all duration-500 ease-out"
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - (progress?.progress || 0) / 100)}`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="42"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {Math.round(progress?.progress || 0)}%
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {progress?.status === 'failed' ? '处理失败' : '正在创建您的配音视频'}
                  </h3>
                  <p className="text-gray-300 mb-6">
                    {progress?.message || '正在初始化...'}
                  </p>
                  
                  {/* 进度条 */}
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress?.progress || 0}%` }}
                    ></div>
                  </div>
                  
                  {/* 进度详情 */}
                  {progress?.error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl">
                      <p className="text-red-300 text-sm">{progress.error}</p>
                    </div>
                  )}
                  
                  {/* 步骤指示器 */}
                  <div className="mt-6 grid grid-cols-4 gap-2">
                    {['提取字幕', '翻译内容', '生成语音', '合并视频'].map((step, idx) => {
                      const stepProgress = [10, 30, 60, 90][idx];
                      const isActive = (progress?.progress || 0) >= stepProgress;
                      const isCurrent = (progress?.progress || 0) >= (idx > 0 ? [10, 30, 60][idx - 1] : 0) && (progress?.progress || 0) < stepProgress;
                      
                      return (
                        <div key={step} className={`p-2 rounded-xl text-xs ${
                          isActive ? 'bg-purple-500/30 text-purple-300' : 
                          isCurrent ? 'bg-purple-500/20 text-purple-300 animate-pulse' : 
                          'bg-white/5 text-gray-500'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            {isActive && <CheckCircle className="w-3 h-3" />}
                            {isCurrent && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>{step}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Results Section */
          <div className="max-w-4xl mx-auto">
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
              {/* 成功消息 */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-green-300 font-semibold">成功！</h3>
                  <p className="text-green-200 text-sm">{result.message}</p>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-blue-400 text-lg">📝</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{result.transcriptSegments}</p>
                      <p className="text-gray-400 text-sm">字幕片段</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                      <span className="text-red-400 text-lg">⚠️</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{result.translationErrors}</p>
                      <p className="text-gray-400 text-sm">翻译错误</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 视频播放器 */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">🎬 您的配音视频</h3>
                <div className="bg-black/50 rounded-2xl overflow-hidden border border-white/10">
                  <video
                    controls
                    className="w-full h-auto max-h-96"
                    src={`http://localhost:3002${result.downloadUrl}`}
                  >
                    您的浏览器不支持视频标签。
                  </video>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={`http://localhost:3002${result.downloadUrl}`}
                  download
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl text-center flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  下载视频
                </a>
                <button
                  onClick={resetForm}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 border border-white/20 flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  配音另一个视频
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm">
            Powered by AI • Made with ❤️ for content creators
          </p>
        </div>
      </div>
    </div>
  );
}