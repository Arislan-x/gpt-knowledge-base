$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestPath = Join-Path $root "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$version = [string]$manifest.version

if (-not $version) {
  throw "manifest.json does not contain a version."
}

$dist = Join-Path $root "dist"
New-Item -ItemType Directory -Path $dist -Force | Out-Null
$zipPath = Join-Path $dist "gpt-knowledge-base-$version.zip"
$hashPath = "$zipPath.sha256"

$resolvedDist = (Resolve-Path $dist).Path
foreach ($path in @($zipPath, $hashPath)) {
  $parent = [System.IO.Path]::GetFullPath((Split-Path -Parent $path))
  if ($parent -ne $resolvedDist) {
    throw "Refusing to replace a file outside the dist directory: $path"
  }
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Force
  }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$runtimeRoots = @(
  $manifestPath,
  (Join-Path $root "LICENSE"),
  (Join-Path $root "CHANGELOG.md"),
  (Join-Path $root "PRIVACY.md"),
  (Join-Path $root "PRIVACY_EN.md"),
  (Join-Path $root "README.md"),
  (Join-Path $root "README_EN.md"),
  (Join-Path $root "_locales"),
  (Join-Path $root "assets"),
  (Join-Path $root "src")
)

$files = foreach ($runtimeRoot in $runtimeRoots) {
  if (Test-Path -LiteralPath $runtimeRoot -PathType Leaf) {
    Get-Item -LiteralPath $runtimeRoot
  } else {
    Get-ChildItem -LiteralPath $runtimeRoot -Recurse -File
  }
}

$ignoredNames = @(".DS_Store", "Thumbs.db", "Desktop.ini")
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files | Where-Object { $ignoredNames -notcontains $_.Name }) {
    $relative = $file.FullName.Substring($root.Length).TrimStart([char]'\', [char]'/').Replace([char]'\', [char]'/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $file.FullName,
      $relative,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $archive.Dispose()
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  if (-not ($zip.Entries | Where-Object { $_.FullName -eq "manifest.json" })) {
    throw "The generated ZIP does not contain manifest.json at its root."
  }
} finally {
  $zip.Dispose()
}

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath $hashPath -Value "$hash  $(Split-Path -Leaf $zipPath)" -Encoding ascii

Write-Output "Created $zipPath"
Write-Output "SHA256 $hash"
