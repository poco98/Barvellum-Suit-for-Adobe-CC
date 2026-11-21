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
  // Excel and ERP exports are often UTF-16 or Windows-1252, not UTF-8. Only the reference and barcode columns are used.
  function decodeText(buffer,ext) {
    var u8=new Uint8Array(buffer);
    if(u8.length>=2&&u8[0]===0xFF&&u8[1]===0xFE)return new TextDecoder('utf-16le').decode(u8.subarray(2));
    if(u8.length>=2&&u8[0]===0xFE&&u8[1]===0xFF)return new TextDecoder('utf-16be').decode(u8.subarray(2));
    try{return new TextDecoder('utf-8',{fatal:true}).decode(u8);}
    catch(error){if(ext==='json')throw new Error('JSON files must be UTF-8.');return new TextDecoder('windows-1252').decode(u8);}
  }
  async function load(file) {
    if(file.size>25*1024*1024)throw new Error('File size limit: 25 MB.');
    var bytes=await file.arrayBuffer(), ext=file.name.split('.').pop().toLowerCase();
    if(ext==='xlsx')return xlsx(bytes);
    var source=decodeText(bytes,ext),rows;
    if(ext==='json'){
      var data=JSON.parse(source);if(!Array.isArray(data)||!data.length)throw new Error('JSON must contain a list of objects or rows.');
      if(Array.isArray(data[0]))rows=data;
      else {var keys=Object.keys(data[0]);rows=[keys].concat(data.map(function(r){return keys.map(function(k){var v=r[k];if(typeof v==='number'&&!Number.isSafeInteger(v))throw new Error('Imprecise number in JSON. Store codes as text.');return v==null?'':String(v);});}));}
    }else if(ext==='csv'||ext==='tsv'||ext==='txt')rows=CodeCore.parseCSV(source);
    else throw new Error('Import XLSX, UTF-8 CSV, TSV or JSON. Save older XLS files as XLSX first.');
    return {names:[file.name],sheet:async function(){return {rows:rows,numericWarnings:[]};}};
  }
  function createTemplate() {
    var zip=new JSZip();
    var spreadsheet='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    var office='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    var packageRels='http://schemas.openxmlformats.org/package/2006/relationships';
    var contentType='application/vnd.openxmlformats-officedocument.spreadsheetml.';
    zip.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="${contentType}sheet.main+xml"/>
      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="${contentType}worksheet+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="${contentType}styles+xml"/>
    </Types>`);
    zip.file('_rels/.rels',`<Relationships xmlns="${packageRels}">
      <Relationship Id="rId1" Type="${office}/officeDocument" Target="xl/workbook.xml"/>
    </Relationships>`);
    zip.file('xl/workbook.xml',`<workbook xmlns="${spreadsheet}" xmlns:r="${office}">
      <sheets><sheet name="Products" sheetId="1" r:id="rId1"/></sheets>
    </workbook>`);
    zip.file('xl/_rels/workbook.xml.rels',`<Relationships xmlns="${packageRels}">
      <Relationship Id="rId1" Type="${office}/worksheet" Target="worksheets/sheet1.xml"/>
      <Relationship Id="rId2" Type="${office}/styles" Target="styles.xml"/>
    </Relationships>`);
    zip.file('xl/styles.xml',`<styleSheet xmlns="${spreadsheet}">
      <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
      <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
      <borders count="1"><border/></borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="2">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
        <xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
      </cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>`);
    zip.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="${spreadsheet}">
      <cols><col min="1" max="2" width="24" style="1" customWidth="1"/></cols>
      <sheetData>
        <row r="1">
          <c r="A1" t="inlineStr"><is><t>Reference</t></is></c>
          <c r="B1" t="inlineStr"><is><t>Barcode</t></is></c>
        </row>
        <row r="2"><c r="A2" s="1"/><c r="B2" s="1"/></row>
      </sheetData>
    </worksheet>`);
    return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
  }
  window.CodeDatabase={load:load,createTemplate:createTemplate};
})();
