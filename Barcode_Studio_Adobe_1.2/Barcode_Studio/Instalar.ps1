param([switch]$NonInteractive)
$ErrorActionPreference = 'Stop'
$id = 'pt.andre.codigo'
$source = Join-Path $PSScriptRoot 'extension'
$destinationRoot = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
$destination = Join-Path $destinationRoot $id
$stateRoot = Join-Path $env:APPDATA 'CodigoStudio'
$stateFile = Join-Path $stateRoot 'installation.json'
if (Get-Process -Name Photoshop,Illustrator,InDesign -ErrorAction SilentlyContinue) {
    throw 'Close Illustrator, Photoshop and InDesign, then run the installer again.'
}
if (!(Test-Path -LiteralPath (Join-Path $source 'CSXS\manifest.xml'))) { throw 'Extract the complete ZIP before installing.' }
$fontSource = Join-Path $source 'fonts\AmazonEmber_Rg.ttf'
if (!(Test-Path -LiteralPath $fontSource)) {throw 'Amazon Ember Regular is missing from this package.'}
New-Item -ItemType Directory -Path $destinationRoot,$stateRoot -Force | Out-Null
$state = if(Test-Path -LiteralPath $stateFile) {Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json} else {$null}
if (!$state) {
    $backup = @()
    foreach($version in 11,12) {
        $key = "HKCU:\Software\Adobe\CSXS.$version"
        $existing = Get-ItemProperty -LiteralPath $key -Name PlayerDebugMode -ErrorAction SilentlyContinue
        $backup += [pscustomobject]@{version=$version; existed=($null -ne $existing); value=if($existing){$existing.PlayerDebugMode}else{$null}; kind=if($existing){(Get-Item -LiteralPath $key).GetValueKind('PlayerDebugMode').ToString()}else{'String'}}
    }
    $state = [pscustomobject]@{cep=$backup; fontInstalled=$false; fontPath=''; fontHash=''; version='1.2.0'; priorExtensionBackup=''}
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
public static class CodeStudioFont {
 [DllImport("gdi32.dll",CharSet=CharSet.Unicode)] public static extern int AddFontResourceEx(string file,uint flags,IntPtr reserved);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
}
'@
    [void][CodeStudioFont]::AddFontResourceEx($fontDestination,0,[IntPtr]::Zero)
    $broadcast=[IntPtr]::Zero
    [void][CodeStudioFont]::SendMessageTimeout([IntPtr]0xffff,0x001D,[IntPtr]::Zero,[IntPtr]::Zero,2,1000,[ref]$broadcast)
    $state.fontInstalled=$true;$state.fontPath=$fontDestination;$state.fontHash=(Get-FileHash -LiteralPath $fontDestination -Algorithm SHA256).Hash
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding UTF8
}
$state.version='1.2.0'
$state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding UTF8
Write-Host ''
Write-Host 'Barcode Studio 1.2 installed. Amazon Ember Regular is included and installed for the current user.'
Write-Host 'An existing font installation with that name has been preserved.'
Write-Host 'CEP PlayerDebugMode enabled for this user to load this unsigned local panel.'
Write-Host 'Open Window > Extensions > Barcode Studio. In Photoshop: Extensions (Legacy).'
Write-Host 'If the panel does not appear, see README.md.'
if (!$NonInteractive) {Read-Host 'Press Enter to close' | Out-Null}
