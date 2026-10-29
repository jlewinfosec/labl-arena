// Phase 7 test: a story day; chapter 1 is a Hardpoint round scored on the tablet; chapter 3 ends when BLUE beats the
// mini-game at the station (credits BLUE, how = Mini-game, finish time logged). Screenshots of the station, the Hardpoint
// screen, the story library and a chapter intro.
const { chromium } = require('playwright'); const path = require('path');
let fail = 0; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const btn = t => p.evaluate(t => { const x = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toLowerCase().includes(t.toLowerCase())); if (!x) return false; x.click(); return true; }, t);
  await p.goto('file://' + path.resolve('LABL_Arena.html'), { waitUntil: 'load' });
  await p.fill('input[placeholder="NEW PIN"]', '1234'); await p.fill('input[placeholder="AGAIN"]', '1234');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Set up this tablet')).click()); await p.waitForTimeout(400);
  // roster, story day (Hold the Relic: KOTH → Hardpoint → Story Mission with Rewire), teams
  await p.evaluate(() => {
    const R = { MAKERS: ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'].map((n, i) => ({ id: 'p' + i, n, nw: false, dead: false })) }; const v = loadCfg(); v.roster = R; saveCfg(v);
    setMode('6'); bbRunUnlock(); const P = BBP.get(); const story = lablStories().find(s => s.id === 'relic'); lablStoryDay(P, story); BBP.save(P);
    const T = bbTeams(); T.pool = R.MAKERS.map(x => x.id); T.a.m = ['p0', 'p1', 'p2', 'p3']; T.b.m = ['p4', 'p5', 'p6', 'p7']; T.drawIdx = 1; bbSaveTeams(T);
  });
  // story library screenshot
  await p.evaluate(() => { setMode('0'); DIR_OK = true; DIR_LAST = Date.now(); go({ g: 'home', tab: 'story' }); }); await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/p7_story_library.png' });
  check(await p.evaluate(() => /Escort the VIP/.test(document.body.innerText) && /Hold the Relic/.test(document.body.innerText) && /Retrieval/.test(document.body.innerText)), 'story library lists the three templates');
  const plan = await p.evaluate(() => BBP.get().items.map(x => x.k === 'brk' ? x.kind : x.mode + (x.story ? '#' + x.story.ci : '')));
  check(JSON.stringify(plan) === JSON.stringify(['brief', 'King of the Hill#0', 'reload', 'Hardpoint#1', 'reload', 'Story Mission#2', 'teardown']), 'story day: chapters in order, reload between, teardown last (' + plan.join(' | ') + ')');
  // go straight to chapter 2 (Hardpoint): chapter intro card, then rules
  await p.evaluate(() => { setMode('6'); bbRunUnlock(); const r = BBR.get(); r.idx = 3; r.rnd = 1; r.itemAt = Date.now(); BBR.save(r); const T = bbTeams(); T.drawIdx = 3; bbSaveTeams(T); go({ g: 'bbrun' }); }); await p.waitForTimeout(500);
  check(await p.evaluate(() => !!document.getElementById('labl-chapter') && /CHAPTER 2 OF 3/.test(document.body.innerText)), 'chapter intro card opens before the rules card');
  await p.screenshot({ path: 'shots/p7_chapter_intro.png' });
  await p.click('#labl-chapter button'); await p.waitForTimeout(400);
  check(await p.evaluate(() => !!document.getElementById('labl-rules')), 'rules card follows the chapter card');
  await p.click('#labl-rules button'); await p.waitForTimeout(400);   // Hardpoint's own Start is phone-based and disabled, so this just closes the card
  await p.evaluate(() => { const P = BBP.get(); P.items[3].len = 9; BBP.save(P); });   // a 9-second round so the horn comes quickly
  await btn('Run Hardpoint here'); await p.waitForTimeout(400);
  check(await p.evaluate(() => /Hardpoint on this tablet/i.test(document.body.innerText)), 'Hardpoint station opens from the run screen');
  await btn('Start the round'); await p.waitForTimeout(3600);
  check(await p.evaluate(() => /^[ABC]$/.test((document.querySelector('.st-hill') || {}).textContent || '')), 'the live hill shows as a huge letter');
  await btn('RED HOLDS'); await p.waitForTimeout(1600); await btn('BLUE HOLDS'); await p.waitForTimeout(700); await btn('RED HOLDS'); await p.waitForTimeout(700);
  await p.screenshot({ path: 'shots/p7_hardpoint.png' });
  // the horn
  await p.waitForTimeout(7000);
  const hp = await p.evaluate(() => ({ pend: BBR.get().pre, run: !!document.querySelector('[data-bbclock]') }));
  check(hp.pend && hp.pend.win === 0 && hp.pend.obj[0] > hp.pend.obj[1] && hp.run, 'at the horn the Hardpoint result (RED, most seconds) is handed to the run screen: ' + JSON.stringify(hp.pend && hp.pend.obj));
  await btn('RED WON'); await p.waitForTimeout(400); if (await p.evaluate(() => !!document.querySelector('.labl-nextup'))) { await p.click('.labl-nextup'); await p.waitForTimeout(300); }
  const hpr = await p.evaluate(() => { const r = bbRoundsAll().slice(-1)[0]; return { mode: r.mode, win: r.teams[r.win].n, how: r.how, obj: r.obj, story: r.story }; });
  check(hpr.mode === 'Hardpoint' && hpr.win === 'RED' && hpr.obj[0] > hpr.obj[1] && hpr.story && hpr.story.ci === 1, 'Hardpoint round logged with the seconds held (' + JSON.stringify(hpr) + ')');
  await p.waitForTimeout(10500);
  // chapter 3: the mini-game station; BLUE plays and wins
  await p.evaluate(() => { const r = BBR.get(); r.idx = 5; r.rnd = 1; r.clk = null; r.itemAt = Date.now(); BBR.save(r); const T = bbTeams(); T.drawIdx = 5; bbSaveTeams(T); go({ g: 'bbrun' }); }); await p.waitForTimeout(500);
  check(await p.evaluate(() => /CHAPTER 3 OF 3/i.test(document.body.innerText) && /Last chapter: RED/i.test(document.body.innerText)), 'chapter 3 card says how chapter 2 ended (Last chapter: RED …)');
  await p.click('#labl-chapter button'); await p.waitForTimeout(300); await p.click('#labl-rules button'); await p.waitForTimeout(300);
  await p.evaluate(() => { const r = BBR.get(); r.clk = null; BBR.save(r); route(); }); await p.waitForTimeout(300);   // the rules card started the clock; the station runs its own
  await btn('Mini-game station'); await p.waitForTimeout(400);
  check(await p.evaluate(() => /Pick the game/i.test(document.body.innerText) && /rewire the panel/i.test(document.querySelector('.st-pick .labl-tile.on b').textContent)), 'station setup preselects the chapter\'s mini-game (Rewire the panel)');
  await btn('Station ready'); await p.waitForTimeout(300); await btn('Start the round'); await p.waitForTimeout(3600);
  await p.screenshot({ path: 'shots/p7_mg_station.png' });
  check(await p.evaluate(() => [...document.querySelectorAll('.st-side b')].map(b => b.textContent.toUpperCase()).join('|') === 'RED PLAYS|BLUE PLAYS'), 'station shows the clock and RED plays / BLUE plays');
  // RED fails: only RED locks
  await btn('RED PLAYS'); await p.waitForTimeout(600); await btn('Start'); await p.waitForTimeout(1500);
  await p.evaluate(() => CUR_API && CUR_API.fail('test', { cause: 'mistakes' })); await p.waitForTimeout(1200);
  check(await p.evaluate(() => /RED is locked out for 30 s/i.test(document.body.innerText)), 'a RED fail locks RED only (fail screen says so)');
  await btn('Back to the station'); await p.waitForTimeout(400);
  const locks = await p.evaluate(() => [...document.querySelectorAll('.st-side')].map(b => b.disabled));
  check(locks[0] === true && locks[1] === false, 'RED\'s button is locked, BLUE\'s is open');
  // BLUE plays and wins → the round ends, BLUE credited
  await btn('BLUE PLAYS'); await p.waitForTimeout(600); await btn('Start'); await p.waitForTimeout(1500);
  await p.evaluate(() => CUR_API && CUR_API.win('test', {})); await p.waitForTimeout(1200);
  const mg = await p.evaluate(() => ({ pend: BBR.get().pre, log: LABL_LOG, run: !!document.querySelector('[data-bbclock]') }));
  check(mg.pend && mg.pend.win === 1 && mg.log && mg.log.how === 'mg' && mg.log.mgs != null && mg.run, 'BLUE\'s win ends the round and hands BLUE to the run screen with the finish time');
  await btn('BLUE WON'); await p.waitForTimeout(400); if (await p.evaluate(() => !!document.querySelector('.labl-nextup'))) { await p.click('.labl-nextup'); await p.waitForTimeout(300); }
  const mgr = await p.evaluate(() => { const r = bbRoundsAll().slice(-1)[0]; return { mode: r.mode, win: r.teams[r.win].n, how: r.how, mgs: r.mgs, game: r.mgGame, story: r.story }; });
  check(mgr.win === 'BLUE' && mgr.how === 'mg' && typeof mgr.mgs === 'number' && mgr.game === 'wire' && mgr.story.ci === 2, 'story chapter logged: BLUE, how = Mini-game, finish time, game (' + JSON.stringify(mgr) + ')');
  check(!errs.length, 'zero PAGEERROR lines' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fail ? '\n' + fail + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED'); process.exit(fail ? 1 : 0);
})();
