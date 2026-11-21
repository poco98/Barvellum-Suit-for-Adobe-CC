BARVELLUM SUIT FOR WINDOWS

How to Install:

1. Extract the entire ZIP file to a folder.
2. Close Illustrator, Photoshop and InDesign.
3. Run Install.cmd.
4. Reopen the Adobe app and choose Window > Extensions > Barvellum Suit for Adobe CC.
   In Photoshop, choose Window > Extensions (Legacy) > Barvellum Suit for Adobe CC.

How to use:

Create a barcode
1. In Barcode, select a format and type a code, or search for a product reference.
2. Set the X dimension and bar height, then choose Generate & analyze.
3. Review the result. Choose Insert barcode, Export SVG or PNG (600 ppi).

EAN-13 requires 13 digits, including the check digit. If the check digit is invalid,
the panel generates Code 128 and keeps all 13 original digits. The Use EAN-13 button
applies the corrected number to the current preview. Confirm it belongs to the product.

Create a QR code
1. In QR link, paste the complete URL and choose the size and error correction.
2. Choose Analyze QR & link. Review QR reading and link availability separately.
3. Choose Insert QR or export as SVG or PNG.

Read an existing code
1. In Analyze, choose a sharp PNG or JPEG that shows a single code.
2. Review the decoded value. Enter Expected data to compare it with your reference.

Set up the product database
1. In Database, choose Save XLSX template... and select a folder on your PC.
2. Open the workbook and enter one product per row under Reference and Barcode.
   Both columns are formatted as text. Keep that format to preserve leading zeros.
3. Save the workbook. In Database, choose Import XLSX / CSV / JSON..., select the
   file and confirm the Reference and Barcode columns.
4. Choose Save database, then search by reference or barcode in Barcode.

Saving an import replaces the current product table. Use Export backup to save a
copy first. An installation update retains the local product database.

In Illustrator, select a visible, unlocked layer before inserting. The barcode
text remains editable. In Layers, its group is named after the code value.
Check the dimensions and readability of the final printed artwork.

How to Uninstall:

Close the Adobe apps. Run Uninstall.cmd.

Credits and documentation:

Developed by André Filipe.
See README.md for compatibility, Resources/README.md for technical details,
and CHANGELOG.md for the release history.
Resources/FORMATS.csv lists the supported barcode formats.
Libraries: bwip-js/BWIPP, jsQR, QuaggaJS, ZXing-derived Code 93 reader and JSZip.
Third-party licences are included in Resources/extension/vendor.
