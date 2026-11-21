(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var boot=window.CodeStudioBoot;
  var core=window.CodeCore,bwip=window.bwipjs,cep=window.__adobe_cep__;
  var current=null,records=[],pending=null,book=null,limit=100,revision=0,liveTimer=null,productMatches=[];
  var qrCurrent=null,qrRevision=0,qrTimer=null;
  var storage=null,storageWarning='',hostReady=false,hostName='';
  function status(message){$('status').textContent=message;$('status').title=message;}
  function notice(id,message,kind){$(id).textContent=message;$(id).className='notice '+(kind||'');}
  function tab(id){document.querySelectorAll('.tab').forEach(function(el){el.classList.toggle('active',el.id===id);});document.querySelectorAll('nav button').forEach(function(el){el.classList.toggle('active',el.dataset.tab===id);});}
  function arg(value){return JSON.stringify(value).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
  function hostEval(script){
    return new Promise(function(resolve,reject){
      if(!cep||typeof cep.evalScript!=='function'){reject(new Error('Adobe host bridge is unavailable.'));return;}
      var timer=setTimeout(function(){reject(new Error('Adobe did not respond. Close any open modal dialog and try again.'));},120000);
      try{cep.evalScript(script,function(result){clearTimeout(timer);if(!result||result==='EvalScript error.'||result.indexOf('ERROR|')===0)reject(new Error((result||'Empty Adobe response.').replace(/^ERROR\|/,'')));else resolve(result.replace(/^OK\|/,''));});}catch(error){clearTimeout(timer);reject(error);}
    });
  }
  function join(){return Array.prototype.slice.call(arguments).join('/').replace(/\\/g,'/').replace(/\/+/g,'/');}
  function initStorage(){
    var requireNode=window.cep_node&&window.cep_node.require||window.require;
    if(typeof requireNode==='function')try{
      var fs=requireNode('fs'),os=requireNode('os'),nodeBuffer=requireNode('buffer').Buffer;
      var folder=join(os.homedir(),'AppData/Roaming/CodigoStudio');
      storage={kind:'Node filesystem',base:folder,exists:function(p){return fs.existsSync(p);},readText:function(p){return fs.readFileSync(p,'utf8');},readBytes:function(p){return new Uint8Array(fs.readFileSync(p));},mkdir:function(p){fs.mkdirSync(p,{recursive:true});},writeText:function(p,text){fs.writeFileSync(p,text,'utf8');},writeBytes:function(p,bytes){fs.writeFileSync(p,nodeBuffer.from(bytes));},atomicText:function(p,text){var temp=p+'.'+Date.now()+'.tmp';fs.writeFileSync(temp,text,'utf8');fs.renameSync(temp,p);}};
      return;
    }catch(error){storageWarning='Node access: '+error.message;}
    // CEP's built-in filesystem is independent of CommonJS globals.
    if(cep&&window.cep&&window.cep.fs)try{
      var api=window.cep.fs,folderPath=decodeURI(cep.getSystemPath('userData')).replace(/^file:\/\//,'').replace(/^\/([A-Za-z]:)/,'$1');
      function check(r){if(r.err!==0)throw new Error('CEP filesystem error '+r.err);return r.data;}
      storage={kind:'CEP filesystem',base:join(folderPath,'CodigoStudio'),exists:function(p){return api.stat(p).err===0;},readText:function(p){return check(api.readFile(p,'UTF8'));},readBytes:function(p){var text=atob(check(api.readFile(p,'Base64'))),bytes=new Uint8Array(text.length);for(var i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);return bytes;},mkdir:function(p){if(api.stat(p).err!==0)check(api.makedir(p));},writeText:function(p,text){check(api.writeFile(p,text,'UTF8'));},writeBytes:function(p,bytes){var text='';for(var i=0;i<bytes.length;i++)text+=String.fromCharCode(bytes[i]);check(api.writeFile(p,btoa(text),'Base64'));}};
      storage.atomicText=storage.writeText;
      storageWarning='';return;
    }catch(error){storageWarning+=' CEP access: '+error.message;}
  }
  function setButtons(){var available=!!current;$('svg').disabled=$('png').disabled=!available;$('place').disabled=!available||!hostReady||!storage;var qr=!!qrCurrent;$('qr-svg').disabled=$('qr-png').disabled=!qr;$('qr-place').disabled=!qr||!hostReady||!storage;$('qr-open').disabled=!qr;}
  function invalidate(){revision++;current=null;setButtons();$('dimensions').textContent='';$('preview-state').textContent='Changed';$('preview').textContent='Update the preview to see your changes.';notice('validation','Data changed. Generate and verify again.');}
  function schedulePreview(){clearTimeout(liveTimer);if($('live').checked&&$('value').value.trim())liveTimer=setTimeout(function(){generate(false);},400);}
  function saveSettings(){try{localStorage.setItem('barcode-studio-settings',JSON.stringify({module:$('module').value,height:$('height').value,showText:$('show-text').checked,live:$('live').checked,qrSize:$('qr-size').value,qrCorrection:$('qr-correction').value}));}catch(ignore){}}
  function loadSettings(){try{var saved=JSON.parse(localStorage.getItem('barcode-studio-settings')||'null');if(!saved)return;if(Number(saved.module)>=0.15&&Number(saved.module)<=2)$('module').value=saved.module;if(Number(saved.height)>=5&&Number(saved.height)<=150)$('height').value=saved.height;if(typeof saved.showText==='boolean')$('show-text').checked=saved.showText;if(typeof saved.live==='boolean')$('live').checked=saved.live;if(Number(saved.qrSize)>=10&&Number(saved.qrSize)<=200)$('qr-size').value=saved.qrSize;if(['L','M','Q','H'].includes(saved.qrCorrection))$('qr-correction').value=saved.qrCorrection;}catch(ignore){}}
  function changed(){invalidate();saveSettings();schedulePreview();}
  function formatHint(){
    var id=$('format').value,notes={ean13:'13 digits including the check digit.',ean8:'8 digits including the check digit.',upca:'12 digits including the check digit.',upce:'UPC-E data must match the encoder rules.',itf14:'14 digits including the check digit.',code128:'Letters, digits and references. Use QR for Unicode or long text.',qrcode:'A URL, plain text or Unicode. The exact text will be encoded.',gs1qrcode:'GS1 application identifiers and their values are required.'};
    $('format-hint').textContent=notes[id]||'Select Load sample to see the input required by this format.';
    $('qr-settings').hidden=!/qrcode/.test(id);$('height').disabled=/qr|matrix|aztec|pdf417|maxicode|dotcode|hanxin|codeone|ultracode/.test(id);
    $('complete').disabled=!['ean13','ean8','upca','itf14','ean14','sscc18'].includes(id);
  }
  function formatList(){
    var selected=$('format').value||'ean13',common=['ean13','ean8','upca','upce','code128','gs1-128','itf14','qrcode','datamatrix','gs1datamatrix','pdf417','azteccode'];
    var symbols=bwip.symbolList.slice();
    symbols.sort(function(a,b){var ai=common.indexOf(a.bcid),bi=common.indexOf(b.bcid);return (ai<0?999:ai)-(bi<0?999:bi)||a.desc.localeCompare(b.desc);});
    $('format').replaceChildren();symbols.forEach(function(s){var option=document.createElement('option');option.value=s.bcid;option.textContent=s.desc;$('format').appendChild(option);});
    if(symbols.some(function(s){return s.bcid===selected;}))$('format').value=selected;
    $('format-count').textContent=bwip.symbolList.length+' formats';formatHint();
  }
  function config(){var extra=core.options($('extra').value);if(/qrcode/.test($('format').value))extra.eclevel=$('qr-level').value;return {bcid:$('format').value,text:$('value').value,moduleMm:$('module').value,heightMm:$('height').value,showText:$('show-text').checked,extra:JSON.stringify(extra),fontBase64:window.CodeFontBase64};}
  async function generate(verify){
    if(verify===undefined)verify=true;
    clearTimeout(liveTimer);
    var token=++revision;
    current=null;setButtons();$('preview-state').textContent=verify?'Verifying…':'Rendering…';
    try{
      if(!$('format').value)throw new Error('Select a barcode format first.');
      var code=core.build(bwip,config());
      $('preview').innerHTML=code.svg;
      $('dimensions').textContent=code.widthMm.toFixed(2)+' × '+code.heightMm.toFixed(2)+' mm · X '+code.moduleMm+' mm';
      var report='Content accepted by the encoder.',kind='ok',result=null;
      if(['ean13','ean8','upca','itf14','ean14','sscc18'].includes(code.bcid))report+=' Check digit is valid.';
      if(verify){
        notice('validation',report+'\nTesting independent reading…');
        try{
          var canvas=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,450);
          if(token!==revision)return null;
          result=await CodeScanner.scan(canvas,code.bcid);
          if(token!==revision)return null;
          if(result.unsupported){report+='\n'+result.message;kind='warn';}
          else if(result.text!==code.text){notice('validation','Reading mismatch. Expected: '+code.text+'\nDecoded: '+result.text+'\nInsertion and export are blocked.','error');$('preview-state').textContent='Mismatch';return null;}
          else report+='\nIndependent reading confirmed: '+result.text;
        }catch(error){if(token!==revision)return null;report+='\nIndependent reading not confirmed: '+error.message;kind='warn';}
      }else report+='\nLive preview. Reading will be checked before insertion or export.';
      if(token!==revision)return null;
      if(code.warnings.length){report+='\n'+code.warnings.join('\n');kind='warn';}
      code.checked=!!verify;current=code;setButtons();notice('validation',report,kind);$('preview-state').textContent=verify?(kind==='ok'?'Verified':'Encoder valid'):'Live preview';status(verify?'Barcode generated.':'Preview updated.');return code;
    }catch(error){if(token!==revision)return null;notice('validation',error.message,'error');$('preview-state').textContent='Check data';$('preview').textContent='Enter valid data for the selected format.';status('Update the data and try again.');return null;}
  }
  async function checkedCode(kind){if(kind==='qr'){if(!qrCurrent)return null;if(!qrCurrent.checked)return generateQR(true,false);return qrCurrent;}if(!current)return null;if(!current.checked)return generate(true);return current;}
  function filename(code,extension){var name=$('selected-ref').textContent||code.text||'barcode';return code.bcid+'_'+name.replace(/[^\w.-]/g,'_').slice(0,70)+'.'+extension;}
  function download(blob,name){var url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
  async function exportFile(extension,kind){
    try{var code=await checkedCode(kind);if(!code)return;var data;
      if(extension==='svg')data=code.svg;else{var canvas=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,600);data=await CodeScanner.png(canvas,600);}
      var name=filename(code,extension);
      if(cep&&storage){var chosen=await hostEval('CodeStudio.chooseSave('+arg(name)+')');if(chosen==='CANCEL')return;var target=decodeURIComponent(chosen);if(extension==='svg')storage.writeText(target,data);else storage.writeBytes(target,new Uint8Array(await data.arrayBuffer()));status('Exported: '+target);}
      else{download(typeof data==='string'?new Blob([data],{type:'image/svg+xml'}):data,name);status('Download ready.');}
    }catch(error){status('Export failed: '+error.message);}
  }
  async function place(kind){
    try{var code=await checkedCode(kind);if(!code)return;if(!hostReady||!storage)throw new Error('Adobe document access is unavailable. See Help > Diagnostics.');$(kind==='qr'?'qr-place':'place').disabled=true;var out=join(storage.base,'assets');storage.mkdir(storage.base);storage.mkdir(out);var file=join(out,Date.now()+'-'+Math.random().toString(16).slice(2)+'.svg');storage.writeText(file,/illustrator/i.test(hostName)?core.illustratorSVG(code.svg):code.svg);var label='Barcode Studio | '+code.bcid+' | '+code.text.slice(0,70);status(await hostEval('CodeStudio.place('+arg(file)+','+code.widthMm+','+code.heightMm+','+arg(label)+')'));}catch(error){status('Insert failed: '+error.message);notice(kind==='qr'?'qr-read-status':'validation','Insert failed: '+error.message,'error');}finally{setButtons();}
  }
  function readDB(){
    try{var raw=storage?(storage.exists(join(storage.base,'database.json'))?storage.readText(join(storage.base,'database.json')):null):localStorage.getItem('codigo-studio-db');if(raw){var data=JSON.parse(raw);if(!Array.isArray(data))throw new Error('The saved database is not a list.');records=data;notice('db-status',records.length+' products loaded.','ok');}else{records=[];notice('db-status','No database loaded. Import a file to start.');}}catch(error){records=[];notice('db-status','Unable to open database: '+error.message,'error');}renderResults();
  }
  function storeDB(items){var json=JSON.stringify(items);if(storage){storage.mkdir(storage.base);storage.atomicText(join(storage.base,'database.json'),json);}else localStorage.setItem('codigo-studio-db',json);records=items;}
  function renderResults(){
    $('count').textContent=records.length;var matches=core.search(records,$('search').value);$('results').replaceChildren();
    matches.slice(0,limit).forEach(function(item){var article=document.createElement('article');article.className='article';var ref=document.createElement('strong');ref.textContent=item.ref||'No reference';var code=document.createElement('code');code.textContent=item.code||'No barcode data';article.append(ref,code);var actions=document.createElement('div');actions.className='row';var button=document.createElement('button');button.className='small secondary';button.textContent='Use barcode';button.disabled=!item.code;button.onclick=function(){useItem(item);};actions.appendChild(button);article.appendChild(actions);$('results').appendChild(article);});
    $('results-count').textContent=Math.min(limit,matches.length)+' of '+matches.length+' products';$('more').hidden=matches.length<=limit;
    renderProductMatches();
  }
  function renderProductMatches(){
    var query=$('product-search').value.trim(),box=$('product-matches');box.replaceChildren();
    if(!query){box.hidden=true;$('product-search').setAttribute('aria-expanded','false');$('product-search-note').textContent=records.length?records.length+' products ready. Search by reference or barcode.':'Import Reference and Barcode columns in Database.';productMatches=[];return;}
    var q=core.normalize(query);productMatches=records.filter(function(item){return core.normalize((item.ref||'')+' '+(item.code||'')).includes(q);});
    productMatches.sort(function(a,b){return (core.normalize(a.ref)===q?-1:0)-(core.normalize(b.ref)===q?-1:0);});
    productMatches.slice(0,8).forEach(function(item){var button=document.createElement('button');button.type='button';button.className='product-match';var ref=document.createElement('strong'),code=document.createElement('code');ref.textContent=item.ref||'No reference';code.textContent=item.code||'No barcode';button.append(ref,code);button.disabled=!item.code;button.onclick=function(){useItem(item);};box.appendChild(button);});
    box.hidden=!productMatches.length;$('product-search').setAttribute('aria-expanded',productMatches.length?'true':'false');$('product-search-note').textContent=productMatches.length?productMatches.length+' matching products. Select one to load its barcode.':records.length?'No matching reference or barcode.':'Import a product table in Database first.';
  }
  function useItem(item){
    var id=item.format||(/^\d{13}$/.test(item.code)?'ean13':/^\d{8}$/.test(item.code)?'ean8':/^\d{12}$/.test(item.code)?'upca':/^\d{14}$/.test(item.code)?'itf14':'code128');
    if(!bwip.symbolList.some(function(s){return s.bcid===id;})){notice('db-status','Unknown format at line '+item.line+': '+id,'error');return;}
    $('format').value=id;$('value').value=item.code;$('extra').value='';$('selected-ref').textContent=item.ref;$('product-search').value=item.ref||item.code;$('product-matches').hidden=true;$('product-search').setAttribute('aria-expanded','false');$('product-search-note').textContent='Selected: '+(item.ref||item.code);formatHint();invalidate();tab('create');generate(true);
  }
  async function prepareSheet(){
    pending=await book.sheet(Number($('sheet').value));var headers=core.headers(pending.rows),map=core.mapping(headers);$('columns').replaceChildren();
    [['ref','Reference'],['code','Barcode']].forEach(function(pair){var label=document.createElement('label');label.textContent=pair[1];var select=document.createElement('select');select.id='map-'+pair[0];var none=document.createElement('option');none.value='-1';none.textContent='Not mapped';select.appendChild(none);headers.forEach(function(header,index){var option=document.createElement('option');option.value=index;option.textContent=header;select.appendChild(option);});select.value=map[pair[0]];label.appendChild(select);$('columns').appendChild(label);});$('mapping').hidden=false;
  }
  async function importFile(file){
    try{book=await CodeDatabase.load(file);$('sheet').replaceChildren();book.names.forEach(function(name,index){var option=document.createElement('option');option.value=index;option.textContent=name;$('sheet').appendChild(option);});await prepareSheet();notice('db-status','File loaded. Confirm the columns, then save the database.');}catch(error){notice('db-status',error.message,'error');}
  }
  function importRows(){
    try{if(!pending)throw new Error('Import a file first.');var map={ref:Number($('map-ref').value),code:Number($('map-code').value),desc:-1,qr:-1,format:-1};if(map.ref<0||map.code<0)throw new Error('Map both Reference and Barcode columns.');if(map.ref===map.code)throw new Error('Reference and Barcode must use different columns.');if(pending.numericWarnings.some(function(w){return w.col===map.code;}))throw new Error('Excel contains long numeric codes with possible precision loss. Recover the original values and store them as text.');var items=core.records(pending.rows,map).map(function(r){return {ref:r.ref,code:r.code,line:r.line};});storeDB(items);var audit=core.audit(items);notice('db-status',items.length+' products saved. '+audit.invalid.length+' invalid codes, '+audit.duplicates.length+' duplicate codes, '+audit.missing+' empty records.',audit.invalid.length||audit.duplicates.length?'warn':'ok');$('mapping').hidden=true;limit=100;renderResults();}catch(error){notice('db-status',error.message,'error');}
  }
  async function chooseFile(kind){
    var input=$(kind==='database'?'db-file':'scan-file');
    if(!cep||!storage){input.click();return;}
    try{var selected=await hostEval('CodeStudio.chooseInput('+arg(kind)+')');if(selected==='CANCEL')return;var target=decodeURIComponent(selected),bytes=storage.readBytes(target),name=target.split(/[\\/]/).pop(),extension=name.split('.').pop().toLowerCase(),type=extension==='png'?'image/png':/jpe?g/.test(extension)?'image/jpeg':'application/octet-stream';var file=new File([bytes],name,{type:type});if(kind==='database')await importFile(file);else await scanFile(file);}catch(error){notice(kind==='database'?'db-status':'scan-status','Unable to open file: '+error.message,'error');}
  }
  async function backup(){
    try{var json=JSON.stringify(records.map(function(r){return {reference:r.ref,barcode:r.code};}),null,2);if(cep&&storage){var chosen=await hostEval('CodeStudio.chooseSave("barcode_studio_products.json")');if(chosen==='CANCEL')return;storage.writeText(decodeURIComponent(chosen),json,'utf8');status('Database backup exported.');}else download(new Blob([json],{type:'application/json'}),'barcode_studio_products.json');}catch(error){status(error.message);}
  }
  async function scanFile(file){
    var url;
    try{if(!/image\/(png|jpeg)/.test(file.type)||file.size>25*1024*1024)throw new Error('Choose a PNG or JPEG up to 25 MB.');url=URL.createObjectURL(file);var img=document.createElement('img');img.src=url;img.alt='Barcode image';$('scan-preview').replaceChildren(img);notice('scan-status','Reading image…');var result=await CodeScanner.scan(url),expected=$('expected').value;notice('scan-status','Format: '+result.format+'\nData: '+result.text+(expected?'\n'+(expected===result.text?'Matches the expected data.':'Does not match the expected data.') : ''),expected&&expected!==result.text?'error':'ok');}catch(error){notice('scan-status',error.message,'warn');}finally{if(url)URL.revokeObjectURL(url);}
  }
  function qrStatus(type,message,kind,label){$('qr-'+type+'-status').textContent=message;$('qr-'+type+'-badge').textContent=label||'Not checked';$('qr-'+type+'-badge').className='pill '+(kind||'');}
  function qrChanged(){qrRevision++;qrCurrent=null;setButtons();$('qr-preview-state').textContent='Changed';$('qr-preview').textContent='Updating QR preview…';$('qr-dimensions').textContent='';qrStatus('read','The QR will be read back before insertion or export.','','Not checked');qrStatus('link','Use Verify QR & link to check the server response.','','Not checked');clearTimeout(qrTimer);saveSettings();if($('qr-url').value.trim())qrTimer=setTimeout(function(){generateQR(false,false);},400);else $('qr-preview').textContent='Your QR will appear here';}
  async function generateQR(verify,checkLink){
    clearTimeout(qrTimer);var token=++qrRevision;qrCurrent=null;setButtons();$('qr-preview-state').textContent=verify?'Checking…':'Rendering…';
    try{
      var link=$('qr-url').value.trim();CodeLink.parse(link);var size=Number($('qr-size').value);if(!Number.isFinite(size)||size<10||size>200)throw new Error('QR size must be between 10 and 200 mm.');
      var cfg={bcid:'qrcode',text:link,moduleMm:0.5,heightMm:10,showText:false,extra:JSON.stringify({eclevel:$('qr-correction').value})},code=core.build(bwip,cfg);
      cfg.moduleMm=0.5*size/code.widthMm;
      if(cfg.moduleMm<0.15||cfg.moduleMm>2)throw new Error('This link needs a different QR size. Increase the size for long links.');
      code=core.build(bwip,cfg);code.checked=false;
      $('qr-preview').innerHTML=code.svg;$('qr-dimensions').textContent=code.widthMm.toFixed(2)+' × '+code.heightMm.toFixed(2)+' mm · '+$('qr-correction').value+' error correction';
      if(verify){
        qrStatus('read','Reading the generated QR and comparing its data…','warn','Checking');
        var canvas=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,450);if(token!==qrRevision)return null;
        var decoded=await CodeScanner.scan(canvas,'qrcode');if(token!==qrRevision)return null;
        if(decoded.text!==link)throw new Error('The decoded QR does not match your link. Output has been blocked.');
        code.checked=true;qrStatus('read','The QR is readable and contains exactly the link entered above.','ok','Readable');
      }else qrStatus('read','Preview generated. The QR will be read back before insertion or export.','','Not checked');
      qrCurrent=code;setButtons();$('qr-preview-state').textContent=verify?'QR verified':'Live preview';
      if(checkLink){
        qrStatus('link','Checking the server response…','warn','Checking');var connection=await CodeLink.check(link);if(token!==qrRevision)return null;
        code.linkResult=connection;qrStatus('link',connection.message,connection.kind,connection.status?'HTTP '+connection.status:connection.kind==='ok'?'Reachable':'Not confirmed');
      }
      status(verify?'QR reading verified.':'QR preview updated.');return code;
    }catch(error){if(token!==qrRevision)return null;qrCurrent=null;setButtons();$('qr-preview').textContent='Enter a valid URL to generate a QR.';$('qr-dimensions').textContent='';$('qr-preview-state').textContent='Check link';qrStatus('read',error.message,'error','Check data');status('Update the QR link and try again.');return null;}
  }
  function openQRLink(){try{var address=CodeLink.parse($('qr-url').value);if(window.cep&&window.cep.util&&window.cep.util.openURLInDefaultBrowser)window.cep.util.openURLInDefaultBrowser(address.href);else window.open(address.href,'_blank','noopener,noreferrer');status('Link opened in the browser.');}catch(error){status(error.message);}}
  function diagnostics(){return {version:'1.2.0',ready:boot.ready,host:cep?'Adobe CEP':'Browser',hostReady:hostReady,storage:storage?storage.kind:'Browser storage',storageWarning:storageWarning,commonJS:typeof window.module==='object',core:typeof window.CodeCore,formats:bwip&&bwip.symbolList?bwip.symbolList.length:0,baseMeasurements:{moduleMm:0.4,barHeightMm:10,textPx:14},errors:boot.errors,userAgent:navigator.userAgent};}
  function bind(){
    document.querySelectorAll('nav button').forEach(function(el){el.onclick=function(){tab(el.dataset.tab);};});
    $('generate').onclick=function(){generate(true);};$('place').onclick=function(){place('barcode');};$('svg').onclick=function(){exportFile('svg','barcode');};$('png').onclick=function(){exportFile('png','barcode');};
    $('qr-generate').onclick=function(){generateQR(true,true);};$('qr-place').onclick=function(){place('qr');};$('qr-svg').onclick=function(){exportFile('svg','qr');};$('qr-png').onclick=function(){exportFile('png','qr');};$('qr-open').onclick=openQRLink;
    ['qr-url','qr-size','qr-correction'].forEach(function(id){$(id).addEventListener('input',qrChanged);});
    ['value','module','height','extra','show-text','qr-level'].forEach(function(id){$(id).addEventListener('input',changed);});
    $('value').addEventListener('input',function(){$('selected-ref').textContent='';$('product-search').value='';renderProductMatches();$('product-search-note').textContent='Manual data. Search above to load a product reference.';});
    $('product-search').oninput=renderProductMatches;
    $('product-search').onkeydown=function(event){if(event.key==='Enter'&&productMatches.length){event.preventDefault();useItem(productMatches[0]);}else if(event.key==='ArrowDown'){var first=$('product-matches').querySelector('button');if(first){event.preventDefault();first.focus();}}else if(event.key==='Escape'){$('product-matches').hidden=true;this.setAttribute('aria-expanded','false');}};
    $('format').onchange=function(){$('extra').value='';formatHint();changed();};
    $('live').onchange=function(){saveSettings();schedulePreview();};
    $('complete').onclick=function(){try{var id=$('format').value,value=$('value').value.trim(),lengths={ean13:13,ean8:8,upca:12,itf14:14,ean14:14,sscc18:18},digits=value.replace(/\s/g,'').replace(/^\((01|00)\)/,'');if(lengths[id]&&digits.length===lengths[id]){core.validate(id,value);notice('validation','The complete code has a valid check digit. No digit has been changed.','ok');return;}$('value').value=core.complete(id,value);changed();notice('validation','Check digit calculated. Confirm that the resulting code belongs to this product.','warn');}catch(error){notice('validation',error.message,'error');}};
    $('sample').onclick=function(){var sample=bwip.symbolList.find(function(s){return s.bcid===$('format').value;});if(!sample)return;var extra={};sample.opts.split(/\s+/).filter(Boolean).forEach(function(part){var index=part.indexOf('=');if(index<0)extra[part]=true;else{var key=part.slice(0,index),value=part.slice(index+1);extra[key]=/^-?\d+(\.\d+)?$/.test(value)?Number(value):value;}});delete extra.includetext;delete extra.height;if(extra.eclevel){$('qr-level').value=extra.eclevel;delete extra.eclevel;}$('value').value=sample.text;$('extra').value=Object.keys(extra).length?JSON.stringify(extra):'';$('selected-ref').textContent='';changed();};
    $('choose-db').onclick=function(){chooseFile('database');};$('choose-scan').onclick=function(){chooseFile('image');};
    $('db-file').onchange=function(){if(this.files[0])importFile(this.files[0]);this.value='';};$('scan-file').onchange=function(){if(this.files[0])scanFile(this.files[0]);this.value='';};
    $('sheet').onchange=function(){prepareSheet().catch(function(error){notice('db-status',error.message,'error');});};$('import').onclick=importRows;
    $('search').oninput=function(){limit=100;renderResults();};$('more').onclick=function(){limit+=100;renderResults();};$('refresh').onclick=readDB;$('backup').onclick=backup;
    $('audit').onclick=function(){$('audit-result').hidden=false;$('audit-result').textContent=JSON.stringify(core.audit(records),null,2);};
    $('diagnostics').onclick=function(){$('diagnostic-output').hidden=false;$('diagnostic-output').textContent=JSON.stringify(diagnostics(),null,2);};
  }
  try{
    if(!core)throw new Error('The barcode core is missing.');
    if(!bwip||!bwip.symbolList)throw new Error('The barcode encoder is missing.');
    if(!window.CodeDatabase||!window.CodeScanner||!window.CodeLink)throw new Error('A database, reader or link module is missing.');
    var raw=atob(window.CodeFontBase64),fontBytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)fontBytes[i]=raw.charCodeAt(i);core.initFont(bwip,fontBytes);
    // Populate and bind the core UI before attempting optional native storage.
    formatList();loadSettings();bind();initStorage();readDB();
    boot.ready=true;boot.diagnostics=diagnostics;$('boot-status').hidden=true;status('Ready.');
    if(cep){$('host').textContent='Adobe CEP · connecting…';hostEval('CodeStudio.info()').then(function(name){hostReady=true;hostName=name;$('host').textContent=name+' · '+(storage?'Local database':'Browser storage');setButtons();}).catch(function(error){$('host').textContent='Adobe CEP · host connection unavailable';notice('boot-status','Generation is available, but Adobe document access failed: '+error.message,'warn');$('boot-status').hidden=false;});}
    else $('host').textContent='Standalone · SVG / PNG export';
    if(cep&&!storage){notice('boot-status','Native file access is unavailable. Generation still works. See Help > Diagnostics.','warn');$('boot-status').hidden=false;}
  }catch(error){boot.fail(error.message);$('generate').disabled=true;}
})();
