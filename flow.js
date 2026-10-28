const { chromium } = require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1024,height:768},acceptDownloads:true});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGEERROR '+e.stack.split('\n').slice(0,3).join(' <- ')));
const file='file://'+path.resolve('LABL_Arena.html');
const txt=async()=>p.evaluate(()=>document.querySelector('#app').innerText.replace(/\n+/g,' | '));
const buttons=async()=>p.evaluate(()=>[...document.querySelectorAll('#app button')].map(b=>b.textContent.trim()).filter(Boolean));
const btn=async(t)=>{const ok=await p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().toLowerCase().includes(t.toLowerCase())); if(!b) return false; b.click(); return true;},t); if(!ok) console.log('NO BUTTON:',t,'| have:',(await buttons()).slice(0,25).join(' / ')); await p.waitForTimeout(400); return ok;};
const say=async(l)=>{console.log('\n=== '+l+' ===\n'+(await txt()).slice(0,500)); if(errs.length){console.log(errs.join('\n'));errs.length=0;}};
await p.goto(file,{waitUntil:'load'});
await p.fill('input[placeholder="NEW PIN"]','1234'); await p.fill('input[placeholder="AGAIN"]','1234'); await btn('Set up this tablet');
// roster
await p.evaluate(()=>{const R={}; const sq=['MAKERS','KREWE','BAYOU']; ['Jacob','Alex','Sam','Riley','Casey','Drew','Jordan','Taylor','Morgan','Quinn','Avery','Reese'].forEach((n,i)=>{(R[sq[i%3]]=R[sq[i%3]]||[]).push({id:'p'+i,n,nw:i>9,dead:false})}); const v=loadCfg(); v.roster=R; saveCfg(v);});
// arena: plan
await p.evaluate(()=>{setMode('6'); bbRunUnlock(); go({g:'bbrun',s:'plan'});}); await p.waitForTimeout(500);
await p.fill('input[type=number]','12'); await p.waitForTimeout(300);
await btn('Build a full day'); await p.waitForTimeout(300); await btn('Tap again to confirm'); await p.waitForTimeout(600);
// pin the first block to a plain team mode so the round flow is the same every run (the builder is random)
await p.evaluate(()=>{const P=BBP.get(); const i=P.items.findIndex(x=>x.k==='mode'); if(i>=0){P.items[i].mode='Capture the Flag'; BBP.save(P);} });
await say('plan built'); console.log(await p.evaluate(()=>BBP.get().items.map(i=>i.k==='brk'?('BRK '+i.kind+' '+(i.min||'')):('MODE '+i.mode+' x'+i.n)).join(' | ')));
// teams: balanced shuffle
await p.evaluate(()=>go({g:'bbrun',s:'teams'})); await p.waitForTimeout(400); console.log('team buttons:',(await buttons()).slice(0,30).join(' / '));
await btn('shuffle'); await say('teams');
// run
await p.evaluate(()=>go({g:'bbrun'})); await p.waitForTimeout(400); await say('run start'); console.log((await buttons()).join(' / '));
await btn('Briefing done'); await p.waitForTimeout(600); await say('after briefing');
console.log((await buttons()).join(' / '));

const ff=async(sec)=>{await p.evaluate(sec=>{const r=jget('ep_bbrun',null); if(r&&r.clk&&r.clk.t0){r.clk.t0-=((r.clk.len||300)+1)*1000; jset('ep_bbrun',r);} },sec); await p.waitForTimeout(1200);};  // past the round's own length (CTF is 7 min)
for (let rnd=1; rnd<=2; rnd++) {
  await btn('Start round'); await p.waitForTimeout(4500); await say('round '+rnd+' running');
  await ff(301); await say('round '+rnd+' horn'); console.log((await buttons()).slice(9,22).join(' / '));
  await btn('ORANGE CRUSH'); await p.waitForTimeout(300); await say('logged round '+rnd);
  // UNDO toast lasts 10s; wait it out
  await p.waitForTimeout(10500);
  const t=await txt(); if (/Reset done/i.test(t)) { await btn('Reset done'); }
  await say('after reset '+rnd);
}
await p.screenshot({path:'shots/flow_block_done.png',fullPage:true});
await p.evaluate(()=>go({g:'bbrun',s:'rounds'})); await say('rounds tab');
await p.evaluate(()=>go({g:'bbrun',s:'stand'})); await say('standings'); await p.screenshot({path:'shots/flow_stand.png',fullPage:true});
// CSV
const [dl]=await Promise.all([p.waitForEvent('download'), p.evaluate(()=>lablCsv(false))]); const csvPath=await dl.path(); console.log('CSV:', require('fs').readFileSync(csvPath,'utf8'));
// scoreboard
await p.evaluate(()=>{setMode('8'); go({g:'board'});}); await say('scoreboard'); await p.screenshot({path:'shots/flow_board.png',fullPage:true});

await b.close();})();
