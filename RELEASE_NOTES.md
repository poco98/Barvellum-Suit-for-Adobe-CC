# Barvellum Suit for Adobe CC v1.6.2

**Build date** 21 November 2026 · **Platforms** Windows and macOS

Version 1.6.2 improves the footer in the Adobe CEP panel. The author credit has more room beside Adobe's docking controls, and the status message follows the tab you are using.

## What's fixed in v1.6.2

- **Author credit visibility.** The footer reserves space on the right and below the credit. At very narrow widths, it places the status message and the credit on separate rows.
- **Long status messages.** Long messages, such as export paths, truncate within their own area. Hover over the message to see the full text.
- **Status for the active tab.** Returning to a tab restores its last footer message. If a QR link check finishes while you are working in **Barcode**, its result stays in **QR link** and the Barcode footer message stays visible.

The v1.6.1 panel redesign is included. It brings product search and barcode settings into one editor, keeps format-specific options under **Advanced**, and places the editor and preview side by side at wider panel sizes. The separate Windows and macOS installer packages were introduced in v1.6.0.

## Downloads

| Operating system | Release asset | Install | Uninstall |
| --- | --- | --- | --- |
| Windows | `Barvellum_Suit_for_Windows_1.6.2.zip` | `Install.cmd` | `Uninstall.cmd` |
| macOS | `Barvellum_Suit_for_MacOS_1.6.2.zip` | `Install.command` | `Uninstall.command` |

### SHA-256 checksums

```text
252a69122ac866628fdc06c14510d95f4842cc1a53d6b4e904b7d0a5b86446b8  Barvellum_Suit_for_Windows_1.6.2.zip
28c4c27cbfca8977c6fc962f4c3693f2d5a9724b999751fa3a5e25dc526fa8e6  Barvellum_Suit_for_MacOS_1.6.2.zip
```

## Compatibility

| Adobe application | Manifest version range | Open the panel from |
| --- | --- | --- |
| Illustrator | 29.0–31.9 | **Window → Extensions** |
| Photoshop | 26.0–28.9 | **Window → Extensions (Legacy)** |
| InDesign | 20.0–22.9 | **Window → Extensions** |

The extension requires CEP support and CSXS 11.0 or later. The manifest ranges describe the applications the panel is configured to load in. See **Testing and known limits** below for the environments covered by the packaged reports.

On Apple silicon, Photoshop requires Rosetta to load CEP extensions. [Adobe documentation](https://helpx.adobe.com/photoshop/desktop/troubleshoot/tool-feature-issues/photoshop-features-not-working-on-apple-silicon.html)

## Install or update

1. Download and fully extract the ZIP for your operating system. Close Illustrator, Photoshop and InDesign.
2. Run `Install.cmd` on Windows or `Install.command` on macOS. To run the macOS installer from Terminal, open the extracted folder and enter `/bin/bash Install.command`.
3. Reopen your Adobe application and select **Barvellum Suit for Adobe CC** from the menu above.
4. Use **Help → Diagnostics** to confirm the panel reports **1.6.2** and shows the connected Adobe application.

For an update, run the new installer over the existing installation. It preserves the local product database. You can export a JSON copy from **Database → Export backup**. In **Database**, saving a new import replaces the current product table.

The installers enable the per-user CEP preference `PlayerDebugMode` for CSXS 11 and 12 so CEP can load the unsigned panel. Each ZIP includes a quick-start guide and technical documentation under `Resources/`.

## Barcodes, QR codes and product data

| Area | What you can do |
| --- | --- |
| **Barcode** | Generate from typed data or a product reference. Review the result with **Generate & analyze**. **Check / calculate digit** validates supported GTIN formats or calculates a missing check digit. |
| **QR link** | Create an HTTP or HTTPS QR code at 10–200 mm with adjustable error correction. Verify the encoded URL and check whether the destination responds. |
| **Database** | Import XLSX, CSV/TSV or JSON with **Reference** and **Barcode** fields. Use the XLSX template to preserve leading zeros. Audit missing or duplicate barcodes and recognised GTIN errors, or export a JSON backup. |
| **Analyze** | Decode a single code from a PNG or JPEG and compare the decoded value with an expected value. Independent decoding is available for standard QR, EAN-8/13, UPC-A/E, Code 128/39/93, ITF and Codabar. |
| **Help** | Review the workflow and find startup, storage and insertion details under **Diagnostics**. |

**EAN-13.** Enter 13 digits, including the check digit. If the check digit is invalid, the panel generates Code 128 and preserves the original 13 digits, including leading zeros. **Use EAN-13** applies the calculated check digit to the current preview. Confirm the resulting value against the product reference before exporting.

**Artwork.** The default linear barcode settings are a 0.45 mm X dimension, 13 mm regular bars and a 0.80 mm gap between bars and text. Bars are expanded into filled paths. Captions use Amazon Ember Regular at 14 pt. Export options are vector SVG and raster PNG at 600 ppi. Barcodes keep a transparent background. QR codes use a white background with rounded corners where size permits.

| Application | Artwork placement |
| --- | --- |
| Illustrator | Places supported codes as grouped vector artwork on the active artboard, with editable barcode captions. Select a visible, unlocked layer. |
| Photoshop | Places the SVG as a Smart Object. |
| InDesign | Embeds the SVG on the active page. |

## Testing and known limits

- **Footer and tab status.** The Windows and macOS reports record checks at 275, 350, 440 and 900 px in a simulated CEP host, including long export paths and delayed QR results.
- **Panel workflows.** The packaged reports cover EAN-13, Code 128 fallback, QR readback, CSV import and image analysis. The Adobe placement checks use models of the Illustrator, Photoshop and InDesign APIs. HTTP checks use simulated responses for redirects, timeouts and access errors.
- **Desktop validation pending.** Docking and artwork placement in running Adobe desktop applications remain to be verified. The macOS installer checks were simulated.
- **Output checks.** Independent decoding can confirm the encoded value for supported formats. Check the printed result separately for readability, dimensions and production quality. A readable QR and a reachable URL are separate results.

The installer archives include `TEST-RESULTS.json`, `CEP-TEST-RESULTS.json`, `HOST-TEST-RESULTS.json` and `LINK-TEST-RESULTS.json` in `Resources/`. See `Resources/FORMATS.csv` for the full list of 111 encoders.

## Uninstall and troubleshooting

1. Close the Adobe applications. Run the uninstaller from the extracted folder. On macOS, you can run `/bin/bash Uninstall.command` from Terminal.
2. To restore previous CEP preferences on Windows, run `.\Resources\Uninstall.ps1 -RestoreCEP` in PowerShell from the extracted folder. On macOS, the uninstaller restores saved preference values if they still match the installer setting.

If the panel does not appear, check the Adobe application version and its Extensions menu. In Photoshop, enable **Allow Extensions to Load** if the setting is available. When reporting a problem, include your operating system, Adobe application and version, the steps to reproduce it and the details from **Help → Diagnostics**.

## Credits and licensing

Developed by **André Filipe**. The repository's MIT licence covers the original project code and documentation. Third-party library notices are in `Resources/extension/vendor/`. The installed panel uses the bundled Amazon Ember font. Its usage guide is in `Resources/extension/fonts/`. Permission to redistribute the font is pending confirmation.
