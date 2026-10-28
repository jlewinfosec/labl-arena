#!/usr/bin/env python3
"""Make docs/icon-192.png and docs/icon-512.png from overlay/logo_b64.txt (run once; the PNGs are committed)."""
import base64, io, pathlib
from PIL import Image
HERE = pathlib.Path(__file__).parent.parent
logo = Image.open(io.BytesIO(base64.b64decode((HERE/'overlay'/'logo_b64.txt').read_text().strip()))).convert('RGBA')
for sz in (192, 512):
    bg = Image.new('RGBA', (sz, sz), (15, 31, 92, 255))        # #0f1f5c, so maskable icons have no transparent corners
    pad = int(sz * 0.06)
    im = logo.copy(); im.thumbnail((sz - 2*pad, sz - 2*pad), Image.LANCZOS)
    bg.alpha_composite(im, ((sz - im.width)//2, (sz - im.height)//2))
    bg.convert('RGB').save(HERE/'docs'/f'icon-{sz}.png', optimize=True)
    print('wrote', f'icon-{sz}.png')
