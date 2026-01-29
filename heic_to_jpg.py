#!/usr/bin/env python3
"""Batch convert HEIC/HEIF files under data/ to JPEG, generate thumbnails, and update photos.json.

Run: python heic_to_jpg.py

Requires: Pillow, (optional) pillow-heif for HEIC support.
"""
import os
import sys
import json
from pathlib import Path

try:
    # Optional: pillow_heif registers HEIF opener for Pillow
    import pillow_heif
    pillow_heif.register_heif_opener()
    print('pillow_heif loaded')
except Exception:
    print('pillow_heif not available, will rely on Pillow native support')

try:
    from PIL import Image
except Exception:
    print('Pillow is not installed. Run: pip install Pillow')
    sys.exit(1)

ROOT = Path('.')
DATA_DIR = ROOT / 'data'
THUMBS_DIR = ROOT / 'thumbnails'
PHOTOS_JSON = ROOT / 'photos.json'

def find_heic_files():
    exts = {'.heic', '.HEIC', '.heif', '.HEIF'}
    if not DATA_DIR.exists():
        return []
    return [p for p in DATA_DIR.iterdir() if p.suffix in exts]

def convert_file(p: Path):
    # produce jpeg at same base name with .jpg
    out = p.with_suffix('.jpg')
    try:
        with Image.open(p) as im:
            if im.mode in ('RGBA', 'LA', 'P'):
                im = im.convert('RGB')
            im.save(out, 'JPEG', quality=95, optimize=True)
        print(f'Converted: {p} -> {out}')
        return out
    except Exception as e:
        print(f'Failed to convert {p}: {e}')
        return None

def make_thumbnail(jpg_path: Path, max_w=600, max_h=450):
    if not THUMBS_DIR.exists():
        THUMBS_DIR.mkdir(parents=True)
    thumb_path = THUMBS_DIR / jpg_path.name
    try:
        with Image.open(jpg_path) as im:
            if im.mode in ('RGBA', 'LA', 'P'):
                im = im.convert('RGB')
            im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
            im.save(thumb_path, 'JPEG', quality=90, optimize=True)
        print(f'Thumbnail: {thumb_path}')
        return thumb_path
    except Exception as e:
        print(f'Failed to make thumbnail for {jpg_path}: {e}')
        return None

def update_photos_json(mapping):
    # mapping: { 'data/old.heic': 'data/new.jpg', ... }
    if not PHOTOS_JSON.exists():
        print('photos.json not found; skipping JSON update')
        return
    with PHOTOS_JSON.open('r', encoding='utf-8') as f:
        payload = json.load(f)

    photos = payload.get('photos') if isinstance(payload, dict) else payload
    if photos is None:
        print('Unexpected photos.json structure; skipping')
        return

    changed = 0
    for p in photos:
        src = p.get('src', '')
        for old, new in mapping.items():
            # match by suffix or exact
            if src.endswith(old) or src == old:
                p['src'] = new
                thumb = Path(new).with_suffix('.jpg').name
                p['thumbnailPath'] = f'thumbnails/{Path(new).name}'
                changed += 1
                print(f'Updated JSON entry for {old} -> {new}')
                break

    # backup
    bk = PHOTOS_JSON.with_suffix('.bak.json')
    if not bk.exists():
        PHOTOS_JSON.rename(bk)
        with bk.open('r', encoding='utf-8') as f:
            data = json.load(f)
        with PHOTOS_JSON.open('w', encoding='utf-8') as f:
            json.dump({'photos': data} if isinstance(data, list) else data, f, ensure_ascii=False, indent=2)
    else:
        with PHOTOS_JSON.open('w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f'photos.json updated, entries changed: {changed}')

def main():
    files = find_heic_files()
    if not files:
        print('No HEIC/HEIF files found in data/.')
        return

    mapping = {}
    for p in files:
        out = convert_file(p)
        if out:
            thumb = make_thumbnail(out)
            mapping[str(p).replace('\\', '/')] = str(out).replace('\\', '/')

    if mapping:
        update_photos_json(mapping)
    else:
        print('No files converted.')

if __name__ == '__main__':
    main()
