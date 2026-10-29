// Phase 6 test: Next Up with 30 players (no clipped names, both tablet sizes), every scoreboard slide, auto-rotation,
// tap to pause, swipe to move.
const { chromium } = require('playwright'); const path = require('path');
let fail = 0; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + path.resolve('LABL_Arena.html'), { waitUntil: 'load' });
  await p.fill('input[placeholder="NEW PIN"]', '1234'); await p.fill('input[placeholder="AGAIN"]', '1234');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Set up this tablet')).click()); await p.waitForTimeout(400);
  const NAMES = 'Alexander Bartholomew Christopher Dee Elizabeth Fay Gus Hal Ivy Jon Kai Lee Mia Ned Ola Pat Quintessa Rae Sid Tam Uma Vic Wes Xan Yas Zed Ash Bo Cy Di'.split(' ');
  await p.evaluate(NAMES => {
    const R = { 'FREE AGENTS': NAMES.map((n, i) => ({ id: 'p' + i, n, nw: false, dead: false, age: ['Y', 'T', 'A'][i % 3] })) }; const v = loadCfg(); v.roster = R; saveCfg(v);
    const T = bbTeams(); T.pool = NAMES.map((_, i) => 'p' + i); T.bl = {}; NAMES.forEach((_, i) => { T.bl['p' + i] = ['S', 'F', 'B'][i % 3]; }); bbSaveTeams(T);
    setMode('6'); bbRunUnlock(); const P = BBP.get(); P.heads = 30; P.items = P.items.filter(x => x.kind === 'brief'); bbPlanAuto(P); P.items.filter(x => x.k === 'mode')[0].mode = 'Capture the Flag'; BBP.save(P);
    const [A, B] = lablDraw(bbPlayers(), T.bl); T.a.m = A; T.b.m = B; T.drawIdx = 1; bbSaveTeams(T);
    // a few logged rounds today and last month, so every slide has content
    const Bs = BBS.get(); const ids = NAMES.map((_, i) => 'p' + i); const nm = Object.fromEntries(ids.map((id, i) => [id, NAMES[i]]));
    for (let k = 0; k < 18; k++) { const t = (k < 6 ? Date.now() - (6 - k) * 600000 : Date.now() - 30 * 86400000 + k * 600000), ev = k < 6 ? EVENT_SALT : 'LABL 2026-09-28', half = ids.slice(k % 2, 15 + (k % 2)), other = ids.filter(x => !half.includes(x)); Bs.rounds['s' + k] = { id: 's' + k, t, ev, era: lablSeasonOf(t), mode: k % 3 ? 'Capture the Flag' : 'Pistol-Only 3-15 FFA', fmt: 'teams', teams: [{ n: 'RED', col: 'red', m: half }, { n: 'BLUE', col: 'blue', m: other }], win: k % 2, how: k % 2 ? 'time' : 'obj', nm, sq: {}, st: { [ids[k % 30]]: [2, 1] } }; }
    BBS.save(Bs);
    const r = BBR.get(); r.idx = 1; r.rnd = 2; r.bw = { id: P.items[1].id, w: [1, 0] }; BBR.save(r);
  }, NAMES);
  const clipped = async () => p.evaluate(() => [...document.querySelectorAll('.nu-names span')].filter(s => { const box = s.parentElement.getBoundingClientRect(), r = s.getBoundingClientRect(); return s.scrollWidth > s.clientWidth + 1 || r.bottom > box.bottom + 1; }).map(s => s.textContent));
  await p.evaluate(() => go({ g: 'bbrun', s: 'nextup' })); await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/p6_nextup_30_1280x800.png' });
  let c = await clipped(); check(c.length === 0, 'Next Up, 30 players at 1280×800: no clipped names' + (c.length ? ' (' + c.join(', ') + ')' : ''));
  check(await p.evaluate(() => /ROUND 2 OF 3/i.test(document.body.innerText) && /RED 1/.test(document.body.innerText) && document.querySelectorAll('.nu-team').length === 2), 'Next Up shows the round, the series score and both rosters');
  await p.setViewportSize({ width: 800, height: 1280 }); await p.waitForTimeout(400); await p.screenshot({ path: 'shots/p6_nextup_30_800x1280.png' });
  c = await clipped(); check(c.length === 0, 'Next Up, 30 players at 800×1280: no clipped names' + (c.length ? ' (' + c.join(', ') + ')' : ''));
  const fits = await p.evaluate(() => document.querySelector('.labl-nextup').scrollHeight <= window.innerHeight + 2);
  check(fits, 'Next Up fits the portrait screen without scrolling');
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.click('.labl-nextup'); await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.querySelector('.labl-nextup') && !!document.querySelector('[data-bbclock]')), 'one tap returns to the run screen');
  // the scoreboard
  await p.evaluate(() => { setMode('8'); LABL_SLIDE = 0; LABL_SLIDE_PAUSED = false; go({ g: 'board' }); }); await p.waitForTimeout(500);
  const n = await p.evaluate(() => lablSlides().length);
  for (let i = 0; i < n; i++) { await p.evaluate(i => { LABL_SLIDE = i; route(); }, i); await p.waitForTimeout(400); const k = await p.evaluate(() => lablSlides()[LABL_SLIDE].k); await p.screenshot({ path: 'shots/p6_board_' + k + '.png' }); }
  check(n === 5, 'five scoreboard slides (season top 10, today, Day Champion race, titles, logo): ' + n);
  await p.evaluate(() => { LABL_SLIDE = 0; route(); });
  await p.waitForTimeout(12800);
  check(await p.evaluate(() => LABL_SLIDE) === 1, 'slides rotate on their own every 12 s');
  await p.click('.labl-board .sb-body'); await p.waitForTimeout(300);
  check(await p.evaluate(() => LABL_SLIDE_PAUSED && /PAUSED/.test(document.body.innerText)), 'a tap pauses the rotation');
  await p.mouse.move(900, 400); await p.mouse.down(); await p.mouse.move(600, 400, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  check(await p.evaluate(() => LABL_SLIDE) === 2, 'a swipe moves to the next slide');
  check(!(await p.evaluate(() => /\d:\d\d\s*$/m.test(document.querySelector('.sb-head').textContent))), 'no live round clock on the scoreboard');
  check(!errs.length, 'zero PAGEERROR lines' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fail ? '\n' + fail + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED'); process.exit(fail ? 1 : 0);
})();
