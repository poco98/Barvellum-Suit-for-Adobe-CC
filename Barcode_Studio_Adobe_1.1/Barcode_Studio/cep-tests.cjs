const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.resolve(process.execPath,'../../node_modules/playwright')));}
const url=require('url').pathToFileURL(path.join(__dirname,'extension/index.html')).href;
async function fixture(page,settings){
 await page.addInitScript(({name,useNode})=>{
  window.module={exports:{}};window.exports=window.module.exports;window.define=function(){};window.define.amd={};
  window._hostCalls=[];window._testFiles={};const files=window._testFiles,dirs=new Set();
  const csv='Reference;Description;EAN;QR\nTEST-A;Test product A;5600495667334;https://example.org/manual-a\nTEST-B;Test product B;5600495667341;https://example.org/manual-b';
  files['C:/fixtures/products.csv']=csv;
  function encode(text){return btoa(unescape(encodeURIComponent(text)));}
  function decode(text){return decodeURIComponent(escape(atob(text)));}
  function bytes(text){return new TextEncoder().encode(text);}
  window.__adobe_cep__={getSystemPath:()=> 'C:/Test/AppData/Roaming',evalScript:(script,callback)=>{
   window._hostCalls.push(script);
   if(script==='CodeStudio.info()')callback(name);
   else if(script.startsWith('CodeStudio.chooseInput('))callback(encodeURIComponent('C:/fixtures/products.csv'));
   else if(script.startsWith('CodeStudio.chooseSave('))callback(encodeURIComponent('C:/fixtures/export.svg'));
   else if(script.startsWith('CodeStudio.place('))callback('OK|Inserted by simulated '+name);
   else callback('ERROR|Unexpected host call');
  }};
  window.cep={fs:{stat:p=>({err:files[p]!==undefined||dirs.has(p)?0:3}),makedir:p=>{dirs.add(p);return{err:0};},readFile:(p,encoding)=>files[p]===undefined?{err:3}:{err:0,data:encoding==='Base64'?encode(files[p]):files[p]},writeFile:(p,value,encoding)=>{files[p]=encoding==='Base64'?decode(value):value;return{err:0};}}};
  if(useNode){
   window.cep_node={require:moduleName=>{
    if(moduleName==='os')return{homedir:()=> 'C:/Test'};
    if(moduleName==='buffer')return{Buffer:{from:value=>value}};
    if(moduleName==='fs')return{existsSync:p=>files[p]!==undefined||dirs.has(p),readFileSync:(p,encoding)=>{if(files[p]===undefined)throw Error('not found');return encoding?files[p]:bytes(files[p]);},mkdirSync:p=>dirs.add(p),writeFileSync:(p,value)=>files[p]=typeof value==='string'?value:new TextDecoder().decode(value),renameSync:(a,b)=>{files[b]=files[a];delete files[a];}};
    throw Error('Module not available in fixture: '+moduleName);
   }};
  }
 },settings);
}
(async()=>{
 const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';const browser=await chromium.launch(fs.existsSync(chrome)?{executablePath:chrome,headless:true}:{headless:true});const results=[];
 try{
  for(const settings of [{name:'Adobe Illustrator 31.0',useNode:true},{name:'Adobe Photoshop 28.0',useNode:false},{name:'Adobe InDesign 22.0',useNode:false}]){
   const page=await browser.newPage({viewport:{width:440,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page,settings);await page.goto(url);await page.waitForFunction(()=>CodeStudioBoot.ready&&CodeStudioBoot.diagnostics().hostReady);
   assert.equal(await page.locator('#format option').count(),111);assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('#boot-status').isVisible(),false);
   // A real selection through the native HTML select, followed by manual text.
   await page.selectOption('#format','code128');await page.locator('#value').fill('BRICOFERR BKBT202A');await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));
   await page.locator('#place').click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Inserted by simulated'));
   const vector=await page.evaluate(()=>Object.values(_testFiles).find(v=>typeof v==='string'&&v.startsWith('<svg')));assert(vector&&!/\bstroke=/.test(vector));assert(vector.includes('font-family="Amazon Ember"'));assert(vector.includes('data-font-size-px="14"'));
   // Native dialog path, not a synthetic file-input change.
   await page.locator('[data-tab="database"]').click();await page.locator('#choose-db').click();await page.waitForFunction(()=>!document.getElementById('mapping').hidden);await page.locator('#import').click();assert.equal(await page.locator('#count').innerText(),'2');
   const saved=await page.evaluate(()=>_testFiles['C:/Test/AppData/Roaming/CodigoStudio/database.json']);assert.equal(JSON.parse(saved)[0].code,'5600495667334');
   await page.locator('#search').fill('TEST-A');assert.equal(await page.locator('.article').count(),1);await page.locator('.article button').first().click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));assert.equal(await page.locator('#format').inputValue(),'ean13');
   await page.locator('#svg').click();await page.waitForFunction(()=>_testFiles['C:/fixtures/export.svg']!==undefined);assert((await page.evaluate(()=>_testFiles['C:/fixtures/export.svg'])).startsWith('<svg'));
   // QR from a database column.
   await page.locator('[data-tab="database"]').click();await page.locator('.article button').nth(1).click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));assert.equal(await page.locator('#format').inputValue(),'qrcode');
   // Live preview and empty search are both usable after the CEP bootstrap.
   await page.locator('#value').fill('Manual QR text');await page.waitForFunction(()=>document.getElementById('preview-state').textContent==='Live preview');
   await page.locator('#format-search').fill('zz-nonexistent');assert.equal(await page.locator('#format option').count(),0);await page.locator('#format-search').fill('');assert.equal(await page.locator('#format option').count(),111);
   const diagnostics=await page.evaluate(()=>CodeStudioBoot.diagnostics());assert.equal(errors.length,0,errors.join('\n'));results.push({host:settings.name,mode:diagnostics.storage,formats:111,manualText:'passed',nativeCsvImport:'passed',databaseBarcode:'passed',databaseQR:'passed',hostInsertCall:'passed',svgExport:'passed',livePreview:'passed',errors});
   if(settings.useNode){await page.selectOption('#format','ean13');await page.locator('#value').fill('5600495667334');await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));await page.screenshot({path:path.join(__dirname,'PREVIEW.png'),fullPage:true});}
   await page.close();
  }
  const failed=await browser.newPage();await failed.addInitScript(()=>Object.defineProperty(window,'CodeCore',{get:()=>undefined,set:()=>{}}));await failed.goto(url);assert.equal(await failed.locator('#boot-status').isVisible(),true);assert((await failed.locator('#boot-status').innerText()).includes('could not start'));await failed.close();
  fs.writeFileSync(path.join(__dirname,'CEP-TEST-RESULTS.json'),JSON.stringify({date:new Date().toISOString(),regression:'Original mixed-context failure reproduced: CodeCore is not defined, zero formats. Fixed browser-first export and optional-storage initialisation.',results,fatalErrorVisibility:'passed',scope:'Adobe CEP/CommonJS/AMD and file/host APIs simulated in Chromium. Native Adobe application placement is not asserted by this test.'},null,2));console.log(JSON.stringify(results));console.log('CEP REGRESSION PASS');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
