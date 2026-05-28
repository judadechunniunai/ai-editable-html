param(
  [string]$Repo = "judadechunniunai/ai-editable-html",
  [string]$Ref = "main",
  [ValidateSet("codex", "cursor", "trae", "claude", "both", "all")]
  [string]$Target = "codex",
  [string]$CursorProject = (Get-Location).Path,
  [string]$TraeProject = (Get-Location).Path,
  [string]$ClaudeProject = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $localRoot = Split-Path -Parent $PSScriptRoot
  if (Test-Path (Join-Path $localRoot "ai-editable-html")) {
    return $localRoot
  }

  if ($Repo -eq "YOUR_GITHUB_USERNAME/ai-editable-html") {
    throw "Pass -Repo owner/ai-editable-html when running this script from GitHub raw."
  }

  $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-editable-html-" + [Guid]::NewGuid().ToString("N"))
  $zipPath = Join-Path $tempRoot "repo.zip"
  $extractPath = Join-Path $tempRoot "repo"
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/$Repo/archive/refs/heads/$Ref.zip" -OutFile $zipPath
  Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
  $root = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
  if (!$root) {
    throw "Downloaded repository archive is empty."
  }
  return $root.FullName
}

function Install-CodexSkill($repoRoot) {
  $source = Join-Path $repoRoot "ai-editable-html"
  $targetRoot = Join-Path $HOME ".codex\skills"
  $target = Join-Path $targetRoot "ai-editable-html"

  if (!(Test-Path $source)) {
    throw "Cannot find skill source at $source"
  }

  New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
  if (Test-Path $target) {
    Remove-Item -Recurse -Force $target
  }
  Copy-Item -Recurse -Path $source -Destination $target
  Write-Host "Installed Codex skill to $target"
}

function Install-CursorRule($repoRoot) {
  $source = Join-Path $repoRoot "cursor-rules\ai-editable-html.mdc"
  $resourceSource = Join-Path $repoRoot "ai-editable-html"
  $targetRoot = Join-Path $CursorProject ".cursor\rules"
  $target = Join-Path $targetRoot "ai-editable-html.mdc"
  $resourceTargetRoot = Join-Path $CursorProject ".cursor"
  $resourceTarget = Join-Path $resourceTargetRoot "ai-editable-html"

  if (!(Test-Path $source)) {
    throw "Cannot find Cursor rule at $source"
  }
  if (!(Test-Path $resourceSource)) {
    throw "Cannot find AI Editable HTML resources at $resourceSource"
  }

  New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
  Copy-Item -Force -Path $source -Destination $target
  Write-Host "Installed Cursor rule to $target"

  New-Item -ItemType Directory -Force -Path $resourceTargetRoot | Out-Null
  if (Test-Path $resourceTarget) {
    Remove-Item -Recurse -Force $resourceTarget
  }
  Copy-Item -Recurse -Path $resourceSource -Destination $resourceTarget
  Write-Host "Installed Cursor resources to $resourceTarget"
}

function Install-TraeRule($repoRoot) {
  $source = Join-Path $repoRoot "trae-rules\ai-editable-html.md"
  $resourceSource = Join-Path $repoRoot "ai-editable-html"
  $targetRoot = Join-Path $TraeProject ".trae\rules"
  $target = Join-Path $targetRoot "ai-editable-html.md"
  $resourceTargetRoot = Join-Path $TraeProject ".trae"
  $resourceTarget = Join-Path $resourceTargetRoot "ai-editable-html"

  if (!(Test-Path $source)) {
    throw "Cannot find Trae rule at $source"
  }
  if (!(Test-Path $resourceSource)) {
    throw "Cannot find AI Editable HTML resources at $resourceSource"
  }

  New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
  Copy-Item -Force -Path $source -Destination $target
  Write-Host "Installed Trae rule to $target"

  New-Item -ItemType Directory -Force -Path $resourceTargetRoot | Out-Null
  if (Test-Path $resourceTarget) {
    Remove-Item -Recurse -Force $resourceTarget
  }
  Copy-Item -Recurse -Path $resourceSource -Destination $resourceTarget
  Write-Host "Installed Trae resources to $resourceTarget"
}

function Install-ClaudeRule($repoRoot) {
  $source = Join-Path $repoRoot "claude-rules\CLAUDE.md"
  $resourceSource = Join-Path $repoRoot "ai-editable-html"
  $targetRoot = Join-Path $ClaudeProject ".claude"
  $target = Join-Path $targetRoot "CLAUDE.md"
  $resourceTarget = Join-Path $targetRoot "ai-editable-html"

  if (!(Test-Path $source)) {
    throw "Cannot find Claude rule at $source"
  }
  if (!(Test-Path $resourceSource)) {
    throw "Cannot find AI Editable HTML resources at $resourceSource"
  }

  New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
  Copy-Item -Force -Path $source -Destination $target
  Write-Host "Installed Claude Code instructions to $target"

  if (Test-Path $resourceTarget) {
    Remove-Item -Recurse -Force $resourceTarget
  }
  Copy-Item -Recurse -Path $resourceSource -Destination $resourceTarget
  Write-Host "Installed Claude Code resources to $resourceTarget"
}

$repoRoot = Get-RepoRoot
if ($Target -eq "codex" -or $Target -eq "both" -or $Target -eq "all") {
  Install-CodexSkill $repoRoot
}
if ($Target -eq "cursor" -or $Target -eq "both" -or $Target -eq "all") {
  Install-CursorRule $repoRoot
}
if ($Target -eq "trae" -or $Target -eq "all") {
  Install-TraeRule $repoRoot
}
if ($Target -eq "claude" -or $Target -eq "all") {
  Install-ClaudeRule $repoRoot
}
