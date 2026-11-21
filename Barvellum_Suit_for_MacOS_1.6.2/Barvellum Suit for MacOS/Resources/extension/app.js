(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var boot=window.CodeStudioBoot;
  var core=window.CodeCore,bwip=window.bwipjs,cep=window.__adobe_cep__;
  var productPageSize=25,limit=productPageSize;
  var current=null,records=[],pending=null,book=null,revision=0,liveTimer=null,productMatches=[];
  var qrCurrent=null,qrRevision=0,qrTimer=null,importRevision=0;
  var storage=null,storageWarning='',hostReady=false,hostName='',inserting=false,lastInsert=null;
  var activeTab='create',tabStatuses=Object.create(null);
  function renderStatus(){
    var footerStatus=$('status'), message=tabStatuses[activeTab]||'Ready.';
    if(footerStatus.textContent!==message)footerStatus.textContent=message;
    footerStatus.title=message;
  }
  function status(message,section){
    tabStatuses[section]=message;
    if(section===activeTab)renderStatus();
  }
  function notice(id,message,kind){$(id).textContent=message;$(id).className='notice '+(kind||'');}
  function tab(id){
    var previous=document.querySelector('.tab.active');
    activeTab=id;
    document.querySelectorAll('.tab').forEach(function(el){el.classList.toggle('active',el.id===id);});
    document.querySelectorAll('nav button').forEach(function(el){
      var active=el.dataset.tab===id;
      el.classList.toggle('active',active);
      if(active)el.setAttribute('aria-current','true');
      else el.removeAttribute('aria-current');
    });
    if(previous&&previous.id!==id)document.querySelector('main').scrollTop=0;
    renderStatus();
  }
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
      var dataDirectory=typeof os.platform==='function'&&os.platform()==='darwin'?'Library/Application Support':'AppData/Roaming';
      var folder=join(os.homedir(),dataDirectory,'Barvellum.Suit');
      storage={kind:'Node filesystem',base:folder,exists:function(p){return fs.existsSync(p);},readText:function(p){return fs.readFileSync(p,'utf8');},readBytes:function(p){return new Uint8Array(fs.readFileSync(p));},mkdir:function(p){fs.mkdirSync(p,{recursive:true});},writeText:function(p,text){fs.writeFileSync(p,text,'utf8');},writeBytes:function(p,bytes){fs.writeFileSync(p,nodeBuffer.from(bytes));},atomicText:function(p,text){var temp=p+'.'+Date.now()+'.tmp';fs.writeFileSync(temp,text,'utf8');fs.renameSync(temp,p);},purge:function(dir,ms){try{var now=Date.now();fs.readdirSync(dir).forEach(function(n){if(!/^\d+-[0-9a-f]+\.(svg|bsv)$/.test(n))return;var f=dir+'/'+n;if(now-fs.statSync(f).mtimeMs>ms)fs.unlinkSync(f);});}catch(ignore){}}};
      return;
    }catch(error){storageWarning='Node access: '+error.message;}
    // CEP's built-in filesystem is independent of CommonJS globals.
    if(cep&&window.cep&&window.cep.fs)try{
      var api=window.cep.fs,folderPath=decodeURI(cep.getSystemPath('userData')).replace(/^file:\/\//,'').replace(/^\/([A-Za-z]:)/,'$1');
      function check(r){if(r.err!==0)throw new Error('CEP filesystem error '+r.err);return r.data;}
      storage={kind:'CEP filesystem',base:join(folderPath,'Barvellum.Suit'),exists:function(p){return api.stat(p).err===0;},readText:function(p){return check(api.readFile(p,'UTF8'));},readBytes:function(p){var text=atob(check(api.readFile(p,'Base64'))),bytes=new Uint8Array(text.length);for(var i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);return bytes;},mkdir:function(p){if(api.stat(p).err!==0)check(api.makedir(p));},writeText:function(p,text){check(api.writeFile(p,text,'UTF8'));},writeBytes:function(p,bytes){var text='';for(var i=0;i<bytes.length;i++)text+=String.fromCharCode(bytes[i]);check(api.writeFile(p,btoa(text),'Base64'));}};
      storage.atomicText=storage.writeText;
      storage.purge=function(dir,ms){try{var list=api.readdir(dir),now=Date.now();if(list.err!==0)return;list.data.forEach(function(n){if(!/^\d+-[0-9a-f]+\.(svg|bsv)$/.test(n))return;var info=api.stat(dir+'/'+n);if(info.err===0&&info.data&&now-Number(info.data.mtime)>ms)api.deleteFile(dir+'/'+n);});}catch(ignore){}};
      storageWarning='';return;
    }catch(error){storageWarning+=' CEP access: '+error.message;}
  }
  function setButtons(){var available=!!current;$('svg').disabled=$('png').disabled=!available;$('place').disabled=!available||!hostReady||!storage||inserting;var qr=!!qrCurrent;$('qr-svg').disabled=$('qr-png').disabled=!qr;$('qr-place').disabled=!qr||!hostReady||!storage||inserting;$('qr-open').disabled=!qr;
    var fallback=current&&current.ean13Fallback;
    $('use-ean13').hidden=!fallback;
    if(fallback)$('use-ean13').textContent='Use EAN-13: '+fallback.correctedText;
  }
  function renderPreview(id,value,isArtwork){
    var preview=$(id);
    preview.classList.toggle('has-artwork',!!isArtwork);
    if(isArtwork)preview.innerHTML=value.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
    else preview.textContent=value;
  }
  function invalidate(){revision++;current=null;setButtons();$('dimensions').textContent='';$('preview-state').textContent='Changed';renderPreview('preview','Update the preview to see your changes.');notice('validation','Data changed. Generate and analyze again.');}
  function schedulePreview(){clearTimeout(liveTimer);if($('live').checked&&$('value').value.trim())liveTimer=setTimeout(function(){generate(false);},400);}
  function saveSettings(){try{localStorage.setItem('barvellum-suit-settings',JSON.stringify({version:3,module:$('module').value,height:$('height').value,showText:$('show-text').checked,live:$('live').checked,qrSize:$('qr-size').value,qrCorrection:$('qr-correction').value}));}catch(ignore){}}
  function loadSettings(){
    try{
      var saved=JSON.parse(localStorage.getItem('barvellum-suit-settings')||localStorage.getItem('barcode-studio-settings')||'null');
      if(!saved)return;
      var height=Number(saved.height),module=Number(saved.module),oldSettings=(saved.version||1)<3;
      var previousHeight=oldSettings&&(height===12||(!saved.version&&height===10));
      var previousModule=oldSettings&&module===0.4;
      if(!previousModule&&module>=0.15&&module<=2)$('module').value=saved.module;
      if(!previousHeight&&height>=5&&height<=150)$('height').value=saved.height;
      if(typeof saved.showText==='boolean')$('show-text').checked=saved.showText;
      if(typeof saved.live==='boolean')$('live').checked=saved.live;
      if(Number(saved.qrSize)>=10&&Number(saved.qrSize)<=200)$('qr-size').value=saved.qrSize;
      if(['L','M','Q','H'].includes(saved.qrCorrection))$('qr-correction').value=saved.qrCorrection;
      if(previousHeight||previousModule)saveSettings();
    }catch(ignore){}
  }
  function changed(){invalidate();saveSettings();schedulePreview();}
  function formatHint(){
    var id=$('format').value,notes={ean13:'13 digits required. An invalid check digit uses Code 128.',ean8:'8 digits including the check digit.',upca:'12 digits including the check digit.',upce:'UPC-E data must match the encoder rules.',itf14:'14 digits including the check digit.',code128:'Letters, digits and references. Use QR for Unicode or long text.',qrcode:'A URL, plain text or Unicode. The exact text will be encoded.',gs1qrcode:'GS1 application identifiers and their values are required.'};
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
    formatHint();
  }
  function config(){var extra=core.options($('extra').value);if(/qrcode/.test($('format').value))extra.eclevel=$('qr-level').value;return {bcid:$('format').value,text:$('value').value,moduleMm:$('module').value,heightMm:$('height').value,showText:$('show-text').checked,extra:JSON.stringify(extra),fontBase64:window.CodeFontBase64};}
  async function generate(verify){
    if(verify===undefined)verify=true;
    clearTimeout(liveTimer);
    var token=++revision;
    current=null;setButtons();$('preview-state').textContent=verify?'Analyzing…':'Rendering…';
    try{
      if(!$('format').value)throw new Error('Select a barcode format first.');
      var code=core.build(bwip,config());
      renderPreview('preview',code.svg,true);
      $('dimensions').textContent=code.widthMm.toFixed(2)+' × '+code.heightMm.toFixed(2)+' mm · X '+code.moduleMm+' mm';
      var report='Content accepted by the encoder.',kind='ok',result=null,matched=false;
      if(code.ean13Fallback){
        report='Generated as Code 128. The EAN-13 check digit would be '+code.ean13Fallback.expectedDigit+'. All 13 digits were preserved.';
        kind='warn';
      }
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
          else{matched=true;report+='\nIndependent reading confirmed: '+result.text;}
        }catch(error){if(token!==revision)return null;report+='\nIndependent reading not confirmed: '+error.message;kind='warn';}
      }else report+='\nLive preview. Reading will be checked before insertion or export.';
      if(token!==revision)return null;
      if(code.warnings.length){report+='\n'+code.warnings.join('\n');kind='warn';}
      code.checked=!!verify;current=code;setButtons();notice('validation',report,kind);
      $('preview-state').textContent=code.ean13Fallback?(matched?'Code 128 analyzed':'Code 128 preview'):(verify?(kind==='ok'?'Analyzed':'Encoder valid'):'Live preview');
      status(verify?'Barcode generated.':'Preview updated.','create');return code;
    }catch(error){if(token!==revision)return null;notice('validation',error.message,'error');$('preview-state').textContent='Check data';renderPreview('preview','Enter valid data for the selected format.');status('Update the data and try again.','create');return null;}
  }
  async function checkedCode(kind){if(kind==='qr'){if(!qrCurrent)return null;if(!qrCurrent.checked)return generateQR(true,false);return qrCurrent;}if(!current)return null;if(!current.checked)return generate(true);return current;}
  function filename(code,extension){
    if(/qr(?:code)?$/.test(code.bcid)){
      var linkName=$('selected-ref').textContent||code.text;
      return code.bcid+'_'+linkName.replace(/[^\w.-]/g,'_').slice(0,70)+'.'+extension;
    }
    var name=code.text.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,70).replace(/[ .]+$/,'')||'barcode';
    if(/^(?:con|prn|aux|nul|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3])(?:\.|$)/i.test(name))name='_'+name;
    return name+'.'+extension;
  }
  function download(blob,name){var url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},30000);}
  async function exportFile(extension,kind){
    var section=kind==='qr'?'qr':'create';
    try{var code=await checkedCode(kind);if(!code)return;var data;
      if(extension==='svg')data=code.svg;else{var canvas=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,600,true);data=await CodeScanner.png(canvas,600);}
      var name=filename(code,extension);
      if(cep&&storage){var chosen=await hostEval('CodeStudio.chooseSave('+arg(name)+')');if(chosen==='CANCEL')return;var target=decodeURIComponent(chosen);if(extension==='svg')storage.writeText(target,data);else storage.writeBytes(target,new Uint8Array(await data.arrayBuffer()));status('Exported: '+target,section);}
      else{download(typeof data==='string'?new Blob([data],{type:'image/svg+xml'}):data,name);status('Download ready.',section);}
    }catch(error){status('Export failed: '+error.message,section);}
  }
  async function place(kind){
    if(inserting)return;
    inserting=true;setButtons();
    var section=kind==='qr'?'qr':'create',messageId=kind==='qr'?'qr-insert-status':'insert-status';
    $(messageId).hidden=true;
    $(messageId).textContent='';
    try {
      var code=await checkedCode(kind);
      if(!code)return;
      if(!hostReady||!storage)throw new Error('Adobe document access is unavailable. See Help > Diagnostics.');
      var artwork=code, illustrator=/illustrator/i.test(hostName);
      if(!illustrator&&code.settings.showText){
        artwork=core.build(bwip,Object.assign({},code.settings,{outlineText:true,fontBase64:null}));
      }
      var out=join(storage.base,'assets');
      storage.mkdir(storage.base);storage.mkdir(out);
      if(typeof storage.purge==='function')storage.purge(out,24*3600*1000);
      var nativeArtwork=illustrator?core.illustratorArtwork(artwork.svg):null;
      var file=join(out,Date.now()+'-'+Math.random().toString(16).slice(2)+(nativeArtwork?'.bsv':'.svg'));
      storage.writeText(file,nativeArtwork||core.adobeSVG(artwork.svg));
      var label='Barvellum Suit | '+code.bcid+' | '+(kind==='qr'?'QR link':code.text.slice(0,70));
      var method=nativeArtwork?'CodeStudio.placeIllustratorArtwork':'CodeStudio.place';
      var args=[arg(file),artwork.widthMm,artwork.heightMm,arg(label)];
      if(illustrator&&kind==='barcode'&&code.settings.showText)args.push(arg(code.text));
      var result=await hostEval(method+'('+args.join(',')+')');
      lastInsert={kind:kind,host:hostName,status:'ok',message:result};
      notice(messageId,result,'ok');status(result,section);
    }catch(error){
      lastInsert={kind:kind,host:hostName,status:'error',message:error.message};
      notice(messageId,'Insert failed: '+error.message,'error');status('Insert failed: '+error.message,section);
    }finally{
      $(messageId).hidden=!$(messageId).textContent||!lastInsert;
      inserting=false;setButtons();
    }
  }
  function readDB(){
    try{var dbPath=storage?join(storage.base,'database.json'):'';if(storage&&!storage.exists(dbPath)){['BarvellumSuit','CodigoStudio'].some(function(oldName){var legacyDb=join(storage.base.replace(/Barvellum\.Suit$/,oldName),'database.json');if(storage.exists(legacyDb)){dbPath=legacyDb;return true;}return false;});}var raw=storage?(storage.exists(dbPath)?storage.readText(dbPath):null):(localStorage.getItem('barvellum-suit-db')||localStorage.getItem('codigo-studio-db'));if(raw){var data=JSON.parse(raw);if(!Array.isArray(data))throw new Error('The saved database is not a list.');records=data;notice('db-status',records.length+' products loaded.','ok');}else{records=[];notice('db-status','No database loaded. Import a file to start.');}}catch(error){records=[];notice('db-status','Unable to open database: '+error.message,'error');}renderDatabase();
  }
  function storeDB(items){var json=JSON.stringify(items);if(storage){storage.mkdir(storage.base);storage.atomicText(join(storage.base,'database.json'),json);}else localStorage.setItem('barvellum-suit-db',json);records=items;}
  function renderDatabase(){
    $('count').textContent=records.length;
    renderResults();
    renderProductMatches();
  }
  function renderResults(){
    $('results').replaceChildren();
    if(!$('product-list').open)return;
    var matches=core.search(records,$('search').value);
    matches.slice(0,limit).forEach(function(item){var article=document.createElement('article');article.className='article';var ref=document.createElement('strong');ref.textContent=item.ref||'No reference';var code=document.createElement('code');code.textContent=item.code||'No barcode data';article.append(ref,code);var actions=document.createElement('div');actions.className='row';var button=document.createElement('button');button.className='small secondary';button.textContent='Use barcode';button.disabled=!item.code;button.onclick=function(){useItem(item);};actions.appendChild(button);article.appendChild(actions);$('results').appendChild(article);});
    $('results-count').textContent=matches.length?Math.min(limit,matches.length)+' of '+matches.length+' products':'No matching products.';
    $('more').hidden=matches.length<=limit;
  }
  function renderProductMatches(){
    var query=$('product-search').value.trim(),box=$('product-matches');box.replaceChildren();
    if(!query){box.hidden=true;$('product-search').setAttribute('aria-expanded','false');$('product-search-note').textContent=records.length?records.length+' products ready to search.':'Import products in Database.';productMatches=[];return;}
    var q=core.normalize(query);productMatches=records.filter(function(item){return core.normalize((item.ref||'')+' '+(item.code||'')).includes(q);});
    productMatches.sort(function(a,b){return (core.normalize(a.ref)===q?-1:0)-(core.normalize(b.ref)===q?-1:0);});
    productMatches.slice(0,8).forEach(function(item){var button=document.createElement('button');button.type='button';button.className='product-match';var ref=document.createElement('strong'),code=document.createElement('code');ref.textContent=item.ref||'No reference';code.textContent=item.code||'No barcode';button.append(ref,code);button.disabled=!item.code;button.onclick=function(){useItem(item);};box.appendChild(button);});
    box.hidden=!productMatches.length;$('product-search').setAttribute('aria-expanded',productMatches.length?'true':'false');$('product-search-note').textContent=productMatches.length?productMatches.length+' matching products. Select one to load its barcode.':records.length?'No matching reference or barcode.':'Import a product table in Database first.';
  }
  function useItem(item){
    var id=item.format||core.guessBarcodeFormat(item.code);
    var fallbackNote='';
    if(!item.format&&['ean8','upca','itf14'].indexOf(id)>=0){try{core.validate(id,item.code);}catch(notGtin){id='code128';fallbackNote=' · Code 128 (not a valid GTIN check digit)';}}
    if(!bwip.symbolList.some(function(s){return s.bcid===id;})){notice('db-status','Unknown format at line '+item.line+': '+id,'error');return;}
    $('format').value=id;$('value').value=item.code;$('extra').value='';$('selected-ref').textContent=item.ref;$('product-search').value=item.ref||item.code;$('product-matches').hidden=true;$('product-search').setAttribute('aria-expanded','false');$('product-search-note').textContent='Selected: '+(item.ref||item.code)+fallbackNote;formatHint();invalidate();tab('create');generate(true);
  }
  async function prepareSheet(){
    var token=++importRevision;
    pending=null;$('import').disabled=true;$('columns').replaceChildren();
    try {
      var data=await book.sheet(Number($('sheet').value));
      if(token!==importRevision)return;
      var headers=core.headers(data.rows),map=core.mapping(headers);
      [['ref','Reference'],['code','Barcode']].forEach(function(pair){
        var label=document.createElement('label');label.textContent=pair[1];
        var select=document.createElement('select');select.id='map-'+pair[0];
        select.add(new Option('Not mapped','-1'));
        headers.forEach(function(header,index){select.add(new Option((index+1)+' · '+(header||'Unnamed column'),index));});
        select.value=map[pair[0]];label.appendChild(select);$('columns').appendChild(label);
      });
      pending=data;$('import').disabled=false;
      notice('db-status','File loaded. Confirm the columns, then save the database.');
    }catch(error){if(token===importRevision)notice('db-status',error.message,'error');}
  }
  async function importFile(file){
    var token=++importRevision;
    pending=null;book=null;$('mapping').hidden=true;
    try{
      var workbook=await CodeDatabase.load(file);
      if(token!==importRevision)return;
      book=workbook;$('sheet').replaceChildren();
      book.names.forEach(function(name,index){$('sheet').add(new Option(name,index));});
      $('mapping').hidden=false;
      await prepareSheet();
    }catch(error){if(token===importRevision)notice('db-status',error.message,'error');}
  }
  function importRows(){
    try{if(!pending)throw new Error('Import a file first.');var map={ref:Number($('map-ref').value),code:Number($('map-code').value),desc:-1,qr:-1,format:-1};if(map.ref<0||map.code<0)throw new Error('Map both Reference and Barcode columns.');if(map.ref===map.code)throw new Error('Reference and Barcode must use different columns.');if(pending.numericWarnings.some(function(w){return w.col===map.code;}))throw new Error('Excel contains long numeric codes with possible precision loss. Recover the original values and store them as text.');var items=core.records(pending.rows,map).map(function(r){return {ref:r.ref,code:r.code,line:r.line};});storeDB(items);var audit=core.audit(items);notice('db-status',items.length+' products saved. '+audit.invalid.length+' check-digit issues, '+audit.duplicates.length+' duplicate codes, '+audit.missing+' empty records.',audit.invalid.length||audit.duplicates.length?'warn':'ok');$('mapping').hidden=true;$('search').value='';$('product-list').open=false;limit=productPageSize;renderDatabase();}catch(error){notice('db-status',error.message,'error');}
  }
  async function chooseFile(kind){
    var input=$(kind==='database'?'db-file':'scan-file');
    if(!cep||!storage){input.click();return;}
    try{var selected=await hostEval('CodeStudio.chooseInput('+arg(kind)+')');if(selected==='CANCEL')return;var target=decodeURIComponent(selected),bytes=storage.readBytes(target),name=target.split(/[\\/]/).pop(),extension=name.split('.').pop().toLowerCase(),type=extension==='png'?'image/png':/jpe?g/.test(extension)?'image/jpeg':'application/octet-stream';var file=new File([bytes],name,{type:type});if(kind==='database')await importFile(file);else await scanFile(file);}catch(error){notice(kind==='database'?'db-status':'scan-status','Unable to open file: '+error.message,'error');}
  }
  async function backup(){
    try{var json=JSON.stringify(records.map(function(r){return {reference:r.ref,barcode:r.code};}),null,2);if(cep&&storage){var chosen=await hostEval('CodeStudio.chooseSave("barvellum_suit_products.json")');if(chosen==='CANCEL')return;storage.writeText(decodeURIComponent(chosen),json,'utf8');status('Database backup exported.','database');}else download(new Blob([json],{type:'application/json'}),'barvellum_suit_products.json');}catch(error){status(error.message,'database');}
  }
  async function saveDatabaseTemplate(){
    var button=$('save-template'),name='Barvellum_Database_Template.xlsx';
    button.disabled=true;
    try{
      var nativeSave=cep&&storage,target;
      if(nativeSave){
        var chosen=await hostEval('CodeStudio.chooseSave('+arg(name)+')');
        if(chosen==='CANCEL')return;
        target=decodeURIComponent(chosen);
        if(!/\.xlsx$/i.test(target))throw new Error('Save the template with an .xlsx extension.');
      }
      var bytes=await CodeDatabase.createTemplate();
      if(nativeSave){
        storage.writeBytes(target,bytes);
        status('Database template saved: '+target,'database');
      }else{
        download(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),name);
        status('Database template ready to download.','database');
      }
    }catch(error){notice('db-status','Unable to save the template: '+error.message,'error');}
    finally{button.disabled=false;}
  }
  async function scanFile(file){
    var url;
    try{if(!/image\/(png|jpeg)/.test(file.type)||file.size>25*1024*1024)throw new Error('Choose a PNG or JPEG up to 25 MB.');url=URL.createObjectURL(file);var img=document.createElement('img');img.src=url;img.alt='Barcode image';$('scan-preview').replaceChildren(img);notice('scan-status','Reading image…');var result=await CodeScanner.scan(url),expected=$('expected').value;notice('scan-status','Format: '+result.format+'\nData: '+result.text+(expected?'\n'+(expected===result.text?'Matches the expected data.':'Does not match the expected data.') : ''),expected&&expected!==result.text?'error':'ok');}catch(error){notice('scan-status',error.message,'warn');}finally{if(url)URL.revokeObjectURL(url);}
  }
  function qrStatus(type,message,kind,label){$('qr-'+type+'-status').textContent=message;$('qr-'+type+'-badge').textContent=label||'Not checked';$('qr-'+type+'-badge').className='pill '+(kind||'');}
  function qrChanged(){qrRevision++;qrCurrent=null;setButtons();$('qr-preview-state').textContent='Changed';$('qr-dimensions').textContent='';qrStatus('read','The QR will be read back before insertion or export.','','Not checked');qrStatus('link','Use Analyze QR & link to check the server response.','','Not checked');clearTimeout(qrTimer);saveSettings();var hasLink=!!$('qr-url').value.trim();renderPreview('qr-preview',hasLink?'Updating QR preview…':'Your QR will appear here');if(hasLink)qrTimer=setTimeout(function(){generateQR(false,false);},400);}
  async function generateQR(verify,checkLink){
    clearTimeout(qrTimer);var token=++qrRevision;qrCurrent=null;setButtons();$('qr-preview-state').textContent=verify?'Analyzing…':'Rendering…';
    try{
      var link=$('qr-url').value.trim();CodeLink.parse(link);var size=Number($('qr-size').value);if(!Number.isFinite(size)||size<10||size>200)throw new Error('QR size must be between 10 and 200 mm.');
      var cfg={bcid:'qrcode',text:link,moduleMm:0.5,heightMm:12,showText:false,qrWidthMm:size,extra:JSON.stringify({eclevel:$('qr-correction').value})};
      var code=core.build(bwip,cfg);code.checked=false;
      renderPreview('qr-preview',code.svg,true);$('qr-dimensions').textContent=code.widthMm.toFixed(2)+' × '+code.heightMm.toFixed(2)+' mm · '+$('qr-correction').value+' error correction';
      if(verify){
        qrStatus('read','Reading the generated QR and comparing its data…','warn','Checking');
        var canvas=await CodeScanner.raster(code.svg,code.widthMm,code.heightMm,450);if(token!==qrRevision)return null;
        var decoded=await CodeScanner.scan(canvas,'qrcode');if(token!==qrRevision)return null;
        if(decoded.text!==link)throw new Error('The decoded QR does not match your link. Output has been blocked.');
        code.checked=true;qrStatus('read','The QR is readable and contains exactly the link entered above.','ok','Readable');
      }else qrStatus('read','Preview generated. The QR will be read back before insertion or export.','','Not checked');
      qrCurrent=code;setButtons();$('qr-preview-state').textContent=verify?'QR analyzed':'Live preview';
      if(checkLink){
        qrStatus('link','Checking the server response…','warn','Checking');var connection=await CodeLink.check(link);if(token!==qrRevision)return null;
        code.linkResult=connection;qrStatus('link',connection.message,connection.kind,connection.status?'HTTP '+connection.status:connection.kind==='ok'?'Reachable':'Not confirmed');
      }
      status(verify?'QR reading confirmed.':'QR preview updated.','qr');return code;
    }catch(error){if(token!==qrRevision)return null;qrCurrent=null;setButtons();renderPreview('qr-preview','Enter a valid URL to generate a QR.');$('qr-dimensions').textContent='';$('qr-preview-state').textContent='Check link';qrStatus('read',error.message,'error','Check data');status('Update the QR link and try again.','qr');return null;}
  }
  function openQRLink(){try{var address=CodeLink.parse($('qr-url').value);if(window.cep&&window.cep.util&&window.cep.util.openURLInDefaultBrowser)window.cep.util.openURLInDefaultBrowser(address.href);else window.open(address.href,'_blank','noopener,noreferrer');status('Link opened in the browser.','qr');}catch(error){status(error.message,'qr');}}
  function diagnostics(){return {version:boot.version,ready:boot.ready,host:hostName||(cep?'Adobe CEP':'Browser'),hostReady:hostReady,storage:storage?storage.kind:'Browser storage',storageWarning:storageWarning,commonJS:typeof window.module==='object',core:typeof window.CodeCore,formats:bwip&&bwip.symbolList?bwip.symbolList.length:0,baseMeasurements:{moduleMm:0.4,barHeightMm:10,textPx:14},lastInsert:lastInsert,errors:boot.errors,userAgent:navigator.userAgent};}
  function bind(){
    document.querySelectorAll('nav button').forEach(function(el){el.onclick=function(){tab(el.dataset.tab);};});
    $('generate').onclick=function(){generate(true);};$('place').onclick=function(){place('barcode');};$('svg').onclick=function(){exportFile('svg','barcode');};$('png').onclick=function(){exportFile('png','barcode');};
    $('use-ean13').onclick=function(){
      if(!current||!current.ean13Fallback||$('value').value!==current.sourceText)return;
      $('value').value=current.ean13Fallback.correctedText;
      $('value').dispatchEvent(new Event('input',{bubbles:true}));
      generate(true);
    };
    $('qr-generate').onclick=function(){generateQR(true,true);};$('qr-place').onclick=function(){place('qr');};$('qr-svg').onclick=function(){exportFile('svg','qr');};$('qr-png').onclick=function(){exportFile('png','qr');};$('qr-open').onclick=openQRLink;
    ['qr-url','qr-size','qr-correction'].forEach(function(id){$(id).addEventListener('input',qrChanged);});
    ['value','module','height','extra','show-text','qr-level'].forEach(function(id){$(id).addEventListener('input',changed);});
    $('value').addEventListener('input',function(){$('selected-ref').textContent='';$('product-search').value='';renderProductMatches();});
    $('product-search').oninput=renderProductMatches;
    $('product-search').onkeydown=function(event){if(event.key==='Enter'&&productMatches.length){event.preventDefault();useItem(productMatches[0]);}else if(event.key==='ArrowDown'){var first=$('product-matches').querySelector('button');if(first){event.preventDefault();first.focus();}}else if(event.key==='Escape'){$('product-matches').hidden=true;this.setAttribute('aria-expanded','false');}};
    $('format').onchange=function(){$('extra').value='';formatHint();changed();};
    $('live').onchange=function(){saveSettings();schedulePreview();};
    $('complete').onclick=function(){
      var id=$('format').value,value=$('value').value.trim(),lengths={ean13:13,ean8:8,upca:12,itf14:14,ean14:14,sscc18:18},digits=value.replace(/\s/g,'').replace(/^\((01|00)\)/,'');
      try{
        if(lengths[id]&&digits.length===lengths[id]){core.validate(id,value);notice('validation','The complete code has a valid check digit. No digit has been changed.','ok');return;}
        $('value').value=core.complete(id,value);changed();notice('validation','Check digit calculated. Confirm that the resulting code belongs to this product.','warn');
      }catch(error){
        var canGenerate=id==='ean13'&&$('value').value===value&&value.length===13&&!/\D/.test(value);
        notice('validation',error.message+(canGenerate?' Generate to keep the original number as Code 128.':''),canGenerate?'warn':'error');
      }
    };
    $('sample').onclick=function(){var sample=bwip.symbolList.find(function(s){return s.bcid===$('format').value;});if(!sample)return;var extra={};sample.opts.split(/\s+/).filter(Boolean).forEach(function(part){var index=part.indexOf('=');if(index<0)extra[part]=true;else{var key=part.slice(0,index),value=part.slice(index+1);extra[key]=/^-?\d+(\.\d+)?$/.test(value)?Number(value):value;}});delete extra.includetext;delete extra.height;if(extra.eclevel){$('qr-level').value=extra.eclevel;delete extra.eclevel;}$('value').value=sample.text;$('extra').value=Object.keys(extra).length?JSON.stringify(extra):'';$('selected-ref').textContent='';changed();};
    $('choose-db').onclick=function(){chooseFile('database');};$('choose-scan').onclick=function(){chooseFile('image');};
    $('save-template').onclick=saveDatabaseTemplate;
    $('db-file').onchange=function(){if(this.files[0])importFile(this.files[0]);this.value='';};$('scan-file').onchange=function(){if(this.files[0])scanFile(this.files[0]);this.value='';};
    $('sheet').onchange=prepareSheet;$('import').onclick=importRows;
    $('product-list').addEventListener('toggle',renderResults);
    $('search').oninput=function(){
      limit=productPageSize;
      $('results').scrollTop=0;
      var expanded=Boolean(this.value.trim());
      if($('product-list').open===expanded)renderResults();
      else $('product-list').open=expanded;
    };
    $('more').onclick=function(){var scroll=$('results').scrollTop;limit+=productPageSize;renderResults();$('results').scrollTop=scroll;};$('refresh').onclick=readDB;$('backup').onclick=backup;
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
    boot.ready=true;boot.diagnostics=diagnostics;$('boot-status').hidden=true;renderStatus();
    if(cep){$('host').textContent='Adobe CEP · connecting…';hostEval('CodeStudio.info()').then(function(name){hostReady=true;hostName=name;$('host').textContent=name+' · '+(storage?'Local database':'Browser storage');setButtons();}).catch(function(error){$('host').textContent='Adobe CEP · host connection unavailable';notice('boot-status','Generation is available, but Adobe document access failed: '+error.message,'warn');$('boot-status').hidden=false;});}
    else $('host').textContent='Standalone · SVG / PNG export';
    if(cep&&!storage){notice('boot-status','Native file access is unavailable. Generation still works. See Help > Diagnostics.','warn');$('boot-status').hidden=false;}
  }catch(error){boot.fail(error.message);$('generate').disabled=true;}
})();
