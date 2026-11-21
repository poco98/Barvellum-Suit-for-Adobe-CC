(function(){
  'use strict';
  var readers={ean13:'ean_reader',ean8:'ean_8_reader',upca:'upc_reader',upce:'upc_e_reader',code128:'code_128_reader',code39:'code_39_reader',code39ext:'code_39_reader',code93:'code_93_reader',interleaved2of5:'i2of5_reader',itf14:'i2of5_reader',rationalizedCodabar:'codabar_reader'};
  async function imageCanvas(source) {
    if(source instanceof HTMLCanvasElement)return source;
    var img=source instanceof HTMLImageElement?source:new Image();
    if(!(source instanceof HTMLImageElement))await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=function(){reject(new Error('Unable to open the image.'));};img.src=source;});
    if(!img.naturalWidth)throw new Error('The image is empty.');
    var ratio=Math.min(1,4096/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
    var ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas;
  }
  async function scan(source,bcid) {
    var canvas=await imageCanvas(source);
    if(!bcid||bcid==='code93'){var code93=readCode93(canvas);if(code93)return code93;}
    if(!bcid||bcid==='qrcode'){
      var d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),q=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});
      if(q)return {text:q.data,format:'QR Code'};
      if(bcid==='qrcode')throw new Error('The reader could not decode this QR code.');
    }
    if(bcid&&!readers[bcid])return {unsupported:true,message:'This format is validated by the encoder only. Independent reading is not available for this format.'};
    var list=bcid?[readers[bcid]]:['ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_128_reader','code_39_reader','code_93_reader','i2of5_reader','codabar_reader'];
    async function attempt(target,locate){return new Promise(function(resolve,reject){try{Quagga.decodeSingle({src:target.toDataURL('image/png'),numOfWorkers:0,locate:locate,inputStream:{size:Math.max(target.width,target.height),singleChannel:false},decoder:{readers:list},locator:{halfSample:false,patchSize:'medium'}},function(result){resolve(result&&result.codeResult?{text:result.codeResult.code,format:result.codeResult.format}:null);});}catch(e){reject(e);}});}
    var found=await attempt(canvas,false);if(found)return found;
    found=await attempt(canvas,true);if(found)return found;
    // Sample several horizontal bands, excluding captions and bearer bars. No expected value is passed to the reader.
    for(var fraction of [0.3,0.45,0.6]){
      var row=Math.floor(canvas.height*fraction),data=canvas.getContext('2d').getImageData(0,row,canvas.width,1).data,runs=[],start=-1;
      for(var i=0;i<=canvas.width;i++){var black=i<canvas.width&&data[i*4]<128&&data[i*4+1]<128&&data[i*4+2]<128;if(black&&start<0)start=i;if(!black&&start>=0){runs.push({start:start,end:i});start=-1;}}
      if(runs.length<15)continue;
      var widths=runs.map(function(r){return r.end-r.start;}).sort(function(a,b){return a-b;}),unit=widths[Math.floor(widths.length*.15)],left=0,right=canvas.width;
      if(runs[0].end-runs[0].start>=unit*4&&runs[runs.length-1].end-runs[runs.length-1].start>=unit*4){left=runs[0].end;right=runs[runs.length-1].start;}
      var band=document.createElement('canvas');band.width=right-left+unit*24;band.height=120;var ctx=band.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,band.width,band.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,left,row,right-left,1,unit*12,10,right-left,100);
      found=await attempt(band,false);if(found)return found;
    }
    throw new Error('Unable to decode. Use a sharp, upright image cropped around the barcode. A failed reading does not prove that the code is invalid.');
  }
  async function raster(svg,widthMm,heightMm,dpi) {
    var image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    try{await new Promise(function(ok,fail){image.onload=ok;image.onerror=fail;image.src=url;});var c=document.createElement('canvas');c.width=Math.round(widthMm/25.4*dpi);c.height=Math.round(heightMm/25.4*dpi);if(c.width*c.height>25000000)throw new Error('Image is too large. Reduce the X dimension.');var ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(image,0,0,c.width,c.height);return c;}finally{URL.revokeObjectURL(url);}
  }
  async function png(canvas,dpi){
    var blob=await new Promise(function(r){canvas.toBlob(r,'image/png');}),input=new Uint8Array(await blob.arrayBuffer()),pieces=[input.slice(0,8)],offset=8;
    function u32(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];}
    var density=Math.round(dpi/0.0254),chunk=new Uint8Array([0,0,0,9,112,72,89,115].concat(u32(density),u32(density),[1,0,0,0,0])),crc=0xffffffff;
    for(var i=4;i<17;i++){crc^=chunk[i];for(var b=0;b<8;b++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}chunk.set(u32((crc^0xffffffff)>>>0),17);
    var inserted=false;
    while(offset<input.length){var view=new DataView(input.buffer,input.byteOffset+offset),length=view.getUint32(0),type=String.fromCharCode.apply(null,input.slice(offset+4,offset+8));if(type!=='pHYs')pieces.push(input.slice(offset,offset+length+12));if(type==='IHDR'&&!inserted){pieces.push(chunk);inserted=true;}offset+=length+12;}
    return new Blob(pieces,{type:'image/png'});
  }
  window.CodeScanner={scan:scan,raster:raster,png:png,readers:readers};
})();
