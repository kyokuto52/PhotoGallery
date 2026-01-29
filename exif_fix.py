#!/usr/bin/env python3
"""Normalize paths in photos.json, replace HEIC src/thumbnailPath with generated JPG when available,
and extract EXIF from image files to populate photo['exif'].

Run: python exif_fix.py
"""
import json
import shutil
from pathlib import Path
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    print('pillow_heif registered')
except Exception:
    pass
from PIL import Image
from PIL.ExifTags import TAGS

ROOT = Path('.')
PHOTOS_JSON = ROOT / 'photos.json'
DATA_DIR = ROOT / 'data'
THUMBS_DIR = ROOT / 'thumbnails'

if not PHOTOS_JSON.exists():
    print('photos.json not found')
    raise SystemExit(1)

with PHOTOS_JSON.open('r', encoding='utf-8') as f:
    payload = json.load(f)

photos = payload.get('photos') if isinstance(payload, dict) else payload
if photos is None:
    print('Unexpected photos.json structure')
    raise SystemExit(1)

# backup
bak = PHOTOS_JSON.with_suffix('.bak.json')
if not bak.exists():
    shutil.copy2(PHOTOS_JSON, bak)
    print(f'Backup created: {bak}')

def extract_exif(path: Path):
    try:
        with Image.open(path) as img:
            out = {}
            # First, try PIL _getexif (works for JPEG)
            try:
                exif_data = img._getexif()
            except Exception:
                exif_data = None

            if exif_data:
                exif_tags = {
                    'Make': '相机品牌',
                    'Model': '相机型号',
                    'Software': '软件',
                    'DateTime': '拍摄时间',
                    'Artist': '摄影师',
                    'DateTimeOriginal': '原始拍摄时间',
                    'ExposureTime': '曝光时间',
                    'FNumber': '光圈值',
                    'ExposureProgram': '曝光程序',
                    'ISOSpeedRatings': 'ISO感光度',
                    'ShutterSpeedValue': '快门速度值',
                    'ApertureValue': '光圈值',
                    'BrightnessValue': '亮度值',
                    'MaxApertureValue': '最大光圈值',
                    'MeteringMode': '测光模式',
                    'LightSource': '光源',
                    'Flash': '闪光灯',
                    'FocalLength': '焦距',
                    'LensModel': '镜头型号',
                    'LensSpecification': '镜头规格',
                    'FocalLengthIn35mmFilm': '35mm胶片等效焦距'
                }
                for tag_id, val in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag in exif_tags:
                        name = exif_tags[tag]
                        try:
                            if tag == 'ISOSpeedRatings':
                                out[name] = f'ISO {val}'
                            else:
                                out[name] = str(val)
                        except Exception:
                            out[name] = str(val)
                return out

            # If PIL _getexif failed (e.g., HEIF), try reading raw EXIF bytes
            try:
                exif_bytes = img.info.get('exif') or img.info.get('EXIF')
                if exif_bytes:
                    import piexif
                    exif_dict = piexif.load(exif_bytes)
                    # extract common tags
                    def val_from_ifd(ifd, tag_id):
                        try:
                            v = exif_dict.get(ifd, {}).get(tag_id)
                            return v
                        except Exception:
                            return None

                    # mapping numeric tags
                    mapping = {
                        ('0th', 271): '相机品牌',
                        ('0th', 272): '相机型号',
                        ('0th', 305): '软件',
                        ('Exif', 36867): '原始拍摄时间',
                        ('Exif', 33434): '曝光时间',
                        ('Exif', 33437): '光圈值',
                        ('Exif', 34855): 'ISO感光度',
                        ('Exif', 37386): '焦距'
                    }
                    for (ifd, tid), name in mapping.items():
                        v = val_from_ifd(ifd, tid)
                        if v is None:
                            continue
                        # format values
                        try:
                            if isinstance(v, bytes):
                                v = v.decode(errors='ignore')
                            elif isinstance(v, tuple) and len(v) == 2:
                                # rational
                                v = f"{v[0]}/{v[1]}"
                            out[name] = str(v)
                        except Exception:
                            out[name] = str(v)
                    return out if out else None
            except Exception:
                pass
            return None
    except Exception as e:
        print('EXIF read error for', path, e)
        return None

changed = 0
exif_added = 0
for p in photos:
    src = p.get('src', '')
    if not src:
        continue
    # normalize slashes
    src = src.replace('\\', '/').strip()
    p['src'] = src

    # if src is HEIC/HEIF and corresponding JPG exists, switch to JPG
    lower = src.lower()
    if lower.endswith('.heic') or lower.endswith('.heif'):
        jpg = str(Path(src).with_suffix('.jpg'))
        if (ROOT / jpg).exists():
            p['src'] = jpg.replace('\\', '/')
            changed += 1

    # thumbnailPath normalization
    tp = p.get('thumbnailPath')
    if tp:
        tp = tp.replace('\\', '/').strip()
        # if thumbnail points to HEIC, try .jpg
        if tp.lower().endswith('.heic') or tp.lower().endswith('.heif'):
            jpgt = tp.rsplit('.', 1)[0] + '.jpg'
            if (ROOT / jpgt).exists():
                p['thumbnailPath'] = jpgt.replace('\\', '/')
                changed += 1
            else:
                p['thumbnailPath'] = tp
        else:
            p['thumbnailPath'] = tp
    else:
        # try to derive thumbnail from src
        candidate = 'thumbnails/' + Path(p['src']).name
        if (ROOT / candidate).exists():
            p['thumbnailPath'] = candidate
            changed += 1

    # try extract exif from src file; if src is JPG without EXIF, try original HEIC variants
    candidates = []
    srcpath = Path(p['src'])
    candidates.append(ROOT / srcpath)
    # add possible HEIC/HEIF variants with same stem
    stem = srcpath.stem
    for ext in ['.HEIC', '.heic', '.HEIF', '.heif', '.jpg', '.jpeg', '.JPG']:
        candidates.append(ROOT / ('data/' + stem + ext))

    found_ex = None
    for cand in candidates:
        if cand.exists():
            ex = extract_exif(cand)
            if ex:
                p['exif'] = ex
                exif_added += 1
                found_ex = True
                break

if isinstance(payload, dict):
    payload['photos'] = photos
else:
    payload = photos

with PHOTOS_JSON.open('w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print(f'Path updates: {changed}, EXIF extracted for: {exif_added} photos')
