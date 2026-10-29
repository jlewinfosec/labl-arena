// Phase 5 test: seed 3 events / 20 players / ~40 rounds, then check the season ranking, the 15-round line, Day Champions
// and both CSVs against values computed here, independently of the app's code.
const { chromium } = require('playwright'); const path = require('path');
let fail = 0; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail++; };
// ---- the seed (deterministic)
const NAMES = 'Ava Ben Cal Dee Eli Fay Gus Hal Ivy Jon Kai Lee Mia Ned Ola Pat Quin Rae Sid Tam'.split(' ');
const ids = NAMES.map((n, i) => 'p' + i);
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const events = [['LABL 2026-08-15', Date.UTC(2026, 7, 15, 16)], ['LABL 2026-09-12', Date.UTC(2026, 8, 12, 16)], ['LABL 2026-10-10', Date.UTC(2026, 9, 10, 16)]];
const rounds = [];
events.forEach(([ev, t0], e) => {
  const here = ids.slice(0, e === 0 ? 20 : 14);   // six players only came to the first event (14 rounds: below the line)
  for (let k = 0; k < 14; k++) {
    const t = t0 + k * 600000, ffa = k % 7 === 6, comp = e === 2 && k < 4;
    const sh = here.slice().sort(() => rnd() - 0.5);
    const st = {}; sh.slice(0, 5).forEach(id => { st[id] = [Math.floor(rnd() * 4), Math.floor(rnd() * 3)]; });
    if (ffa) rounds.push({ id: 'r' + e + '_' + k, t, ev, mode: 'Pistol-Only 3-15 FFA', fmt: 'ffa', p: sh, win: sh[Math.floor(rnd() * sh.length)], st, how: 'elim', comp, nm: Object.fromEntries(sh.map(i => [i, NAMES[ids.indexOf(i)]])), sq: Object.fromEntries(sh.map(i => [i, ids.indexOf(i) % 2 ? 'KREWE' : 'MAKERS'])) });
    else { const half = Math.ceil(sh.length / 2), a = sh.slice(0, half), b = sh.slice(half); const w = rnd() < 0.1 ? -1 : rnd() < 0.5 ? 0 : 1;
      rounds.push({ id: 'r' + e + '_' + k, t, ev, mode: k % 2 ? 'Capture the Flag' : 'Standard 3-15', fmt: 'teams', teams: [{ n: 'RED', col: 'red', m: a }, { n: 'BLUE', col: 'blue', m: b }], win: w, st, how: w === -1 ? 'time' : 'obj', comp, nm: Object.fromEntries(sh.map(i => [i, NAMES[ids.indexOf(i)]])), sq: Object.fromEntries(sh.map(i => [i, ids.indexOf(i) % 2 ? 'KREWE' : 'MAKERS'])) }); }
  }
});
// ---- expected values
const winnersOf = r => r.fmt === 'ffa' ? [r.win] : r.win >= 0 ? r.teams[r.win].m : [];
const playersOf = r => r.fmt === 'ffa' ? r.p : [].concat(...r.teams.map(t => t.m));
const tally = R => { const P = {}; R.forEach(r => { const W = new Set(winnersOf(r)); playersOf(r).forEach(id => { const x = P[id] = P[id] || { id, n: NAMES[ids.indexOf(id)], pts: 0, rounds: 0, tags: 0, outs: 0 }; x.rounds++; if (W.has(id)) x.pts++; }); Object.entries(r.st || {}).forEach(([id, v]) => { const x = P[id] = P[id] || { id, n: NAMES[ids.indexOf(id)], pts: 0, rounds: 0, tags: 0, outs: 0 }; x.tags += v[0]; x.outs += v[1]; }); }); return Object.values(P); };
const expRank = tally(rounds).map(x => Object.assign(x, { rate: x.pts / x.rounds, tpo: x.tags / Math.max(1, x.outs), q: x.rounds >= 15 })).sort((a, b) => b.q - a.q || b.pts - a.pts || b.rate - a.rate || b.tpo - a.tpo || a.n.localeCompare(b.n));
const expChamp = ev => { const L = tally(rounds.filter(r => r.ev === ev)).filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts || b.tags - a.tags || a.n.localeCompare(b.n)); return L[0]; };
// ---- a small RFC 4180 parser for the CSV checks
function parseCsv(text) { const rows = []; let row = [], cell = '', q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\r') {} else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows; }
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + path.resolve('LABL_Arena.html'), { waitUntil: 'load' });
  await p.fill('input[placeholder="NEW PIN"]', '1234'); await p.fill('input[placeholder="AGAIN"]', '1234');
  await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('Set up this tablet')).click()); await p.waitForTimeout(400);
  await p.evaluate(rounds => { const B = BBS.get(); rounds.forEach(r => { r.era = lablSeasonOf(r.t); r.dev = DEVICE_ID; B.rounds[r.id] = r; }); BBS.save(B); const c = loadCfg(); c.salt = 'LABL 2026-10-10'; saveCfg(c); }, rounds);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(500);
  const got = await p.evaluate(() => ({ era: ERA, rank: lablRank(bbRoundsAll().filter(r => r.era === '2026 H2')).map(x => [x.n, x.pts, x.rounds, x.rank, x.q]), champs: lablDayChampions(bbRoundsAll().filter(r => r.era === '2026 H2')).map(x => [x.ev, x.champ && x.champ.n, x.champ && x.champ.pts]) }));
  check(got.era === '2026 H2', 'the current season comes from the date (' + got.era + ')');
  check(await p.evaluate(() => bbRoundsAll().every(r => r.era === '2026 H2')), 'every seeded round was labelled 2026 H2 from its date');
  const exp = expRank.map(x => [x.n, x.pts, x.rounds]);
  const same = JSON.stringify(got.rank.map(x => x.slice(0, 3))) === JSON.stringify(exp);
  check(same, 'season ranking (points, then win rate, then tags per out) matches the hand-computed order' + (same ? '' : '\n  app: ' + JSON.stringify(got.rank.slice(0, 6)) + '\n  exp: ' + JSON.stringify(exp.slice(0, 6))));
  const nq = expRank.filter(x => x.q).length, gotQ = got.rank.filter(x => x[4]).length, lineOk = got.rank.every((x, i) => (i < nq) === !!x[4]) && got.rank.filter(x => x[4]).every((x, i) => x[3] === i + 1);
  check(gotQ === nq && lineOk && nq > 0 && nq < 20, '15-round line: ' + nq + ' ranked players above it, the rest below (' + (20 - nq) + ')');
  const champOk = events.every(([ev]) => { const e = expChamp(ev), g = got.champs.find(x => x[0] === ev); return g && g[1] === e.n && g[2] === e.pts; });
  check(champOk, 'Day Champion of each event matches (most round wins, ties on tags): ' + got.champs.map(x => x[0].slice(5) + ' → ' + x[1] + ' (' + x[2] + ')').join(', '));
  const csv = await p.evaluate(() => ({ r: lablCsvFile(true).text, pr: lablPlayerRoundsFile(true).text }));
  const R = parseCsv(csv.r), PR = parseCsv(csv.pr);
  check(R.length === rounds.length + 1 && R.every(row => row.length === R[0].length), 'rounds CSV: ' + (R.length - 1) + ' rows, every row has ' + R[0].length + ' columns');
  check(R[0].includes('how') && R[0].includes('competitive') && R[0].includes('edited'), 'rounds CSV has how, competitive and edited columns');
  const prExp = rounds.reduce((a, r) => a + playersOf(r).length, 0);
  check(PR.length === prExp + 1 && PR.every(row => row.length === PR[0].length), 'player-rounds CSV: ' + (PR.length - 1) + ' rows (one per player per round), every row has ' + PR[0].length + ' columns');
  const wonCol = PR[0].indexOf('won'), playerCol = PR[0].indexOf('player');
  const sumWon = {}; PR.slice(1).forEach(row => (sumWon[row[playerCol]] = (sumWon[row[playerCol]] || 0) + +row[wonCol]));
  check(expRank.every(x => sumWon[x.n] === x.pts), 'player-rounds "won" column sums to each player\'s season points');
  check(R.slice(1).filter(row => row[R[0].indexOf('competitive')] === '1').length === 4, 'competitive column flags the 4 competitive rounds');
  check(!(await p.evaluate(() => document.body.innerText.includes('League Point'))), 'no League Point mention on the panel');
  // screenshots: season standings (scoreboard) and the Day Champion card (end of day)
  await p.evaluate(() => { setMode('8'); BB_VIEW = 'season'; go({ g: 'board' }); }); await p.waitForTimeout(500);
  check(!(await p.evaluate(() => document.body.innerText.includes('League Point'))), 'no League Point mention on the scoreboard');
  await p.screenshot({ path: 'shots/p5_season_standings.png', fullPage: false });
  await p.evaluate(() => { setMode('6'); bbRunUnlock(); const P = BBP.get(); const r = BBR.get(); r.idx = P.items.length; BBR.save(r); go({ g: 'bbrun' }); }); await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/p5_day_champion.png', fullPage: false });
  check(await p.evaluate(() => !!document.querySelector('.labl-champ')), 'Day Champion card on the end-of-day item');
  check(!errs.length, 'zero PAGEERROR lines' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); console.log(fail ? '\n' + fail + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED'); process.exit(fail ? 1 : 0);
})();
