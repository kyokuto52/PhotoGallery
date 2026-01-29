try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    print('pillow_heif registered for inspection')
except Exception:
    print('pillow_heif not available')

from PIL import Image

paths = [
    'data/1769710623790_DSCF0541.HEIC',
    'data/1769710623790_DSCF0541.heic'
]

for p in paths:
    try:
        img = Image.open(p)
        print('FILE:', p)
        print('TYPE:', type(img))
        print('INFO KEYS:', list(img.info.keys()))
        # show raw info entries
        for k, v in img.info.items():
            print(' -', k, type(v))
    except Exception as e:
        print('ERROR opening', p, e)
