from PIL import Image, ExifTags

def info(path):
    try:
        img = Image.open(path)
        print('FILE:', path)
        print('info keys:', list(img.info.keys()))
        try:
            ex = img._getexif()
            print('has exif:', bool(ex))
            if ex:
                for k, v in ex.items():
                    print(ExifTags.TAGS.get(k, k), v)
        except Exception as e:
            print('exif read error', e)
    except Exception as e:
        print('open error for', path, e)

if __name__ == '__main__':
    info('data/1769710623790_DSCF0541.jpg')
    print('---')
    info('data/1769710623790_DSCF0541.HEIC')
