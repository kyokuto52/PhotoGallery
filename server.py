#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地服务器脚本 - 用于管理面板的图片处理和JSON保存
运行方式：python server.py
"""

import os
import json
import shutil
import time
import mimetypes
import signal
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import cgi
import base64

# 全局服务器变量
httpd = None

def signal_handler(signum, frame):
    """信号处理函数"""
    print(f"\n🛑 收到信号 {signum}，正在停止服务器...")
    if httpd:
        httpd.shutdown()
        httpd.server_close()
    print("服务器已停止")
    sys.exit(0)

# 注册信号处理器
signal.signal(signal.SIGINT, signal_handler)
if hasattr(signal, 'SIGTERM'):
    signal.signal(signal.SIGTERM, signal_handler)

class AdminHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """处理GET请求"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
            return
        
        # 处理静态文件
        if self.path == '/':
            self.path = '/index.html'
        
        try:
            # 获取文件路径，去除查询参数
            file_path = self.path.split('?')[0].lstrip('/')
            if not file_path:
                file_path = 'index.html'
            
            # 调试信息
            print(f"请求路径: {self.path}")
            print(f"处理文件: {file_path}")
            print(f"文件是否存在: {os.path.exists(file_path)}")
            print(f"当前工作目录: {os.getcwd()}")
            
            # 检查文件是否存在
            if not os.path.exists(file_path):
                self.send_error(404, f'File not found: {file_path}')
                return
            
            # 获取文件类型
            content_type, _ = mimetypes.guess_type(file_path)
            if content_type is None:
                content_type = 'application/octet-stream'
            
            # 读取并发送文件
            with open(file_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            print(f"处理文件时出错: {str(e)}")
            self.send_error(500, f'Internal server error: {str(e)}')
    
    def do_POST(self):
        """处理POST请求"""
        if self.path == '/copy-image':
            self.handle_copy_image()
        elif self.path == '/save-json':
            self.handle_save_json()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def handle_copy_image(self):
        """处理图片复制请求"""
        try:
            # 解析multipart/form-data
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'}
            )
            
            # 获取上传的图片文件
            if 'image' in form:
                image_file = form['image']
                if image_file.filename:
                    # 创建data文件夹（如果不存在）
                    if not os.path.exists('data'):
                        os.makedirs('data')
                    
                    # 生成唯一文件名
                    timestamp = int(time.time() * 1000)
                    file_name = f"{timestamp}_{image_file.filename}"
                    file_path = os.path.join('data', file_name)
                    
                    # 保存文件到data文件夹
                    with open(file_path, 'wb') as f:
                        f.write(image_file.file.read())
                    
                    result = {
                        'success': True,
                        'filePath': f'data/{file_name}',
                        'message': f'图片已保存到：{file_path}'
                    }
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                    return
            
            # 如果没有文件，返回错误
            result = {
                'success': False,
                'error': '没有找到图片文件'
            }
            
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def handle_save_json(self):
        """处理JSON保存请求"""
        try:
            content_length = int(self.headers['Content-Length'])
            json_data = self.rfile.read(content_length)
            
            # 保存到photos.json文件
            with open('photos.json', 'w', encoding='utf-8') as f:
                f.write(json_data.decode('utf-8'))
            
            result = {
                'success': True,
                'message': 'JSON文件已保存'
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server(port=3001):
    """启动服务器"""
    global httpd
    server_address = ('', port)
    httpd = HTTPServer(server_address, AdminHandler)
    print(f"🚀 本地服务器已启动，端口：{port}")
    print(f"📁 主页地址：http://localhost:{port}/")
    print(f"📁 管理面板地址：http://localhost:{port}/admin.html")
    print(f"💡 按 Ctrl+C 停止服务器")
    print(f"💡 或者关闭此命令行窗口")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 收到键盘中断，正在停止服务器...")
    except Exception as e:
        print(f"\n❌ 服务器运行出错：{e}")
    finally:
        if httpd:
            print("正在关闭服务器...")
            httpd.shutdown()
            httpd.server_close()
            print("服务器已停止")

if __name__ == '__main__':
    run_server()
