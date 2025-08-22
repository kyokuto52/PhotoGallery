#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EXIF元数据提取脚本
从图片中提取相机、镜头、光圈、焦距、快门速度等拍摄信息
运行方式：python extract_exif.py
"""

import os
import json
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def extract_exif_data(image_path):
    """提取图片的EXIF元数据"""
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
                'ExifImageWidth': '图片宽度',
                'ExifImageLength': '图片高度',
                'Orientation': '方向',
                'XResolution': 'X分辨率',
                'YResolution': 'Y分辨率',
                'ResolutionUnit': '分辨率单位',
                'YCbCrPositioning': 'YCbCr定位',
                'ExifOffset': 'EXIF偏移',
                'ExifVersion': 'EXIF版本',
                'FlashPixVersion': 'FlashPix版本',
                'ColorSpace': '色彩空间',
                'ComponentsConfiguration': '组件配置',
                'CompressedBitsPerPixel': '压缩位/像素',
                'PixelXDimension': '像素X尺寸',
                'PixelYDimension': '像素Y尺寸',
                'UserComment': '用户注释',
                'DateTimeOriginal': '原始拍摄时间',
                'DateTimeDigitized': '数字化时间',
                'SubsecTime': '子秒时间',
                'SubsecTimeOriginal': '原始子秒时间',
                'SubsecTimeDigitized': '数字化子秒时间',
                'ExposureTime': '曝光时间',
                'FNumber': '光圈值',
                'ExposureProgram': '曝光程序',
                'SpectralSensitivity': '光谱灵敏度',
                'ISOSpeedRatings': 'ISO感光度',
                'OECF': '光电转换函数',
                'ExifVersion': 'EXIF版本',
                'DateTimeOriginal': '原始拍摄时间',
                'DateTimeDigitized': '数字化时间',
                'ComponentsConfiguration': '组件配置',
                'CompressedBitsPerPixel': '压缩位/像素',
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
                'SubsecTime': '子秒时间',
                'SubsecTimeOriginal': '原始子秒时间',
                'SubsecTimeDigitized': '数字化子秒时间',
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
                'DeviceSettingDescription': '设备设置描述',
                'SubjectDistanceRange': '主体距离范围',
                'ImageUniqueID': '图片唯一ID',
                'CameraOwnerName': '相机所有者姓名',
                'BodySerialNumber': '机身序列号',
                'LensSpecification': '镜头规格',
                'LensMake': '镜头品牌',
                'LensModel': '镜头型号',
                'LensSerialNumber': '镜头序列号'
            }
            
            # 提取EXIF信息
            for tag_id, value in exif_data.items():
                tag_name = TAGS.get(tag_id, tag_id)
                if tag_name in exif_tags:
                    exif_info[exif_tags[tag_name]] = str(value)
            
            # 处理特殊值
            if '曝光时间' in exif_info:
                try:
                    exposure_time = float(exif_info['曝光时间'])
                    if exposure_time < 1:
                        exif_info['曝光时间'] = f"1/{int(1/exposure_time)}秒"
                    else:
                        exif_info['曝光时间'] = f"{exposure_time}秒"
                except:
                    pass
            
            if '光圈值' in exif_info:
                try:
                    f_number = float(exif_info['光圈值'])
                    exif_info['光圈值'] = f"f/{f_number:.1f}"
                except:
                    pass
            
            if '焦距' in exif_info:
                try:
                    focal_length = float(exif_info['焦距'])
                    exif_info['焦距'] = f"{focal_length}mm"
                except:
                    pass
            
            if 'ISO感光度' in exif_info:
                exif_info['ISO感光度'] = f"ISO {exif_info['ISO感光度']}"
            
            return exif_info
            
    except Exception as e:
        print(f"提取EXIF数据时出错 {image_path}: {str(e)}")
        return None

def update_photos_with_exif():
    """更新photos.json文件，添加EXIF元数据"""
    try:
        # 读取现有的photos.json
        with open('photos.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        photos = data.get('photos', [])
        updated_count = 0
        
        print("🔄 开始提取图片EXIF元数据...")
        
        for photo in photos:
            if 'src' in photo and photo['src'].startswith('data/'):
                image_path = photo['src']
                
                if os.path.exists(image_path):
                    exif_data = extract_exif_data(image_path)
                    if exif_data:
                        # 添加EXIF数据到照片信息中
                        photo['exif'] = exif_data
                        updated_count += 1
                        print(f"✅ 已提取 {image_path} 的EXIF数据")
                    else:
                        print(f"⚠️  未找到 {image_path} 的EXIF数据")
                else:
                    print(f"❌ 图片文件不存在: {image_path}")
        
        # 保存更新后的数据
        with open('photos.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n🎉 EXIF元数据提取完成！")
        print(f"✅ 成功更新 {updated_count} 张照片")
        print(f"📁 数据已保存到: photos.json")
        print("💡 现在可以刷新网页，查看灯箱中的元数据信息")
        
    except Exception as e:
        print(f"❌ 更新photos.json时出错: {str(e)}")

if __name__ == '__main__':
    update_photos_with_exif()
