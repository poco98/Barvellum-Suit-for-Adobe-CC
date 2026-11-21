(function(root, factory) {
  // CEP exposes CommonJS globals in its browser window. The panel must get the
  // browser API even when Node's module/exports are present (mixed context).
  var api = factory();
  if (typeof window !== 'undefined') root.CodeCore = api;
  else if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CodeCore = api;
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';
  var gtinLengths = {ean13:13, ean8:8, upca:12, itf14:14, ean14:14, sscc18:18};
  function checkDigit(body) {
    if (!/^\d+$/.test(body)) throw new Error('Use digits only.');
    var sum=0, weight=3;
    for(var i=body.length-1;i>=0;i--) {sum+=Number(body[i])*weight;weight=4-weight;}
    return String((10-sum%10)%10);
  }
  function validate(bcid, text) {
    if (!text || !text.trim()) throw new Error('Enter the barcode data.');
    if (text.length>12000) throw new Error('Data is too long. Panel limit: 12,000 characters.');
    var len=gtinLengths[bcid];
    if(['itf14','ean14','sscc18'].includes(bcid))text=text.replace(/\s/g,'').replace(bcid==='ean14'?/^\(01\)/:bcid==='sscc18'?/^\(00\)/:/^$/,'');
    if (len) {
      if (!new RegExp('^\\d{'+len+'}$').test(text)) throw new Error('This format requires '+len+' digits including the check digit.');
      var expected=checkDigit(text.slice(0,-1));
      if (text.slice(-1)!==expected) throw new Error('Invalid check digit. The last digit should be '+expected+'. The original value has not been changed.');
    }
    return {text:text,message:len?'Structure and check digit are valid.':'Data accepted. Format rules will be checked by the encoder.'};
  }
  function complete(bcid, text) {
    var len=gtinLengths[bcid];
    if (!len) throw new Error('Check digit calculation is available for EAN-8/13/14, UPC-A, ITF-14 and SSCC-18.');
    if (!new RegExp('^\\d{'+(len-1)+'}$').test(text)) throw new Error('Enter exactly '+(len-1)+' digits to calculate the final digit.');
    return text+checkDigit(text);
  }
  function normalize(value) {return String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
  function parseCSV(text, delimiter) {
    text=text.replace(/^\uFEFF/,'');
    if (/^sep=[;,\t]\r?\n/i.test(text)) {delimiter=text[4];text=text.replace(/^sep=.\r?\n/i,'');}
    if(!delimiter) {
      var scores=[',',';','\t'].map(function(d) {var quote=false,count=0;for(var j=0;j<text.length;j++){var c=text[j];if(c==='"'){if(quote&&text[j+1]==='"'){j++;continue;}quote=!quote;}else if(!quote&&c===d)count++;else if(!quote&&(c==='\n'||c==='\r'))break;}return {d:d,n:count};});
      scores.sort(function(a,b){return b.n-a.n;});delimiter=scores[0].d;
    }
    var rows=[],row=[],cell='',quoted=false,closed=false;
    for(var i=0;i<text.length;i++) {
      var ch=text[i];
      if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;}
      else if(ch==='"'&&cell===''&&!closed)quoted=true;
      else if(ch===delimiter){row.push(cell);cell='';closed=false;}
      else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(function(v){return v!=='';}))rows.push(row);row=[];cell='';closed=false;}
      else {if(closed&&ch!==' '&&ch!=='\t')throw new Error('Invalid CSV: unexpected characters after a closing quote.');if(!closed)cell+=ch;}
    }
    if(quoted)throw new Error('Invalid CSV: unclosed quote.');
    row.push(cell);if(row.some(function(v){return v!=='';}))rows.push(row);
    return rows;
  }
  function headers(rows) {
    if(rows.length<2)throw new Error('The table needs headers and at least one product.');
    var head=rows[0].map(function(x){return String(x).trim();});
    var seen={};head.forEach(function(h){if(!h)throw new Error('The table has empty headers.');var k=normalize(h);if(seen[k])throw new Error('Duplicate header: '+h);seen[k]=true;});
    return head;
  }
  function guess(head, aliases) {return head.findIndex(function(h){return aliases.indexOf(normalize(h))>=0;});}
  function mapping(head) {return {
    ref:guess(head,['codigoartigo','referencia','ref','reference','sku','codigo']),
    desc:guess(head,['descricaoartigo','descricao','description','nome','produto']),
    code:guess(head,['ean','ean13','codigobarras','codigodebarras','barcode','codigoean','gtin']),
    qr:guess(head,['qr','qrcode','url','link','ligacao']),
    format:guess(head,['formato','format','tipo','bcid'])
  };}
  function records(rows, map) {
    headers(rows);
    if(map.code<0&&map.qr<0)throw new Error('Map a barcode or QR column.');
    var items=[];
    rows.slice(1).forEach(function(row,i){
      if(!row.some(function(v){return String(v).trim()!=='';}))return;
      function val(k){return map[k]<0?'':String(row[map[k]]==null?'':row[map[k]]).trim();}
      var code=val('code'), qr=val('qr');
      if(/^[+-]?\d+[.,]?\d*[eE][+-]?\d+$/.test(code))throw new Error('Line '+(i+2)+': the code uses scientific notation. Store the original value as text.');
      items.push({ref:val('ref'),desc:val('desc'),code:code,qr:qr,format:val('format'),line:i+2});
    });
    if(items.length>100000)throw new Error('Database limit: 100,000 products.');
    if(!items.length)throw new Error('No products to import.');
    return items;
  }
  function audit(items) {
    var seen=Object.create(null),duplicates=[],invalid=[],missing=0;
    items.forEach(function(r){if(!r.code&&!r.qr)missing++;if(r.code){if(seen[r.code])duplicates.push({code:r.code,ref:r.ref,other:seen[r.code]});else seen[r.code]=r.ref||'line '+r.line;
      var id=r.format||(/^\d{13}$/.test(r.code)?'ean13':/^\d{8}$/.test(r.code)?'ean8':null);
      if(id&&gtinLengths[id])try{validate(id,r.code);}catch(e){invalid.push({ref:r.ref,line:r.line,error:e.message});}
    }});return {duplicates:duplicates,invalid:invalid,missing:missing,total:items.length};
  }
  function search(items, query) {var q=normalize(query);return items.filter(function(r){return !q||normalize(r.ref+' '+r.desc+' '+r.code+' '+r.qr).indexOf(q)>=0;});}
  function options(extra) {
    if(!extra.trim())return {};
    var value=JSON.parse(extra);
    if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Options must be a JSON object.');
    var denied=['bcid','text','scale','scaleX','scaleY','width','height','padding','paddingleft','paddingright','paddingtop','paddingbottom','backgroundcolor','barcolor','textcolor','rotate','drawing','includetext','__proto__','prototype','constructor'];
    Object.keys(value).forEach(function(k){if(denied.indexOf(k)>=0||!/^[a-zA-Z][a-zA-Z0-9]*$/.test(k))throw new Error('Reserved option: '+k);if(!['string','number','boolean'].includes(typeof value[k])||String(value[k]).length>2000)throw new Error('Invalid option value: '+k);});return value;
  }
  function initFont(bwip,bytes) {
    var dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),count=dv.getUint16(4),units=1000,ascent=1000;
    for(var i=0;i<count;i++){var p=12+i*16,tag=String.fromCharCode(bytes[p],bytes[p+1],bytes[p+2],bytes[p+3]),offset=dv.getUint32(p+8);if(tag==='head')units=dv.getUint16(offset+18);if(tag==='hhea')ascent=dv.getInt16(offset+4);}
    bwip.loadFont('Amazon Ember',ascent/units*100,bytes);
  }
  function escapeXML(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c];});}
  function expandStrokes(svg) {
    return svg.replace(/<path\b([^>]*\bstroke="([^"]+)"[^>]*)\s*\/>/g,function(original,attrs,color){
      var width=Number((attrs.match(/stroke-width="([\d.]+)"/)||[])[1]),data=(attrs.match(/\bd="([^"]*)"/)||[])[1],out='';
      if(!width||!data)throw new Error('A stroke could not be expanded.');
      var pattern=/M(-?[\d.]+)[ ,](-?[\d.]+)L(-?[\d.]+)[ ,](-?[\d.]+)/g,match,rest=data.replace(pattern,'').trim();
      if(rest)throw new Error('A non-linear stroke could not be expanded.');
      while((match=pattern.exec(data))){var x1=+match[1],y1=+match[2],x2=+match[3],y2=+match[4],length=Math.hypot(x2-x1,y2-y1);if(!length)continue;var dx=-(y2-y1)/length*width/2,dy=(x2-x1)/length*width/2;
        out+='M'+(x1+dx)+' '+(y1+dy)+'L'+(x2+dx)+' '+(y2+dy)+'L'+(x2-dx)+' '+(y2-dy)+'L'+(x1-dx)+' '+(y1-dy)+'Z';
      }
      return '<path fill="'+color+'" d="'+out+'" />';
    });
  }
  function build(bwip, cfg) {
    var validated=validate(cfg.bcid,cfg.text),payload=validated.text;
    var encoderText=cfg.bcid==='ean14'?'(01)'+payload:cfg.bcid==='sscc18'?'(00)'+payload:payload;
    var x=Number(cfg.moduleMm),height=Number(cfg.heightMm);
    if(!Number.isFinite(x)||x<0.15||x>2)throw new Error('X dimension must be between 0.15 and 2 mm.');
    if(!Number.isFinite(height)||height<5||height>150)throw new Error('Bar height must be between 5 and 150 mm.');
    var qr=/qrcode/.test(cfg.bcid), opts=Object.assign({},options(cfg.extra||''),{bcid:cfg.bcid,text:encoderText,scale:3,includetext:!!cfg.showText,textfont:'Amazon Ember',textsize:14*25.4/(96*x),barcolor:'000000',textcolor:'000000',backgroundcolor:'FFFFFF',padding:qr?4:12});
    if(cfg.bcid==='code93'||cfg.bcid==='code93ext')opts.includecheck=true;
    // bwip height is in mm at 72 dpi. Match the requested physical bar height after the X-module conversion.
    if(!/qr|matrix|aztec|pdf417|maxicode|dotcode|hanxin|codeone|ultracode/.test(cfg.bcid))opts.height=height*25.4/(72*x);
    var drawing=bwip.drawingSVG(),texts=[],end=drawing.end,setopts=drawing.setopts,padX=0,padY=0;
    drawing.setopts=function(options){padX=options.paddingleft||0;padY=options.paddingtop||0;return setopts.call(drawing,options);};
    drawing.text=function(tx,ty,value,color,font){
      tx+=padX;ty+=padY;
      var size=14*25.4/96*3/x,rotate=font.rotate?' transform="rotate('+(-font.rotate)+' '+tx+' '+ty+')"':'';
      texts.push('<text x="'+tx+'" y="'+ty+'" font-family="Amazon Ember" font-weight="400" font-style="normal" font-size="'+size+'" fill="#'+color+'"'+rotate+' data-font-size-px="14">'+escapeXML(value)+'</text>');
    };
    drawing.end=function(){return end.apply(drawing,arguments).replace('</svg>',texts.join('\n')+'\n</svg>');};
    var svg=expandStrokes(bwip.render(opts,drawing)), m=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if(!m)throw new Error('The encoder did not return dimensions.');
    var w=Number(m[1])*x/3,h=Number(m[2])*x/3;
    if(w>1000||h>1000)throw new Error('The barcode exceeds one metre. Reduce the data or X dimension.');
    svg=svg.replace('<svg ','<svg width="'+w.toFixed(4)+'mm" height="'+h.toFixed(4)+'mm" ');
    if(cfg.fontBase64)svg=svg.replace(/(<svg[^>]*>)/,'$1\n<defs><style>@font-face{font-family:"Amazon Ember";src:url(data:font/ttf;base64,'+cfg.fontBase64+') format("truetype");font-weight:400;font-style:normal;}</style></defs>');
    if(/\bstroke=/.test(svg))throw new Error('Active strokes remain after expansion. Export has been blocked.');
    return {svg:svg,widthMm:w,heightMm:h,options:opts,bcid:cfg.bcid,text:payload,sourceText:cfg.text,moduleMm:x,warnings:x<0.264&&/ean|upc|itf14/.test(cfg.bcid)?['X dimension is below 0.264 mm. Check the dimensions required by your application.']:[]};
  }
  return {initFont:initFont,expandStrokes:expandStrokes,checkDigit:checkDigit,validate:validate,complete:complete,parseCSV:parseCSV,headers:headers,mapping:mapping,records:records,audit:audit,search:search,normalize:normalize,build:build,options:options};
});
