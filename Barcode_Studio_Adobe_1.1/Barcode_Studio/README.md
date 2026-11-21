# Barcode Studio 1.1

Local Windows CEP panel for barcode and QR generation in Adobe Illustrator, Photoshop and InDesign. Interface, errors and installation messages are in English.

## Install or update

1. Extract the complete ZIP. Do not run files from inside the ZIP viewer.
2. Close Illustrator, Photoshop and InDesign.
3. Run **Install.cmd**. Administrator rights are not needed.
4. Open an Adobe app and a document.
5. Open **Window > Extensions > Barcode Studio**. In Photoshop, use **Window > Extensions (Legacy)**.

The previous name was Código Studio. This update keeps its extension ID and existing product database, so do not install it in a second extension folder. Install.cmd updates the original panel in place. The Portuguese-named installer files remain as compatibility aliases.

If you still see the old name and version, close all three Adobe apps and run this package's Install.cmd again. Confirm that the panel header shows **Barcode Studio 1.1.0**. Open Help > Diagnostics if startup reports an error.

The installer copies the extension to `%APPDATA%\Adobe\CEP\extensions\pt.andre.codigo`. It installs Amazon Ember Regular for the current Windows user and preserves an existing font installation. Restart the Windows session if Adobe does not recognise a newly installed font.

This is an unsigned local extension. Installation enables PlayerDebugMode for CSXS.11 and CSXS.12 in the current Windows user. This also allows other unsigned CEP extensions in that user profile. Previous values are recorded. To remove the panel and restore those CEP settings, close Adobe apps and run `Desinstalar.ps1 -RestoreCEP` in PowerShell. The font, product database and generated assets are preserved on uninstall.

Configured host ranges: Illustrator 29–31, Photoshop 26–28, InDesign 20–22 (2025–2027). Versions that disable or remove CEP cannot load this panel. Photoshop may require **Preferences > Plugins > Allow Extensions to Load** and an app restart.

## What changed in 1.1

- Fixed the CEP/CommonJS startup failure that left the format list empty and prevented event handlers from loading.
- Populates and connects the UI before initialising optional native storage.
- Added visible startup errors and Help > Diagnostics.
- Uses a native Adobe file dialog for database/image imports when native storage is available.
- Supports Node filesystem access and an independent CEP filesystem fallback.
- English interface and messages.
- Added live preview, format-specific input hints and QR error correction controls.
- Retains Amazon Ember Regular at 14 px and expanded vector bars.

The workflow reference was Next Barcode Suite: choose a format, type data, inspect a preview and insert directly. This is independently implemented software and does not contain Next Barcode Suite code or assets. It supports the 111 encoders listed in FORMATS.csv, not the reference product's advertised format count.

## Generate from numbers or text

1. Choose a barcode format. The dropdown is keyboard accessible and the search filters it.
2. Enter data in **Data / text**.
3. Review the live preview. Click **Generate & verify** for the reading test.
4. Click **Insert into document**, **Export SVG** or **Export PNG**.

Use **EAN-13** for 13 digits including a valid check digit. EAN/UPC cannot encode arbitrary text. Use **Code 128** for product references, letters, digits and ordinary text. Use **QR Code** for a URL, longer text or Unicode. **Load sample** shows the encoder's example for a specialised format.

**Calculate check digit** completes a value that is exactly one digit short for EAN-8/13/14, UPC-A, ITF-14 and SSCC-18. It does not silently replace the check digit in an invalid complete value. Confirm that every code belongs to the correct product.

Changing input invalidates the previous result. A live preview is encoder-validated; the reading test runs before insertion or export when it has not yet been run. A confirmed mismatch between encoded and decoded data blocks output.

## Font, vectors and output

- Interface text: Amazon Ember Regular, 14 px.
- Human-readable barcode text: Amazon Ember Regular, 14 physical CSS pixels, equivalent to 10.5 pt at 96 ppi.
- The font is included in the installer and embedded in exported SVG previews.
- SVG text remains text. Bars and strokes are expanded to filled vector paths. Output is blocked if an active stroke remains.
- Illustrator: embedded vector SVG. InDesign: embedded SVG on the active page. Photoshop: embedded Smart Object containing the SVG, not native editable Photoshop shape layers.
- Resizing a whole barcode in a document also resizes its text.
- PNG dimensions and resolution metadata are generated at 600 ppi.
- Default output is RGB black on white. For CMYK packaging, check conversion to 100% K and the final print resolution.

