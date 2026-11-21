# Changelog · Barvellum Suit for Windows

Release notes for Barvellum Suit for Adobe CC. Each entry describes that version’s behaviour. Later releases supersede earlier defaults where noted.

## 1.6.3

### Fixed

- Render barcode and QR previews as SVG images to keep markup out of the panel document.
- Remove embedded styling through XML parsing before preparing SVG artwork for Adobe placement.
- Keep ITF-14 whitespace handling and strip only the matching application identifier for EAN-14 and SSCC-18.

## 1.6.2

- Add clearance around the footer so the author credit remains visible next to Adobe's docking controls.
- Show the status for the active tab, including when a background QR check finishes.

## 1.6.1

- Refresh the dark panel with blue controls, rounded surfaces and colour-coded feedback.
- Combine product search and barcode settings into one editor. Keep advanced settings available on demand.
- Arrange the editor and preview side by side in wider panels.

## 1.6.0

### Changed

- Packaged the Windows installers and resources in a standalone distribution.
- Added Windows-specific setup instructions and a technical guide.

### Validation

- Checked the package structure and installer references. Native Adobe placement on Windows was not retested for this package.

## 1.5.14

### Added

- **Save XLSX template…** creates a blank workbook and lets the user choose its filename and folder. Reference and Barcode columns use text formatting to preserve leading zeros.

### Changed

- Replaced the quick-start file with `readme.txt`, covering installation, everyday use and removal.

## 1.5.13

### Changed

- Set the panel and Adobe menu title to **Barvellum Suit for Adobe CC**.
- Applied a neutral grey theme based on `#181818`.
- Renamed **Verify** to **Analyze** and aligned the barcode and QR action labels.

## 1.5.12

### Changed

- Updated **Help** with the barcode workflow, default dimensions, Illustrator insertion and QR checks.
- Named the editable Illustrator caption group after the complete barcode value, including leading zeros.

## 1.5.11

### Changed

- Redesigned the five tabs with a compact graphite layout for docked panels. The preview area keeps a light background for code readability.

## 1.5.10

### Fixed

- Set the gap between the leading EAN-13 digit and the first guard bar to twice the X dimension in previews, exports and inserted artwork.

## 1.5.9

### Changed

- Renamed the panel to **Barvellum Suit** and adopted the `afd.barvellum.suit` CEP identifier.
- Migrated earlier Windows product data and settings into `%APPDATA%\Barvellum.Suit`. Earlier data is preserved and recognised legacy extensions can be archived.
- Renamed the database backup to `barvellum_suit_products.json`.

## 1.5.8

### Added

- Support for UTF-8, UTF-16 and Windows-1252 in CSV, TSV and TXT imports.

### Fixed

- Use Code 128 for 8-, 12- and 14-digit database values that fail their GTIN check-digit rules.
- Accept part numbers such as `1E5` and `4E7` while rejecting values converted to spreadsheet scientific notation.
- Clean up temporary artwork files older than 24 hours.

## 1.5.7

### Fixed

- Keep caption positioning stable between renders by avoiding repeated registration of the embedded preview font.

## 1.5.6

### Added

- **Use EAN-13** offers a corrected check digit after a Code 128 fallback and applies it when selected.

### Changed

- Keep the database list collapsed after import. Searching opens the filtered list, and clearing the query collapses it.

## 1.5.5

### Changed

- Standardised the package and installer names in English. At this version, the CEP installation folder was `afd.barcode.studio`.

## 1.5.4

### Changed

- Set the vertical gap between the regular bars and the caption to 0.80 mm.
- Separate bars and captions in Illustrator and SVG output. Illustrator captions remain editable.
- Organised the installation folder around two shortcuts and a quick-start guide.

## 1.5.3

### Changed

- Require exactly 13 digits for EAN-13. A valid check digit generates EAN-13. An invalid one generates Code 128 while preserving all 13 digits.
- Set the defaults at this version to a 0.45 mm X dimension, 13 mm bars and a 0.50 mm caption gap. Custom dimensions are preserved when migrating earlier defaults.

## 1.5.2

### Fixed

- Move linear barcode captions 1 mm lower, consistently across previews, Illustrator artwork and exports.

## 1.5.1

### Added

- QR output sizes from 10 to 200 mm, subject to the URL fitting at the chosen size.

### Changed

- Set regular bars to 12 mm at a 0.40 mm X dimension, with longer guard bars where the format requires them.

### Fixed

- Leave room for longer captions inside the export canvas and show the actual manifest version after installation.

## 1.5

### Changed

- Set Amazon Ember Regular captions to 14 pt. Keep captions editable in Illustrator.
- Use a transparent background for barcodes and a white background for QR codes, with a 1.844 mm corner radius where the size permits. Match SVG and PNG output to inserted artwork.
- Set the default bar height to 12 mm. Migrate the earlier default of 10 mm while preserving other saved heights.
- Name barcode exports after the encoded value, including leading zeros.

## 1.4

### Added

- Draw supported barcodes and QR codes directly as grouped, filled paths in Illustrator. Retain SVG import for shapes that require it.

### Changed

- Use editable Amazon Ember Regular captions at 10.5 pt at this version and apply 100% K when inserting black artwork into a CMYK Illustrator document.

### Fixed

- Keep artwork in the document when only post-insertion selection fails.

## 1.3

### Changed

- Outline Amazon Ember lettering for InDesign and Photoshop placement. Preserve editable captions in Illustrator and SVG exports.
- Show insertion errors alongside the action and report the last insertion stage in **Help → Diagnostics**.
- Accept missing or duplicate headers in extra columns. Extend the audit to UPC-A and ITF-14 alongside EAN-8 and EAN-13.

### Fixed

- Size Illustrator artwork from the imported bounds when they match the SVG proportions.
- Validate InDesign page and frame placement and restore preferences on failure.
- Scale the Photoshop Smart Object uniformly and roll back a failed insertion.
- Enforce a timeout for link checks even when a network connection has yet to open.
