<#
.SYNOPSIS
    Lyrics Plus Translate Uninstaller for Spicetify
.DESCRIPTION
    Uninstalls the Lyrics Plus Translate custom app from Spicetify.
    Usage: iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/uninstall.ps1 | iex
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║         Lyrics Plus Translate - Uninstaller                ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

$appName = "lyrics-plus"
$appDir = Join-Path $env:LOCALAPPDATA "spicetify\CustomApps\$appName"

# Remove from Spicetify config
Write-Host "[1/3] Removing from Spicetify config..." -ForegroundColor Yellow
$currentApps = & spicetify config custom_apps 2>$null
if ($currentApps -match $appName) {
    & spicetify config custom_apps "$appName-" 2>$null
    Write-Host "  ✓ Removed from custom_apps" -ForegroundColor Green
}

# Delete files
Write-Host "[2/3] Deleting app files..." -ForegroundColor Yellow
if (Test-Path $appDir) {
    Remove-Item -Recurse -Force $appDir
    Write-Host "  ✓ Deleted: $appDir" -ForegroundColor Green
} else {
    Write-Host "  → App directory not found (already removed?)" -ForegroundColor DarkYellow
}

# Apply changes
Write-Host "[3/3] Applying Spicetify changes..." -ForegroundColor Yellow
& spicetify apply 2>$null

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Uninstallation Complete!                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Please restart Spotify to complete the process." -ForegroundColor Cyan
Write-Host ""
