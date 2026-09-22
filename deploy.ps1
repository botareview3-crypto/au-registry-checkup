<#
  deploy.ps1
  Commits and pushes this project to GitHub. Render watches that GitHub repo
  and auto-deploys on every push (Render does not accept a direct
  "git push" itself - it always deploys from a connected GitHub/GitLab repo).

  First run:
    .\deploy.ps1 -RemoteUrl "https://github.com/<you>/au-registry-checkup.git"

  Every run after that, from the project folder:
    .\deploy.ps1
    .\deploy.ps1 -Message "tweak colors"
#>

param(
    [string]$Message = "Update AU Registry Checkup",
    [string]$RemoteUrl = ""
)

# Git normally writes routine status info to stderr (e.g. "git push" progress),
# so we do NOT set $ErrorActionPreference = "Stop" - that would treat git's
# normal chatter as a fatal script error. Instead we check $LASTEXITCODE
# after each git call to decide success/failure ourselves.
$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false

Write-Host "== AU Registry Checkup - deploy helper ==" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git isn't installed or isn't on PATH. Install it from https://git-scm.com/downloads and re-run." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".git")) {
    Write-Host "No git repo here yet - initializing..." -ForegroundColor Yellow
    git init | Out-Null
    git branch -M main
}

$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) { $existingRemote = $null }

if (-not $existingRemote) {
    if (-not $RemoteUrl) {
        $RemoteUrl = Read-Host "Enter your GitHub repo URL (e.g. https://github.com/you/au-registry-checkup.git)"
    }
    git remote add origin $RemoteUrl
    Write-Host "Added remote origin -> $RemoteUrl" -ForegroundColor Green
} elseif ($RemoteUrl -and $RemoteUrl -ne $existingRemote) {
    git remote set-url origin $RemoteUrl
    Write-Host "Updated remote origin -> $RemoteUrl" -ForegroundColor Green
}

git add -A

git commit -m "$Message" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nothing new to commit - pushing current history anyway." -ForegroundColor Yellow
}

git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "git push failed - see the error output above for details." -ForegroundColor Red
    Write-Host "Common causes: wrong repo URL, no push access, or you need to authenticate (a browser login window or credential prompt may appear)." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Pushed to GitHub." -ForegroundColor Green
Write-Host "If this repo is connected to a Render service with Auto-Deploy on, Render will redeploy automatically." -ForegroundColor Green
Write-Host "Watch progress at https://dashboard.render.com" -ForegroundColor Green