## Product database

Import **XLSX**, **UTF-8 CSV**, **TSV** or **JSON** in Database > Import file. Choose the worksheet where applicable, map the columns, then save the database.

Supported mappings: Reference/SKU, Description, Barcode/EAN, QR data/URL and an optional encoder format ID such as `ean13`, `code128` or `qrcode`. Portuguese and English header names are recognised. Search products, then choose **Barcode** or **QR** for a record. QR data uses its own mapped column.

Store codes as text to preserve leading zeros. The XLSX reader preserves text cells and simple all-zero numeric formats. It reads cached formula values but never evaluates formulas or runs macros. Old XLS and password-protected files are not supported. Numeric codes with possible Excel precision loss and scientific notation are blocked. Limits: 25 MB per file, 100,000 products, 100 MB of uncompressed Excel content.

Import replaces the current database. Use **Export JSON backup** for a re-importable backup. The shared local file is `%APPDATA%\CodigoStudio\database.json`, the same location used by version 1.0. Use **Reload** after importing in another Adobe app. The last save wins if multiple panels import simultaneously. There is no direct Eticadata/SQL connection or live link to the imported source file.

The two rows in example_products.csv are demonstration data, not assignments of new GS1 codes to products.

## Verification

- Encoder syntax and format rules are checked.
- Explicit check digit validation for EAN-8/13/14, UPC-A, ITF-14 and SSCC-18. Code 93 always includes its C/K checksums.
- Independent image reading for standard QR, EAN-8/13, UPC-A/E, Code 128/39/93, ITF and Codabar.
- Other encoders, including Data Matrix, Aztec, PDF417 and specialised GS1 formats, have encoder validation without an independent decoder in this build.
- Verify reads one barcode from a cropped upright PNG/JPEG. Failure to read does not prove invalidity.
- Database audit reports recognised invalid GTINs, duplicates and missing codes. It does not fully validate every format in every row or prove product ownership.

Digital validation does not certify ISO/GS1 print quality, colour separations, final dimensions, symbol ownership, or the availability of a QR URL. Confirm the final printed output using suitable verification equipment.

## Testing scope

TEST-RESULTS.json records generation of all 111 bundled examples, independent reading of the main supported types, XLSX/CSV parsing, leading zeros, PNG metadata, fonts and vector expansion.

CEP-TEST-RESULTS.json records regression tests with Adobe's CommonJS/AMD globals and simulated host APIs, using both Node and CEP filesystem paths. These cover selecting a format, manual text, native-dialog CSV import, database selection, host insertion calls, SVG export, live preview and startup error display. They are not tests of final artwork placement inside running Adobe desktop applications.

## Development and licences

The source is in extension. No runtime CDN, paid service, telemetry or subscription is used. All data stays on the computer.

`npm install` and `npm test` run the development checks with Playwright. Tests use Chrome at its standard Windows path or CHROME_PATH, otherwise the Playwright Chromium installation (`npx playwright install chromium`). `npm run build` regenerates font data and the format list. The installed panel does not need an external Node/npm installation.

Included libraries: bwip-js 4.11.4/BWIPP (MIT), jsQR (Apache-2.0), QuaggaJS (MIT), JSZip (MIT selection), and a ZXing-derived Code 93 reader (Apache-2.0). Licences are in extension/vendor. Original font metadata and usage guidelines are in extension/fonts.

References:

- Adobe CEP: https://github.com/Adobe-CEP/CEP-Resources
- bwip-js: https://github.com/metafloor/bwip-js
- Workflow reference: https://exchange.adobe.com/apps/cc/124c5c64/next-barcode-suite
- Amazon typography/font source: https://developer.amazon.com/en-US/alexa/branding/echo-guidelines/identity-guidelines/typography
- Source font mirror: https://github.com/iBug/Amazon-Fonts
