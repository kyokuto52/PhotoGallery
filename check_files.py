import json
from pathlib import Path

PH = Path('photos.json')
if not PH.exists():
    print('photos.json missing')
    raise SystemExit(1)

data = json.loads(PH.read_text(encoding='utf-8'))
photos = data.get('photos') if isinstance(data, dict) else data
miss_src = []
miss_thumb = []
for p in photos:
    src = p.get('src','')
    tp = p.get('thumbnailPath','')
    if src:
        if not Path(src).exists():
            miss_src.append(src)
    if tp:
        if not Path(tp).exists():
            miss_thumb.append(tp)

print('missing src count:', len(miss_src))
for s in miss_src[:50]:
    print(' MISSING SRC:', s)
print('missing thumb count:', len(miss_thumb))
for t in miss_thumb[:50]:
    print(' MISSING THUMB:', t)
