#!/bin/bash
# regenerate lint/all.js from the built file and write overlay/undef.json
cd /home/claude/labl
python3 - <<'PY'
import re,pathlib
b=pathlib.Path('LABL_Arena.html').read_text(encoding='utf-8')
blocks=re.findall(r'<script(?![^>]*text/plain)[^>]*>(.*?)</script>',b,flags=re.S)
js=[blk for blk in blocks if not (len(blk)>100000 and ('qrcode' in blk[:2000].lower() or 'jsQR' in blk[:5000]))]
# drop the auto-stub block itself so we see the true undefined set
js=[x for x in js if 'auto stubs: EP globals' not in x[:200]]
pathlib.Path('lint/all.js').write_text('\n;\n'.join(js))
PY
cd lint && npx eslint all.js -f json 2>/dev/null | python3 -c "
import json,sys,collections,re
d=json.load(sys.stdin); c=collections.Counter()
for f in d:
  for m in f['messages']:
    if m['ruleId']!='no-undef': print('OTHER',m['line'],m['message']); continue
    c[re.search(r\"'([^']+)'\",m['message']).group(1)]+=1
names=[n for n,_ in c.most_common()]
json.dump(names,open('../overlay/undef.json','w'),indent=0)
print(len(names),'undefined ->',', '.join(names[:40]))
"
