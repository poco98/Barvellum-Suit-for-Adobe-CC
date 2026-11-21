/* ExtendScript, compatible with the CEP hosts. No external data is evaluated. */
var CodeStudio = CodeStudio || {};
CodeStudio.lastStep = '';
CodeStudio.captionSizePt = 14;
CodeStudio.step = function(name) {CodeStudio.lastStep = name;};
CodeStudio.amazonEmber = function() {
    var names = ['AmazonEmber-Regular', 'AmazonEmber', 'AmazonEmber_Rg'];
    for (var i = 0; i < names.length; i++) {try {return app.textFonts.getByName(names[i]);} catch(ignore) {}}
    for (var n = 0; n < app.textFonts.length; n++) {
        var font = app.textFonts[n];
        if (font.family === 'Amazon Ember' && /regular|normal|roman/i.test(font.style)) return font;
    }
    throw new Error('Amazon Ember Regular is not available in Illustrator. Close Adobe apps, run Install.cmd and reopen Illustrator.');
};
CodeStudio.fixIllustratorText = function(item, fontState) {
    if (item.typename === 'TextFrame' || item.typename === 'TextFrameItem') {
        if (!fontState.font) fontState.font = CodeStudio.amazonEmber();
        item.textRange.characterAttributes.textFont = fontState.font;
        item.textRange.characterAttributes.size = CodeStudio.captionSizePt;
        return true;
    } else if (item.typename === 'GroupItem') {
        var textOnly = item.pageItems.length > 0;
        for (var i = 0; i < item.pageItems.length; i++) {
            if (!CodeStudio.fixIllustratorText(item.pageItems[i], fontState)) textOnly = false;
        }
        if (fontState.captionName && (textOnly || item.name === 'barcode-text')) item.name = fontState.captionName;
        return textOnly;
    }
    return false;
};
// Decode only the closed, absolute paths emitted by Barvellum Suit's encoder.
CodeStudio.barcodeContours = function(data) {
    var commands = data.match(/[MLCQZ][^MLCQZ]*/g);
    if (!commands || commands.join('') !== data) throw new Error('Invalid generated vector path.');
    var contours = [], points = null;
    var sizes = {M:2,L:2,C:6,Q:4,Z:0};
    for (var i=0; i<commands.length; i++) {
        var kind=commands[i].charAt(0), tail=commands[i].substring(1).replace(/^\s+|\s+$/g,'');
        var values=tail ? tail.split(/[\s,]+/) : [];
        if (values.length!==sizes[kind]) throw new Error('Invalid generated vector coordinates.');
        for (var v=0; v<values.length; v++) {
            values[v]=Number(values[v]);
            if (!isFinite(values[v])) throw new Error('Invalid generated vector coordinate.');
        }
        if (kind==='M') {
            if (points) throw new Error('The generated outline is open.');
            points=[{anchor:values}];
            continue;
        }
        if (!points) throw new Error('The generated outline has no start point.');
        if (kind==='Z') {
            if (points.length<2) throw new Error('The generated outline is empty.');
            var first=points[0], last=points[points.length-1];
            if (last.anchor[0]===first.anchor[0] && last.anchor[1]===first.anchor[1]) {
                first.left=last.left;
                points.pop();
            }
            contours.push(points);
            points=null;
            continue;
        }
        var end=values.slice(-2), previous=points[points.length-1], next={anchor:end};
        if (kind==='C') {
            previous.right=values.slice(0,2);
            next.left=values.slice(2,4);
        } else if (kind==='Q') {
            var control=values.slice(0,2), a=previous.anchor;
            previous.right=[a[0]+2*(control[0]-a[0])/3,a[1]+2*(control[1]-a[1])/3];
            next.left=[end[0]+2*(control[0]-end[0])/3,end[1]+2*(control[1]-end[1])/3];
        }
        points.push(next);
    }
    if (points) throw new Error('The generated outline is open.');
    return contours;
};
CodeStudio.barcodeColor = function(hex, doc) {
    if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Invalid generated vector colour.');
    if (doc.documentColorSpace===DocumentColorSpace.CMYK && /^#(000000|ffffff)$/i.test(hex)) {
        var ink = new CMYKColor();
        ink.cyan=0;ink.magenta=0;ink.yellow=0;ink.black=hex.toLowerCase()==='#000000'?100:0;
        return ink;
    }
    var rgb = new RGBColor();
    rgb.red=parseInt(hex.substr(1,2),16);rgb.green=parseInt(hex.substr(3,2),16);rgb.blue=parseInt(hex.substr(5,2),16);
    return rgb;
};
CodeStudio.placeIllustratorArtwork = function(path, widthMm, heightMm, label, captionName) {
    var group=null, textGroup=null, oldCoordinates, changedCoordinates=false;
    try {
        CodeStudio.step('Illustrator: read barcode vectors');
        if (!app.documents.length) throw new Error('Open an Illustrator document first.');
        var doc=app.activeDocument, layer=doc.activeLayer;
        if (layer.locked || !layer.visible) throw new Error('Select a visible, unlocked layer before inserting.');
        var file=new File(path);
        if (!/\.bsv$/i.test(file.name)||!file.exists||!file.open('r')) throw new Error('The generated artwork file is unavailable.');
        var rows;
        try {rows=file.read().split(/\r?\n/);} finally {file.close();}
        var header=rows.shift().replace(/^\uFEFF/,'').split('\t'), sw=Number(header[1]), sh=Number(header[2]);
        var width=Number(widthMm)*72/25.4, height=Number(heightMm)*72/25.4;
        if (header[0]!=='BSV1'||!isFinite(sw)||!isFinite(sh)||!isFinite(width)||!isFinite(height)||!(sw>0&&sh>0&&width>0&&height>0)||!rows.length) {
            throw new Error('Invalid generated artwork dimensions.');
        }
        oldCoordinates=app.coordinateSystem;
        app.coordinateSystem=CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        changedCoordinates=true;
        var board=doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        var left=(board[0]+board[2]-width)/2, top=(board[1]+board[3]+height)/2;
        function position(point){return [left+point[0]*width/sw,top-point[1]*height/sh];}
        CodeStudio.step('Illustrator: create barcode group');
        group=layer.groupItems.add();
        group.name=label;
        var font=null;
        for (var i=0; i<rows.length; i++) {
            var row=rows[i].split('\t');
            var color=CodeStudio.barcodeColor(row[1],doc);
            if (row[0]==='T' && row.length===5) {
                CodeStudio.step('Illustrator: create editable caption');
                var textX=Number(row[2]), textY=Number(row[3]);
                if (!isFinite(textX)||!isFinite(textY)) throw new Error('Invalid caption coordinates.');
                if (!font) font=CodeStudio.amazonEmber();
                if (!textGroup) {
                    textGroup=layer.groupItems.add();
                    group.name=label+' | Bars';
                    textGroup.name=captionName || (label+' | Text');
                }
                var text=textGroup.textFrames.pointText(position([textX,textY]));
                text.contents=decodeURIComponent(row[4]);
                var type=text.textRange.characterAttributes;
                type.textFont=font;type.size=CodeStudio.captionSizePt;type.fillColor=color;
                continue;
            }
            CodeStudio.step('Illustrator: draw barcode paths');
            if (row[0]!=='P'||row.length!==4) throw new Error('Invalid generated artwork record.');
            var contours=CodeStudio.barcodeContours(row[3]);
            var parent=contours.length>1?group.compoundPathItems.add():group;
            for (var c=0; c<contours.length; c++) {
                var points=contours[c], anchors=[];
                for (var j=0; j<points.length; j++) anchors.push(position(points[j].anchor));
                var item=parent.pathItems.add();
                item.setEntirePath(anchors);
                for (var p=0; p<points.length; p++) {
                    if (points[p].left) item.pathPoints[p].leftDirection=position(points[p].left);
                    if (points[p].right) item.pathPoints[p].rightDirection=position(points[p].right);
                }
                item.closed=true;item.stroked=false;item.filled=true;
                item.evenodd=row[2]==='1';item.fillColor=color;
            }
        }
        // Selection is cosmetic. A selection error must never discard the barcode.
        try {doc.selection=null;group.selected=true;if(textGroup)textGroup.selected=true;} catch(ignoreSelection) {}
        return 'OK|Barcode inserted as native Illustrator vectors.';
    } catch(error) {
        if (textGroup) {try {textGroup.remove();} catch(ignoreTextRollback) {}}
        if (group) {try {group.remove();} catch(ignoreRollback) {}}
        return 'ERROR|'+CodeStudio.lastStep+' - '+error.message;
    } finally {
        if (changedCoordinates) {try {app.coordinateSystem=oldCoordinates;} catch(ignoreCoordinates) {}}
    }
};
CodeStudio.insertIllustrator = function(file, width, height, label, doc, captionName) {
    CodeStudio.step('Illustrator: target layer');
    var layer = doc.activeLayer;
    if (layer.locked || !layer.visible) throw new Error('Select a visible, unlocked layer before inserting.');
    var board = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var interaction = app.userInteractionLevel, donor = null, group = null, done = false;
    try {
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        // Illustrator's placedItems.file does not accept SVG. Open the SVG as
        // a temporary document, duplicate its native artwork, then close only
        // that temporary document. The user's clipboard is never touched.
        CodeStudio.step('Illustrator: open SVG');
        donor = app.open(file);
        if (!donor || donor === doc) throw new Error('Illustrator did not open the temporary SVG document.');
        var sourceBoard = donor.artboards[0].artboardRect;
        var sourceWidth = sourceBoard[2] - sourceBoard[0];
        var sourceHeight = sourceBoard[1] - sourceBoard[3];
        if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error('The imported SVG has invalid dimensions.');
        var items = [];
        for (var i = 0; i < donor.pageItems.length; i++) {
            var art = donor.pageItems[i];
            if (art.parent.typename === 'Layer' || art.parent.typename === 'Document') items.push(art);
        }
        if (!items.length) throw new Error('The imported SVG contains no artwork.');
        CodeStudio.step('Illustrator: duplicate vectors');
        doc.activate();
        group = layer.groupItems.add();
        group.name = label;
        for (var n = items.length - 1; n >= 0; n--) items[n].duplicate(group, ElementPlacement.PLACEATBEGINNING);
        CodeStudio.step('Illustrator: size and position');
        // The artboard includes the quiet margins even when they are transparent.
        var percent = width / sourceWidth * 100;
        if (Math.abs(percent - 100) > 0.001) group.resize(percent, percent);
        CodeStudio.step('Illustrator: apply font');
        CodeStudio.fixIllustratorText(group, {font:null,captionName:captionName});
        group.position = [board[0] + (board[2] - board[0] - group.width) / 2, board[1] - (board[1] - board[3] - group.height) / 2];
        try {doc.selection = null;group.selected = true;} catch(ignoreSelection) {}
        done = true;
        return 'OK|Native vector barcode inserted in Illustrator. Bars are expanded; text uses Amazon Ember Regular at 14 pt.';
    } finally {
        if (!done && group) {try {group.remove();} catch(ignoreGroup) {}}
        if (donor && donor !== doc) {try {donor.close(SaveOptions.DONOTSAVECHANGES);} catch(ignoreClose) {}}
        try {doc.activate();} catch(ignoreActivate) {}
        app.userInteractionLevel = interaction;
    }
};
CodeStudio.insertInDesign = function(file, width, height, label, doc) {
    CodeStudio.step('InDesign: target layer and page');
    var layer = doc.activeLayer;
    if (layer.locked || !layer.visible) throw new Error('Select a visible, unlocked layer before inserting.');
    var page = doc.layoutWindows.length ? doc.layoutWindows[0].activePage : doc.pages[0];
    if (!page || page.isValid === false) throw new Error('Open a layout page before inserting.');
    var prefs = app.scriptPreferences;
    var unit = prefs.measurementUnit, interaction = prefs.userInteractionLevel, frame = null;
    try {
        prefs.measurementUnit = MeasurementUnits.POINTS;
        prefs.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
        var bounds = page.bounds;
        var top = (bounds[0] + bounds[2] - height) / 2;
        var left = (bounds[1] + bounds[3] - width) / 2;
        CodeStudio.step('InDesign: place SVG');
        frame = page.rectangles.add(layer, undefined, undefined, {geometricBounds:[top,left,top+height,left+width],strokeWeight:0});
        frame.label = label;
        var placed = frame.place(file, false);
        if (!placed || !placed.length || placed[0].isValid === false) throw new Error('InDesign did not return a placed graphic.');
        CodeStudio.step('InDesign: fit and embed');
        frame.fit(FitOptions.PROPORTIONALLY);
        frame.fit(FitOptions.CENTER_CONTENT);
        var link = placed[0].itemLink;
        if (!link || link.isValid === false) throw new Error('InDesign did not return a valid artwork link.');
        link.unlink();
        return 'OK|SVG embedded in InDesign.';
    } catch(error) {
        if (frame) {try {frame.remove();} catch(ignore) {}}
        throw error;
    } finally {
        try {prefs.measurementUnit = unit;} finally {prefs.userInteractionLevel = interaction;}
    }
};
CodeStudio.photoshopPlacedWidth = function(layer) {
    try {
        var id = stringIDToTypeID, property = id('smartObjectMore');
        var reference = new ActionReference();
        reference.putProperty(id('property'),property);
        reference.putEnumerated(id('layer'),id('ordinal'),id('targetEnum'));
        var transform = executeActionGet(reference).getObjectValue(property).getList(id('transform'));
        var x = transform.getDouble(2) - transform.getDouble(0);
        var y = transform.getDouble(3) - transform.getDouble(1);
        var width = Math.sqrt(x*x+y*y);
        if (width > 0 && isFinite(width)) return width;
    } catch (unavailable) {}
    var bounds = layer.bounds;
    return bounds[2].as('px') - bounds[0].as('px');
};
CodeStudio.insertPhotoshop = function(file, width, label, doc) {
    var previous = doc.activeHistoryState, previousLayer = doc.activeLayer;
    CodeStudio.step('Photoshop: place SVG');
    try {
        var desc = new ActionDescriptor();
        desc.putPath(charIDToTypeID('null'),file);
        desc.putEnumerated(charIDToTypeID('FTcs'),charIDToTypeID('QCSt'),charIDToTypeID('Qcsa'));
        executeAction(charIDToTypeID('Plc '),desc,DialogModes.NO);
        var layer = doc.activeLayer;
        if (!layer || layer.kind !== LayerKind.SMARTOBJECT) throw new Error('Photoshop did not return a Smart Object.');
        CodeStudio.step('Photoshop: size Smart Object');
        var actualWidth = CodeStudio.photoshopPlacedWidth(layer);
        var percent = width * doc.resolution / 72 / actualWidth * 100;
        if (!(isFinite(percent) && percent > 0)) throw new Error('Photoshop returned invalid Smart Object bounds.');
        if (Math.abs(percent - 100) > 0.001) layer.resize(percent,percent,AnchorPosition.MIDDLECENTER);
        layer.name = label;
        return 'OK|Barcode inserted as a Photoshop Smart Object.';
    } catch(error) {
        try {doc.activeHistoryState = previous;} catch(rollbackError) {throw new Error(error.message+' Rollback failed: '+rollbackError.message);}
        try {doc.activeLayer = previousLayer;} catch(ignore) {}
        throw error;
    }
};
CodeStudio.info = function () {return app.name + ' ' + app.version;};
CodeStudio.chooseSave = function(name) {try {var f=new File(Folder.desktop.fsName+'/'+name).saveDlg('Export Barvellum Suit');return f?encodeURIComponent(f.fsName):'CANCEL';}catch(e){return 'ERROR|'+e.message;}};
CodeStudio.chooseInput = function(kind) {
    try {
        var filter = kind === 'database' ? 'Database files:*.xlsx;*.csv;*.tsv;*.txt;*.json,All files:*.*' : 'Barcode images:*.png;*.jpg;*.jpeg,All files:*.*';
        if (/mac/i.test($.os)) {
            var extensions = kind === 'database' ? /\.(xlsx|csv|tsv|txt|json)$/i : /\.(png|jpe?g)$/i;
            filter = function(item) {return item instanceof Folder || extensions.test(item.name);};
        }
        var selected = File.openDialog(kind === 'database' ? 'Import product database' : 'Read barcode image', filter, false);
        return selected ? encodeURIComponent(selected.fsName) : 'CANCEL';
    } catch(e) {return 'ERROR|'+e.message;}
};
CodeStudio.place = function(path, widthMm, heightMm, label, captionName) {
    try {
        CodeStudio.step('Check document and SVG');
        if (!app.documents.length) throw new Error('Open a document before inserting a barcode.');
        var f = new File(path);
        if (!f.exists || !/\.svg$/i.test(f.name)) throw new Error('The SVG file is unavailable.');
        var w = widthMm * 72 / 25.4, h = heightMm * 72 / 25.4;
        if (!(w > 0 && h > 0 && isFinite(w) && isFinite(h))) throw new Error('The artwork dimensions are invalid.');
        var name = app.name.toLowerCase(), doc = app.activeDocument;
        if (name.indexOf('illustrator') >= 0) {
            return CodeStudio.insertIllustrator(f, w, h, label, doc, captionName);
        }
        if (name.indexOf('indesign') >= 0) return CodeStudio.insertInDesign(f, w, h, label, doc);
        if (name.indexOf('photoshop') >= 0) return CodeStudio.insertPhotoshop(f, w, label, doc);
        throw new Error('Unsupported application: '+app.name);
    } catch(e) {return 'ERROR|'+CodeStudio.lastStep+' — '+e.message;}
};
