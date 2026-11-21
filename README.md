# Barvellum Suit for Adobe CC

Barvellum Suit is a CEP panel for creating, reading and placing barcodes and QR codes in **Adobe Illustrator**, **Adobe Photoshop** and **Adobe InDesign**. Developed by André Filipe.

## Features

- Generate barcodes from manually entered data or product database records. Check GTIN check digits and read supported codes from PNG or JPEG images.
- Generate QR codes for HTTP and HTTPS URLs. Verify the encoded URL and check whether the destination responds.
- Export SVG or PNG at 600 ppi for raster output. In Illustrator, barcode captions remain editable.
- Import product data from XLSX, CSV/TSV or JSON. Save an XLSX template that preserves leading zeros, search by product reference or barcode, and export a JSON backup.

## Compatibility

| Adobe application | Manifest version range | Panel menu |
| --- | --- | --- |
| Illustrator | 29.0–31.9 | **Window → Extensions** |
| Photoshop | 26.0–28.9 | **Window → Extensions (Legacy)** |
| InDesign | 20.0–22.9 | **Window → Extensions** |

The extension requires a host with CEP support and CSXS 11.0 or later. The version ranges come from the extension manifest. See the [v1.6.3 release notes](RELEASE_NOTES.md) for the test scope and pending desktop checks.

## Installation

Download the ZIP for your operating system from **Releases**.

| Operating system | v1.6.3 package | Installer |
| --- | --- | --- |
| Windows | `Barvellum_Suit_for_Windows_1.6.3.zip` | `Install.cmd` |
| macOS | `Barvellum_Suit_for_MacOS_1.6.3.zip` | `Install.command` |

1. Extract the entire ZIP and close Illustrator, Photoshop and InDesign.
2. Run the installer from the extracted folder. On macOS, you can also open Terminal in that folder and run `/bin/bash Install.command`.
3. Reopen the Adobe application and choose **Barvellum Suit for Adobe CC** from the menu listed above.

The installers enable the per-user CEP preference `PlayerDebugMode` for CSXS 11 and 12 so CEP can load the unsigned panel. Updates preserve the local product database. On Apple silicon, run Photoshop in Rosetta mode to load CEP extensions. [Adobe documentation](https://helpx.adobe.com/photoshop/desktop/troubleshoot/tool-feature-issues/photoshop-features-not-working-on-apple-silicon.html)

## First use

| Tab | Workflow |
| --- | --- |
| **Barcode** | Choose a format, enter a value or search for a product reference, then select **Generate & analyze**. Review the reported format before inserting or exporting. |
| **QR link** | Enter the URL, select **Analyze QR & link** and review the **QR reading** and **Link availability** results individually. |
| **Database** | Choose **Save XLSX template…** and fill in **Reference** and **Barcode**. Use **Export backup** before saving an import that replaces the product table. |
| **Analyze** | Load a PNG or JPEG containing one code. Use **Expected data** to compare the decoded value with your reference. |
| **Help** | Open **Diagnostics** to check the panel version, Adobe connection, storage and last insertion result. |

EAN-13 requires exactly 13 digits, including the check digit. If the last digit is invalid, the panel generates Code 128 and preserves all 13 original digits. **Use EAN-13** applies the calculated check digit to the current preview. Confirm the new value against the product reference before using it.

## Uninstall

Close the Adobe applications. Run `Uninstall.cmd` on Windows or `Uninstall.command` on macOS from the extracted folder. The technical guide explains how to restore previous CEP settings.

## Documentation

- [Changelog](CHANGELOG.md)
- [v1.6.3 release notes](RELEASE_NOTES.md)
- Each installer ZIP contains a technical guide at `Resources/README.md` and a format list at `Resources/FORMATS.csv`.

## Credits and licensing

Developed by **André Filipe**. The [MIT licence](LICENSE) covers the original project code and documentation.

Third-party libraries retain their respective licences in `Resources/extension/vendor/`. The packages contain the Amazon Ember font and its usage guide in `Resources/extension/fonts/`. Permission to redistribute the font is pending confirmation.
