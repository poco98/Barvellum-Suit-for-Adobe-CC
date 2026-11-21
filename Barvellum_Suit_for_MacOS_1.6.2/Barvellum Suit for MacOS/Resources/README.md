# Barvellum Suit for MacOS technical guide

See the [project overview](../README.md) for installation and compatibility, and the [changelog](../CHANGELOG.md) for release history.

## Local files and preferences

| Item | macOS |
| --- | --- |
| CEP panel | `~/Library/Application Support/Adobe/CEP/extensions/afd.barvellum.suit` |
| Product database | `~/Library/Application Support/Barvellum.Suit/database.json` |
| Temporary artwork | `assets` in the product data folder |
| User font | `~/Library/Fonts` |

The installers make the bundled Amazon Ember Regular font available to the current user and keep an existing font file. If a host cannot find the font or load the panel after installation, close the Adobe apps and relaunch them. On macOS, sign out and sign back in if the updated CEP preferences or font are still unavailable. In Photoshop, enable **Allow Extensions to Load** in plug-in settings if that option is available. [Adobe CEP Cookbook](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md)

### Restore CEP preferences

Run **Uninstall.command** with the Adobe apps closed. Setup restores a saved preference when its current value still matches the installer setting.

## Barcode workflow

Import XLSX, CSV/TSV (UTF-8, UTF-16 or Windows-1252) or JSON in **Database**. Map exactly two different columns: **Reference** and **Barcode**. Extra source columns are ignored. In **Barcode**, type a reference or barcode, then choose a result. Enter selects the first match and Arrow Down focuses the result list. You can also enter data manually.

Select EAN-13 to generate a barcode from exactly 13 digits. A valid check digit produces EAN-13. A mismatch produces Code 128 with all 13 original digits, including leading zeros. The panel reports the format used. This works with manual input and imported product codes. Other EAN/UPC selections enforce their own lengths and check digits. Use Code 128 for ordinary text or references. FORMATS.csv lists all 111 encoders.

**Check / calculate digit** completes a value that is one digit short or validates a complete supported GTIN. An invalid final digit is reported with its expected value, without modifying the code.

Live preview validates the encoder rules. Independent reading runs when requested and before output when necessary. A confirmed data mismatch blocks output. Check final print dimensions and quality separately.

## Database

Use **Save XLSX template…** to save a blank product workbook. Enter the product data, save it, then import the completed workbook.

Store barcode cells as text to preserve zeros. XLSX supports text, cached formula values and simple all-zero numeric formats; it never evaluates formulas or runs macros. Old XLS and password-protected files are unsupported. Scientific notation and long numbers with possible precision loss are blocked.

Limits: 25 MB input, 100,000 records and 100 MB of uncompressed Excel data. Import replaces the current table. Export backup creates a two-field JSON that can be reimported. Audit codes reports recognised invalid GTINs, duplicate barcode values and missing codes.

The shared table stays in the platform-specific data folder listed above. Old extra fields are retained in existing files but not shown in the new interface. Reload after importing in another Adobe app. There is no direct SQL/Eticadata link or automatic source-file sync. Example rows are demonstrations, not assignments of new GS1 codes.

## QR link

Paste an `https://` or `http://` URL in **QR link**, choose size/correction and click **Analyze QR & link**.

**QR reading** decodes the generated image independently and compares it with the exact URL. Output is blocked if reading fails or differs.

**Link availability** checks the server response. It uses HEAD, follows up to five redirects and falls back to GET for HTTP 405/501, stopping after headers. HTTP 2xx is reachable. HTTP 401/403 is restricted. HTTP 4xx/5xx is an error response. Timeout, connection or CORS restrictions are reported as unconfirmed, never as a successful check. Open link lets you check manually.

Node networking is used when available. The browser fallback cannot always expose cross-origin HTTP status. No relay service is used. A URL is contacted only by the explicit Analyze QR & link or Open link action; QR reading before output does not automatically repeat the network check. Non-web schemes and embedded username/password URLs are rejected.

A readable QR and an accessible destination are separate checks. HTTP success does not certify page content, login requirements or future availability.

## Font, vectors and Adobe output

All bars are expanded filled paths. Text uses Amazon Ember Regular at 14 pt. Resizing the complete artwork also scales its text.

**Illustrator:** The panel draws supported barcode and QR shapes directly into a group on the active artboard. Text stays editable in AmazonEmber-Regular at 14 pt. Complex SVG features use temporary-document SVG import. Both routes require a visible, unlocked target layer and clean up partial artwork on error.

Illustrator's temporary SVG omits embedded webfont CSS and uses the installed desktop font. Exported SVG keeps its font data. **InDesign** embeds SVG on the active page. **Photoshop** inserts an SVG Smart Object, not native Photoshop shape layers.

PNG uses 600 ppi dimensions and metadata and preserves transparency. Barcodes retain their clear margins, so leave space around the bars when placing them over artwork. QR codes retain their white margin with rounded corners. Check conversion to 100% K for CMYK packaging and verify the final print.

## Verification limits

Explicit check digits: EAN-8/13/14, UPC-A, ITF-14 and SSCC-18. Code 93 includes C/K checksums. Independent readers: standard QR, EAN-8/13, UPC-A/E, Code 128/39/93, ITF and Codabar. Other formats have encoder validation only.

Analyze reads one upright PNG/JPEG. Failure to read a photo does not prove invalidity. Validation does not register GS1 codes, prove ownership or certify printed ISO/GS1 quality.

## Tests and diagnostics

- TEST-RESULTS.json: all 111 example encoders, independent readers, XLSX/CSV, zeros, PNG metadata, font and expansion.
- CEP-TEST-RESULTS.json: simulated CEP/CommonJS/AMD UI, Node/CEP storage, two-column import, reference search, size preservation, QR tab, export and host calls.
- HOST-TEST-RESULTS.json: bridge code tested against models of Illustrator, Photoshop and InDesign, including native Illustrator paths, caption styling, CMYK colour, scaling and rollback.
- LINK-TEST-RESULTS.json: fixture HTTP responses for status, redirects, HEAD/GET, timeouts, network and CORS failures.

These reports do not assert successful artwork placement in a running native Adobe desktop app. Confirm that in your installed versions. Startup details are in Help > Diagnostics.

## Development and licences

Source is in extension. Run `npm install` and `npm test` for development checks. Install Playwright Chromium or set CHROME_PATH to your local Chrome executable. `npm run build` rebuilds font data and format list. Installed panels need no external Node/npm setup.

Bundled libraries: bwip-js 4.11.4/BWIPP (MIT), jsQR (Apache-2.0), QuaggaJS (MIT), JSZip (MIT selection), ZXing-derived Code 93 reader (Apache-2.0). Original licences and font guidelines are included. No runtime CDN, telemetry, subscription or paid service is used.
