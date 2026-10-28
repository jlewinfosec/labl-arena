#!/usr/bin/env python3
"""Assemble LABL_Arena.html from selected ranges of the EP field terminal source
plus LABL overlay files. Ranges are 1-based inclusive line numbers in src.html."""
import sys, re, pathlib
HERE = pathlib.Path(__file__).parent
SRC = (HERE/'src.html').read_text(encoding='utf-8').split('\n')

def rng(a, b):
    return '\n'.join(SRC[a-1:b])

def read(name):
    return (HERE/'overlay'/name).read_text(encoding='utf-8')

import json
def stubs():
    f = HERE/'overlay'/'undef.json'
    names = json.loads(f.read_text()) if f.exists() else []
    skip = set(json.loads((HERE/'overlay'/'curated.json').read_text()))
    out = ['<script>/* ---- auto stubs: EP globals not carried into LABL ---- */']
    for n in names:
        if n in skip or n in ('define','module','process','exports','require'): continue
        out.append(f'if (typeof {n} === "undefined") window.{n} = function {n}() {{ return undefined; }};')
    out.append('</script>')
    return '\n'.join(out)

parts = []
# ---- head + CSS (lines 1-1241 contain head, style, body open). We rebuild head ourselves.
parts.append(read('head.html'))              # <!doctype> ... <style> fonts </style>
parts.append(rng(10, 1239))                  # original <style> ... </style>
parts.append(read('theme.css.html').replace('LABL_LOGO_URL', 'data:image/png;base64,' + read('logo_b64.txt')))  # LABL theme
parts.append('</head>\n<body>')
parts.append(rng(1839, 1841))                # redlight filter + #navbar + #app (EP emblem + boot splash dropped)
parts.append(read('pre.js.html'))            # shims that must exist before EP code
parts.append(rng(2086, 2434))                # GRIDNAV (nav mini-game math)
parts.append(rng(2435, 3054))                # SHARED HELPERS
parts.append('<script>/* ---- helpers lifted from dropped EP modules ---- */')
parts.append(rng(27660, 27717))              # B32, b32enc/dec, kh32, runKey, runStream
parts.append(rng(27718, 27719))              # utf8/unutf8
parts.append(rng(29260, 29284))              # sealBytes / unsealBytes
parts.append(rng(67009, 67013))              # mtMin
parts.append(rng(50317, 50317))              # sunTxt
parts.append('</script>')
parts.append(rng(6000, 15347))               # CONFIG, helpers, audio, registry/router, leaderboard, log
parts.append(rng(15654, 15854))              # legibility pass
parts.append(rng(15855, 27614))              # kits, shell, demos, 20 games, mission tablet, bunker
parts.append(rng(27615, 27622))              # qrcode + jsQR
parts.append(rng(32447, 44824))              # kiosk block incl. BULLET BALLET core
parts.append(rng(44825, 49627))              # arena titles + run-of-show
parts.append(stubs())                        # auto no-op stubs for still-undefined EP globals
parts.append(read('labl.js.html'))           # LABL shell: PIN, modes, roster, scoreboard, backup, CSV, verbiage
parts.append('<script>route();</script>')
parts.append('</body></html>')

out = '\n'.join(parts)

# ---- source patches: exact-substring edits for things the shell can't override at runtime (const bindings etc.)
sys.path.insert(0, str(HERE/'overlay'))
import patches
for old, new in patches.PATCHES:
    c = out.count(old)
    if c != 1:
        print(f'PATCH FAILED ({c} matches): {old[:90]!r}'); sys.exit(1)
    out = out.replace(old, new)
PATCHES_ALL = getattr(patches, "PATCHES_ALL", [])
for old, new in PATCHES_ALL:
    if old not in out: print("PATCH_ALL missing:", old[:80]); sys.exit(1)
    out = out.replace(old, new)
print('applied', len(patches.PATCHES), 'patches')

tmp = HERE/'_pre_terms.html'
tmp.write_text(out, encoding='utf-8')
# ---- verbiage pass (string-literal aware; see overlay/terms.js)
import subprocess
subprocess.run(['node', str(HERE/'overlay'/'terms.js'), str(tmp), str(HERE/'LABL_Arena.html')], check=True)
out = (HERE/'LABL_Arena.html').read_text(encoding='utf-8')
print('wrote LABL_Arena.html', len(out)//1024, 'KB', out.count('\n'), 'lines')
