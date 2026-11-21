const fs=require('fs'),path=require('path');
const root=__dirname,p=path.join(root,'extension');
fs.writeFileSync(path.join(p,'font-data.js'),'window.CodeFontBase64='+JSON.stringify(fs.readFileSync(path.join(p,'fonts/AmazonEmber_Rg.ttf')).toString('base64'))+';');
for(const f of ['bwip-js.js','jsQR.js','quagga.js','jszip.js']){
  const q=path.join(p,'vendor',f),body=fs.readFileSync(q,'utf8');
  if(!body.startsWith(';(function(){var module, exports, define;'))fs.writeFileSync(q,';(function(){var module, exports, define;\n'+body+'\n}).call(typeof window!=="undefined"?window:globalThis);\n');
}
require(path.join(p,'vendor/bwip-js.js'));
fs.writeFileSync(path.join(root,'FORMATS.csv'),'Identifier;Format\r\n'+globalThis.bwipjs.symbolList.map(s=>s.bcid+';'+s.desc).join('\r\n'));
