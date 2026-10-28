// Headless smoke test: node test.js [route ...]   e.g. node test.js "" "g=arena" "g=bbrun"
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['', 'g=arena', 'g=bbrun'];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type().toUpperCase() + ' ' + m.text().slice(0, 300)); });
  const file = 'file://' + path.resolve('LABL_Arena.html');
  for (const r of routes) {
    errs.length = 0;
    await page.goto(file + (r ? '?' + r : ''), { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const text = await page.evaluate(() => (document.querySelector('#app')?.innerText || '').slice(0, 400).replace(/\n+/g, ' | '));
    const shot = 'shots/' + (r || 'root').replace(/[^a-z0-9]+/gi, '_') + '.png';
    fs.mkdirSync('shots', { recursive: true });
    await page.screenshot({ path: shot });
    console.log(`\n=== ?${r} ===\nAPP: ${text}\n` + (errs.length ? errs.map(e => '  ' + e).join('\n') : '  (no errors)'));
  }
  await browser.close();
})();
