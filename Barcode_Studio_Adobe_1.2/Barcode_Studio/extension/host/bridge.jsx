/* ExtendScript, compatible with the CEP hosts. No external data is evaluated. */
var CodeStudio = CodeStudio || {};
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
        item.textRange.characterAttributes.size = 10.5;
    } else if (item.typename === 'GroupItem') {
        for (var i = 0; i < item.pageItems.length; i++) {
            CodeStudio.fixIllustratorText(item.pageItems[i], fontState);
        }
    }
};
CodeStudio.insertIllustrator = function(file, width, height, label, doc) {
    var layer = doc.activeLayer;
    if (layer.locked || !layer.visible) throw new Error('Select a visible, unlocked layer before inserting.');
    var board = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var interaction = app.userInteractionLevel, donor = null, group = null, done = false;
    try {
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        // Illustrator's placedItems.file does not accept SVG. Open the SVG as
        // a temporary document, duplicate its native artwork, then close only
        // that temporary document. The user's clipboard is never touched.
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
        doc.activate();
        group = layer.groupItems.add();
        group.name = label;
        for (var n = items.length - 1; n >= 0; n--) items[n].duplicate(group, ElementPlacement.PLACEATBEGINNING);
        var percent = width / sourceWidth * 100;
        if (Math.abs(width / sourceWidth - height / sourceHeight) > 0.005) throw new Error('SVG proportions do not match the requested size.');
        if (Math.abs(percent - 100) > 0.001) group.resize(percent, percent);
        CodeStudio.fixIllustratorText(group, {font:null});
        group.position = [board[0] + (board[2] - board[0] - width) / 2, board[1] - (board[1] - board[3] - height) / 2];
        doc.selection = null;
        group.selected = true;
        done = true;
        return 'OK|Native vector barcode inserted in Illustrator. Bars are expanded; text uses Amazon Ember Regular at 14 px.';
    } finally {
        if (!done && group) {try {group.remove();} catch(ignoreGroup) {}}
        if (donor && donor !== doc) {try {donor.close(SaveOptions.DONOTSAVECHANGES);} catch(ignoreClose) {}}
        try {doc.activate();} catch(ignoreActivate) {}
        app.userInteractionLevel = interaction;
    }
};
CodeStudio.info = function () {return app.name + ' ' + app.version;};
CodeStudio.chooseSave = function(name) {try {var f=new File(Folder.desktop.fsName+'/'+name).saveDlg('Export Barcode Studio');return f?encodeURIComponent(f.fsName):'CANCEL';}catch(e){return 'ERROR|'+e.message;}};
CodeStudio.chooseInput = function(kind) {
    try {
        var filter = kind === 'database' ? 'Database files:*.xlsx;*.csv;*.tsv;*.txt;*.json,All files:*.*' : 'Barcode images:*.png;*.jpg;*.jpeg,All files:*.*';
        var selected = File.openDialog(kind === 'database' ? 'Import product database' : 'Read barcode image', filter, false);
        return selected ? encodeURIComponent(selected.fsName) : 'CANCEL';
    } catch(e) {return 'ERROR|'+e.message;}
};
CodeStudio.place = function(path, widthMm, heightMm, label) {
    try {
        if (!app.documents.length) throw new Error('Open a document before inserting a barcode.');
        var f = new File(path);
        if (!f.exists || !/\.svg$/i.test(f.name)) throw new Error('The SVG file is unavailable.');
        var w = widthMm * 72 / 25.4, h = heightMm * 72 / 25.4;
        var name = app.name.toLowerCase(), doc = app.activeDocument;
        if (name.indexOf('illustrator') >= 0) {
            return CodeStudio.insertIllustrator(f, w, h, label, doc);
        }
        if (name.indexOf('indesign') >= 0) {
            var unit = app.scriptPreferences.measurementUnit;
            try {
                app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
                var page = app.activeWindow.activePage, b = page.bounds;
                var top = b[0]+(b[2]-b[0]-h)/2, left = b[1]+(b[3]-b[1]-w)/2;
                var frame = page.rectangles.add({geometricBounds:[top,left,top+h,left+w],strokeWeight:0});
                try {
                    frame.label = label;
                    var placed = frame.place(f)[0];
                    frame.fit(FitOptions.PROPORTIONALLY);
                    frame.fit(FitOptions.CENTER_CONTENT);
                    if (placed.itemLink) placed.itemLink.unlink();
                }catch(e){frame.remove();throw e;}
            } finally {app.scriptPreferences.measurementUnit = unit;}
            return 'OK|SVG embedded on the active InDesign page. Check the black colour separation.';
        }
        if (name.indexOf('photoshop') >= 0) {
            var desc = new ActionDescriptor();
            desc.putPath(charIDToTypeID('null'),f);
            desc.putEnumerated(charIDToTypeID('FTcs'),charIDToTypeID('QCSt'),charIDToTypeID('Qcsa'));
            executeAction(charIDToTypeID('Plc '),desc,DialogModes.NO);
            var layer = doc.activeLayer, bounds = layer.bounds;
            var actualW = bounds[2].as('px')-bounds[0].as('px');
            var actualH = bounds[3].as('px')-bounds[1].as('px');
            layer.resize((widthMm/25.4*doc.resolution)/actualW*100,(heightMm/25.4*doc.resolution)/actualH*100,AnchorPosition.MIDDLECENTER);
            layer.name = label;
            return 'OK|Barcode inserted as a Photoshop Smart Object.';
        }
        throw new Error('Unsupported application: '+app.name);
    } catch(e) {return 'ERROR|'+e.message;}
};
