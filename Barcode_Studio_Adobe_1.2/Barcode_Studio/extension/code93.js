/* Code 93 scanline reader. Pattern table and checksum algorithm adapted from
 * ZXing Code93Reader, Copyright 2010 ZXing authors, Apache License 2.0.
 * https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/Code93Reader.java
 * Local adaptation: canvas sampling and JavaScript implementation. */
(function(){
  'use strict';
  var alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%abcd*';
  var encodings=[0x114,0x148,0x144,0x142,0x128,0x124,0x122,0x150,0x112,0x10A,0x1A8,0x1A4,0x1A2,0x194,0x192,0x18A,0x168,0x164,0x162,0x134,0x11A,0x158,0x14C,0x146,0x12C,0x116,0x1B4,0x1B2,0x1AC,0x1A6,0x196,0x19A,0x16C,0x166,0x136,0x13A,0x12E,0x1D4,0x1D2,0x1CA,0x16E,0x176,0x1AE,0x126,0x1DA,0x1D6,0x132,0x15E];
  function pattern(widths){var sum=widths.reduce(function(a,b){return a+b;},0),value=0,modules=0;for(var i=0;i<6;i++){var n=Math.round(widths[i]*9/sum);if(n<1||n>4)return -1;modules+=n;for(var j=0;j<n;j++)value=value<<1|(i%2===0?1:0);}return modules===9?encodings.indexOf(value):-1;}
  function decode(bits){
    var widths=[],positions=[],start=bits.indexOf(1),color=1,run=0;
    if(start<0)return null;
    for(var i=start;i<=bits.length;i++){if(i<bits.length&&bits[i]===color)run++;else{widths.push(run);positions.push(i-run);run=1;color=1-color;}}
    for(var at=0;at+6<widths.length;at+=2){if(pattern(widths.slice(at,at+6))!==47)continue;var result=[],stop=-1;
      for(var offset=at+6;offset+6<widths.length;offset+=6){var index=pattern(widths.slice(offset,offset+6));if(index<0)break;if(index===47){stop=offset;break;}result.push(index);}
      if(stop<0||result.length<2||widths[stop+6]<=0)continue;
      var valid=true;for(var k=0;k<2;k++){var end=result.length-2+k,total=0,weight=1,max=k?15:20;for(var n=end-1;n>=0;n--){total+=result[n]*weight;if(++weight>max)weight=1;}if(total%47!==result[end])valid=false;}
      if(!valid)continue;
      var plain=result.slice(0,-2).map(function(n){return alphabet[n];}).join('');
      // The plain Code 93 reader intentionally does not claim extended ASCII support.
      if(/[abcd]/.test(plain))continue;
      return plain;
    }
    return null;
  }
  window.readCode93=function(canvas){for(var f of [.25,.35,.45,.55,.65]){var row=canvas.getContext('2d').getImageData(0,Math.floor(canvas.height*f),canvas.width,1).data,bits=[];for(var i=0;i<canvas.width;i++)bits.push(row[i*4]+row[i*4+1]+row[i*4+2]<384?1:0);var text=decode(bits)||decode(bits.reverse());if(text!==null)return {text:text,format:'Code 93'};}return null;};
})();
