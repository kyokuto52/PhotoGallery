#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
缩略图生成脚本
为现有的照片自动生成缩略图
运行方式：python generate_thumbnails.py
"""

import os
import shutil
from PIL import Image

def generate_thumbnails():
    """为data文件夹中的所有图片生成缩略图"""
    
    # 检查Pillow库是否可用
    try:
        from PIL import Image
        print("✅ Pillow库已安装")
    except ImportError:
        print("❌ 错误：Pillow库未安装")
        print("💡 请运行：pip install Pillow")
        return
    
    # 检查data文件夹是否存在
    if not os.path.exists('data'):
        print("❌ 错误：data文件夹不存在")
        return
    
    # 创建thumbnails文件夹
    if not os.path.exists('thumbnails'):
        os.makedirs('thumbnails')
        print("📁 创建thumbnails文件夹")
    
    # 支持的图片格式
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'}
    
    # 获取data文件夹中的所有文件
    data_files = [f for f in os.listdir('data') if os.path.isfile(os.path.join('data', f))]
    image_files = [f for f in data_files if any(f.lower().endswith(ext) for ext in image_extensions)]
    
    if not image_files:
        print("❌ 在data文件夹中没有找到图片文件")
        return
    
    print(f"📸 找到 {len(image_files)} 张图片")
    print("🔄 开始生成缩略图...")
    
    success_count = 0
    error_count = 0
    
    for filename in image_files:
        try:
            # 构建文件路径
            source_path = os.path.join('data', filename)
            thumbnail_path = os.path.join('thumbnails', filename)
            
            # 如果缩略图已存在，跳过
            if os.path.exists(thumbnail_path):
                print(f"⏭️  跳过 {filename}（缩略图已存在）")
                continue
            
            # 打开图片
            with Image.open(source_path) as img:
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
                    shutil.copy2(source_path, thumbnail_path)
                    print(f"📋 复制 {filename}（原图已足够小）")
                else:
                    # 计算新尺寸
                    new_width = int(width * ratio)
                    new_height = int(height * ratio)
                    
                    # 生成缩略图
                    thumbnail = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    
                    # 保存缩略图，优化质量
                    if filename.lower().endswith('.png'):
                        # PNG格式保持原格式
                        thumbnail.save(thumbnail_path, 'PNG', optimize=True)
                    else:
                        # 其他格式转换为JPEG
                        thumbnail.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
                    
                    print(f"✅ 生成 {filename} 缩略图 ({new_width}x{new_height})")
                
                success_count += 1
                
        except Exception as e:
            print(f"❌ 处理 {filename} 时出错：{str(e)}")
            error_count += 1
    
    print("\n" + "="*50)
    print(f"🎉 缩略图生成完成！")
    print(f"✅ 成功：{success_count} 张")
    if error_count > 0:
        print(f"❌ 失败：{error_count} 张")
    print(f"📁 缩略图保存在：thumbnails/ 文件夹")
    print("💡 现在可以刷新网页，浏览页面将使用缩略图，点击查看原图")

if __name__ == '__main__':
    generate_thumbnails()
