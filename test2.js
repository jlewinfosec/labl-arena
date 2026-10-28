const { chromium } = require('playwright');const path=require('path');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:768}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERROR '+e.stack.split('\n').slice(0,3).join(' <- ')));
const file='file://'+path.resolve('LABL_Arena.html');
await p.goto(file,{waitUntil:'load'}); await p.evaluate(()=>{setMode('7')});
for (const r of process.argv.slice(2)) { errs.length=0;
  await p.goto(file+'?'+r,{waitUntil:'load'}); await p.waitForTimeout(800);
  let t=await p.evaluate(()=>document.querySelector('#app').innerText.slice(0,300).replace(/\n+/g,' | '));
  console.log('\n=== ?'+r+' ===\n'+t+'\n'+errs.map(e=>'  '+e.slice(0,400)).join('\n'));
  const btn=await p.$('button:has-text("Start"), button:has-text("START"), button:has-text("Begin"), button:has-text("Play")');
  if(btn){await btn.click(); await p.waitForTimeout(1500); t=await p.evaluate(()=>document.querySelector('#app').innerText.slice(0,300).replace(/\n+/g,' | ')); console.log('after start: '+t); console.log(errs.map(e=>'  '+e.slice(0,400)).join('\n'));}
  fs.mkdirSync('shots',{recursive:true}); await p.screenshot({path:'shots/'+r.split('&')[0].replace(/[^a-z0-9]/gi,'_')+'.png'});
}
await b.close();})();
