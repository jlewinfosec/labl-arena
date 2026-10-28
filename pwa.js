// Phase 0 test: serve docs/ over http, install the service worker, go offline and reload (data survives),
// then publish a bumped version at the same URL and confirm saved data survives the update.
// run: node pwa.js   (needs Playwright; builds a temporary bumped copy in a scratch folder)
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.json': 'application/json' };
let fail = 0; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail++; };
(async () => {
  // a scratch copy of docs/ so we can swap versions without touching the repo
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'labl-pwa-')); fs.cpSync('docs', root, { recursive: true });
  const srv = http.createServer((req, res) => {
    const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const url = 'http://127.0.0.1:' + srv.address().port + '/labl-arena/';
  fs.mkdirSync(path.join(root, 'labl-arena'), { recursive: true }); for (const f of fs.readdirSync(root).filter(x => x !== 'labl-arena')) fs.renameSync(path.join(root, f), path.join(root, 'labl-arena', f));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/sfx\//.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200) + ' @ ' + (m.location().url || '')); });
  const btn = t => p.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().includes(t)); if (!b) throw new Error('no button ' + t); b.click(); }, t);

  await p.goto(url, { waitUntil: 'load' });
  await p.fill('input[placeholder="NEW PIN"]', '1234'); await p.fill('input[placeholder="AGAIN"]', '1234'); await btn('Set up this tablet'); await p.waitForTimeout(600);
  await p.evaluate(() => go({ g: 'home', tab: 'roster' })); await p.fill('input[placeholder="Player name"]', 'Jacob'); await btn('+ Add player'); await p.waitForTimeout(400);
  // wait for the worker to control the page
  await p.evaluate(() => navigator.serviceWorker.ready); for (let i = 0; i < 40 && !(await p.evaluate(() => !!navigator.serviceWorker.controller)); i++) await p.waitForTimeout(250);
  check(await p.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page (' + url + ')');
  check(await p.evaluate(() => caches.keys().then(k => k.some(x => x.startsWith('labl-arena-')))), 'app shell cached');
  await p.evaluate(() => go({ g: 'home', tab: 'settings' })); await p.waitForTimeout(500);
  const ver1 = await p.evaluate(() => LABL.version); const txt1 = await p.evaluate(() => document.body.innerText);
  check(txt1.includes('LABL Arena version ' + ver1), 'version shown in Settings (' + ver1 + ')');
  check(txt1.includes('Storage:'), 'storage.persist result shown in Settings');
  check(txt1.includes('Send to Google Drive'), 'Send to Google Drive button in Settings');
  await p.screenshot({ path: 'shots/pwa_settings.png', fullPage: true });
  check(await p.evaluate(() => document.querySelector('.labl-foot') && document.querySelector('.labl-foot').textContent.includes(LABL.version)), 'version in the panel footer');

  // ---- offline reload keeps data
  await ctx.setOffline(true); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(800);
  const off = await p.evaluate(() => ({ setup: lablCfg().setup, roster: Object.values(lablRoster()).flat().map(x => x.n), ver: LABL.version }));
  check(off.setup && off.roster.includes('Jacob'), 'offline reload: app opens with its data (' + off.roster.join(',') + ')');
  await ctx.setOffline(false);

  // ---- a bumped version at the same URL keeps the data
  const idx = path.join(root, 'labl-arena', 'index.html'), sw = path.join(root, 'labl-arena', 'sw.js');
  const bump = ver1.replace(/(\d+)$/, m => String(+m + 1));
  fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace('version: "' + ver1 + '"', 'version: "' + bump + '"'));
  fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(ver1, bump));
  await p.evaluate(() => { DIR_OK = true; DIR_LAST = Date.now(); go({ g: 'home', tab: 'start' }); }); await p.waitForTimeout(300);   // the reload locked the panel; unlock as a Board Member would
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  for (let i = 0; i < 60 && !(await p.evaluate(() => !!(PWA.waiting))); i++) await p.waitForTimeout(250);
  check(await p.evaluate(() => !!PWA.waiting), 'new worker installed and waiting');
  let bannerOnPanel = false; for (let i = 0; i < 20 && !bannerOnPanel; i++) { await p.waitForTimeout(250); bannerOnPanel = await p.evaluate(() => !!document.getElementById('labl-update')); }
  await p.screenshot({ path: 'shots/pwa_update_banner.png', fullPage: false });
  check(bannerOnPanel, 'update banner shown on the Board Member panel');
  await p.evaluate(() => { setMode('6'); bbRunUnlock(); go({ g: 'bbrun' }); }); await p.waitForTimeout(400);
  check(!(await p.evaluate(() => !!document.getElementById('labl-update'))), 'no update banner on the run screen');
  await p.evaluate(() => { setMode('0'); DIR_OK = true; DIR_LAST = Date.now(); go({ g: 'home' }); }); await p.waitForTimeout(400);
  await Promise.all([p.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), p.click('#labl-update')]); await p.waitForTimeout(1200);
  const after = await p.evaluate(() => ({ ver: LABL.version, setup: lablCfg().setup, roster: Object.values(lablRoster()).flat().map(x => x.n), pin: (loadCfg() || {}).dirPin }));
  check(after.ver === bump, 'app restarted on the new version (' + after.ver + ')');
  check(after.setup && after.roster.includes('Jacob') && after.pin === '1234', 'saved data survived the update');
  // and still offline after the update
  await ctx.setOffline(true); await p.reload({ waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(800);
  check(await p.evaluate(() => LABL.version).catch(() => null) === bump, 'new version opens offline');
  await ctx.setOffline(false);
  const bad = errs.filter(e => /manifest|service.?worker|sw\.js/i.test(e));
  check(bad.length === 0, 'no console errors about the manifest or the service worker' + (bad.length ? ': ' + bad.join(' | ') : ''));
  check(!errs.some(e => e.startsWith('PAGEERROR')), 'zero PAGEERROR lines' + (errs.length ? ' (other console: ' + errs.join(' | ').slice(0, 300) + ')' : ''));
  await b.close(); srv.close(); fs.rmSync(root, { recursive: true, force: true });
  console.log(fail ? '\n' + fail + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED'); process.exit(fail ? 1 : 0);
})();
