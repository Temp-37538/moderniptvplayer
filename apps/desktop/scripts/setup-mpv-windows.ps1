$ErrorActionPreference = "Stop"

# Pin the upstream libmpv development archive and verify it before use.
$archiveName = "mpv-dev-x86_64-20261021-git-e471496c56.7z"
$archiveUrl = "https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/20261021/$archiveName"
$expectedSha256 = "EFC719EFF3DC5954B4A5EF C800632808BCEC01CC9034940DD14E5EB7FE9EA633".Replace(" ", "")
$tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } elseif ($env:TEMP) { $env:TEMP } else { [System.IO.Path]::GetTempPath() }
$workDir = Join-Path $tempRoot "moderniptvplayer-mpv"
$archivePath = Join-Path $workDir $archiveName
$extractDir = Join-Path $workDir "extracted"
New-Item -ItemType Directory -Force -Path $workDir, $extractDir | Out-Null

Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath
$actualSha256 = (Get-FileHash -Path $archivePath -Algorithm SHA256).Hash
if ($actualSha256 -ne $expectedSha256) {
  throw "libmpv archive SHA-256 mismatch: expected $expectedSha256, got $actualSha256"
}

$sevenZip = Get-Command 7z -ErrorAction SilentlyContinue
if ($sevenZip) {
  $sevenZipPath = $sevenZip.Source
} else {
  $sevenZipPath = Join-Path $env:ProgramFiles "7-Zip\7z.exe"
}
if (-not (Test-Path $sevenZipPath)) {
  throw "7-Zip is required to extract the pinned libmpv archive."
}
& $sevenZipPath x $archivePath "-o$extractDir" -y | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Could not extract the libmpv development archive."
}

$mpvDll = Get-ChildItem -Path $extractDir -Recurse -File -Filter "libmpv-2.dll" | Select-Object -First 1
if (-not $mpvDll) {
  throw "The libmpv archive did not contain libmpv-2.dll."
}

# libmpv2-sys links with #[link(name = "mpv")]. The upstream archive's
# MinGW import library cannot be consumed by MSVC, so regenerate one from the
# DLL exports using the Visual Studio tools available on the Windows runner.
$exports = & dumpbin /nologo /exports $mpvDll.FullName
if ($LASTEXITCODE -ne 0) {
  throw "dumpbin could not read libmpv-2.dll exports."
}
$exportNames = @()
foreach ($line in $exports) {
  if ($line -match '^\s+\d+\s+[0-9A-Fa-f]+\s+[0-9A-Fa-f]+\s+(\S+)\s*$') {
    $exportNames += $Matches[1]
  }
}
if ($exportNames.Count -eq 0) {
  throw "No exports were found in libmpv-2.dll."
}

$defPath = Join-Path $workDir "mpv.def"
@("LIBRARY libmpv-2.dll", "EXPORTS") + $exportNames | Set-Content -Path $defPath -Encoding ascii
$linkDir = Join-Path $workDir "link"
New-Item -ItemType Directory -Force -Path $linkDir | Out-Null
$importLib = Join-Path $linkDir "mpv.lib"
& lib /nologo "/def:$defPath" "/out:$importLib" /machine:x64
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $importLib)) {
  throw "Could not generate the MSVC import library for libmpv."
}

$runtimeDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\src-tauri\mpv-runtime"))
if (Test-Path $runtimeDir) {
  Remove-Item -Path $runtimeDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

# Flatten the archive's runtime DLLs so the Windows loader can find all
# dependencies beside the Tauri executable after installation.
$dlls = Get-ChildItem -Path $extractDir -Recurse -File -Filter "*.dll"
foreach ($dll in $dlls) {
  Copy-Item -Path $dll.FullName -Destination (Join-Path $runtimeDir $dll.Name) -Force
}
foreach ($license in (Get-ChildItem -Path $extractDir -Recurse -File | Where-Object {
  $_.Name -match '^(LICENSE|COPYING|NOTICE)(\.|$)|^README'
})) {
  Copy-Item -Path $license.FullName -Destination (Join-Path $runtimeDir $license.Name) -Force
}

if (-not (Test-Path (Join-Path $runtimeDir "libmpv-2.dll"))) {
  throw "libmpv-2.dll was not staged for bundling."
}

if ($env:GITHUB_ENV) {
  "LIB=$linkDir;$env:LIB" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
} else {
  $env:LIB = "$linkDir;$env:LIB"
}
Write-Host "Prepared libmpv runtime and MSVC import library."
