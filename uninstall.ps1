<#
.SYNOPSIS
    Lyrics Plus Translate Uninstaller for Spicetify
.DESCRIPTION
    Uninstalls the Lyrics Plus Translate custom app from Spicetify.
    Usage: iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
.NOTES
    Author: Tuna285
    Repository: https://github.com/Tuna285/custom-of-lyrics-plus
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "+============================================================+" -ForegroundColor Yellow
Write-Host "|         Lyrics Plus Translate - Uninstaller                |" -ForegroundColor Yellow
Write-Host "+============================================================+" -ForegroundColor Yellow
Write-Host ""

$appName = "lyrics-plus"
$customAppsDir = Join-Path $env:LOCALAPPDATA "spicetify\CustomApps"
$appDir = Join-Path $customAppsDir $appName

# [1/3] Close Spotify first
Write-Host "[1/3] Checking for running Spotify..." -ForegroundColor Yellow

$spotifyProcess = Get-Process -Name "Spotify" -ErrorAction SilentlyContinue
if ($spotifyProcess) {
    Write-Host "  -> Spotify is running. Closing it..." -ForegroundColor DarkYellow
    Stop-Process -Name "Spotify" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Spotify closed" -ForegroundColor Green
}
else {
    Write-Host "  [OK] Spotify is not running" -ForegroundColor Green
}

# [2/3] Remove app files
Write-Host "[2/3] Removing app files..." -ForegroundColor Yellow

if (Test-Path $appDir) {
    try {
        Remove-Item -Recurse -Force $appDir -ErrorAction Stop
        Write-Host "  [OK] Removed: $appDir" -ForegroundColor Green
    }
    catch {
        Write-Host "  [ERROR] Failed to remove folder. Please close any editors using these files." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "  [OK] App folder not found (already removed)" -ForegroundColor Green
}

# [3/3] Update Spicetify config
Write-Host "[3/3] Updating Spicetify config..." -ForegroundColor Yellow

try {
    $currentApps = & spicetify config custom_apps 2>$null
    if ($currentApps -match $appName) {
        & spicetify config custom_apps "$appName-" 2>$null
        Write-Host "  [OK] Removed $appName from custom_apps" -ForegroundColor Green
    }
    else {
        Write-Host "  [OK] $appName not in custom_apps" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Applying Spicetify changes..." -ForegroundColor Yellow
    & spicetify apply 2>$null
}
catch {
    Write-Host "  [WARN] Spicetify not found, skipping config update" -ForegroundColor DarkYellow
}

# Done!
Write-Host ""
Write-Host "+============================================================+" -ForegroundColor Green
Write-Host "|              Uninstallation Complete!                      |" -ForegroundColor Green
Write-Host "+============================================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Lyrics Plus Translate has been removed." -ForegroundColor Cyan
Write-Host "  Restart Spotify to complete the process." -ForegroundColor DarkGray
Write-Host ""
