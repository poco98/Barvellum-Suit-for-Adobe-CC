(function(root, factory) {
  // CEP exposes CommonJS globals in its browser window. The panel must get the
  // browser API even when Node's module/exports are present (mixed context).
  var api = factory();
  if (typeof window !== 'undefined') root.CodeCore = api;
  else if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CodeCore = api;
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';
  var captionSizePt = 14;
  var captionGapMm = 0.8;
  var gtinLengths = {ean13:13, ean8:8, upca:12, itf14:14, ean14:14, sscc18:18};
  function checkDigit(body) {
    if (!body || /\D/.test(body)) throw new Error('Use digits only.');
    var sum=0, weight=3;
    for(var i=body.length-1;i>=0;i--) {sum+=Number(body[i])*weight;weight=4-weight;}
    return String((10-sum%10)%10);
  }
  function validate(bcid, text) {
    if (!text || !text.trim()) throw new Error('Enter the barcode data.');
    if (text.length>12000) throw new Error('Data is too long. Panel limit: 12,000 characters.');
    var len=gtinLengths[bcid];
    if(['itf14','ean14','sscc18'].includes(bcid))text=text.replace(/\s/g,'');
    if((bcid==='ean14'&&text.startsWith('(01)'))||(bcid==='sscc18'&&text.startsWith('(00)')))text=text.slice(4);
    if (len) {
      if (text.length!==len || /\D/.test(text)) throw new Error('This format requires exactly '+len+' digits.');
      var expected=checkDigit(text.slice(0,-1));
      if (text.slice(-1)!==expected) throw new Error('Invalid check digit. The last digit should be '+expected+'. The original value has not been changed.');
    }
    return {text:text,message:len?'Structure and check digit are valid.':'Data accepted. Format rules will be checked by the encoder.'};
  }
  function complete(bcid, text) {
    var len=gtinLengths[bcid];
    if (!len) throw new Error('Check digit calculation is available for EAN-8/13/14, UPC-A, ITF-14 and SSCC-18.');
    if (text.length!==len-1 || /\D/.test(text)) throw new Error('Enter exactly '+(len-1)+' digits to calculate the final digit.');
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
    return rows[0].map(function(value){return String(value==null?'':value).trim();});
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
      var ref=val('ref'), code=val('code'), qr=val('qr');
      if(!ref&&!code&&!qr)return;
      if(/^[+-]?\d+[.,]\d+[eE][+-]?\d+$/.test(code)||/^[+-]?\d+[.,]?\d*[eE][+-]\d+$/.test(code))throw new Error('Line '+(i+2)+': the code uses scientific notation. Store the original value as text.');
      items.push({ref:ref,desc:val('desc'),code:code,qr:qr,format:val('format'),line:i+2});
    });
    if(items.length>100000)throw new Error('Database limit: 100,000 products.');
    if(!items.length)throw new Error('No products to import.');
    return items;
  }
  function audit(items) {
    var seen=Object.create(null),duplicates=[],invalid=[],missing=0;
    items.forEach(function(r){if(!r.code&&!r.qr)missing++;if(r.code){if(seen[r.code])duplicates.push({code:r.code,ref:r.ref,other:seen[r.code]});else seen[r.code]=r.ref||'line '+r.line;
      var id=r.format||guessBarcodeFormat(r.code);
      if(id&&gtinLengths[id])try{validate(id,r.code);}catch(e){invalid.push({ref:r.ref,line:r.line,error:e.message});}
    }});return {duplicates:duplicates,invalid:invalid,missing:missing,total:items.length};
  }
  function guessBarcodeFormat(code){
    var lengths={8:'ean8',12:'upca',13:'ean13',14:'itf14'};
    return /^\d+$/.test(code)&&lengths[code.length]||'code128';
  }
  function search(items, query) {var q=normalize(query);return items.filter(function(r){return !q||normalize([r.ref||'',r.desc||'',r.code||'',r.qr||''].join(' ')).indexOf(q)>=0;});}
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
  function captionAscent(fontLib,text,size) {
    var font=fontLib.lookup('Amazon Ember'),ascent=null;
    for(var i=0;i<text.length;i++){
      var outline=fontLib.getpaths(font,text.charCodeAt(i),size,size)||[];
      for(var j=0;j<outline.length;j++)ascent=ascent===null?outline[j].y:Math.max(ascent,outline[j].y);
    }
    return ascent;
  }
  function escapeXML(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c];});}
  function expandStrokes(svg,barAdjustment) {
    return svg.replace(/<path\b([^>]*\bstroke="([^"]+)"[^>]*)\s*\/>/g,function(original,attrs,color){
      var width=Number((attrs.match(/stroke-width="([\d.]+)"/)||[])[1]),data=(attrs.match(/\bd="([^"]*)"/)||[])[1],out='';
      if(!width||!data)throw new Error('A stroke could not be expanded.');
      var pattern=/M(-?[\d.]+)[ ,](-?[\d.]+)L(-?[\d.]+)[ ,](-?[\d.]+)/g,match,rest=data.replace(pattern,'').trim();
      if(rest)throw new Error('A non-linear stroke could not be expanded.');
      while((match=pattern.exec(data))){var x1=+match[1],y1=+match[2],x2=+match[3],y2=+match[4];
        if(barAdjustment&&x1===x2&&y1!==y2){
          if(y1>y2)y1=+(y1+barAdjustment).toFixed(8);
          else y2=+(y2+barAdjustment).toFixed(8);
        }
        var length=Math.hypot(x2-x1,y2-y1);if(!length)continue;var dx=-(y2-y1)/length*width/2,dy=(x2-x1)/length*width/2;
        out+='M'+(x1+dx)+' '+(y1+dy)+'L'+(x2+dx)+' '+(y2+dy)+'L'+(x2-dx)+' '+(y2-dy)+'L'+(x1-dx)+' '+(y1-dy)+'Z';
      }
      return '<path fill="'+color+'" d="'+out+'" />';
    });
  }
  function parseAdobeArtwork(svg) {
    var doc=new DOMParser().parseFromString(svg,'image/svg+xml');
    var root=doc.documentElement;
    if(doc.doctype||doc.querySelector('parsererror')||root.localName!=='svg'||root.namespaceURI!=='http://www.w3.org/2000/svg'){
      throw new Error('The encoder did not return a valid SVG.');
    }
    // Adobe placement uses the installed font. Keep embedded styling in the exported SVG.
    root.querySelectorAll('style').forEach(function(style){style.remove();});
    root.querySelectorAll('defs').forEach(function(defs){
      if(!defs.children.length&&!defs.textContent.trim())defs.remove();
    });
    return root;
  }
  function adobeSVG(svg) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(parseAdobeArtwork(svg));
  }
  function qrBackground(width,height,mmPerUnit) {
    var radius=Math.min(1.844/mmPerUnit,width/2,height/2);
    var handle=radius*4*(Math.sqrt(2)-1)/3;
    function point(x,y){return +x.toFixed(8)+' '+ +y.toFixed(8);}
    // Cubic curves give the native Illustrator path and SVG the same round corners.
    var path='M'+point(radius,0)+'L'+point(width-radius,0)
      +'C'+point(width-radius+handle,0)+' '+point(width,radius-handle)+' '+point(width,radius)
      +'L'+point(width,height-radius)
      +'C'+point(width,height-radius+handle)+' '+point(width-radius+handle,height)+' '+point(width-radius,height)
      +'L'+point(radius,height)
      +'C'+point(radius-handle,height)+' '+point(0,height-radius+handle)+' '+point(0,height-radius)
      +'L'+point(0,radius)
      +'C'+point(0,radius-handle)+' '+point(radius-handle,0)+' '+point(radius,0)+'Z';
    return '<path fill="#FFFFFF" d="'+path+'" />\n';
  }
  function illustratorArtwork(svg) {
    var root=parseAdobeArtwork(svg);
    var viewBox = root.getAttribute('viewBox').split(/\s+/).map(Number);
    if(viewBox.length!==4||viewBox[0]!==0||viewBox[1]!==0||!(viewBox[2]>0&&viewBox[3]>0))return null;
    var rows = [['BSV1',viewBox[2],viewBox[3]].join('\t')],nodes=[];
    for(var i=0;i<root.children.length;i++){
      var child=root.children[i];
      if(child.localName==='g'&&/^(barcode-bars|barcode-text)$/.test(child.getAttribute('id'))&&child.attributes.length===1){
        for(var j=0;j<child.children.length;j++)nodes.push(child.children[j]);
      }else nodes.push(child);
    }
    for(var k=0;k<nodes.length;k++){
      var node=nodes[k],tag=node.localName,fill=node.getAttribute('fill');
      if(!/^#[a-f\d]{6}$/i.test(fill)||node.hasAttribute('transform')||node.hasAttribute('clip-path')||node.hasAttribute('style'))return null;
      if(tag==='rect'){
        var x=Number(node.getAttribute('x')),y=Number(node.getAttribute('y'));
        var w=Number(node.getAttribute('width')),h=Number(node.getAttribute('height'));
        if(!isFinite(x)||!isFinite(y)||!(w>0&&h>0)||node.hasAttribute('rx')||node.hasAttribute('ry'))return null;
        rows.push(['P',fill,'0','M'+x+' '+y+'L'+(x+w)+' '+y+'L'+(x+w)+' '+(y+h)+'L'+x+' '+(y+h)+'Z'].join('\t'));
      }else if(tag==='path'){
        var path=node.getAttribute('d');
        if(!/^M[MLCQZ0-9 .,+\-]+$/.test(path))return null;
        rows.push(['P',fill,node.getAttribute('fill-rule')==='evenodd'?'1':'0',path].join('\t'));
      }else if(tag==='text'){
        var tx=Number(node.getAttribute('x')),ty=Number(node.getAttribute('y'));
        if(!isFinite(tx)||!isFinite(ty)||node.children.length)return null;
        rows.push(['T',fill,tx,ty,encodeURIComponent(node.textContent)].join('\t'));
      }else return null;
    }
    return rows.length>1?rows.join('\n'):null;
  }
  function build(bwip, cfg) {
    var ean13Fallback=null;
    if(cfg.bcid==='ean13'&&typeof cfg.text==='string'&&cfg.text.length===13&&!/\D/.test(cfg.text)){
      var expectedDigit=checkDigit(cfg.text.slice(0,-1));
      if(cfg.text.slice(-1)!==expectedDigit){
        ean13Fallback={expectedDigit:expectedDigit,correctedText:cfg.text.slice(0,-1)+expectedDigit};
        cfg=Object.assign({},cfg,{bcid:'code128',extra:''});
      }
    }
    var validated=validate(cfg.bcid,cfg.text),payload=validated.text;
    var encoderText=cfg.bcid==='ean14'?'(01)'+payload:cfg.bcid==='sscc18'?'(00)'+payload:payload;
    var x=Number(cfg.moduleMm),height=Number(cfg.heightMm);
    if(!Number.isFinite(x)||x<0.15||x>2)throw new Error('X dimension must be between 0.15 and 2 mm.');
    if(!Number.isFinite(height)||height<5||height>150)throw new Error('Bar height must be between 5 and 150 mm.');
    var qr=/qr(?:code)?$/.test(cfg.bcid), captionSize=captionSizePt*25.4/(72*x);
    var opts=Object.assign({},options(cfg.extra||''),{bcid:cfg.bcid,text:encoderText,scale:3,includetext:!!cfg.showText,textfont:'Amazon Ember',textsize:cfg.showText?Math.min(captionSize,24.99):10,barcolor:'000000',textcolor:'000000',padding:/qrcode/.test(cfg.bcid)?4:12});
    if(cfg.bcid==='code93'||cfg.bcid==='code93ext')opts.includecheck=true;
    var hasBarHeight=!/qr|matrix|aztec|pdf417|maxicode|dotcode|hanxin|codeone|ultracode/.test(cfg.bcid);
    // The SVG line renderer includes one extra grid unit in each bar.
    if(hasBarHeight)opts.height=(height-x/opts.scale)*25.4/(72*x);
    var drawing=bwip.drawingSVG(),captions=[],texts=[],outlineOffsets=[],end=drawing.end,setopts=drawing.setopts,drawText=drawing.text;
    var drawLine=drawing.line,barBottom=-Infinity,regularBar=null,barsByBottom=Object.create(null);
    var alignEanPrefix=cfg.bcid==='ean13'&&cfg.showText&&opts.textxoffset===undefined,firstBarLeft=null;
    var barAdjustment=0,captionShift=0;
    var padX=0,padY=0,textRight=0,textBottom=0,size=captionSize*opts.scale;
    var captionGap=captionGapMm*opts.scale/x;
    var measureSize=cfg.outlineText?Math.max(8,size|0):1000;
    var textMeasure=null,measureFont=measureSize+'px "Amazon Ember"';
    if(cfg.showText&&!cfg.outlineText&&typeof document!=='undefined'&&document.fonts&&document.fonts.check(measureFont)){
      textMeasure=document.createElement('canvas').getContext('2d');
      if(textMeasure)textMeasure.font=measureFont;
    }
    drawing.setopts=function(options){padX=options.paddingleft||0;padY=options.paddingtop||0;return setopts.call(drawing,options);};
    if(hasBarHeight)drawing.line=function(x1,y1,x2,y2,lineWidth){
      if(x1===x2&&y1!==y2){
        if(alignEanPrefix&&firstBarLeft===null){
          // BWIP truncates the line centre and shifts odd strokes half a unit left at scale 3.
          firstBarLeft=(x1|0)-Math.ceil((Math.round(lineWidth)||1)/2);
        }
        // BWIP's SVG renderer truncates both endpoints and increments the first.
        var start=(y1|0)+1,end=y2|0,bottom=Math.max(start,end),top=Math.min(start,end);
        var bar=barsByBottom[bottom]||(barsByBottom[bottom]={bottom:bottom,top:top,count:0});
        bar.count++;
        if(!regularBar||bar.count>regularBar.count)regularBar=bar;
        barBottom=Math.max(barBottom,bottom);
      }
      return drawLine.apply(drawing,arguments);
    };
    drawing.text=function(tx,ty,value,color,font){
      var metrics=font.rotate?null:drawing.measure(value,'Amazon Ember',size,size);
      var inkAscent=captionAscent(bwip.FontLib,value,measureSize);
      if(textMeasure&&inkAscent!==null){
        var measured=textMeasure.measureText(value).actualBoundingBoxAscent;
        if(isFinite(measured))inkAscent=measured;
      }
      captions.push({x:tx,y:ty,value:value,color:color,font:font,metrics:metrics,inkAscent:inkAscent});
    };
    function renderCaption(caption,index){
      var tx=caption.x,ty=caption.y,value=caption.value,color=caption.color,font=caption.font;
      var lower=caption.metrics&&ty>barBottom;
      if(lower)ty+=captionShift;
      var leadingDigit=alignEanPrefix&&index===0&&!font.rotate&&firstBarLeft!==null&&tx<firstBarLeft&&value===payload.charAt(0);
      if(leadingDigit){
        var glyphSize=cfg.outlineText?(size|0):measureSize;
        var fontLib=bwip.FontLib,glyph=fontLib.getpaths(fontLib.lookup('Amazon Ember'),value.charCodeAt(0),glyphSize,glyphSize);
        var inkRight=Math.max.apply(null,glyph.map(function(point){return point.x;}))*(cfg.outlineText?1:size/glyphSize);
        // Set the gap from the ink edge to the first guard bar to two modules.
        tx=firstBarLeft-2*opts.scale-inkRight;
      }
      var left=tx+padX, baseline=ty+padY;
      if(caption.metrics){
        var metrics=caption.metrics;
        // Leave room for the text engine's trailing side bearing.
        textRight=Math.max(textRight,left+metrics.width+size/2);
        textBottom=Math.max(textBottom,baseline+metrics.descent+2);
      }
      if(cfg.outlineText){
        if(caption.inkAscent!==null)outlineOffsets.push({x:leadingDigit?tx-(tx|0):0,y:lower?ty-(ty|0):0});
        drawText.call(drawing,tx,ty,value,color,Object.assign({},font,{name:'Amazon Ember',width:size,height:size}));
      }else{
        var rotate=font.rotate?' transform="rotate('+(-font.rotate)+' '+left+' '+baseline+')"':'';
        texts.push('<text x="'+left+'" y="'+baseline+'" font-family="Amazon Ember" font-weight="400" font-style="normal" font-size="'+size+'" fill="#'+color+'"'+rotate+'>'+escapeXML(value)+'</text>');
      }
    }
    drawing.end=function(){
      var svg=end.apply(drawing,arguments);
      if(regularBar){
        if(cfg.bcid==='ean13'||cfg.bcid==='code128')barAdjustment=height*opts.scale/x-(regularBar.bottom-regularBar.top);
        var lowerCaptions=captions.filter(function(c){return c.metrics&&c.y>barBottom&&c.inkAscent!==null;});
        if(lowerCaptions.length){
          var scale=cfg.outlineText?1:size/measureSize;
          var inkTop=Math.min.apply(null,lowerCaptions.map(function(c){return c.y-c.inkAscent*scale;}));
          captionShift=regularBar.bottom+barAdjustment+captionGap-inkTop;
        }
      }
      if(!captions.length)return svg;
      captions.forEach(renderCaption);
      var open=svg.indexOf('>')+1,close=svg.lastIndexOf('</svg>'),captionMarkup=texts.join('\n');
      if(cfg.outlineText){
        var outlined=end.apply(drawing,arguments),index=0;
        captionMarkup=outlined.slice(close,outlined.lastIndexOf('</svg>')).replace(/<path\b[^>]*\/>/g,function(path){
          var offset=outlineOffsets[index++];
          return offset&&(offset.x||offset.y)?path.replace('/>','transform="translate('+(offset.x?offset.x.toFixed(8):0)+' '+offset.y.toFixed(8)+')" />'):path;
        });
      }
      if(!captionMarkup.trim())return svg;
      return svg.slice(0,open)+'\n<g id="barcode-bars">'+svg.slice(open,close)+'</g>\n<g id="barcode-text">\n'+captionMarkup+'\n</g>\n'+svg.slice(close);
    };
    var rendered=bwip.render(opts,drawing),svg=expandStrokes(rendered,barAdjustment),m=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if(!m)throw new Error('The encoder did not return dimensions.');
    var unitsWide=Math.max(Number(m[1]),Math.ceil(textRight)),unitsHigh=Math.max(Math.ceil(Number(m[2])+Math.max(0,captionShift,barAdjustment)),Math.ceil(textBottom));
    var mmPerUnit=x/opts.scale;
    if(qr&&cfg.qrWidthMm!==undefined){
      var target=Number(cfg.qrWidthMm);
      if(!Number.isFinite(target)||target<10||target>200)throw new Error('QR size must be between 10 and 200 mm.');
      mmPerUnit=target/unitsWide;
      if(mmPerUnit*opts.scale<0.15)throw new Error('Increase the QR size for this link.');
      x=mmPerUnit*opts.scale;
    }
    var w=unitsWide*mmPerUnit,h=unitsHigh*mmPerUnit;
    if(w>1000||h>1000)throw new Error('The barcode exceeds one metre. Reduce the data or X dimension.');
    svg=svg.replace(m[0],'viewBox="0 0 '+unitsWide+' '+unitsHigh+'"').replace('<svg ','<svg width="'+w.toFixed(4)+'mm" height="'+h.toFixed(4)+'mm" ');
    if(qr)svg=svg.replace(svg.includes('<g id="barcode-bars">')?/<g id="barcode-bars">/:/<svg[^>]*>/,'$&\n'+qrBackground(unitsWide,unitsHigh,mmPerUnit));
    if(cfg.fontBase64)svg=svg.replace(/(<svg[^>]*>)/,'$1\n<defs><style>@font-face{font-family:"Amazon Ember";src:url(data:font/ttf;base64,'+cfg.fontBase64+') format("truetype");font-weight:400;font-style:normal;}</style></defs>');
    if(/\bstroke=/.test(svg))throw new Error('Active strokes remain after expansion. Export has been blocked.');
    return {svg:svg,widthMm:w,heightMm:h,settings:cfg,options:opts,bcid:cfg.bcid,text:payload,sourceText:cfg.text,moduleMm:x,ean13Fallback:ean13Fallback,warnings:x<0.264&&/ean|upc|itf14/.test(cfg.bcid)?['X dimension is below 0.264 mm. Check the dimensions required by your application.']:[]};
  }
  return {adobeSVG:adobeSVG,illustratorArtwork:illustratorArtwork,initFont:initFont,expandStrokes:expandStrokes,checkDigit:checkDigit,validate:validate,complete:complete,parseCSV:parseCSV,headers:headers,mapping:mapping,records:records,audit:audit,search:search,normalize:normalize,build:build,options:options,guessBarcodeFormat:guessBarcodeFormat};
});
