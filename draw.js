// Phase 1 test: 30 players with mixed blaster types and ages, drawn 20 times — every draw balanced, at least 10
// different splits; a walk-in placed in at most 4 interactions; screenshots of the draw screen and the walk-in.
const { chromium } = require('playwright'); const path = require('path');
let fail = 0; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const btn = t => p.evaluate(t => { const x = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toLowerCase().includes(t.toLowerCase())); if (!x) throw new Error('no button ' + t); x.click(); }, t);
  await p.goto('file://' + path.resolve('LABL_Arena.html'), { waitUntil: 'load' });
  await p.fill('input[placeholder="NEW PIN"]', '1234'); await p.fill('input[placeholder="AGAIN"]', '1234'); await btn('Set up this tablet'); await p.waitForTimeout(500);
  // 30 players: 12 springers, 12 flywheels, 3 both, 3 blank; ages 8 youth, 9 teen, 10 adult, 3 blank
  const NAMES = 'Ava Ben Cal Dee Eli Fay Gus Hal Ivy Jon Kai Lee Mia Ned Ola Pat Quin Rae Sid Tam Uma Vic Wes Xan Yas Zed Ash Bo Cy Di'.split(' ');
  await p.evaluate(NAMES => {
    const ages = ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', '', '', ''];
    const bls = ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'B', 'B', 'B', '', '', ''];
    const R = { 'FREE AGENTS': NAMES.map((n, i) => ({ id: 'p' + i, n, nw: false, dead: false, age: ages[i] })) };
    const v = loadCfg(); v.roster = R; saveCfg(v);
    const T = bbTeams(); T.pool = NAMES.map((_, i) => 'p' + i); T.bl = {}; NAMES.forEach((_, i) => { if (bls[(i * 7) % 30]) T.bl['p' + i] = bls[(i * 7) % 30]; }); bbSaveTeams(T);
  }, NAMES);
  // 20 draws straight through lablDraw, checked against the balance limits
  const res = await p.evaluate(() => {
    const P = bbPlayers(), T = bbTeams(), splits = new Set(), bad = [];
    for (let i = 0; i < 20; i++) {
      const [A, B] = lablDraw(P, T.bl);
      const byId = Object.fromEntries(P.map(x => [x.id, x]));
      const bal = lablBalance(P, A.map(i => byId[i]), B.map(i => byId[i]), T.bl);
      if (A.length + B.length !== P.length) bad.push('draw ' + i + ' lost players');
      Object.entries(bal.d).forEach(([k, v]) => { if (v > 1) bad.push('draw ' + i + ' ' + k + ' differs by ' + v); });
      splits.add([...A].sort().join(','));
    }
    return { bad, distinct: splits.size };
  });
  check(res.bad.length === 0, '20 draws of 30 players: team size, springer, flywheel, both, youth, teen, adult each differ by at most 1' + (res.bad.length ? ': ' + res.bad.slice(0, 5).join('; ') : ''));
  check(res.distinct >= 10, '20 draws produce at least 10 different splits (' + res.distinct + ')');
  // the draw screen, with a draw, at both tablet sizes
  await p.evaluate(() => { setMode('6'); bbRunUnlock(); go({ g: 'bbrun', s: 'teams' }); }); await p.waitForTimeout(500);
  await btn('Draw teams'); await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/p1_draw_1280x800.png', fullPage: false });
  const bal = await p.evaluate(() => [...document.querySelectorAll('.labl-team-bal')].map(x => x.textContent));
  console.log('balance lines:', bal.join(' || '));
  await p.setViewportSize({ width: 800, height: 1280 }); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/p1_draw_800x1280.png', fullPage: false });
  await p.setViewportSize({ width: 1280, height: 800 });
  // walk-in from the run screen: 3 interactions (open, name, Add) — the chips are optional
  await p.evaluate(() => { const P = BBP.get(); if (!P.items.some(x => x.k === 'mode')) { P.items.push({ k: 'mode', mode: 'Capture the Flag', n: 3, id: 'm1' }); BBP.save(P); } const T = bbTeams(); T.drawIdx = lablCurIdx(); bbSaveTeams(T); go({ g: 'bbrun' }); }); await p.waitForTimeout(500);
  let n = 0;
  await btn('+ Walk-in'); n++; await p.waitForTimeout(300); await p.screenshot({ path: 'shots/p1_walkin.png', fullPage: false });
  await p.fill('.labl-walk input', 'Newbie'); n++;
  await p.click('.labl-walk .labl-chip.big:nth-child(2)'); n++;   // Springer (optional)
  await p.click('.labl-walk button:has-text("Add")'); n++; await p.waitForTimeout(500);
  const placed = await p.evaluate(() => { const T = bbTeams(), P = bbPlayers(), x = P.find(y => y.n === 'Newbie'); return x ? (T.a.m.includes(x.id) ? 'RED' : T.b.m.includes(x.id) ? 'BLUE' : 'none') + ' bl=' + (T.bl[x.id] || '') + ' pool=' + T.pool.includes(x.id) : 'missing'; });
  check(/^(RED|BLUE) bl=S pool=true$/.test(placed) && n <= 4, 'walk-in added, pooled and placed on a team in ' + n + ' interactions (' + placed + ')');
  const sizes = await p.evaluate(() => [bbTeams().a.m.length, bbTeams().b.m.length]);
  check(Math.abs(sizes[0] - sizes[1]) <= 1, 'teams still within 1 after the walk-in (' + sizes.join('-') + ')');
  // competitive flag hides squads; plain blocks never show the squads format
  const sqOpt = await p.evaluate(() => { go({ g: 'home' }); DIR_OK = true; DIR_LAST = Date.now(); go({ g: 'home', tab: 'teams' }); return [...document.querySelectorAll('option')].some(o => o.value === 'sq'); });
  check(!sqOpt, 'Squads vs squads hidden when the block is not competitive');
  const sqOpt2 = await p.evaluate(() => { const P = BBP.get(); P.items.filter(x => x.k === 'mode')[0].comp = true; BBP.save(P); go({ g: 'home', tab: 'teams' }); return [...document.querySelectorAll('option')].some(o => o.value === 'sq'); });
  check(sqOpt2, 'Squads vs squads offered when the block is competitive');
  check(!errs.length, 'zero PAGEERROR lines' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fail ? '\n' + fail + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED'); process.exit(fail ? 1 : 0);
})();
