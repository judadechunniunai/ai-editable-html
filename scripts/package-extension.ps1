$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "chrome-extension"
$outputRoot = Join-Path $repoRoot "downloads"
$output = Join-Path $outputRoot "ai-editable-html-chrome-extension.zip"

if (!(Test-Path $source)) {
  throw "Cannot find Chrome extension source at $source"
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
if (Test-Path $output) {
  Remove-Item -Force $output
}

Compress-Archive -Path (Join-Path $source "*") -DestinationPath $output
Write-Host "Wrote $output"
