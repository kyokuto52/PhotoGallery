import os
import json
from PIL import Image

# 目标HEIC条目
heic_src = "data/1770576025285_DSCF0231.HEIC"
jpg_src = "data/1770576025285_DSCF0231.jpg"
thumb_heic = "thumbnails/1770576025285_DSCF0231.HEIC"
thumb_jpg = "thumbnails/1770576025285_DSCF0231.jpg"

# 1. 转换HEIC为JPG
if os.path.exists(heic_src):
    with Image.open(heic_src) as im:
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGB")
        im.save(jpg_src, "JPEG", quality=95, optimize=True)
    os.remove(heic_src)
    print(f"HEIC已转JPG: {jpg_src}")
else:
    print("HEIC源文件不存在")

# 2. 缩略图
if os.path.exists(thumb_heic):
    with Image.open(jpg_src) as im:
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGB")
        im.thumbnail((400, 300))
        im.save(thumb_jpg, "JPEG", quality=85, optimize=True)
    os.remove(thumb_heic)
    print(f"缩略图已转JPG: {thumb_jpg}")
else:
    print("HEIC缩略图不存在")

# 3. 更新photos.json
with open("photos.json", "r", encoding="utf-8") as f:
    data = json.load(f)
for p in data["photos"]:
    if p["src"] == heic_src:
        p["src"] = jpg_src
    if p.get("thumbnailPath") == thumb_heic:
        p["thumbnailPath"] = thumb_jpg
with open("photos.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("photos.json已更新")
