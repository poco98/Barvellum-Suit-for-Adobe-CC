# Barcode Studio 1.2

by André Filipe

English Windows CEP panel for barcodes, product reference search and QR links.

## Install or update

1. Extract the complete ZIP.
2. Close Illustrator, Photoshop and InDesign.
3. Run **Install.cmd** without administrator rights.
4. Open **Window > Extensions > Barcode Studio**. Photoshop uses **Extensions (Legacy)**.

Confirm that the header shows **1.2.0**. Installation updates the original extension ID `pt.andre.codigo` and keeps the existing database. Do not create a second extension folder manually. The Portuguese installer filenames remain as compatibility aliases.

The installer copies the panel to `%APPDATA%\Adobe\CEP\extensions\pt.andre.codigo` and installs Amazon Ember Regular for the current Windows user. An existing font installation is preserved. Restart the Windows session if Adobe does not recognise the font.

This is an unsigned local build. Installation enables PlayerDebugMode in CSXS.11 and CSXS.12 for the current user, allowing unsigned CEP extensions in that profile. Previous settings are recorded. To remove the panel and restore them, close Adobe apps and run `Desinstalar.ps1 -RestoreCEP` in PowerShell. Data, assets and font are preserved on uninstall.

Configured hosts: Illustrator 29–31, Photoshop 26–28, InDesign 20–22. Releases that disable/remove CEP cannot load this panel. Photoshop may need Preferences > Plugins > Allow Extensions to Load and a restart.

## Changes in 1.2

- Imported reference search replaces Find a format.
- Import mapping uses only Reference and Barcode.
- QR link has its own tab, independent of the product table.
- QR reading and link availability have separate results.
- Base X dimension is 0.40 mm, bar height is 10 mm, text is Amazon Ember Regular at 14 px.
- Selecting another product preserves dimensions. Size settings are remembered locally.
- Illustrator imports native SVG artwork instead of assigning SVG to a PlacedItem.
- Check digit action handles complete codes clearly without silently changing invalid digits.
- Redesigned interface, with by André Filipe credit.

## Barcode workflow

Import XLSX, UTF-8 CSV/TSV or JSON in **Database**. Map exactly two different columns: **Reference** and **Barcode**. Extra source columns are ignored. In **Barcode**, type a reference or barcode, then choose a result. Enter selects the first match and Arrow Down focuses the result list. You can also enter data manually.

EAN/UPC require the correct number of digits and a valid check digit. Use Code 128 for ordinary text/references. Other encoders may need specialised inputs; Load sample shows an example. FORMATS.csv lists all 111 encoders.

**Check / calculate digit** completes a value that is one digit short or validates a complete supported GTIN. An invalid final digit is reported with its expected value, without modifying the code.

Live preview validates the encoder rules. Independent reading runs when requested and before output when necessary. A confirmed data mismatch blocks output. The 10 mm base height is a layout setting, not certification of a GS1 minimum. Check final print dimensions and quality separately.

## Database

Store barcode cells as text to preserve zeros. XLSX supports text, cached formula values and simple all-zero numeric formats; it never evaluates formulas or runs macros. Old XLS and password-protected files are unsupported. Scientific notation and long numbers with possible precision loss are blocked.

Limits: 25 MB input, 100,000 records and 100 MB of uncompressed Excel data. Import replaces the current table. Export backup creates a two-field JSON that can be reimported. Audit codes reports recognised invalid GTINs, duplicate barcode values and missing codes.

The shared table remains at `%APPDATA%\CodigoStudio\database.json`. Old extra fields are retained in existing files but not shown in the new interface. Reload after importing in another Adobe app. There is no direct SQL/Eticadata link or automatic source-file sync. Example rows are demonstrations, not assignments of new GS1 codes.

## QR link

Paste an `https://` or `http://` URL in **QR link**, choose size/correction and click **Verify QR & link**.

**QR reading** decodes the generated image independently and compares it with the exact URL. Output is blocked if reading fails or differs.

**Link availability** checks the server response. It uses HEAD, follows up to five redirects and falls back to GET for HTTP 405/501, stopping after headers. HTTP 2xx is reachable. HTTP 401/403 is restricted. HTTP 4xx/5xx is an error response. Timeout, connection or CORS restrictions are reported as unconfirmed, never as a successful check. Open link lets you check manually.

Node networking is used when available. The browser fallback cannot always expose cross-origin HTTP status. No relay service is used. A URL is contacted only by the explicit Verify QR & link or Open link action; QR reading before output does not automatically repeat the network check. Non-web schemes and embedded username/password URLs are rejected.

A readable QR and an accessible destination are separate checks. HTTP success does not certify page content, login requirements or future availability.

## Font, vectors and Adobe output

All bars are expanded filled paths. Text uses Amazon Ember Regular at 14 physical CSS pixels, equivalent to 10.5 pt at 96 ppi. Resizing the complete artwork also scales its text.

**Illustrator:** `placedItems.file` does not accept SVG. The panel opens a temporary SVG document, duplicates its top-level native artwork into a group in the active document, centres it on the active artboard and closes only the temporary document without saving. No raster conversion or clipboard copy is used. Nested text is assigned AmazonEmber-Regular at 10.5 pt. Failed imports roll back partial artwork and restore the interaction setting. Choose a visible, unlocked target layer.

Illustrator's temporary SVG omits embedded webfont CSS and uses the installed desktop font. Exported SVG keeps its font data. **InDesign** embeds SVG on the active page. **Photoshop** inserts an SVG Smart Object, not native Photoshop shape layers.

PNG uses 600 ppi dimensions and metadata. Default colours are RGB black/white. Check conversion to 100% K for CMYK packaging and verify the final print.

## Verification limits

Explicit check digits: EAN-8/13/14, UPC-A, ITF-14 and SSCC-18. Code 93 includes C/K checksums. Independent readers: standard QR, EAN-8/13, UPC-A/E, Code 128/39/93, ITF and Codabar. Other formats have encoder validation only.

Verify reads one upright PNG/JPEG. Failure to read a photo does not prove invalidity. Validation does not register GS1 codes, prove ownership or certify printed ISO/GS1 quality.

## Tests and diagnostics

- TEST-RESULTS.json: all 111 example encoders, independent readers, XLSX/CSV, zeros, PNG metadata, font and expansion.
- CEP-TEST-RESULTS.json: simulated CEP/CommonJS/AMD UI, Node/CEP storage, two-column import, reference search, size preservation, QR tab, export and host calls.
- HOST-TEST-RESULTS.json: actual bridge code against an Illustrator DOM model, covering native import, nested fonts, scaling, rollback and cleanup.
- LINK-TEST-RESULTS.json: fixture HTTP responses for status, redirects, HEAD/GET, timeouts, network and CORS failures.

These reports do not assert successful artwork placement in a running native Adobe desktop app. Confirm that in your installed versions. Startup details are in Help > Diagnostics.

## Development and licences

Source is in extension. Run `npm install` and `npm test` for development checks. Tests use Chrome at its standard Windows path or CHROME_PATH; otherwise install Playwright Chromium. `npm run build` rebuilds font data and format list. Installed panels need no external Node/npm setup.

Bundled libraries: bwip-js 4.11.4/BWIPP (MIT), jsQR (Apache-2.0), QuaggaJS (MIT), JSZip (MIT selection), ZXing-derived Code 93 reader (Apache-2.0). Original licences and font guidelines are included. No runtime CDN, telemetry, subscription or paid service is used.
