# Barvellum Suit for Adobe CC v1.6.3

A maintenance release for the Windows and macOS versions of the Adobe CEP panel. It addresses the three code-scanning findings present in both platform copies.

## Fixes

- The barcode and QR previews now load SVG as an image. Preview markup stays outside the panel document.
- The panel parses artwork as XML to remove embedded font styles before preparing SVG for Adobe placement. SVG exports retain their embedded font, and Illustrator captions remain editable.
- GTIN validation handles whitespace for the applicable formats and strips only the matching application identifier for EAN-14 or SSCC-18.

## Downloads

| Platform | Release asset | Install | Uninstall |
| --- | --- | --- | --- |
| Windows | `Barvellum_Suit_for_Windows_1.6.3.zip` | `Install.cmd` | `Uninstall.cmd` |
| macOS | `Barvellum_Suit_for_MacOS_1.6.3.zip` | `Install.command` | `Uninstall.command` |

Extract the archive and close the Adobe applications before running the installer. Reopen the application and select **Window → Extensions → Barvellum Suit for Adobe CC**. In Photoshop, use **Window → Extensions (Legacy)**. Updating through the installer preserves your local product database.

The manifest targets Illustrator 29.0–31.9, Photoshop 26.0–28.9 and InDesign 20.0–22.9 with CEP (CSXS 11.0 or later). On Apple silicon, Photoshop needs Rosetta for CEP extensions. [Adobe documentation](https://helpx.adobe.com/photoshop/desktop/troubleshoot/tool-feature-issues/photoshop-features-not-working-on-apple-silicon.html)

## Verification

All 111 encoder examples and the GTIN checks passed for both platform copies. The Adobe bridge tests and link checks also passed. Chromium could not start in the build environment, so the CEP browser tests remained pending. Adobe desktop validation and a new CodeQL scan are also pending.

### SHA-256 checksums

```text
a7740427ec036a1b1fbcd1d7dd118a018c9f2416893de4f786d1edfe161fde7a  Barvellum_Suit_for_Windows_1.6.3.zip
e5efaed6b5848bc6d8dd8380dae4ec0a0319ec26e2812ced46ca393f1dd8d321  Barvellum_Suit_for_MacOS_1.6.3.zip
```

<details>
<summary>Earlier releases · v1.3 to v1.6.2</summary>

- **v1.6.2** improved author-credit visibility, long status messages and tab-specific status, including background QR checks.
- **v1.6.1** refreshed the dark interface, combined product search and barcode settings in one editor, and placed the editor and preview side by side in wider panels.
- **v1.6.0** introduced separate Windows and macOS packages with installers, uninstallers and setup guides. macOS received per-user CEP installation, preference restoration and storage in Application Support.
- **v1.5.14** added the text-formatted XLSX template for **Reference** and **Barcode**, and consolidated installation, use and removal in the quick-start guide.
- **v1.5.13** applied the full product name in the Adobe menu, introduced a neutral grey theme and standardised the **Analyze** action labels.
- **v1.5.12** expanded **Help** and named editable Illustrator caption groups after the full barcode value, including leading zeros.
- **v1.5.11** gave all five tabs a more compact docked layout and kept generated artwork on a light preview background.
- **v1.5.10** set the gap between the leading EAN-13 digit and the first guard bar to twice the X dimension across previews, exports and placed artwork.
- **v1.5.9** adopted the `afd.barvellum.suit` identifier, migrated earlier Windows product data and settings, and renamed the JSON backup.
- **v1.5.8** expanded text import encoding support, improved Code 128 fallback for invalid GTINs, preserved part numbers such as `1E5` and cleared temporary artwork older than 24 hours.
- **v1.5.7** stabilised caption positions between renders.
- **v1.5.6** added **Use EAN-13** to apply the calculated check digit after Code 128 fallback and linked the database list to the search state.
- **v1.5.5** standardised English package and installer names.
- **v1.5.4** set the vertical bar-to-caption gap to 0.80 mm, separated bars and captions in Illustrator and SVG, and simplified the installation folder.
- **v1.5.3** required 13 digits for EAN-13, preserved all digits when falling back to Code 128 and set the default X dimension to 0.45 mm.
- **v1.5.2** lowered linear barcode captions by 1 mm across previews, Illustrator artwork and exports.
- **v1.5.1** added 10–200 mm QR sizing, made room for longer captions on export and displayed the installed manifest version.
- **v1.5** introduced 14 pt editable Illustrator captions, transparent barcode backgrounds, rounded white QR backgrounds and export filenames based on the encoded value.
- **v1.4** added grouped, filled Illustrator paths, 100% K placement in CMYK documents and protection against losing inserted artwork when selection failed.
- **v1.3** added placement diagnostics, expanded EAN/UPC/ITF audits and improved placement and failure recovery across Illustrator, Photoshop and InDesign. It also added a timeout for link checks.

</details>

Developed by **André Filipe**. The original source and documentation are under the MIT licence. Third-party notices are included with the installers. Permission to redistribute the bundled Amazon Ember font is pending confirmation.
