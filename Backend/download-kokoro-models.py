import os
import sys
import urllib.request
import urllib.parse

# 设置代理
proxy_url = "http://127.0.0.1:10808"
os.environ["http_proxy"] = proxy_url
os.environ["https_proxy"] = proxy_url

# 下载文件列表
files = {
    "voices-v1.0.bin": "https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/voices-v1.0.bin",
    "kokoro-v1.0.onnx": "https://github.com/nazdridoy/kokoro-tts/releases/download/v1.0.0/kokoro-v1.0.onnx"
}

output_dir = r"D:\python\DubFlow\Backend\kokoro-models"

for filename, url in files.items():
    output_path = os.path.join(output_dir, filename)
    
    if os.path.exists(output_path):
        print(f"✅ 已存在: {filename}")
        continue
    
    print(f"⬇️ 正在下载: {filename} ...")
    
    try:
        # 创建代理处理器
        proxy_handler = urllib.request.ProxyHandler({
            'http': proxy_url,
            'https': proxy_url
        })
        opener = urllib.request.build_opener(proxy_handler)
        urllib.request.install_opener(opener)
        
        # 下载文件
        urllib.request.urlretrieve(url, output_path)
        
        file_size = os.path.getsize(output_path)
        print(f"  ✅ 下载成功: {filename} ({file_size / 1024 / 1024:.1f} MB)")
        
    except Exception as e:
        print(f"  ❌ 下载失败: {filename} - {e}")
        sys.exit(1)

print("\n🎉 所有模型文件下载完成！")
