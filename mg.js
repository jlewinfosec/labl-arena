// Phase 4: screenshot every mini-game mid-play (node mg.js before|after), and with "after" also check the LABL rules:
// a fail locks 30 s Standard / 60 s Hard, "I got tagged" leaves no lockout, no grade on the win screen, arena timing caps.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const tag = process.argv[2] || 'after';
let fail = 0; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.stack.split('\n').slice(0, 2).join(' <- ')));
  const file = 'file://' + path.resolve('LABL_Arena.html');
  fs.mkdirSync('shots/mg-' + tag, { recursive: true });
  await p.goto(file, { waitUntil: 'load' });
  await p.fill('input[placeholder="NEW PIN"]', '1234'); await p.fill('input[placeholder="AGAIN"]', '1234');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Set up this tablet')).click()); await p.waitForTimeout(400);
  await p.evaluate(() => { setMode('7'); lablCfgSet({ gamesOff: [] }); });
  const ids = await p.evaluate(() => orderedIds());
  const open = async (id, d) => {
    await p.goto(file + '?g=' + id + '&d=' + d, { waitUntil: 'load' }); await p.waitForTimeout(600);
    const st = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^(start|begin|play)\b/i.test(x.textContent.trim())); if (b) b.click(); return !!b; });
    if (st) await p.waitForTimeout(1800);
    return st;
  };
  for (const id of ids) {
    errs.length = 0;
    await open(id, 1);
    await p.screenshot({ path: 'shots/mg-' + tag + '/' + id + '.png' });
    const txt = await p.evaluate(() => document.querySelector('#app').innerText.slice(0, 120).replace(/\n+/g, ' | '));
    console.log(id.padEnd(9), txt.slice(0, 90), errs.length ? '\n   ' + errs.join('\n   ') : '');
  }
  if (tag === 'after') {
    // green CRT palette must be gone from the canvases: sample every canvas for phosphor-green pixels
    const greens = [];
    for (const id of ids) {
      await open(id, 1);
      const g = await p.evaluate(() => { let n = 0, tot = 0; document.querySelectorAll('canvas').forEach(cv => { try { const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data; for (let i = 0; i < d.length; i += 16) { tot++; const r = d[i], g = d[i + 1], b = d[i + 2]; if (g > 215 && r > 90 && r < 200 && b > 90 && b < 200 && g - Math.max(r, b) > 50) n++; /* phosphor green (pale), not the GREEN game color */ } } catch (e) {} }); return tot ? n / tot : 0; });
      if (g > 0.02) greens.push(id + ' ' + Math.round(g * 100) + '%');
    }
    check(greens.length === 0, 'no canvas is more than 2% phosphor (CRT) green' + (greens.length ? ': ' + greens.join(', ') : ''));
    // lockouts: Standard 30 s, Hard 60 s, from a real fail (quit = fail)
    const lockAfterFail = async d => {
      await open('smash', d);
      await p.evaluate(() => { CUR_API && CUR_API.fail('test fail', { cause: 'mistakes' }); }); await p.waitForTimeout(1500);
      return p.evaluate(() => { const L = lkGet(); const box = L.smash && L.smash.all; return box ? Math.round((box.until - Date.now()) / 1000) : -1; });
    };
    const s1 = await lockAfterFail(1); check(s1 >= 27 && s1 <= 30, 'a Standard fail locks the station for 30 s (' + s1 + ')');
    await p.screenshot({ path: 'shots/mg-after/_fail_screen.png' });
    await p.evaluate(() => mtabClearLocks());
    const s2 = await lockAfterFail(2); check(s2 >= 57 && s2 <= 60, 'a Hard fail locks the station for 60 s (' + s2 + ')');
    await p.evaluate(() => mtabClearLocks());
    // I got tagged: no lockout, logged as tagged
    await open('lock', 1);
    const hasTag = await p.$('button:has-text("I got tagged")'); check(!!hasTag, '"I got tagged" button on the game screen');
    if (hasTag) { await hasTag.click(); await p.waitForTimeout(600); }
    const after = await p.evaluate(() => { const L = lkGet(); const rows = mtabLogGet().rows; return { locked: !!(L.lock && L.lock.all && L.lock.all.until > Date.now()), tagged: rows.some(r => r.tagged), pending: !!jget('ep_pending', null) }; });
    check(!after.locked && after.tagged && !after.pending, 'tagged leaves no lockout and is logged (' + JSON.stringify(after) + ')');
    // win screen: finish time, no grade
    await open('smash', 1);
    await p.evaluate(() => { CUR_API && CUR_API.win('test win', { }); }); await p.waitForTimeout(1200);
    const win = await p.evaluate(() => document.querySelector('#app').innerText);
    check(/\d:\d\d/.test(win) && !/GRADE|\bS\b\s*$/m.test(win) && !/MISTAKES/.test(win), 'win screen shows the finish time and no grade');
    await p.screenshot({ path: 'shots/mg-after/_win_screen.png' });
    // timing profiles: arena caps the clock at 60 s (Standard) and 45 s (Hard); story keeps EP's length
    const clock = async (id, d, prof) => { await p.evaluate(prof => lablCfgSet({ mg: prof }), prof); await open(id, d); return p.evaluate(() => { const t = document.querySelector('.hud .t'); return t ? t.textContent.trim() : '?'; }); };
    const a1 = await clock('lock', 1, 'arena'), a2 = await clock('lock', 2, 'arena'), s = await clock('lock', 1, 'story');
    check(/^0?:?(59|60|1:00|0:59)/.test(a1.replace(/^0+:/, '')) || a1 === '1:00' || a1 === '0:59', 'arena Standard clock starts near 60 s (' + a1 + ')');
    check(/0:4[45]/.test(a2) || a2 === '45', 'arena Hard clock starts near 45 s (' + a2 + ')');
    check(/1:(39|40)/.test(s), 'story timing keeps EP\'s 100 s for Pick the lock (' + s + ')');
    const pins = await p.evaluate(() => { lablCfgSet({ mg: 'arena' }); return lablMgV([0, 6, 8], [0, 4, 4], 1); });
    check(pins === 4, 'arena step count for the lock is 4 pins (' + pins + ')');
    await p.evaluate(() => lablCfgSet({ mg: 'arena' }));
    check(!errs.some(e => e.startsWith('PAGEERROR')), 'zero PAGEERROR lines' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log(fail ? '\n' + fail + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
  }
  await b.close(); process.exit(fail ? 1 : 0);
})();
