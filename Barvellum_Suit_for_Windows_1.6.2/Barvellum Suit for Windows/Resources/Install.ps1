param([switch]$NonInteractive)
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'extension'
$destinationRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Adobe\CEP\extensions'))
$destination = Join-Path $destinationRoot 'afd.barvellum.suit'
$stateRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Barvellum.Suit'))
$legacyStateRoots = @('BarvellumSuit','CodigoStudio') | ForEach-Object { [IO.Path]::GetFullPath((Join-Path $env:APPDATA $_)) }
$stateFile = Join-Path $stateRoot 'installation.json'
if (Get-Process -Name Photoshop,Illustrator,InDesign -ErrorAction SilentlyContinue) {
    throw 'Close Illustrator, Photoshop and InDesign, then run the installer again.'
}
$manifestPath = Join-Path $source 'CSXS\manifest.xml'
if (!(Test-Path -LiteralPath $manifestPath)) { throw 'Extract the complete ZIP before installing.' }
[xml]$manifest = Get-Content -LiteralPath $manifestPath -Raw
$release = $manifest.ExtensionManifest.ExtensionBundleVersion
$fontSource = Join-Path $source 'fonts\AmazonEmber_Rg.ttf'
if (!(Test-Path -LiteralPath $fontSource)) {throw 'Amazon Ember Regular is missing from this package.'}
New-Item -ItemType Directory -Path $destinationRoot,$stateRoot -Force | Out-Null
# Keep the database, settings and CEP backup from earlier installations. The old folder is copied, never moved.
foreach ($legacyStateRoot in $legacyStateRoots) {
    if ((Test-Path -LiteralPath $legacyStateRoot -PathType Container) -and $legacyStateRoot -ne $stateRoot) {
        foreach ($item in Get-ChildItem -LiteralPath $legacyStateRoot -Force) {
            $target = Join-Path $stateRoot $item.Name
            if (!(Test-Path -LiteralPath $target)) { Copy-Item -LiteralPath $item.FullName -Destination $target -Recurse }
        }
    }
}
$state = if(Test-Path -LiteralPath $stateFile) {Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json} else {$null}
if (!$state) {
    $backup = @()
    foreach($version in 11,12) {
        $key = "HKCU:\Software\Adobe\CSXS.$version"
        $existing = Get-ItemProperty -LiteralPath $key -Name PlayerDebugMode -ErrorAction SilentlyContinue
        $backup += [pscustomobject]@{version=$version; existed=($null -ne $existing); value=if($existing){$existing.PlayerDebugMode}else{$null}; kind=if($existing){(Get-Item -LiteralPath $key).GetValueKind('PlayerDebugMode').ToString()}else{'String'}}
    }
    $state = [pscustomobject]@{cep=$backup; fontInstalled=$false; fontPath=''; fontHash=''; version=$release; priorExtensionBackup=''}
    if(Test-Path -LiteralPath $destination) {
        $priorBackup = Join-Path $stateRoot ('extension-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
        Copy-Item -LiteralPath $destination -Destination $priorBackup -Recurse
        $state.priorExtensionBackup=$priorBackup
    }
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding UTF8
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $destination -Recurse -Force
foreach($version in 11,12) {
    $key = "HKCU:\Software\Adobe\CSXS.$version"
    New-Item -Path $key -Force | Out-Null
    New-ItemProperty -LiteralPath $key -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
}
# Install this font for the current Windows user, without administrator rights.
$fontDir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
$fontDestination = Join-Path $fontDir 'AmazonEmber_Rg.ttf'
$fontKey = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
$fontValueName = 'Amazon Ember (TrueType)'
$fontExisting = Get-ItemProperty -LiteralPath $fontKey -Name $fontValueName -ErrorAction SilentlyContinue
if (!(Test-Path -LiteralPath $fontDestination) -and !$fontExisting) {
    New-Item -ItemType Directory -Path $fontDir -Force | Out-Null
    Copy-Item -LiteralPath $fontSource -Destination $fontDestination
    New-Item -Path $fontKey -Force | Out-Null
    New-ItemProperty -LiteralPath $fontKey -Name $fontValueName -Value $fontDestination -PropertyType String -Force | Out-Null
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class BarvellumFont {
 [DllImport("gdi32.dll",CharSet=CharSet.Unicode)] public static extern int AddFontResourceEx(string file,uint flags,IntPtr reserved);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
}
'@
    [void][BarvellumFont]::AddFontResourceEx($fontDestination,0,[IntPtr]::Zero)
    $broadcast=[IntPtr]::Zero
    [void][BarvellumFont]::SendMessageTimeout([IntPtr]0xffff,0x001D,[IntPtr]::Zero,[IntPtr]::Zero,2,1000,[ref]$broadcast)
    $state.fontInstalled=$true;$state.fontPath=$fontDestination;$state.fontHash=(Get-FileHash -LiteralPath $fontDestination -Algorithm SHA256).Hash
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding UTF8
}
$state.version=$release
$state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding UTF8
# Archive earlier Barcode Studio installations so Adobe does not show two panels.
foreach ($legacyName in 'pt.andre.codigo','afd.barcode.studio') {
    $legacyPath = Join-Path $destinationRoot $legacyName
    $legacyManifest = Join-Path $legacyPath 'CSXS\manifest.xml'
    if (Test-Path -LiteralPath $legacyManifest -PathType Leaf) {
        [xml]$previousManifest = Get-Content -LiteralPath $legacyManifest -Raw
        if ($previousManifest.ExtensionManifest.ExtensionBundleId -eq 'pt.andre.codigo') {
            $legacyFolder = Get-Item -LiteralPath $legacyPath -Force
            $archive = Join-Path $stateRoot ('legacy-extension-backup-' + [guid]::NewGuid().ToString('N'))
            if ($legacyFolder.Parent.FullName -ne $destinationRoot -or $legacyFolder.Name -ne $legacyName -or
                ($legacyFolder.Attributes -band [IO.FileAttributes]::ReparsePoint) -or [IO.Path]::GetDirectoryName($archive) -ne $stateRoot) {
                throw 'Unexpected previous installation path.'
            }
            Move-Item -LiteralPath $legacyFolder.FullName -Destination $archive
            Write-Host "Previous installation backed up to $archive"
        }
    }
}
Write-Host ''
Write-Host "Barvellum Suit $release installed. Amazon Ember Regular is included and installed for the current user."
Write-Host 'An existing font installation with that name has been preserved.'
Write-Host 'CEP PlayerDebugMode enabled for this user to load this unsigned local panel.'
Write-Host 'Open Window > Extensions > Barvellum Suit for Adobe CC. In Photoshop: Extensions (Legacy).'
Write-Host 'If the panel does not appear, see Resources\README.md.'
if (!$NonInteractive) {Read-Host 'Press Enter to close' | Out-Null}
