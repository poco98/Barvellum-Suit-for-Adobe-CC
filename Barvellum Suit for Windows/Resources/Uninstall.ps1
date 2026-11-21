param([switch]$RestoreCEP)
$ErrorActionPreference = 'Stop'
if (Get-Process -Name Photoshop,Illustrator,InDesign -ErrorAction SilentlyContinue) {throw 'Close the Adobe apps first.'}
$destinationRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Adobe\CEP\extensions'))
$destination = [IO.Path]::GetFullPath((Join-Path $destinationRoot 'afd.barvellum.suit'))
if ([IO.Path]::GetDirectoryName($destination) -ne $destinationRoot -or [IO.Path]::GetFileName($destination) -ne 'afd.barvellum.suit') {throw 'Unexpected uninstall destination.'}
if (Test-Path -LiteralPath $destination) {Remove-Item -LiteralPath $destination -Recurse -Force}
$stateFile = $null
foreach ($folder in 'Barvellum.Suit','BarvellumSuit','CodigoStudio') {
    $candidate = Join-Path $env:APPDATA (Join-Path $folder 'installation.json')
    if (Test-Path -LiteralPath $candidate) {$stateFile = $candidate; break}
}
if($RestoreCEP -and $stateFile) {
    $state=Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    foreach($entry in $state.cep) {
        $key="HKCU:\Software\Adobe\CSXS.$($entry.version)"
        if($entry.existed){$kind=if($entry.kind){$entry.kind}else{'String'};New-ItemProperty -LiteralPath $key -Name PlayerDebugMode -Value $entry.value -PropertyType $kind -Force | Out-Null}
        elseif(Test-Path -LiteralPath $key){Remove-ItemProperty -LiteralPath $key -Name PlayerDebugMode -ErrorAction SilentlyContinue}
    }
}
Write-Host 'Panel removed. The product database, assets and font have been preserved.'
Write-Host 'To restore the previous CEP settings too, run .\Resources\Uninstall.ps1 -RestoreCEP from the installation folder.'
Read-Host 'Press Enter to close' | Out-Null
