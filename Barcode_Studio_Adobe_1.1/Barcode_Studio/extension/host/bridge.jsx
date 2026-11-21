/* ExtendScript, compatible with the CEP hosts. No external data is evaluated. */
var CodeStudio = CodeStudio || {};
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
            var item = doc.placedItems.add();
            try {
                item.file = f; item.width = w; item.height = h;
                var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
                item.position = [ab[0]+(ab[2]-ab[0]-w)/2,ab[1]-(ab[1]-ab[3]-h)/2];
                item.name = label;
                item.embed();
            } catch (placementError) {try {item.remove();}catch(ignore){} throw placementError;}
            return 'OK|Vector barcode embedded in Illustrator. Check the black colour separation.';
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
