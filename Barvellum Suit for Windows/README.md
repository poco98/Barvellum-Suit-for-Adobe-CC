# Barvellum Suit for Windows

Version **1.6.3**. A CEP panel for generating, reading and placing barcodes and QR codes in Adobe Illustrator, Photoshop and InDesign. Built by André Filipe.

## What you can do

- Generate barcodes from typed values or imported product references. Check the encoded data before inserting or exporting.
- Generate QR codes from URLs and review QR readability and link availability separately.
- Insert editable barcode text in Illustrator or export as SVG and PNG at 600 ppi.
- Create an XLSX import template, import product data, search by reference or barcode, and export a database backup.

## Compatibility

| Adobe app | Configured versions | Open the panel from |
| --- | --- | --- |
| Illustrator | 29–31 | Window → Extensions |
| Photoshop | 26–28 | Window → Extensions (Legacy) |
| InDesign | 20–22 | Window → Extensions |

The panel requires a host that still loads CEP extensions. The version ranges describe the manifest configuration. [Adobe’s CEP transition guide](https://helpx.adobe.com/creative-cloud/apps/integration-with-other-apps/manage-plugins/cep-uxp-plugin-transition.html)

## Install

1. Extract the complete release ZIP and close Illustrator, Photoshop and InDesign.
2. Run **Install.cmd** from the extracted folder.
3. Reopen the Adobe app. From its **Window → Extensions** menu, select **Barvellum Suit for Adobe CC**. In Photoshop, use **Window → Extensions (Legacy)**.

These local installers enable CEP’s per-user `PlayerDebugMode` for CSXS 11 and 12 to load this unsigned build. See the technical guide for restoring the previous CEP preferences. [Adobe CEP Cookbook](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md)

## First use

1. In **Barcode**, select a format, enter a value and choose **Generate & analyze**.
2. In **Database**, choose **Save XLSX template…**. Fill in **Reference** and **Barcode**, then import the workbook. The template uses text fields to preserve leading zeros.
3. In **QR link**, enter a URL and choose **Analyze QR & link**.
4. In **Analyze**, select a PNG or JPEG to read an existing code.

## Uninstall

Close the Adobe apps. Run **Uninstall.cmd** from the extracted folder. The product database, generated assets and font stay in the user account.

## Documentation

- [Changelog](CHANGELOG.md)
- [Technical guide](Resources/README.md)
- [Supported barcode formats](Resources/FORMATS.csv)

## Credits and licensing

Developed by André Filipe. Bundled dependencies and their notices are documented in the technical guide. The supplied Amazon Ember usage guide describes Amazon’s internal use. Confirm the font redistribution terms and the project licence before publishing the source or a release archive publicly.
