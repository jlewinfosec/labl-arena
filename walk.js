const { chromium } = require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:768}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERROR '+e.stack.split('\n').slice(0,3).join(' <- ')));p.on('console',m=>{if(m.type()==='error'&&!/sfx\//.test(m.text()))errs.push('CONSOLE '+m.text().slice(0,200))});
const file='file://'+path.resolve('LABL_Arena.html');
const show=async(l,shot)=>{await p.waitForTimeout(600);const t=await p.evaluate(()=>document.querySelector('#app').innerText.slice(0,220).replace(/\n+/g,' | '));console.log('\n=== '+l+' ===\n'+t);if(errs.length){console.log(errs.join('\n'));errs.length=0;} if(shot) await p.screenshot({path:'shots/'+shot+'.png',fullPage:true});};
const btn=async(t)=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes(t)); if(!b) throw new Error('no button '+t); b.click();},t);
await p.goto(file,{waitUntil:'load'}); await show('first run','first_run');
await p.fill('input[placeholder="NEW PIN"]','1234'); await p.fill('input[placeholder="AGAIN"]','1234'); await btn('Set up this tablet'); await show('home','home_start');
await p.evaluate(()=>go({g:'home',tab:'roster'})); await p.fill('input[placeholder="Player name"]','Jacob'); await p.fill('input[placeholder="Squad (new or existing)"]','Makers'); await btn('+ Add player');
for (const n of ['Alex','Sam','Riley','Casey','Drew','Jordan','Taylor']) { await p.fill('input[placeholder="Player name"]',n); await p.fill('input[placeholder="Squad (new or existing)"]', ['Makers','Krewe'][n.length%2]); await btn('+ Add player'); }
await show('roster','home_roster');
for (const t of ['teams','games','story','settings']) { await p.evaluate(t=>go({g:'home',tab:t}),t); await show('tab '+t,'home_'+t); }
await p.evaluate(()=>go({g:'home',tab:'start'})); await btn('Open the Arena'); await show('arena run','arena_run');
await p.evaluate(()=>go({g:'bbrun',s:'plan'})); await show('arena plan','arena_plan');
await p.evaluate(()=>go({g:'bbrun',s:'teams'})); await show('arena teams','arena_teams');
await p.evaluate(()=>go({g:'bbrun',s:'terms'})); await show('arena stations','arena_terms');
await p.evaluate(()=>go({g:'bbrun',s:'stand'})); await show('arena standings','arena_stand');
await p.evaluate(()=>switchModal('arena')); await p.waitForTimeout(300); await p.click('.labl-switch button:has-text("Mission Tablet")'); await p.click('.labl-switch button:has-text("Go")'); await show('tablet','tablet');
await p.evaluate(()=>switchModal('mtablet')); await p.waitForTimeout(300); await p.click('.labl-switch button:has-text("Scoreboard")'); await p.fill('.labl-switch input','1234'); await p.click('.labl-switch button:has-text("Go")'); await show('scoreboard','board');
await b.close();})();
