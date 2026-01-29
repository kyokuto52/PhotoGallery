"""Inject EXIF bytes from HEIC into corresponding converted JPEGs.

For each data/*.HEIC that has a same-stem data/*.jpg, read EXIF bytes (via pillow_heif info['exif'])
and insert them into the JPG using piexif so the JPEG contains EXIF (visible to browsers/PIL._getexif()).

Run: python inject_exif_to_jpg.py
"""
from pathlib import Path
import sys

ROOT = Path('.')
DATA = ROOT / 'data'

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass

from PIL import Image
import piexif

pairs = []
for heic in DATA.glob('*.HEIC'):
    jpg = heic.with_suffix('.jpg')
    if jpg.exists():
        pairs.append((heic, jpg))
for heic in DATA.glob('*.heic'):
    jpg = heic.with_suffix('.jpg')
    if jpg.exists() and (heic, jpg) not in pairs:
        pairs.append((heic, jpg))

if not pairs:
    print('No HEIC->JPG pairs found.')
    sys.exit(0)

changed = 0
for heic, jpg in pairs:
    try:
        him = Image.open(heic)
        exif_bytes = him.info.get('exif') or him.info.get('EXIF')
        if not exif_bytes:
            print('No exif bytes in', heic)
            continue
        # load existing jpeg exif (if any)
        try:
            j = Image.open(jpg)
            exist = j.info.get('exif') or None
        except Exception:
            exist = None
        # if jpg already has exif, skip
        if exist:
            print('JPG already has EXIF, skipping:', jpg)
            continue
        # attempt to load exif dict from bytes and dump to jpeg
        try:
            exif_dict = piexif.load(exif_bytes)
        except Exception:
            # try using piexif.load on bytes may fail for some HEIF; try parse with piexif from heic by writing temporary
            exif_dict = None
        if exif_dict is None:
            # attempt to create minimal exif with Original DateTime if present in him.info['xmp'] or him.info['exif']
            print('Could not parse EXIF dict for', heic)
            continue
        new_exif = piexif.dump(exif_dict)
        piexif.insert(new_exif, str(jpg))
        print('Injected EXIF into', jpg)
        changed += 1
    except Exception as e:
        print('Error processing', heic, e)

print('Done. EXIF injected into', changed, 'JPEG(s)')