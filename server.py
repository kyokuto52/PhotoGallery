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

# 图片处理库
try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("⚠️  警告：Pillow库未安装，无法生成缩略图和提取EXIF")
    print("💡 请运行：pip install Pillow")

# HEIC/HEIF 支持（可选）：pillow-heif 会为 Pillow 注册 HEIF/HEIC 打开器
try:
    import pillow_heif
    try:
        pillow_heif.register_heif_opener()
        HEIF_AVAILABLE = True
        print('✅ pillow_heif 已加载：支持 HEIC/HEIF 文件')
    except Exception as e:
        HEIF_AVAILABLE = False
        print('⚠️ pillow_heif 加载失败：', e)
except Exception:
    HEIF_AVAILABLE = False

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
        elif self.path == '/extract-exif':
            self.handle_extract_exif()
        elif self.path == '/generate-thumbnails':
            self.handle_generate_thumbnails()
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def extract_exif_from_image(self, image_path):
        """从图片中提取EXIF数据"""
        try:
            with Image.open(image_path) as img:
                exif_data = img._getexif()
                if exif_data is None:
                    return None
                
                exif_info = {}
                
                # 常见的EXIF标签映射
                exif_tags = {
                    'Make': '相机品牌',
                    'Model': '相机型号',
                    'Software': '软件',
                    'DateTime': '拍摄时间',
                    'Artist': '摄影师',
                    'Copyright': '版权信息',
                    'DateTimeOriginal': '原始拍摄时间',
                    'ExposureTime': '曝光时间',
                    'FNumber': '光圈值',
                    'ExposureProgram': '曝光程序',
                    'ISOSpeedRatings': 'ISO感光度',
                    'ShutterSpeedValue': '快门速度值',
                    'ApertureValue': '光圈值',
                    'BrightnessValue': '亮度值',
                    'ExposureBiasValue': '曝光偏差值',
                    'MaxApertureValue': '最大光圈值',
                    'SubjectDistance': '主体距离',
                    'MeteringMode': '测光模式',
                    'LightSource': '光源',
                    'Flash': '闪光灯',
                    'FocalLength': '焦距',
                    'SubjectArea': '主体区域',
                    'MakerNote': '制造商注释',
                    'UserComment': '用户注释',
                    'FlashPixVersion': 'FlashPix版本',
                    'ColorSpace': '色彩空间',
                    'PixelXDimension': '像素X尺寸',
                    'PixelYDimension': '像素Y尺寸',
                    'RelatedSoundFile': '相关音频文件',
                    'InteroperabilityIFDPointer': '互操作性IFD指针',
                    'FlashEnergy': '闪光灯能量',
                    'SpatialFrequencyResponse': '空间频率响应',
                    'FocalPlaneXResolution': '焦平面X分辨率',
                    'FocalPlaneYResolution': '焦平面Y分辨率',
                    'FocalPlaneResolutionUnit': '焦平面分辨率单位',
                    'SubjectLocation': '主体位置',
                    'ExposureIndex': '曝光指数',
                    'SensingMethod': '感光方法',
                    'FileSource': '文件源',
                    'SceneType': '场景类型',
                    'CFAPattern': 'CFA模式',
                    'CustomRendered': '自定义渲染',
                    'ExposureMode': '曝光模式',
                    'WhiteBalance': '白平衡',
                    'DigitalZoomRatio': '数字变焦比',
                    'FocalLengthIn35mmFilm': '35mm胶片等效焦距',
                    'SceneCaptureType': '场景捕获类型',
                    'GainControl': '增益控制',
                    'Contrast': '对比度',
                    'Saturation': '饱和度',
                    'Sharpness': '锐度',
                    'SubjectDistanceRange': '主体距离范围',
                    'ImageUniqueID': '图像唯一ID',
                    'OwnerName': '所有者姓名',
                    'SerialNumber': '序列号',
                    'LensMake': '镜头品牌',
                    'LensModel': '镜头型号',
                    'LensSpecification': '镜头规格',
                    'LensSerialNumber': '镜头序列号',
                    'GPSLatitude': 'GPS纬度',
                    'GPSLongitude': 'GPS经度',
                    'GPSAltitude': 'GPS海拔',
                    'GPSTimeStamp': 'GPS时间戳',
                    'GPSDateStamp': 'GPS日期戳',
                    'GPSProcessingMethod': 'GPS处理方法',
                    'GPSAreaInformation': 'GPS区域信息',
                    'GPSDifferential': 'GPS差分',
                    'GPSVersionID': 'GPS版本ID'
                }
                
                # 提取EXIF数据
                for tag_id, value in exif_data.items():
                    tag_name = TAGS.get(tag_id, tag_id)
                    if tag_name in exif_tags:
                        chinese_name = exif_tags[tag_name]
                        
                        # 格式化特殊值
                        if tag_name == 'ExposureTime':
                            if isinstance(value, tuple) and len(value) == 2:
                                formatted_value = f"{value[0]}/{value[1]}秒"
                            else:
                                formatted_value = str(value)
                        elif tag_name == 'FNumber':
                            if isinstance(value, tuple) and len(value) == 2:
                                formatted_value = f"f/{value[0]}/{value[1]}"
                            else:
                                formatted_value = f"f/{value}"
                        elif tag_name == 'ISOSpeedRatings':
                            formatted_value = f"ISO {value}"
                        elif tag_name == 'FocalLength':
                            if isinstance(value, tuple) and len(value) == 2:
                                formatted_value = f"{value[0]}/{value[1]}mm"
                            else:
                                formatted_value = f"{value}mm"
                        elif tag_name == 'DateTimeOriginal':
                            formatted_value = str(value)
                        else:
                            formatted_value = str(value)
                        
                        exif_info[chinese_name] = formatted_value
                
                return exif_info
                
        except Exception as e:
            print(f"提取EXIF数据时出错: {str(e)}")
            return None
    
    def generate_thumbnail(self, image_path):
        """为图片生成缩略图"""
        try:
            # 创建thumbnails文件夹
            if not os.path.exists('thumbnails'):
                os.makedirs('thumbnails')
            
            # 生成缩略图文件名
            filename = os.path.basename(image_path)
            thumbnail_path = os.path.join('thumbnails', filename)
            
            # 如果缩略图已存在，跳过
            if os.path.exists(thumbnail_path):
                return thumbnail_path
            
            # 打开图片
            with Image.open(image_path) as img:
                # 转换为RGB模式
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # 计算缩略图尺寸
                max_width = 400
                max_height = 300
                width, height = img.size
                
                # 计算缩放比例
                ratio = min(max_width / width, max_height / height)
                
                # 如果图片已经很小，直接复制
                if ratio >= 1:
                    shutil.copy2(image_path, thumbnail_path)
                else:
                    # 计算新尺寸
                    new_width = int(width * ratio)
                    new_height = int(height * ratio)
                    
                    # 生成缩略图
                    thumbnail = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    
                    # 保存缩略图
                    thumbnail.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
            
            return thumbnail_path
            
        except Exception as e:
            print(f"生成缩略图时出错: {str(e)}")
            return None
    
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
                    
                    # 创建thumbnails文件夹（如果不存在）
                    if not os.path.exists('thumbnails'):
                        os.makedirs('thumbnails')
                    
                    # 生成唯一文件名
                    timestamp = int(time.time() * 1000)
                    file_name = f"{timestamp}_{image_file.filename}"
                    file_path = os.path.join('data', file_name)
                    thumbnail_path = os.path.join('thumbnails', file_name)
                    
                    # 保存原图到data文件夹
                    with open(file_path, 'wb') as f:
                        f.write(image_file.file.read())
                    
                    # 生成缩略图
                    thumbnail_generated = False
                    if PIL_AVAILABLE:
                        try:
                            # 打开图片
                            with Image.open(file_path) as img:
                                # 转换为RGB模式（处理RGBA等格式）
                                if img.mode in ('RGBA', 'LA', 'P'):
                                    img = img.convert('RGB')
                                
                                # 计算缩略图尺寸（保持宽高比）
                                max_width = 400
                                max_height = 300
                                
                                # 获取原始尺寸
                                width, height = img.size
                                
                                # 计算缩放比例
                                ratio = min(max_width / width, max_height / height)
                                
                                # 如果图片已经很小，不需要缩放
                                if ratio >= 1:
                                    # 直接复制原图作为缩略图
                                    shutil.copy2(file_path, thumbnail_path)
                                else:
                                    # 计算新尺寸
                                    new_width = int(width * ratio)
                                    new_height = int(height * ratio)
                                    
                                    # 生成缩略图
                                    thumbnail = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                                    
                                    # 保存缩略图，优化质量
                                    thumbnail.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
                                
                                thumbnail_generated = True
                                print(f"✅ 缩略图已生成：{thumbnail_path}")
                                
                        except Exception as e:
                            print(f"⚠️  生成缩略图时出错：{str(e)}")
                            # 如果生成缩略图失败，复制原图作为缩略图
                            shutil.copy2(file_path, thumbnail_path)
                            thumbnail_generated = True
                    else:
                        # 如果没有Pillow库，直接复制原图作为缩略图
                        shutil.copy2(file_path, thumbnail_path)
                        thumbnail_generated = True
                    
                    result = {
                        'success': True,
                        'filePath': f'data/{file_name}',
                        'thumbnailPath': f'thumbnails/{file_name}' if thumbnail_generated else None,
                        'message': f'图片已保存到：{file_path}' + (f'，缩略图已生成：{thumbnail_path}' if thumbnail_generated else '，缩略图生成失败')
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
            print(f"收到保存JSON请求，路径: {self.path}")
            print(f"请求头: {dict(self.headers)}")
            
            content_length = int(self.headers['Content-Length'])
            json_data = self.rfile.read(content_length)
            
            print(f"JSON数据长度: {content_length}")
            print(f"JSON数据预览: {json_data[:200]}...")
            
            # 保存到photos.json文件
            with open('photos.json', 'w', encoding='utf-8') as f:
                f.write(json_data.decode('utf-8'))
            
            print(f"JSON文件已保存到: photos.json")
            
            result = {
                'success': True,
                'message': 'JSON文件已保存',
                'timestamp': time.time()
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            print(f"保存JSON时出错: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def handle_extract_exif(self):
        """处理EXIF数据提取请求"""
        try:
            print("开始提取EXIF数据...")
            
            # 检查photos.json是否存在
            if not os.path.exists('photos.json'):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'photos.json文件不存在'}).encode())
                return
            
            # 读取photos.json
            with open('photos.json', 'r', encoding='utf-8') as f:
                photos_data = json.load(f)
            
            photos = photos_data.get('photos', [])
            if not photos:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': '没有找到照片数据'}).encode())
                return
            
            # 检查Pillow库是否可用
            if not PIL_AVAILABLE:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Pillow库未安装，无法提取EXIF数据'}).encode())
                return
            
            processed = 0
            updated = 0
            
            # 处理每张照片
            for photo in photos:
                processed += 1
                src = photo.get('src', '')
                
                if not src or not os.path.exists(src):
                    print(f"跳过不存在的文件: {src}")
                    continue
                
                try:
                    # 提取EXIF数据
                    exif_data = self.extract_exif_from_image(src)
                    if exif_data:
                        photo['exif'] = exif_data
                        updated += 1
                        print(f"✅ 已提取EXIF: {src}")
                    else:
                        print(f"⚠️  无EXIF数据: {src}")
                        
                except Exception as e:
                    print(f"❌ 提取EXIF失败 {src}: {str(e)}")
            
            # 保存更新后的photos.json
            with open('photos.json', 'w', encoding='utf-8') as f:
                json.dump(photos_data, f, ensure_ascii=False, indent=2)
            
            result = {
                'success': True,
                'processed': processed,
                'updated': updated,
                'message': f'EXIF提取完成，处理了{processed}张照片，更新了{updated}张'
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            print(f"EXIF提取处理失败: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def handle_generate_thumbnails(self):
        """处理缩略图生成请求"""
        try:
            print("开始生成缩略图...")
            
            # 检查photos.json是否存在
            if not os.path.exists('photos.json'):
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'photos.json文件不存在'}).encode())
                return
            
            # 读取photos.json
            with open('photos.json', 'r', encoding='utf-8') as f:
                photos_data = json.load(f)
            
            photos = photos_data.get('photos', [])
            if not photos:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': '没有找到照片数据'}).encode())
                return
            
            # 检查Pillow库是否可用
            if not PIL_AVAILABLE:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Pillow库未安装，无法生成缩略图'}).encode())
                return
            
            # 创建thumbnails文件夹
            if not os.path.exists('thumbnails'):
                os.makedirs('thumbnails')
            
            processed = 0
            generated = 0
            
            # 处理每张照片
            for photo in photos:
                processed += 1
                src = photo.get('src', '')
                
                if not src or not os.path.exists(src):
                    print(f"跳过不存在的文件: {src}")
                    continue
                
                try:
                    # 生成缩略图
                    thumbnail_path = self.generate_thumbnail(src)
                    if thumbnail_path:
                        photo['thumbnailPath'] = thumbnail_path
                        generated += 1
                        print(f"✅ 已生成缩略图: {thumbnail_path}")
                    else:
                        print(f"⚠️  缩略图生成失败: {src}")
                        
                except Exception as e:
                    print(f"❌ 生成缩略图失败 {src}: {str(e)}")
            
            # 保存更新后的photos.json
            with open('photos.json', 'w', encoding='utf-8') as f:
                json.dump(photos_data, f, ensure_ascii=False, indent=2)
            
            result = {
                'success': True,
                'processed': processed,
                'generated': generated,
                'message': f'缩略图生成完成，处理了{processed}张照片，生成了{generated}张缩略图'
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            print(f"缩略图生成处理失败: {str(e)}")
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

def run_server(port=8000):
    """启动服务器"""
    global httpd
    server_address = ('127.0.0.1', port)
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
