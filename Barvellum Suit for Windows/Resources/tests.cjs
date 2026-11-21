const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const runtimeModules=path.resolve(process.execPath,'../../node_modules');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(runtimeModules,'playwright')));}
const core=require('./extension/core.js');
assert.equal(core.checkDigit('560049566733'),'4');assert.equal(core.complete('ean13','560049566733'),'5600495667334');
assert.throws(()=>core.validate('ean13','5600495667335'));assert.throws(()=>core.validate('ean13','560049566733'));
assert.equal(core.checkDigit('1234567'),'0');assert.throws(()=>core.complete('qrcode','123'));
const ean14=core.complete('ean14','1001234500001'),sscc18=core.complete('sscc18','00000000000000001');
assert.equal(core.validate('ean14','(01) '+ean14).text,ean14);
assert.equal(core.validate('sscc18','(00) '+sscc18).text,sscc18);
assert.equal(core.validate('itf14',ean14.slice(0,6)+' '+ean14.slice(6)).text,ean14);
assert.throws(()=>core.validate('itf14','(01)'+ean14));
assert.deepEqual(core.parseCSV('\uFEFFRef;Descrição;EAN\r\nA;"A; B";0123456789012\r\nB;"Linha 1\nLinha 2";123\r\n'),[['Ref','Descrição','EAN'],['A','A; B','0123456789012'],['B','Linha 1\nLinha 2','123']]);
assert.throws(()=>core.parseCSV('a;b\n"missing'));assert.deepEqual(core.parseCSV('a,b\n"a""b",c'),[['a','b'],['a"b','c']]);
assert.throws(()=>core.options('{"scale":1}'));assert.throws(()=>core.records([['EAN'],['5.6004E+12']],{code:0,qr:-1,ref:-1,desc:-1,format:-1}));
const extraColumns=[['Reference','','Barcode','Barcode'],['REF-A','x','012345678905','other'],['','x','','']];
assert.equal(core.records(extraColumns,core.mapping(core.headers(extraColumns))).length,1);
assert.equal(core.audit([{ref:'UPC',code:'012345678904'},{ref:'ITF',code:'10012345000018'}]).invalid.length,2);
const sampleRows=[['Código Artigo','Descrição Artigo','EAN','URL'],['A','Artigo A','5600495667334','https://example.org'],['B','Artigo B','5600495667334','']];
const mapped=core.records(sampleRows,core.mapping(core.headers(sampleRows)));assert.equal(core.audit(mapped).duplicates.length,1);assert.equal(core.search(mapped,'artigo a').length,1);
assert.equal(core.records([['Ref','EAN'],['X','1E5'],['Y','4E7']],{ref:0,code:1,desc:-1,qr:-1,format:-1}).length,2);
assert.throws(()=>core.records([['Ref','EAN'],['X','5.6004E+12']],{ref:0,code:1,desc:-1,qr:-1,format:-1}));assert.throws(()=>core.records([['Ref','EAN'],['X','1E+05']],{ref:0,code:1,desc:-1,qr:-1,format:-1}));
const root=path.join(__dirname,'extension');
(async()=>{let browser;
try{
 const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';browser=await chromium.launch(fs.existsSync(chrome)?{executablePath:chrome,headless:true}:{headless:true});const page=await browser.newPage({viewport:{width:520,height:980}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(require('url').pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>typeof CodeCore!=='undefined'&&document.getElementById('format').options.length===111);await page.evaluate(()=>document.fonts.ready);
 const all=await page.evaluate(()=>{
  const bad=[],generated=[];for(const s of bwipjs.symbolList){try{const opts={};s.opts.split(/\s+/).filter(Boolean).forEach(p=>{const i=p.indexOf('=');if(i<0)opts[p]=true;else{const v=p.slice(i+1);opts[p.slice(0,i)]=/^-?\d+(\.\d+)?$/.test(v)?Number(v):v;}});delete opts.includetext;
  delete opts.height;const cfg={bcid:s.bcid,text:s.text,moduleMm:0.33,heightMm:22.85,showText:true,extra:JSON.stringify(opts)};const code=CodeCore.build(bwipjs,cfg);if(/\bstroke=/.test(code.svg))throw Error('unexpanded stroke');generated.push(s.bcid);}catch(e){bad.push({format:s.bcid,message:e.message});}}
  return {generated:generated.length,bad,font:getComputedStyle(document.body).fontFamily,size:getComputedStyle(document.body).fontSize};
 });console.log('All formats:',JSON.stringify(all));
 const hostArtwork=await page.evaluate(async()=>{
  const cfg={bcid:'ean13',text:'5600495667334',moduleMm:0.4,heightMm:12,showText:true,extra:'',fontBase64:CodeFontBase64};
  const original=CodeCore.build(bwipjs,cfg);
  const placement=CodeCore.adobeSVG(original.svg);
  if(!original.svg.includes('<style>')||placement.includes('<style')||placement.includes('<defs')||!placement.includes('<text ')){
   throw Error('Embedded font styling must stay in export and editable captions must stay in Adobe artwork.');
  }
  const outlined=CodeCore.build(bwipjs,{...cfg,outlineText:true,fontBase64:null});
  const svg=CodeCore.adobeSVG(outlined.svg);
  const raster=await CodeScanner.raster(svg,outlined.widthMm,outlined.heightMm,450);
  const ean=CodeCore.build(bwipjs,{...cfg,text:'5600495661004'});
  const qr=CodeCore.build(bwipjs,{...cfg,bcid:'qrcode',text:'https://example.org/manual',showText:false});
  return {editable:original.svg.includes('<text '),outlined:!svg.includes('<text '),paths:(svg.match(/<path\b/g)||[]).length,dimensionsMatch:original.widthMm===outlined.widthMm&&original.heightMm===outlined.heightMm,decoded:(await CodeScanner.scan(raster,'ean13')).text,nativeEAN:!!CodeCore.illustratorArtwork(ean.svg),nativeQR:!!CodeCore.illustratorArtwork(qr.svg)};
 });assert(hostArtwork.editable&&hostArtwork.outlined&&hostArtwork.paths>1&&hostArtwork.dimensionsMatch&&hostArtwork.nativeEAN&&hostArtwork.nativeQR);assert.equal(hostArtwork.decoded,'5600495667334');console.log('Adobe SVG:',JSON.stringify(hostArtwork));
 const backgrounds=await page.evaluate(async()=>{
  const cfg={bcid:'ean13',text:'5600495657540',moduleMm:0.4,heightMm:12,showText:true,extra:''};
  const barcode=CodeCore.build(bwipjs,cfg);
  const pixel=(canvas,x,y)=>Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data);
  const raster=code=>CodeScanner.raster(code.svg,code.widthMm,code.heightMm,600,true);
  const barcodeCanvas=await raster(barcode);
  const barcodeNative=CodeCore.illustratorArtwork(barcode.svg);
  const bg=[];
  for(const moduleMm of [0.4,1]){
   const qr=CodeCore.build(bwipjs,{...cfg,bcid:'qrcode',text:'https://example.org/manual',showText:false,moduleMm});
   const svg=new DOMParser().parseFromString(qr.svg,'image/svg+xml').documentElement;
   const white=svg.firstElementChild;
   const curve=white.getAttribute('d');
   const canvas=await raster(qr);
   const native=CodeCore.illustratorArtwork(qr.svg);
   const png=await CodeScanner.png(canvas,600),url=URL.createObjectURL(png);
   try{
    bg.push({fill:white.getAttribute('fill'),radius:Number(curve.match(/^M([\d.]+)/)[1])*moduleMm/3,corner:pixel(canvas,0,0),margin:pixel(canvas,Math.floor(canvas.width/2),2),native: native.split('\n')[1]==='P\t#FFFFFF\t0\t'+curve,read:(await CodeScanner.scan(url,'qrcode')).text});
   } finally {URL.revokeObjectURL(url);}
  }
  return {barcodeCorner:pixel(barcodeCanvas,0,0),barcodeNativeTransparent:!!barcodeNative&&!barcodeNative.includes('#FFFFFF'),qr:bg};
 });
 assert.deepEqual(backgrounds.barcodeCorner,[0,0,0,0]);assert(backgrounds.barcodeNativeTransparent);
 for(const qr of backgrounds.qr){assert.equal(qr.fill,'#FFFFFF');assert(Math.abs(qr.radius-1.844)<1e-8);assert.deepEqual(qr.corner,[0,0,0,0]);assert.deepEqual(qr.margin,[255,255,255,255]);assert(qr.native);assert.equal(qr.read,'https://example.org/manual');}
 const geometry=await page.evaluate(async()=>{
  const cfg={bcid:'ean13',text:'5600495642348',moduleMm:0.45,heightMm:13,showText:true,extra:''};
  const ean=CodeCore.build(bwipjs,cfg);
  const svg=new DOMParser().parseFromString(ean.svg,'image/svg+xml');
  const shapes=Array.from(svg.querySelectorAll('path'));
  const rectangles=shapes.flatMap(node=>node.getAttribute('d').split('Z')).filter(Boolean).map(d=>d.match(/-?[\d.]+/g).map(Number));
  function extent(points,axis){const positions=points.filter((_,index)=>index%2===axis);return Math.max(...positions)-Math.min(...positions);}
  const mmPerUnit=cfg.moduleMm/3;
  const narrowest=Math.min(...rectangles.map(p=>extent(p,0)))*mmPerUnit;
  const shortest=Math.min(...rectangles.map(p=>extent(p,1)))*mmPerUnit;
  const firstBarLeft=Math.min(...rectangles.flatMap(p=>[p[0],p[2],p[4],p[6]]));
  const regularBottom=Math.min(...rectangles.map(p=>Math.max(p[1],p[3],p[5],p[7])));
  const artwork=document.createElement('div');document.body.append(artwork);
  artwork.innerHTML=CodeCore.build(bwipjs,{...cfg,outlineText:true}).svg;
  const digitTop=artwork.querySelector('#barcode-text').getBBox().y;
  const captionGap=(digitTop-regularBottom)*mmPerUnit;
  const grouped=!!svg.querySelector('svg > #barcode-bars > path')&&!!svg.querySelector('svg > #barcode-text > text');
  const outlinedGroups=!!artwork.querySelector('svg > #barcode-bars > path')&&!!artwork.querySelector('svg > #barcode-text > path');
  const referenceFont='1000px "Amazon Ember"';
  await document.fonts.load(referenceFont);
  const context=document.createElement('canvas').getContext('2d');context.font=referenceFont;
  const captions=Array.from(svg.querySelectorAll('#barcode-text > text'));
  const editableTop=Math.min(...captions.map(c=>Number(c.getAttribute('y'))-context.measureText(c.textContent).actualBoundingBoxAscent*Number(c.getAttribute('font-size'))/1000));
  const editableGap=(editableTop-regularBottom)*mmPerUnit;
  const prefix=captions[0],outlinedPrefix=artwork.querySelector('#barcode-text > path');
  const editableRight=Number(prefix.getAttribute('x'))+context.measureText(prefix.textContent).actualBoundingBoxRight*Number(prefix.getAttribute('font-size'))/1000;
  const outlinedBounds=outlinedPrefix.getBBox();
  const outlinedRight=outlinedBounds.x+outlinedBounds.width+outlinedPrefix.transform.baseVal.getItem(0).matrix.e;
  const prefixGap=(firstBarLeft-editableRight)*mmPerUnit;
  const outlinedPrefixGap=(firstBarLeft-outlinedRight)*mmPerUnit;
  const nativePrefix=CodeCore.illustratorArtwork(ean.svg).split('\n').find(row=>row.startsWith('T\t')).split('\t');
  const nativePrefixMatches=Number(nativePrefix[2])===Number(prefix.getAttribute('x'))&&nativePrefix[4]==='5';
  artwork.remove();
  const codeImage=await CodeScanner.raster(ean.svg,ean.widthMm,ean.heightMm,600);
  const eanRead=(await CodeScanner.scan(codeImage,'ean13')).text;
  const text='https://example.org/manual-a', qrSizes=[];
  for(const size of [10,30,60,100,200]){
   const code=CodeCore.build(bwipjs,{...cfg,bcid:'qrcode',text,moduleMm:0.5,qrWidthMm:size,showText:false,extra:'{"eclevel":"M"}'});
   const canvas=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,450,true);
   const ctx=canvas.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#181818';ctx.fillRect(0,0,canvas.width,canvas.height);
   qrSizes.push({size,width:code.widthMm,height:code.heightMm,decoded:(await CodeScanner.scan(canvas,'qrcode')).text});
  }
  return {narrowest,shortest,captionGap,editableGap,prefixGap,outlinedPrefixGap,nativePrefixMatches,grouped,outlinedGroups,eanRead,qrSizes};
 });
 assert(Math.abs(geometry.narrowest-0.45)<1e-8);assert(Math.abs(geometry.shortest-13)<1e-8);
 assert(Math.abs(geometry.captionGap-0.8)<0.01,JSON.stringify(geometry));assert(Math.abs(geometry.editableGap-0.8)<0.01,JSON.stringify(geometry));assert(geometry.grouped&&geometry.outlinedGroups);assert.equal(geometry.eanRead,'5600495642348');
 assert(Math.abs(geometry.prefixGap-0.9)<0.01,JSON.stringify(geometry));
 assert(Math.abs(geometry.outlinedPrefixGap-0.9)<0.01,JSON.stringify(geometry));
 assert(geometry.nativePrefixMatches);
 for(const qr of geometry.qrSizes){assert(Math.abs(qr.width-qr.size)<1e-8);assert(Math.abs(qr.height-qr.size)<1e-8);assert.equal(qr.decoded,'https://example.org/manual-a');}
 const readback=await page.evaluate(async()=>{const samples={ean13:'5600495667334',ean8:'12345670',code128:'BKBT202A',qrcode:'https://example.org/á?ref=BKBT202A',itf14:'10012345000017',upca:'012345678905',upce:'01234565',code39:'BRICOFERR',code93:'TEST123',interleaved2of5:'1234567890',rationalizedCodabar:'A123456A'};const out=[];for(const bcid of Object.keys(samples)){try{const cfg={bcid,text:samples[bcid],moduleMm:0.33,heightMm:22.85,showText:true,extra:'',fontBase64:CodeFontBase64},c=CodeCore.build(bwipjs,cfg),canvas=await CodeScanner.raster(c.svg,c.widthMm,c.heightMm,450),read=await CodeScanner.scan(canvas,bcid);out.push({format:bcid,expected:cfg.text,read:read.text,pass:read.text===cfg.text});}catch(e){out.push({format:bcid,pass:false,error:e.message});}}return out;});console.log('Readback:',JSON.stringify(readback));
 const fileChecks=await page.evaluate(async()=>{
  const zip=new JSZip();zip.file('xl/workbook.xml','<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Artigos" r:id="rId1"/></sheets></workbook>');zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');zip.file('xl/styles.xml','<styleSheet><numFmts><numFmt numFmtId="164" formatCode="0000000000000"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>');zip.file('xl/worksheets/sheet1.xml','<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Referência</t></is></c><c r="B1" t="inlineStr"><is><t>EAN</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>REF-001</t></is></c><c r="B2" s="1"><v>123456789012</v></c></row></sheetData></worksheet>');
  const file=new File([await zip.generateAsync({type:'uint8array'})],'test.xlsx'),book=await CodeDatabase.load(file),sheet=await book.sheet(0);if(sheet.rows[1][1]!=='0123456789012')throw Error('Excel leading zero failed');
  const code=CodeCore.build(bwipjs,{bcid:'ean13',text:'5600495667334',moduleMm:.33,heightMm:22.85,showText:true,extra:''}),c=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,600),blob=await CodeScanner.png(c,600),bytes=new Uint8Array(await blob.arrayBuffer());let offset=8,dpi=0;while(offset<bytes.length){let v=new DataView(bytes.buffer,offset),n=v.getUint32(0),t=String.fromCharCode(...bytes.slice(offset+4,offset+8));if(t==='pHYs')dpi=v.getUint32(8)*.0254;offset+=n+12;}if(Math.abs(dpi-600)>.02)throw Error('PNG resolution failed');
  const unsupported=await CodeScanner.scan(c,'datamatrix');if(!unsupported.unsupported)throw Error('Unsupported decoder status failed');
  return {xlsx:'passed',leadingZero:sheet.rows[1][1],pngDpi:dpi,unsupportedDecoder:'explicit'};
 });console.log('File checks:',JSON.stringify(fileChecks));
 await page.locator('#value').fill('5600495667334');await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'),{timeout:10000});
 await page.waitForFunction(()=>document.querySelector('#preview img').naturalWidth>0);
 assert.equal(await page.locator('#preview svg').count(),0);
 const text=await page.locator('#preview img').evaluate(image=>{
  const svg=decodeURIComponent(image.src.slice(image.src.indexOf(',')+1));
  const caption=new DOMParser().parseFromString(svg,'image/svg+xml').querySelector('text');
  return {font:caption.getAttribute('font-family'),weight:caption.getAttribute('font-weight'),points:Number(caption.getAttribute('font-size'))*Number(document.getElementById('module').value)/3*72/25.4};
 });
 assert.equal(text.font,'Amazon Ember');assert.equal(text.weight,'400');assert(Math.abs(text.points-14)<1e-8);
 const endings=await page.evaluate(async()=>{
  const results=[];
  for(let digit=0;digit<=9;digit++){
   const text='560049566585'+digit;
   const code=CodeCore.build(bwipjs,{bcid:'ean13',text,moduleMm:.45,heightMm:13,showText:true,extra:''});
   const image=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,450);
   results.push({input:text,format:code.bcid,decoded:(await CodeScanner.scan(image,code.bcid)).text});
  }
  return results;
 });
 for(const result of endings){assert.equal(result.decoded,result.input);assert.equal(result.format,result.input.endsWith('9')?'ean13':'code128');}
 await page.locator('#value').fill('5600495665855');assert.equal(await page.locator('#svg').isDisabled(),true);await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('preview-state').textContent==='Code 128 analyzed');assert.equal(await page.locator('#value').inputValue(),'5600495665855');
 for(const bad of ['560049566585','56004956658555','560049566585X','560049566585\n','5600495665855\n']){
  await page.locator('#value').fill(bad);await page.locator('#generate').click();
  assert.match(await page.locator('#validation').innerText(),/exactly 13 digits/);assert.equal(await page.locator('#svg').isDisabled(),true);
 }
 await page.locator('[data-tab="database"]').click();await page.locator('#db-file').setInputFiles({name:'artigos.csv',mimeType:'text/csv',buffer:Buffer.from(sampleRows.map(r=>r.join(';')).join('\n'))});await page.locator('#import').click();assert.equal(await page.locator('#count').innerText(),'2');await page.locator('#search').fill('A');await page.waitForFunction(()=>document.querySelectorAll('#results .article').length===1);await page.locator('.article button').first().click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));
 // Regression: Windows-1252 CSV, UTF-16 CSV, and numeric references that are not GTINs.
 for(const [label,buffer] of [['windows-1252',Buffer.from('Referência;EAN\r\nÇ-ÃO;12345678\r\nOK-2;4006381333931\r\n','latin1')],['utf-16le',Buffer.concat([Buffer.from([0xFF,0xFE]),Buffer.from('Referência;EAN\r\nÇ-ÃO;12345678\r\nOK-2;4006381333931\r\n','utf16le')])]]){
  await page.locator('[data-tab="database"]').click();await page.locator('#db-file').setInputFiles({name:'erp.csv',mimeType:'text/csv',buffer});await page.locator('#import').click();
  assert.equal(await page.locator('#count').innerText(),'2',label);
  await page.locator('[data-tab="create"]').click();await page.locator('#product-search').fill('ÇÃO');await page.waitForFunction(()=>document.querySelectorAll('#product-matches .product-match').length===1);
  await page.locator('#product-matches .product-match').first().click();await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('Independent reading confirmed'));
  assert.equal(await page.locator('#format').inputValue(),'code128',label);assert.equal(await page.locator('#value').inputValue(),'12345678',label);
  assert.match(await page.locator('#product-search-note').innerText(),/Code 128/,label);
 }
 await page.screenshot({path:path.join(__dirname,'PREVIEW.png'),fullPage:true});
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(all.size,'14px');assert(all.font.includes('Amazon Ember'));assert.equal(all.bad.length,0,JSON.stringify(all.bad));assert(readback.every(x=>x.pass),JSON.stringify(readback));
 fs.writeFileSync(path.join(__dirname,'TEST-RESULTS.json'),JSON.stringify({date:new Date().toISOString(),formats:all,readback,fileChecks,backgrounds,geometry,endings,checks:'GTIN, CSV, XLSX, leading zeros, PNG metadata, options, duplicates, search, 14 pt captions, SVG expansion, UI invalidation/import, independent decode',adobeHosts:'Not tested in Adobe desktop applications'},null,2));console.log('PASS');
}finally{if(browser)await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
