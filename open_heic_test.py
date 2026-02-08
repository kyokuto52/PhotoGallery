import sys
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    print('pillow_heif registered')
except Exception as e:
    print('pillow_heif not available', e)
from PIL import Image
p='data/1770574823605_DSCF0658.HEIC'
try:
    with Image.open(p) as img:
        print('Opened:', p)
        print('FORMAT:', img.format)
        print('MODE:', img.mode)
        print('INFO KEYS:', list(img.info.keys()))
except Exception as e:
    print('ERROR opening', p, e)
