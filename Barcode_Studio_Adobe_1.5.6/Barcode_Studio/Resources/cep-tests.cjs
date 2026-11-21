const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.resolve(process.execPath,'../../node_modules/playwright')));}
const url=require('url').pathToFileURL(path.join(__dirname,'extension/index.html')).href;
async function fixture(page,settings){
 await page.addInitScript(({name,useNode})=>{
  window.module={exports:{}};window.exports=window.module.exports;window.define=function(){};window.define.amd={};
  window._hostCalls=[];window._testFiles={};const files=window._testFiles,dirs=new Set();
  const csv='Reference;Description;EAN;QR\nTEST-A;Test product A;0123456789012;https://example.org/manual-a\nTEST-B;Test product B;5600495667341;https://example.org/manual-b\nTEST-C;Test product C;0123456789013;';
  files['C:/fixtures/products.csv']=name.includes('InDesign')?csv+'\n'+Array.from({length:7540},(_,i)=>'PRODUCT-'+(i+1)+';Example product;;').join('\n'):csv;
  function encode(text){return btoa(unescape(encodeURIComponent(text)));}
  function decode(text){return decodeURIComponent(escape(atob(text)));}
  function bytes(text){return new TextEncoder().encode(text);}
  window.__adobe_cep__={getSystemPath:()=> 'C:/Test/AppData/Roaming',evalScript:(script,callback)=>{
   window._hostCalls.push(script);
   if(script==='CodeStudio.info()')callback(name);
   else if(script.startsWith('CodeStudio.chooseInput('))callback(encodeURIComponent('C:/fixtures/products.csv'));
   else if(script.startsWith('CodeStudio.chooseSave('))callback(encodeURIComponent('C:/fixtures/'+JSON.parse(script.slice('CodeStudio.chooseSave('.length,-1))));
   else if(script.startsWith('CodeStudio.place(')||script.startsWith('CodeStudio.placeIllustratorArtwork('))callback('OK|Inserted by simulated '+name);
   else callback('ERROR|Unexpected host call');
  }};
  window.cep={fs:{stat:p=>({err:files[p]!==undefined||dirs.has(p)?0:3}),makedir:p=>{dirs.add(p);return{err:0};},readFile:(p,encoding)=>files[p]===undefined?{err:3}:{err:0,data:encoding==='Base64'?encode(files[p]):files[p]},writeFile:(p,value,encoding)=>{files[p]=encoding==='Base64'&&p.endsWith('.png')?atob(value):encoding==='Base64'?decode(value):value;return{err:0};}}};
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
  for(const settings of [{name:'Adobe Illustrator 31.0',useNode:true},{name:'Adobe Photoshop 28.0',useNode:false},{name:'Adobe InDesign 22.0.0.104',useNode:false}]){
   const inDesign=settings.name.includes('InDesign');
   const page=await browser.newPage({viewport:{width:440,height:inDesign?828:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page,settings);await page.goto(url);await page.waitForFunction(()=>CodeStudioBoot.ready&&CodeStudioBoot.diagnostics().hostReady);
   assert.equal(await page.locator('#format option').count(),111);assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('#boot-status').isVisible(),false);
   assert.equal(await page.locator('#module').inputValue(),'0.45');assert.equal(await page.locator('#height').inputValue(),'13');assert.equal(await page.locator('.byline').innerText(),'by André Filipe');
   // A real selection through the native HTML select, followed by manual text.
   await page.selectOption('#format','code128');await page.locator('#value').fill('BRICOFERR BKBT202A');await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));
   await page.locator('#place').click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Inserted by simulated'));
   if(settings.useNode){
    const native=await page.evaluate(()=>Object.values(_testFiles).find(v=>typeof v==='string'&&v.startsWith('BSV1\t')));
    assert(native&&native.includes('\nT\t#000000\t')&&native.includes('BRICOFERR%20BKBT202A')&&!native.includes('#FFFFFF'));
   }else{
    const vector=await page.evaluate(()=>Object.values(_testFiles).find(v=>typeof v==='string'&&v.includes('<svg')));
    assert(vector&&!/\bstroke=/.test(vector)&&!vector.includes('@font-face')&&!vector.includes('#FFFFFF')&&!vector.includes('<text '));
   }
   // Native dialog path, not a synthetic file-input change.
   await page.locator('[data-tab="database"]').click();await page.locator('#choose-db').click();await page.waitForFunction(()=>!document.getElementById('mapping').hidden);assert.equal(await page.locator('#columns select').count(),2);await page.locator('#import').click();assert.equal(await page.locator('#count').innerText(),inDesign?'7543':'3');
   assert.equal(await page.locator('#product-list').evaluate(el=>el.open),false);assert.equal(await page.locator('.article').count(),0);
   await page.locator('#product-list summary').click();
   await page.waitForFunction(count=>document.querySelectorAll('#results .article').length===count,inDesign?25:3);
   if(inDesign){
    assert(await page.locator('#results').evaluate(el=>el.scrollHeight>el.clientHeight));
    await page.locator('#more').click();assert.equal(await page.locator('.article').count(),50);
   }
   await page.locator('#product-list summary').click();await page.waitForFunction(()=>!document.querySelector('#results .article'));
   const saved=await page.evaluate(()=>_testFiles['C:/Test/AppData/Roaming/CodigoStudio/database.json']);assert.equal(JSON.parse(saved)[0].code,'0123456789012');assert.deepEqual(Object.keys(JSON.parse(saved)[0]).sort(),['code','line','ref']);
   await page.locator('#search').fill('TEST-A');await page.waitForFunction(()=>document.querySelectorAll('#results .article').length===1);
   await page.locator('.article button').first().click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));assert.equal(await page.locator('#format').inputValue(),'ean13');
   const fromDatabase=await page.locator('#preview').innerHTML();
   await page.locator('#value').fill('');await page.locator('#value').fill('0123456789012');await page.locator('#generate').click();
   await page.waitForFunction(()=>document.getElementById('preview-state').textContent==='Verified');
   assert.equal(await page.locator('#preview').innerHTML(),fromDatabase);
   await page.locator('#svg').click();await page.waitForFunction(()=>_testFiles['C:/fixtures/0123456789012.svg']!==undefined);assert((await page.evaluate(()=>_testFiles['C:/fixtures/0123456789012.svg'])).startsWith('<svg'));
   await page.locator('#png').click();await page.waitForFunction(()=>_testFiles['C:/fixtures/0123456789012.png']!==undefined);assert.equal(await page.evaluate(()=>_testFiles['C:/fixtures/0123456789012.png'].slice(1,4)),'PNG');
   await page.locator('#product-search').fill('TEST-C');await page.locator('#product-search').press('Enter');
   await page.waitForFunction(()=>document.getElementById('preview-state').textContent==='Code 128 verified');
   assert.equal(await page.locator('#value').inputValue(),'0123456789013');
   assert.match(await page.locator('#validation').innerText(),/Independent reading confirmed: 0123456789013/);
   await page.locator('#svg').click();await page.waitForFunction(()=>_testFiles['C:/fixtures/0123456789013.svg']!==undefined);
   await page.locator('#place').click();await page.waitForFunction(()=>_hostCalls.some(call=>call.includes('Barcode Studio | code128 | 0123456789013')));
   await page.locator('#use-ean13').click();await page.waitForFunction(()=>document.getElementById('preview-state').textContent==='Verified');
   assert.equal(await page.locator('#value').inputValue(),'0123456789012');
   assert.equal(await page.locator('#preview').innerHTML(),fromDatabase);
   assert.equal(await page.evaluate(()=>JSON.parse(_testFiles['C:/Test/AppData/Roaming/CodigoStudio/database.json'])[2].code),'0123456789013');
   // Search products in the Barcode tab without changing dimensions.
   await page.locator('#module').fill('0.42');await page.locator('#height').fill('11');await page.locator('#product-search').fill('TEST-B');assert.equal(await page.locator('#product-matches button').count(),1);await page.locator('#product-search').press('Enter');await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));assert.equal(await page.locator('#value').inputValue(),'5600495667341');assert.equal(await page.locator('#module').inputValue(),'0.42');assert.equal(await page.locator('#height').inputValue(),'11');
   // A full GTIN is validated; an invalid final digit is not silently changed.
   await page.locator('#value').fill('5600495658652');await page.locator('#complete').click();assert((await page.locator('#validation').innerText()).includes('Invalid check digit'));assert.equal(await page.locator('#value').inputValue(),'5600495658652');
   // Dedicated QR tab. HTTP is stubbed here; its transport is tested separately.
   await page.evaluate(()=>CodeLink.check=async()=>({status:200,kind:'ok',message:'Link reached successfully (HTTP 200).'}));await page.locator('[data-tab="qr"]').click();await page.locator('#qr-url').fill('https://example.org/manual-a');await page.locator('#qr-generate').click();await page.waitForFunction(()=>document.getElementById('qr-read-badge').textContent==='Readable'&&document.getElementById('qr-link-badge').textContent==='HTTP 200');await page.locator('#qr-place').click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Inserted by simulated'));
   if(settings.useNode){
    const qrAsset=await page.evaluate(()=>Object.values(_testFiles).filter(v=>typeof v==='string'&&v.startsWith('BSV1\t')).at(-1));
    assert(qrAsset.includes('\nP\t#000000\t1\t')&&!qrAsset.includes('\nT\t'));
    assert.match(qrAsset.split('\n')[1],/^P\t#FFFFFF\t0\tM.+C.+Z$/);
    assert.equal(await page.evaluate(()=>_hostCalls.filter(call=>call.startsWith('CodeStudio.placeIllustratorArtwork(')).length),3);
   }
   await page.locator('[data-tab="create"]').click();await page.selectOption('#format','code128');await page.locator('#value').fill('Manual barcode text');await page.waitForFunction(()=>document.getElementById('preview-state').textContent==='Live preview');
   const diagnostics=await page.evaluate(()=>CodeStudioBoot.diagnostics());assert.equal(errors.length,0,errors.join('\n'));results.push({host:settings.name,mode:diagnostics.storage,formats:111,manualText:'passed',nativeCsvImport:'passed',twoColumnMapping:'passed',collapsibleDatabase:'passed',referenceSearch:'passed',sourceIndependentEAN13:'passed',measurementPersistence:'passed',dedicatedQR:'passed',hostInsertCall:'passed',svgExport:'passed',livePreview:'passed',authorCredit:'passed',errors});
   if(settings.useNode){await page.selectOption('#format','ean13');await page.locator('#module').fill('0.40');await page.locator('#height').fill('10');await page.locator('#value').fill('5600495667334');await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));await page.screenshot({path:path.join(__dirname,'PREVIEW.png'),fullPage:true});await page.locator('[data-tab="qr"]').click();await page.screenshot({path:path.join(__dirname,'QR-PREVIEW.png'),fullPage:true});}
   await page.close();
  }
  const upgrade=await browser.newPage();await upgrade.goto(url);
  await upgrade.evaluate(()=>localStorage.setItem('barcode-studio-settings',JSON.stringify({module:'0.42',height:'10'})));
  await upgrade.reload();assert.equal(await upgrade.locator('#height').inputValue(),'13');assert.equal(await upgrade.locator('#module').inputValue(),'0.42');
  await upgrade.locator('#height').fill('10');await upgrade.reload();assert.equal(await upgrade.locator('#height').inputValue(),'10');
  await upgrade.evaluate(()=>localStorage.setItem('barcode-studio-settings',JSON.stringify({module:'0.40',height:'11'})));
  await upgrade.reload();assert.equal(await upgrade.locator('#height').inputValue(),'11');assert.equal(await upgrade.locator('#module').inputValue(),'0.45');
  await upgrade.evaluate(()=>localStorage.setItem('barcode-studio-settings',JSON.stringify({version:2,module:'0.40',height:'12'})));
  await upgrade.reload();assert.equal(await upgrade.locator('#height').inputValue(),'13');assert.equal(await upgrade.locator('#module').inputValue(),'0.45');await upgrade.close();
  const failed=await browser.newPage();await failed.addInitScript(()=>Object.defineProperty(window,'CodeCore',{get:()=>undefined,set:()=>{}}));await failed.goto(url);assert.equal(await failed.locator('#boot-status').isVisible(),true);assert((await failed.locator('#boot-status').innerText()).includes('could not start'));await failed.close();
  fs.writeFileSync(path.join(__dirname,'CEP-TEST-RESULTS.json'),JSON.stringify({date:new Date().toISOString(),regression:'Original mixed-context failure reproduced: CodeCore is not defined, zero formats. Fixed browser-first export and optional-storage initialisation.',results,fatalErrorVisibility:'passed',scope:'Adobe CEP/CommonJS/AMD and file/host APIs simulated in Chromium. Native Adobe application placement is not asserted by this test.'},null,2));console.log(JSON.stringify(results));console.log('CEP REGRESSION PASS');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
