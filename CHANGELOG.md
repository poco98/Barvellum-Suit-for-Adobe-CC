# Changelog

Version history for Barvellum Suit for Adobe CC, most recent first. Defaults in each entry apply to that version.

## [1.6.3](RELEASE_NOTES.md)

### Fixed

- Render SVG previews as images.
- Use an XML parser to remove embedded styles from artwork prepared for Adobe placement.
- Remove the redundant replacement in ITF-14 validation and strip the matching application identifier for EAN-14 and SSCC-18.

## 1.6.2

### Fixed

- Added room beside Adobe's docking controls to keep the author credit visible.
- The footer now shows the last message for the active tab. A QR check that finishes in the background updates the **QR link** tab's status.

## 1.6.1

### Changed

- Refreshed the dark panel with blue controls, rounded surfaces and colour-coded feedback.
- Combined product search and barcode settings in one editor, with format-specific options under **Advanced**.
- Placed the editor and preview side by side in wider panels.

## 1.6.0

### Added

- Packaged standalone Windows and macOS distributions with platform-specific installers, uninstallers and setup guides.
- Added per-user CEP installation on macOS and enabled the uninstaller to restore backed-up CEP settings.

### Changed

- Stored macOS product data and generated artwork in **Application Support**. Applied macOS file filters to database and barcode image imports.

### Validation

- Checked the Windows package structure and installer references. Verified macOS installation and Adobe integration in simulated environments.

## 1.5.14

### Added

- **Save XLSX template…** creates a blank workbook and lets the user choose its filename and folder. **Reference** and **Barcode** are formatted as text to preserve leading zeros.

### Changed

- Moved the quick-start guide to `readme.txt` with instructions for installation, daily use and removal.

## 1.5.13

### Changed

- Renamed the panel and Adobe menu entry to **Barvellum Suit for Adobe CC**.
- Applied a neutral grey theme based on `#181818`.
- Renamed **Verify** to **Analyze** and aligned the barcode and QR action labels.

## 1.5.12

### Changed

- Updated **Help** with the barcode workflow, default measurements, Illustrator insertion and QR checks.
- Named the editable Illustrator caption group after the full barcode value, including leading zeros.

## 1.5.11

### Changed

- Reworked all five tabs into a compact graphite layout for docked panels. Generated artwork appears on a light preview background.

## 1.5.10

### Fixed

- Set the gap between the leading EAN-13 digit and the first guard bar to twice the X dimension in previews, exports and placed artwork.

## 1.5.9

### Changed

- Renamed the panel to **Barvellum Suit** and adopted the CEP identifier `afd.barvellum.suit`.
- Migrated earlier Windows product data and settings to `%APPDATA%\Barvellum.Suit`. The installer preserves earlier data and can archive recognised legacy extensions.
- Renamed the database backup to `barvellum_suit_products.json`.

## 1.5.8

### Added

- Added UTF-8, UTF-16 and Windows-1252 support for CSV, TSV and TXT imports.

### Fixed

- Used Code 128 for 8-, 12- and 14-digit database values that fail GTIN check-digit validation.
- Accepted part numbers such as `1E5` and `4E7` while rejecting values that spreadsheets converted to scientific notation.
- Cleaned up temporary artwork more than 24 hours old.

## 1.5.7

### Fixed

- Kept caption positioning stable between renders by avoiding repeated registration of the embedded preview font.

## 1.5.6

### Added

- **Use EAN-13** offers the calculated check digit after Code 128 fallback and applies it when selected.

### Changed

- Kept the database list collapsed after import. Searching opens the filtered list and clearing the query collapses it again.

## 1.5.5

### Changed

- Standardised package and installer names in English. The CEP installation folder in this version was `afd.barcode.studio`.

## 1.5.4

### Changed

- Set the vertical gap between the regular bars and caption to 0.80 mm.
- Separated bars and captions in Illustrator and SVG output. Captions remain editable in Illustrator.
- Organised the installation folder around two shortcuts and a quick-start guide.

## 1.5.3

### Changed

- Required 13 digits for EAN-13. A valid check digit produces EAN-13. An invalid check digit produces Code 128 with all 13 original digits.
- Set the defaults to a 0.45 mm X dimension, 13 mm bars and a 0.50 mm caption gap. Migration preserves custom dimensions.

## 1.5.2

### Fixed

- Moved linear barcode captions 1 mm lower across previews, Illustrator artwork and exports.

## 1.5.1

### Added

- Added QR output sizes from 10 to 200 mm, subject to the URL fitting at the chosen size.

### Changed

- Set regular bars to 12 mm at a 0.40 mm X dimension, with longer guard bars for formats that require them.

### Fixed

- Left room for longer captions on the export canvas and displayed the manifest version after installation.

## 1.5

### Changed

- Set captions in Amazon Ember Regular at 14 pt and kept them editable in Illustrator.
- Applied transparent backgrounds to barcodes and white backgrounds to QR codes, with a 1.844 mm corner radius where size permits. SVG and PNG export match the inserted artwork.
- Set the default bar height to 12 mm. Migration updates the earlier 10 mm default and preserves other saved heights.
- Named barcode export files after the encoded value, including leading zeros.

## 1.4

### Added

- Drew supported barcodes and QR codes as grouped, filled paths in Illustrator. SVG import remains available for shapes that require it.

### Changed

- Used editable Amazon Ember Regular captions at 10.5 pt in this version. Applied 100% K when inserting black artwork into a CMYK Illustrator document.

### Fixed

- Preserved inserted artwork when the post-insertion selection failed.

## 1.3

### Changed

- Outlined Amazon Ember text when placing artwork in InDesign and Photoshop. Captions remain editable in Illustrator and exported SVG.
- Reported insertion errors beside the action and recorded the last insertion step in **Help → Diagnostics**.
- Accepted missing and duplicate headers in extra columns. Extended the audit to UPC-A and ITF-14 alongside EAN-8 and EAN-13.

### Fixed

- Sized Illustrator artwork from imported bounds when they match the SVG proportions.
- Validated the InDesign page and frame and restored preferences on failure.
- Scaled the Photoshop Smart Object uniformly and rolled back failed insertions.
- Applied a timeout to link checks from the start of the connection request.
