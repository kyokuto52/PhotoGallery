import sys
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    print('pillow_heif registered')
except Exception as e:
    print('pillow_heif not available', e)
from PIL import Image
import xml.etree.ElementTree as ET

p = 'data/1770574823605_DSCF0658.HEIC'
try:
    with Image.open(p) as img:
        print('Opened:', p)
        print('INFO KEYS:', list(img.info.keys()))
        if 'exif' in img.info:
            ex = img.info['exif']
            print('\n--- exif (bytes) length:', len(ex))
            try:
                import piexif
                try:
                    d = piexif.load(ex)
                    print('piexif load OK; 0th keys:', list(d.get('0th', {}).keys())[:10])
                except Exception as e:
                    print('piexif.load failed:', e)
            except Exception:
                print('piexif not installed')
            # print first 200 bytes hex
            print('exif head (hex):', ex[:200].hex())
        else:
            print('\n--- no exif in img.info')

        if 'xmp' in img.info:
            x = img.info['xmp']
            print('\n--- xmp type:', type(x), 'len:', len(x))
            try:
                if isinstance(x, bytes):
                    s = x.decode('utf-8', errors='ignore')
                else:
                    s = str(x)
                print('xmp head:\n', s[:800])
                # try parse xml
                try:
                    root = ET.fromstring(s)
                    # search for common datetime tags
                    for elem in root.iter():
                        tag = elem.tag
                        if 'Date' in tag or 'date' in tag or 'DateTime' in tag or 'CreateDate' in tag or 'DateTimeOriginal' in tag:
                            print('XMP tag:', tag, '=>', elem.text)
                except Exception as e:
                    print('XMP XML parse failed:', e)
            except Exception as e:
                print('Error decoding xmp:', e)
        else:
            print('\n--- no xmp in img.info')

except Exception as e:
    print('ERROR opening', p, e)
