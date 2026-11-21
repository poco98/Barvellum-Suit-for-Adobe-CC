const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'extension/host/bridge.jsx'),'utf8');
function fixture(options={}){
 const state={opened:0,closed:0,removed:0,duplicated:0,resizes:[],fontAssigned:[],placedAPI:0};
 function group(parent){return {typename:'GroupItem',parent,pageItems:[],width:60,height:30,resize(x,y){if(options.resizeError)throw Error('resize failed');state.resizes.push([x,y]);},remove(){state.removed++;},duplicate(target){const copy=clone(this,target);target.pageItems.unshift(copy);state.duplicated++;return copy;}};}
 function clone(item,parent){if(item.typename==='GroupItem'){const copy=group(parent);copy.name=item.name;copy.pageItems=item.pageItems.map(child=>clone(child,copy));return copy;}const copy={typename:item.typename,parent};if(item.textRange){const attrs={};Object.defineProperty(attrs,'textFont',{set:value=>state.fontAssigned.push(value.name)});Object.defineProperty(attrs,'size',{set:value=>state.fontAssigned.push(value)});copy.textRange={characterAttributes:attrs};}return copy;}
 const target={typename:'Document',artboards:[{artboardRect:[0,300,400,0]}],activate(){app.activeDocument=this;},close(){throw Error('USER DOCUMENT MUST NOT BE CLOSED');},placedItems:{add(){state.placedAPI++;throw Error('SVG cannot be placed');}}};target.artboards.getActiveArtboardIndex=()=>0;
 const layer={typename:'Layer',locked:!!options.locked,visible:true,groupItems:{add(){state.group=group(layer);return state.group;}}};target.activeLayer=layer;
 const sourceLayer={typename:'Layer'},nested=group(sourceLayer);
 nested.pageItems=[{typename:'PathItem',parent:nested}];
 if(!options.noText){
  const caption=group(nested);
  caption.pageItems=[{typename:'TextFrame',parent:caption,textRange:{characterAttributes:{}}}];
  nested.pageItems.push(caption);
 }
 const donor={typename:'Document',artboards:[{artboardRect:[0,30,60,0]}],pageItems:[nested,...nested.pageItems],close(value){assert.equal(value,'discard');state.closed++;app.activeDocument=target;}};
 const font={name:'AmazonEmber-Regular',family:'Amazon Ember',style:'Regular'};const fonts=options.missingFont?[]:[font];fonts.getByName=name=>{if(!options.missingFont&&name===font.name)return font;throw Error('font not found');};
 const app={name:'Adobe Illustrator',version:'31.0',activeDocument:target,documents:[target],textFonts:fonts,userInteractionLevel:'display',open(file){assert(file.exists);state.opened++;app.activeDocument=donor;return donor;}};
 const context={app,File:function(value){this.name=String(value).split('/').pop();this.exists=!options.missingFile;},UserInteractionLevel:{DONTDISPLAYALERTS:'silent'},ElementPlacement:{PLACEATBEGINNING:'front'},SaveOptions:{DONOTSAVECHANGES:'discard'}};vm.createContext(context);vm.runInContext(source,context);
 return {run:()=>context.CodeStudio.place('C:/test/barcode.svg',40,20,'Test barcode',options.captionName),state,app,target};
}
const ok=fixture();assert(ok.run().startsWith('OK|Native vector'));assert.equal(ok.state.placedAPI,0);assert.equal(ok.state.opened,1);assert.equal(ok.state.closed,1);assert.equal(ok.state.duplicated,1);assert.deepEqual(ok.state.fontAssigned,['AmazonEmber-Regular',14]);assert.equal(ok.app.activeDocument,ok.target);assert.equal(ok.app.userInteractionLevel,'display');assert(Math.abs(ok.state.resizes[0][0]-ok.state.resizes[0][1])<1e-12);
for(const options of [{resizeError:true},{missingFont:true}]){const f=fixture(options);assert(f.run().startsWith('ERROR|'));assert.equal(f.state.removed,1);assert.equal(f.state.closed,1);assert.equal(f.app.userInteractionLevel,'display');assert.equal(f.app.activeDocument,f.target);}
const locked=fixture({locked:true});assert(locked.run().includes('unlocked'));assert.equal(locked.state.opened,0);
const absent=fixture({missingFile:true});assert(absent.run().startsWith('ERROR|'));assert.equal(absent.state.opened,0);
const qr=fixture({noText:true,missingFont:true});assert(qr.run().startsWith('OK|'));
const importedCaption=fixture({captionName:'0123456789012'});
assert(importedCaption.run().startsWith('OK|Native vector'));
assert.equal(importedCaption.state.group.pageItems[0].pageItems[1].name,'0123456789012');
function runHost(app,globals){
 const context={app,File:function(){this.name='barcode.svg';this.exists=true;},...globals};
 vm.createContext(context);vm.runInContext(source,context);
 return context.CodeStudio.place('C:/test/barcode.svg',40,20,'Test barcode');
}
function testInDesign(failAt){
 const state={removed:0,embedded:0,bounds:null};
 const layer={locked:failAt==='locked',visible:true};
 const frame={remove(){state.removed++;},fit(){},place(){
  if(failAt==='place')return [];
  return [{itemLink:{isValid:true,unlink(){if(failAt==='embed')throw Error('embed failed');state.embedded++;}}}];
 }};
 const page={bounds:[10,20,610,420],rectangles:{add(target,at,reference,props){assert.equal(target,layer);state.bounds=props.geometricBounds;return frame;}}};
 const doc={activeLayer:layer,layoutWindows:failAt==='headless'?[]:[{activePage:page}],pages:[page]};
 const prefs={measurementUnit:'mm',userInteractionLevel:'all'};
 const result=runHost({name:'Adobe InDesign',documents:[doc],activeDocument:doc,scriptPreferences:prefs},{MeasurementUnits:{POINTS:'pt'},UserInteractionLevels:{NEVER_INTERACT:'never'},FitOptions:{PROPORTIONALLY:1,CENTER_CONTENT:2}});
 assert.deepEqual(prefs,{measurementUnit:'mm',userInteractionLevel:'all'});
 if(!failAt||failAt==='headless'){
  assert(result.startsWith('OK|'));assert.equal(state.embedded,1);
  assert(Math.abs(state.bounds[3]-state.bounds[1]-40*72/25.4)<1e-8);
 }else{assert(result.startsWith('ERROR|InDesign:'));assert.equal(state.removed,failAt==='locked'?0:1);}
}
function testPhotoshop(failAt){
 const previous={},oldLayer={kind:'normal'},doc={activeHistoryState:previous,activeLayer:oldLayer,resolution:300};
 const pixel=value=>({as:unit=>{assert.equal(unit,'px');return value;}});
 let scale;
 const layer={kind:failAt==='kind'?'normal':'smart',bounds:[pixel(0),pixel(0),pixel(failAt==='bounds'?0:100),pixel(48)],resize(x,y){assert.equal(x,y);if(failAt==='size')throw Error('size failed');scale=x;}};
 const result=runHost({name:'Adobe Photoshop',documents:[doc],activeDocument:doc},{
  ActionDescriptor:function(){this.putPath=()=>{};this.putEnumerated=()=>{};},charIDToTypeID:x=>x,DialogModes:{NO:0},LayerKind:{SMARTOBJECT:'smart'},AnchorPosition:{MIDDLECENTER:1},
  stringIDToTypeID:x=>x,ActionReference:function(){this.putProperty=()=>{};this.putEnumerated=()=>{};},
  executeActionGet(){if(failAt)throw Error('Transform unavailable');return {getObjectValue:()=>({getList:()=>({getDouble:i=>[20,30,160,30][i]})})};},
  executeAction(){doc.activeHistoryState={};doc.activeLayer=layer;}
 });
 if(!failAt){assert(result.startsWith('OK|'));assert.equal(layer.name,'Test barcode');assert(Math.abs(scale-40*300/25.4/140*100)<1e-8);}
 else{assert(result.startsWith('ERROR|Photoshop:'));assert.equal(doc.activeHistoryState,previous);assert.equal(doc.activeLayer,oldLayer);}
}
for(const step of [null,'headless','locked','place','embed'])testInDesign(step);
for(const step of [null,'kind','bounds','size'])testPhotoshop(step);
function testNativeIllustrator(failure){
 const paths=[],texts=[],compound=[],groups=[];
 let removed=0;
 function addPath(){const p={setEntirePath(points){p.anchors=points;p.pathPoints=points.map(()=>({}));}};paths.push(p);return p;}
 const doc={artboards:[{artboardRect:[0,300,400,0]}],documentColorSpace:'CMYK',activeLayer:{visible:true,groupItems:{add(){
  const group={pathItems:{add(){const p=addPath();p.group=group;return p;}},compoundPathItems:{add(){compound.push(true);return {pathItems:group.pathItems};}},textFrames:{pointText(anchor){if(failure==='text')throw Error('Text creation failed');const text={anchor,group,textRange:{characterAttributes:{}}};texts.push(text);return text;}},remove(){removed++;}};
  groups.push(group);return group;
 }}}};
 doc.artboards.getActiveArtboardIndex=()=>0;
 Object.defineProperty(doc,'selection',{set(){throw Error('1346458189 (PARM)');}});
 const ember={name:'AmazonEmber-Regular'};
 const app={documents:[doc],activeDocument:doc,coordinateSystem:'artboard',textFonts:{getByName:()=>ember},open(){throw Error('A donor document must not be opened');}};
 const payload='BSV1\t100\t50\nP\t#FFFFFF\t0\tM5 0L95 0C97.761 0 100 2.239 100 5L100 45C100 47.761 97.761 50 95 50L5 50C2.239 50 0 47.761 0 45L0 5C0 2.239 2.239 0 5 0Z\nP\t#000000\t1\t'+(failure==='path'?'M3Z':'M10 10L45 10L45 35L10 35ZM20 20L20 25L25 25L25 20Z')+'\nT\t#000000\t10\t45\t'+encodeURIComponent('5 & 600');
 const context={app,File:function(){this.name='test.bsv';this.exists=true;this.open=()=>true;this.read=()=>payload;this.close=()=>{};},CoordinateSystem:{DOCUMENTCOORDINATESYSTEM:'document'},DocumentColorSpace:{CMYK:'CMYK'},CMYKColor:function(){},RGBColor:function(){}};
 vm.createContext(context);vm.runInContext(source,context);
 const result=context.CodeStudio.placeIllustratorArtwork('test.bsv',40,20,'Sample','5600495642348');
 assert.equal(app.coordinateSystem,'artboard');
 if(failure==='path'){assert(result.startsWith('ERROR|Illustrator: draw barcode paths'));assert.equal(removed,1);return;}
 if(failure==='text'){assert(result.startsWith('ERROR|Illustrator: create editable caption'));assert.equal(removed,2);return;}
 assert(result.startsWith('OK|'),result);
 assert.equal(removed,0);assert.equal(compound.length,1);assert.equal(paths.length,3);
 assert.equal(paths[0].fillColor.black,0);assert.equal(paths[1].fillColor.black,100);
 assert.equal(paths[1].evenodd,true);assert(paths.every(p=>p.closed&&!p.stroked&&p.filled));
 assert(Math.abs(paths[0].anchors[2][0]-paths[0].anchors[6][0]-40*72/25.4)<1e-8);
 assert.equal(paths[0].anchors.length,8);assert(paths[0].pathPoints[0].leftDirection);assert(paths[0].pathPoints[1].rightDirection);
 assert.equal(texts[0].contents,'5 & 600');assert.equal(texts[0].textRange.characterAttributes.size,14);
 assert.equal(texts[0].textRange.characterAttributes.textFont,ember);
 assert.deepEqual(groups.map(g=>g.name),['Sample | Bars','5600495642348']);
 assert(paths.every(p=>p.group===groups[0]));assert(texts.every(t=>t.group===groups[1]));
}
testNativeIllustrator();testNativeIllustrator('path');testNativeIllustrator('text');
const result={date:new Date().toISOString(),illustrator:'Direct filled paths, even-odd contours, CMYK black, editable Amazon Ember text, barcode-value caption names, PARM selection tolerance and rollback passed',indesign:'Active/first page, frame dimensions, embedding and preference restoration passed',photoshop:'Smart Object check, uniform resizing and history rollback passed',scope:'The bridge runs against models of the three Adobe DOMs. These checks do not launch the desktop applications.'};fs.writeFileSync(path.join(__dirname,'HOST-TEST-RESULTS.json'),JSON.stringify(result,null,2));console.log('HOST BRIDGE PASS');
