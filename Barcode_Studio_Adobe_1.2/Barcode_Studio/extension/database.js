(function(){
  'use strict';
  function xml(s) {var doc=new DOMParser().parseFromString(s,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('Invalid Excel XML.');return doc;}
  function all(doc,name){return Array.prototype.slice.call(doc.getElementsByTagNameNS('*',name));}
  function text(node,name){var a=all(node,name);return a.map(function(n){return n.textContent;}).join('');}
  function column(ref){var letters=ref.match(/^[A-Z]+/);if(!letters)return -1;return letters[0].split('').reduce(function(n,c){return n*26+c.charCodeAt(0)-64;},0)-1;}
  async function xlsx(bytes) {
    var zip=await JSZip.loadAsync(bytes), total=0;
    Object.keys(zip.files).forEach(function(k){var s=zip.files[k]._data&&zip.files[k]._data.uncompressedSize||0;total+=s;if(s>40*1024*1024||total>100*1024*1024)throw new Error('Excel file is too large after decompression. Export the list as CSV.');});
    async function read(path,optional){var f=zip.file(path);if(!f){if(optional)return '';throw new Error('Incomplete Excel file: '+path);}return f.async('string');}
    var wb=xml(await read('xl/workbook.xml')),rels=xml(await read('xl/_rels/workbook.xml.rels'));
    var links={};all(rels,'Relationship').forEach(function(r){if(r.getAttribute('TargetMode')==='External')return;var p=r.getAttribute('Target');if(p.indexOf('..')>=0)return;links[r.getAttribute('Id')]=p[0]==='/'?p.slice(1):'xl/'+p;});
    var stringsXML=await read('xl/sharedStrings.xml',true),shared=stringsXML?all(xml(stringsXML),'si').map(function(n){return text(n,'t');}):[];
    var stylesXML=await read('xl/styles.xml',true),formats={},styles=[];
    if(stylesXML){var st=xml(stylesXML);all(st,'numFmt').forEach(function(n){formats[n.getAttribute('numFmtId')]=n.getAttribute('formatCode');});var xf=all(st,'cellXfs')[0];if(xf)styles=all(xf,'xf').map(function(n){return formats[n.getAttribute('numFmtId')]||'';});}
    var sheets=all(wb,'sheet').map(function(n){return {name:n.getAttribute('name'),path:links[n.getAttribute('r:id')||n.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')]};}).filter(function(s){return !!s.path;});
    if(!sheets.length)throw new Error('The Excel file has no available worksheets.');
    return {names:sheets.map(function(s){return s.name;}),sheet:async function(index){
      var doc=xml(await read(sheets[index].path)),rows=[],numericWarnings=[];
      all(doc,'row').forEach(function(row){var values=[];all(row,'c').forEach(function(c){var col=column(c.getAttribute('r')||'');if(col<0||col>500)return;var type=c.getAttribute('t'),v=text(c,'v'),value=v;
        if(type==='s')value=shared[Number(v)]||'';
        else if(type==='inlineStr')value=text(c,'t');
        else if(type==='e')value='[EXCEL ERROR]';
        else if(type!=='str'&&v!==''){
          var fmt=styles[Number(c.getAttribute('s'))]||'';
          if(/^0+$/.test(fmt)&&/^\d+$/.test(v))value=v.padStart(fmt.length,'0');
          if((/^\d{16,}$/.test(v)||/[eE]/.test(v))&&Number(v)>=1e15)numericWarnings.push({row:rows.length,col:col});
        }
        values[col]=value;
      });if(values.some(function(v){return v!=='';}))rows.push(Array.from({length:values.length},function(_,i){return values[i]||'';}));});
      // Ignore empty trailing columns created by cell formatting.
      return {rows:rows,numericWarnings:numericWarnings};
    }};
  }
  async function load(file) {
    if(file.size>25*1024*1024)throw new Error('File size limit: 25 MB.');
    var bytes=await file.arrayBuffer(), ext=file.name.split('.').pop().toLowerCase();
    if(ext==='xlsx')return xlsx(bytes);
    var source=new TextDecoder('utf-8',{fatal:true}).decode(bytes),rows;
    if(ext==='json'){
      var data=JSON.parse(source);if(!Array.isArray(data)||!data.length)throw new Error('JSON must contain a list of objects or rows.');
      if(Array.isArray(data[0]))rows=data;
      else {var keys=Object.keys(data[0]);rows=[keys].concat(data.map(function(r){return keys.map(function(k){var v=r[k];if(typeof v==='number'&&!Number.isSafeInteger(v))throw new Error('Imprecise number in JSON. Store codes as text.');return v==null?'':String(v);});}));}
    }else if(ext==='csv'||ext==='tsv'||ext==='txt')rows=CodeCore.parseCSV(source);
    else throw new Error('Import XLSX, UTF-8 CSV, TSV or JSON. Save older XLS files as XLSX first.');
    return {names:[file.name],sheet:async function(){return {rows:rows,numericWarnings:[]};}};
  }
  window.CodeDatabase={load:load};
})();
