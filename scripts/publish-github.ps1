param(
  [string]$Repo = "judadechunniunai/ai-editable-html",
  [ValidateSet("public", "private", "internal")]
  [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"

if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI is required. Install it from https://cli.github.com/ or with winget install --id GitHub.cli -e"
}

gh auth status | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Run gh auth login first, then rerun this script."
}

$repoExists = $true
gh repo view $Repo *> $null
if ($LASTEXITCODE -ne 0) {
  $repoExists = $false
}

if ($repoExists) {
  if (!(git remote get-url origin 2>$null)) {
    git remote add origin "https://github.com/$Repo.git"
  }
  git push -u origin main
} else {
  $visibilityArg = "--$Visibility"
  gh repo create $Repo $visibilityArg --source . --remote origin --push
}

Write-Host "Published https://github.com/$Repo"
