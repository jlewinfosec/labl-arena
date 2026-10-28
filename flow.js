const { chromium } = require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true});const p=await ctx.newPage();
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
await p.evaluate(()=>{const P=BBP.get(); const M=P.items.filter(x=>x.k==='mode'); M[0].mode='Capture the Flag'; M[1].mode='Pistol-Only 3-15 FFA'; BBP.save(P);});   // block 2: a stat mode (Phase 2)
await say('plan built'); console.log(await p.evaluate(()=>BBP.get().items.map(i=>i.k==='brk'?('BRK '+i.kind+' '+(i.min||'')):('MODE '+i.mode+' x'+i.n)).join(' | ')));
// teams: balanced shuffle
// teams: the draw screen (Phase 1): everyone into the pool, set two blasters, draw, use
await p.evaluate(()=>go({g:'bbrun',s:'teams'})); await p.waitForTimeout(400); console.log('draw buttons:',(await buttons()).slice(0,30).join(' / '));
await btn('Everyone'); await p.click('.labl-prow.in .labl-chip'); await p.click('.labl-prow.in:nth-child(2) .labl-chip'); await btn('Draw teams'); await say('teams drawn');
console.log(await p.evaluate(()=>[...document.querySelectorAll('.labl-team-bal')].map(x=>x.textContent).join(' || ')));
await btn('Use these teams');
// run
await p.evaluate(()=>go({g:'bbrun'})); await p.waitForTimeout(400); await say('run start'); console.log((await buttons()).join(' / '));
await btn('Briefing done'); await p.waitForTimeout(600); await say('after briefing (teams were drawn for this block already, so no draw screen)');
console.log((await buttons()).join(' / '));

const ff=async(sec)=>{await p.evaluate(sec=>{const r=jget('ep_bbrun',null); if(r&&r.clk&&r.clk.t0){r.clk.t0-=((r.clk.len||300)+1)*1000; jset('ep_bbrun',r);} },sec); await p.waitForTimeout(1200);};  // past the round's own length (CTF is 7 min)
const rules=async()=>{ const has=await p.evaluate(()=>!!document.getElementById('labl-rules')); console.log(has?'rules card shown':'FAIL: no rules card before round 1'); if(has){ await p.screenshot({path:'shots/p2_rules_card.png'}); await p.click('#labl-rules button'); } };
for (let rnd=1; rnd<=2; rnd++) {
  if (rnd===1) await rules(); else await btn('Start round');     // the rules card's button starts round 1; Start round N is ready at once afterwards
  await p.waitForTimeout(4500); await say('round '+rnd+' running');
  await ff(301); await say('round '+rnd+' horn'); console.log((await buttons()).slice(9,22).join(' / '));
  if (rnd===1) { await p.click('.labl-how .labl-chip:has-text("Objective")'); await p.waitForTimeout(200); }   // how it ended
  await btn('RED WON'); await p.waitForTimeout(300); await say('logged round '+rnd);
  const t0=Date.now(); const ready=await p.evaluate(()=>[...document.querySelectorAll('button')].some(b=>/Start round 2/.test(b.textContent)&&!b.disabled)); if(rnd===1) console.log(ready?'PASS Start round 2 ready at once (no reset gate)':'FAIL Start round 2 not ready');
  await p.waitForTimeout(10500);   // UNDO toast lasts 10 s; wait it out so the next tap is a clean one
  await say('after undo window '+rnd);
}
console.log('rounds how:', await p.evaluate(()=>bbRoundsAll().map(r=>r.how).join(',')));
await p.screenshot({path:'shots/flow_block_done.png',fullPage:true});
// the next mode block opens the draw screen on its own
await btn('Next'); await p.waitForTimeout(500); await say('block 2 (draw screen should open)');
if (!(await p.evaluate(()=>!!document.querySelector('.labl-draw')))) console.log('FAIL: draw screen did not open for the new block');
await btn('Redraw'); await p.waitForTimeout(300); await btn('Use these teams'); await p.waitForTimeout(400); await say('block 2 run (FFA stat mode)');
// FFA block decided by the stats grid: rules card → start → horn → tags → confirm the leader
await rules(); await p.waitForTimeout(4500); await ff(301); await say('FFA horn');
await p.screenshot({path:'shots/p2_stats_grid.png',fullPage:true});
await p.evaluate(()=>{const rows=[...document.querySelectorAll('.labl-stat-row')]; const plus=r=>r.querySelectorAll('.labl-stat-c')[0].querySelectorAll('button')[1]; const outs=r=>r.querySelectorAll('.labl-stat-c')[1].querySelectorAll('button')[1]; plus(rows[3]).click(); plus(rows[3]).click(); plus(rows[3]).click(); plus(rows[5]).click(); outs(rows[5]).click(); outs(rows[0]).click();});
await p.waitForTimeout(300); const leader=await p.evaluate(()=>document.querySelector('.labl-confirm button')?.textContent||''); console.log('leader:',leader);
const expect=await p.evaluate(()=>document.querySelectorAll('.labl-stat-row')[3].querySelector('.nm').textContent);
await p.click('.labl-confirm button'); await p.waitForTimeout(500);
const ffa=await p.evaluate(()=>{const r=bbRoundsAll().slice(-1)[0]; return {mode:r.mode,win:r.nm[r.win],how:r.how,st:r.st};}); console.log('FFA round:',JSON.stringify(ffa));
console.log(ffa.win.toUpperCase()===expect.toUpperCase()&&ffa.st&&Object.keys(ffa.st).length===3?'PASS FFA winner came from the stats grid':'FAIL FFA winner not from the grid');
await p.waitForTimeout(10500);
// edit the first logged round: BLUE won instead of RED; the standings must change
await p.evaluate(()=>go({g:'bbrun',s:'stand'})); await p.waitForTimeout(300); const standBefore=await txt();
await p.evaluate(()=>go({g:'bbrun',s:'rounds'})); await p.waitForTimeout(300); await say('rounds tab');
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.textContent.trim()==='Edit'); b[b.length-1].click();}); await p.waitForTimeout(300);
await p.screenshot({path:'shots/p2_edit_round.png',fullPage:false});
await p.click('.labl-edit button:has-text("BLUE won")'); await p.click('.labl-edit .labl-how .labl-chip:has-text("Forfeit")'); await p.click('.labl-edit button:has-text("Save changes")'); await p.waitForTimeout(400);
const ed=await p.evaluate(()=>{const r=bbRoundsAll()[0]; return {win:r.teams[r.win].n,how:r.how,ed:r.ed};}); console.log('edited:',JSON.stringify(ed));
await p.evaluate(()=>go({g:'bbrun',s:'stand'})); await p.waitForTimeout(300); const standAfter=await txt();
console.log(ed.win==='BLUE'&&ed.how==='forfeit'&&ed.ed.length===1&&standBefore!==standAfter?'PASS edit changed the round and the standings':'FAIL edit');
await p.evaluate(()=>go({g:'bbrun',s:'rounds'})); await say('rounds tab');
await p.evaluate(()=>go({g:'bbrun',s:'stand'})); await say('standings'); await p.screenshot({path:'shots/flow_stand.png',fullPage:true});
// CSV
const [dl]=await Promise.all([p.waitForEvent('download'), p.evaluate(()=>lablCsv(false))]); const csvPath=await dl.path(); console.log('CSV:', require('fs').readFileSync(csvPath,'utf8'));
// scoreboard
await p.evaluate(()=>{setMode('8'); go({g:'board'});}); await say('scoreboard'); await p.screenshot({path:'shots/flow_board.png',fullPage:true});

await b.close();})();
