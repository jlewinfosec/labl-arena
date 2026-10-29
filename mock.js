// Phase 8: a mock game day end to end. 20 players + 2 walk-ins, 5 blocks (a team block, an FFA block decided by the
// grid, an elimination block, a story chapter won at the mini-game station, a last team block), one edited round,
// the dart sweep and teardown, then Send to Google Drive (navigator.share stubbed). Also: the screen wake lock is held
// through a 6-minute simulated round (navigator.wakeLock stubbed), and the back gesture mid-round stays on the run screen.
const { chromium } = require('playwright'); const path = require('path');
let fail = 0; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__wake = { requests: 0, held: null };
    Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { window.__wake.requests++; const h = { released: false, release: async () => { h.released = true; }, addEventListener() {} }; window.__wake.held = h; return h; } }, configurable: true });
    window.__shared = []; navigator.share = async d => { window.__shared.push((d.files || []).map(f => f.name)); }; navigator.canShare = () => true;
  });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const btn = async t => { const ok = await p.evaluate(t => { const x = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toLowerCase().includes(t.toLowerCase())); if (!x) return false; x.click(); return true; }, t); if (!ok) console.log('NO BUTTON:', t); await p.waitForTimeout(350); return ok; };
  const nextUp = async () => { if (await p.evaluate(() => !!document.querySelector('.labl-nextup'))) { await p.click('.labl-nextup'); await p.waitForTimeout(300); } };
  const rules = async () => { for (let i = 0; i < 20 && !(await p.evaluate(() => !!document.getElementById('labl-rules'))); i++) await p.waitForTimeout(150); if (await p.evaluate(() => !!document.getElementById('labl-chapter'))) { await p.click('#labl-chapter button'); await p.waitForTimeout(300); } if (await p.evaluate(() => !!document.getElementById('labl-rules'))) { await p.click('#labl-rules button'); await p.waitForTimeout(400); return true; } return false; };
  const ff = async () => { await p.evaluate(() => { const r = jget('ep_bbrun', null); if (r && r.clk && r.clk.t0) { r.clk.t0 -= ((r.clk.len || 300) + 1) * 1000; jset('ep_bbrun', r); } }); await p.waitForTimeout(1300); };
  const winner = async t => { await btn(t); await p.waitForTimeout(300); await nextUp(); await p.waitForTimeout(10300); };
  await p.goto('file://' + path.resolve('LABL_Arena.html'), { waitUntil: 'load' });
  await p.fill('input[placeholder="NEW PIN"]', '1234'); await p.fill('input[placeholder="AGAIN"]', '1234'); await btn('Set up this tablet');
  const NAMES = 'Ava Ben Cal Dee Eli Fay Gus Hal Ivy Jon Kai Lee Mia Ned Ola Pat Quin Rae Sid Tam'.split(' ');
  await p.evaluate(NAMES => {
    const R = { MAKERS: NAMES.slice(0, 10).map((n, i) => ({ id: 'p' + i, n, nw: false, dead: false, age: ['Y', 'T', 'A'][i % 3] })), KREWE: NAMES.slice(10).map((n, i) => ({ id: 'p' + (i + 10), n, nw: false, dead: false, age: ['Y', 'T', 'A'][i % 3] })) }; const v = loadCfg(); v.roster = R; saveCfg(v);
    setMode('6'); bbRunUnlock();
    const P = BBP.get(); P.heads = 20; const story = lablStories().find(s => s.id === 'relic');
    const m = (mode, extra) => Object.assign({ id: bbId(), k: 'mode', mode, n: bbModeN(mode, P), comp: false, mg: 'arena' }, extra || {});
    const brk = (kind, min) => ({ id: bbId(), k: 'brk', kind, min });
    P.items = [P.items[0], m('Capture the Flag'), brk('reload', 10), m('Pistol-Only 3-15 FFA'), brk('reload', 10), m('Standard 3-15'), brk('sweep', 10), m('Story Mission', { story: { sid: story.id, ci: 2 }, len: 120 }), brk('reload', 10), m('Nerfball'), brk('teardown', 20)];
    BBP.save(P);
    const T = bbTeams(); T.pool = NAMES.map((_, i) => 'p' + i); T.bl = {}; NAMES.forEach((_, i) => (T.bl['p' + i] = ['S', 'F'][i % 2])); bbSaveTeams(T);
  }, NAMES);
  // teams, briefing
  await p.evaluate(() => go({ g: 'bbrun', s: 'teams' })); await p.waitForTimeout(400); await btn('Draw teams'); await btn('Use these teams'); await nextUp();
  await p.evaluate(() => go({ g: 'bbrun' })); await p.waitForTimeout(400); await btn('Briefing done'); await p.waitForTimeout(500);
  // two walk-ins during block 1
  for (const n of ['Walkin One', 'Walkin Two']) { await btn('+ Walk-in'); await p.fill('.labl-walk input', n); await p.click('.labl-walk button:has-text("Add")'); await p.waitForTimeout(400); }
  const sizes = await p.evaluate(() => [bbTeams().a.m.length, bbTeams().b.m.length, bbPlayers().length]);
  check(sizes[2] === 22 && sizes[0] + sizes[1] === 22 && Math.abs(sizes[0] - sizes[1]) <= 1, 'two walk-ins joined (22 players, teams ' + sizes[0] + '-' + sizes[1] + ')');
  // block 1: CTF, RED 2-0 — with the wake lock held through a simulated 6-minute round and a back gesture mid-round
  check(await rules(), 'block 1 rules card read, round 1 started');
  await p.waitForTimeout(4000);
  const w0 = await p.evaluate(() => ({ req: window.__wake.requests, held: !!(window.__wake.held && !window.__wake.held.released) }));
  await p.evaluate(() => { const r = jget('ep_bbrun', null); r.clk.t0 -= 360000; r.clk.len = 420; jset('ep_bbrun', r); }); await p.waitForTimeout(1500);   // six minutes in
  const w1 = await p.evaluate(() => ({ held: !!(window.__wake.held && !window.__wake.held.released), clock: (document.querySelector('[data-bbclock]') || {}).textContent }));
  check(w0.req > 0 && w0.held && w1.held, 'screen wake lock requested on the run screen and still held 6 minutes into the round (' + w1.clock + ' left)');
  await p.goBack(); await p.waitForTimeout(600);
  check(await p.evaluate(() => !!document.querySelector('[data-bbclock]') && NAV.get('g') === 'bbrun'), 'back gesture mid-round stays on the run screen');
  await p.evaluate(() => { const r = jget('ep_bbrun', null); r.clk.t0 -= 61000; jset('ep_bbrun', r); }); await p.waitForTimeout(1300);
  await winner('RED WON');
  await btn('Start round'); await p.waitForTimeout(4000); await ff(); await winner('RED WON');
  check(await p.evaluate(() => bbRoundsAll().length === 2 && /Reload/i.test(document.body.innerText)), 'block 1 done 2-0, reload break on screen');
  // block 2: FFA via the grid
  await btn('Next'); await p.waitForTimeout(500); await btn('Keep last teams'); await nextUp(); await p.evaluate(() => go({ g: 'bbrun' })); await p.waitForTimeout(400);
  check(await rules(), 'block 2 (FFA) rules read'); await p.waitForTimeout(4000); await ff();
  await p.evaluate(() => { const rows = [...document.querySelectorAll('.labl-stat-row')]; const plus = r => r.querySelectorAll('.labl-stat-c')[0].querySelectorAll('button')[1]; plus(rows[2]).click(); plus(rows[2]).click(); plus(rows[7]).click(); });
  await p.waitForTimeout(300); await p.click('.labl-confirm button'); await p.waitForTimeout(400); await nextUp(); await p.waitForTimeout(10300);
  const ffa = await p.evaluate(() => { const r = bbRoundsAll().slice(-1)[0]; return r.fmt === 'ffa' && Object.keys(r.st || {}).length === 2; });
  check(ffa, 'FFA block decided by the tags grid');
  await btn('Skip to the next block'); await p.waitForTimeout(500); await btn('Next'); await p.waitForTimeout(500);   // the FFA block is 3 rounds; one was enough for the mock
  await btn('Redraw'); await btn('Use these teams'); await nextUp(); await p.evaluate(() => go({ g: 'bbrun' })); await p.waitForTimeout(400);
  // block 3: Standard, RED, BLUE, RED (tiebreaker)

  check(await rules(), 'block 3 rules read'); await p.waitForTimeout(4000); await ff(); await winner('RED WON');
  await btn('Start round'); await p.waitForTimeout(4000); await ff(); await winner('BLUE WON');
  await btn('Start round'); await p.waitForTimeout(4000); await ff(); await winner('RED WON');
  check(await p.evaluate(() => bbRoundsAll().length === 6 && /Dart sweep/i.test(document.body.innerText)), 'block 3 went to a tiebreaker; dart sweep on screen');
  await btn('Next'); await p.waitForTimeout(500); await btn('Keep last teams'); await nextUp(); await p.evaluate(() => go({ g: 'bbrun' })); await p.waitForTimeout(400);
  // block 4: the story chapter at the mini-game station, BLUE wins
  check(await rules(), 'story chapter card then rules read');
  await p.evaluate(() => { const r = BBR.get(); r.clk = null; BBR.save(r); route(); }); await p.waitForTimeout(300);
  await btn('Mini-game station'); await btn('Station ready'); await btn('Start the round'); await p.waitForTimeout(3600);
  await btn('BLUE PLAYS'); await p.waitForTimeout(600); await btn('Start'); await p.waitForTimeout(1500); await p.evaluate(() => CUR_API && CUR_API.win('mock', {})); await p.waitForTimeout(1200);
  await winner('BLUE WON');
  const st = await p.evaluate(() => { const r = bbRoundsAll().slice(-1)[0]; return r.how === 'mg' && r.teams[r.win].n === 'BLUE' && typeof r.mgs === 'number'; });
  check(st, 'story chapter won at the station: BLUE, how = Mini-game, finish time logged');
  await btn('Skip to the next block'); await p.waitForTimeout(500); if (await p.evaluate(() => /Reload/i.test(document.body.innerText))) await btn('Next'); await p.waitForTimeout(500);
  await btn('Keep last teams'); await nextUp(); await p.evaluate(() => go({ g: 'bbrun' })); await p.waitForTimeout(400);
  // block 5: Nerfball 2-0 BLUE
  check(await rules(), 'block 5 rules read'); await p.waitForTimeout(4000); await ff(); await winner('BLUE WON');
  await btn('Start round'); await p.waitForTimeout(4000); await ff(); await winner('BLUE WON');
  // one edited round: block 1 round 1 → BLUE
  await p.evaluate(() => go({ g: 'bbrun', s: 'rounds' })); await p.waitForTimeout(400);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(x => x.textContent.trim() === 'Edit'); b[b.length - 1].click(); }); await p.waitForTimeout(300);
  await p.click('.labl-edit button:has-text("BLUE won")'); await p.click('.labl-edit button:has-text("Save changes")'); await p.waitForTimeout(400);
  check(await p.evaluate(() => { const r = bbRoundsAll()[0]; return r.teams[r.win].n === 'BLUE' && r.ed.length === 1; }), 'round 1 edited to BLUE');
  // teardown and the end of the day
  await p.evaluate(() => go({ g: 'bbrun' })); await p.waitForTimeout(400);
  if (!(await p.evaluate(() => /teardown/i.test(document.body.innerText)))) { await btn('Skip to the next block'); await p.waitForTimeout(500); }
  check(await p.evaluate(() => /teardown/i.test(document.body.innerText)), 'Dart sweep & teardown on screen');
  await btn('Next'); await p.waitForTimeout(500);
  check(await p.evaluate(() => /That's the day/i.test(document.body.innerText) && !!document.querySelector('.labl-champ')), "That's the day with the Day Champion card");
  await btn('Send backup'); await p.waitForTimeout(600);
  const shared = await p.evaluate(() => window.__shared);
  check(shared.length === 1 && shared[0].length === 3 && shared[0].some(n => /backup/.test(n)) && shared[0].some(n => /players/.test(n)), 'Send to Google Drive shared the backup and both CSVs (' + (shared[0] || []).join(', ') + ')');
  const total = await p.evaluate(() => bbRoundsAll().length);
  check(total === 9, 'nine rounds logged across the five blocks (' + total + ')');
  check(!errs.length, 'zero PAGEERROR lines' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fail ? '\n' + fail + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED'); process.exit(fail ? 1 : 0);
})();
