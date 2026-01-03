<#
.SYNOPSIS
    Lyrics Plus Translate Installer for Spicetify
.DESCRIPTION
    Installs the Lyrics Plus Translate custom app for Spicetify.
    Usage: iwr -useb https://raw.githubusercontent.com/Tuna285/custom-of-lyrics-plus/main/install.ps1 | iex
.NOTES
    Author: Tuna285
    Repository: https://github.com/Tuna285/custom-of-lyrics-plus
#>

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Lyrics Plus Translate - Installer                  ║" -ForegroundColor Cyan
Write-Host "║     AI-powered lyrics translation for Spotify              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
$repoOwner = "Tuna285"
$repoName = "custom-of-lyrics-plus"
$branch = "main"
$appName = "lyrics-plus"
$baseUrl = "https://raw.githubusercontent.com/$repoOwner/$repoName/$branch"

# Files to download (must match manifest.json subfiles + core files)
$filesToDownload = @(
    "index.js",
    "style.css",
    "manifest.json",
    "Utils.js",
    "Config.js",
    "Cache.js",
    "Prompts.js",
    "GeminiClient.js",
    "Translator.js",
    "Components.js",
    "ProviderLRCLIB.js",
    "ProviderMusixmatch.js",
    "ProviderNetease.js",
    "ProviderGenius.js",
    "Providers.js",
    "SyncedLyrics.js",
    "UnsyncedLyrics.js",
    "TabBar.js",
    "Settings.js",
    "OptionsMenu.js",
    "PlaybarButton.js",
    "version.json",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
)

# Asset files (in assets/ folder)
$assetsToDownload = @(
    "preview.gif"
)

# ─────────────────────────────────────────────────────────────
# Check Spicetify installation
# ─────────────────────────────────────────────────────────────
Write-Host "[1/5] Checking Spicetify installation..." -ForegroundColor Yellow

$spicetifyPath = ""
try {
    $spicetifyPath = (Get-Command spicetify -ErrorAction Stop).Source
    Write-Host "  ✓ Spicetify found at: $spicetifyPath" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Spicetify not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Spicetify first:" -ForegroundColor Yellow
    Write-Host "  iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# ─────────────────────────────────────────────────────────────
# Get CustomApps path
# ─────────────────────────────────────────────────────────────
Write-Host "[2/5] Locating CustomApps directory..." -ForegroundColor Yellow

$spicetifyConfig = & spicetify -c 2>$null
if (-not $spicetifyConfig) {
    $spicetifyConfig = Join-Path $env:APPDATA "spicetify"
}
$configDir = Split-Path $spicetifyConfig -Parent
$customAppsDir = Join-Path $env:LOCALAPPDATA "spicetify\CustomApps"

# Create CustomApps directory if not exists
if (-not (Test-Path $customAppsDir)) {
    New-Item -ItemType Directory -Path $customAppsDir -Force | Out-Null
}

$appDir = Join-Path $customAppsDir $appName
Write-Host "  ✓ CustomApps directory: $customAppsDir" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────
# Remove existing installation (if any)
# ─────────────────────────────────────────────────────────────
Write-Host "[3/5] Preparing installation directory..." -ForegroundColor Yellow

if (Test-Path $appDir) {
    Write-Host "  → Removing existing $appName installation..." -ForegroundColor DarkYellow
    Remove-Item -Recurse -Force $appDir
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $appDir "assets") -Force | Out-Null
Write-Host "  ✓ Created: $appDir" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────
# Download files
# ─────────────────────────────────────────────────────────────
Write-Host "[4/5] Downloading files..." -ForegroundColor Yellow

$downloadedCount = 0
$totalFiles = $filesToDownload.Count + $assetsToDownload.Count

foreach ($file in $filesToDownload) {
    $url = "$baseUrl/$file"
    $dest = Join-Path $appDir $file
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
        $downloadedCount++
        $percent = [math]::Round(($downloadedCount / $totalFiles) * 100)
        Write-Host "  [$percent%] Downloaded: $file" -ForegroundColor DarkGray
    } catch {
        Write-Host "  ⚠ Failed to download: $file (optional)" -ForegroundColor DarkYellow
    }
}

foreach ($asset in $assetsToDownload) {
    $url = "$baseUrl/assets/$asset"
    $dest = Join-Path $appDir "assets\$asset"
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
        $downloadedCount++
        $percent = [math]::Round(($downloadedCount / $totalFiles) * 100)
        Write-Host "  [$percent%] Downloaded: assets/$asset" -ForegroundColor DarkGray
    } catch {
        Write-Host "  ⚠ Failed to download: assets/$asset (optional)" -ForegroundColor DarkYellow
    }
}

Write-Host "  ✓ Downloaded $downloadedCount files" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────
# Configure Spicetify
# ─────────────────────────────────────────────────────────────
Write-Host "[5/5] Configuring Spicetify..." -ForegroundColor Yellow

# Add custom app to config
$currentApps = & spicetify config custom_apps 2>$null
if ($currentApps -notmatch $appName) {
    & spicetify config custom_apps "$appName" 2>$null
    Write-Host "  ✓ Added $appName to custom_apps" -ForegroundColor Green
} else {
    Write-Host "  ✓ $appName already in custom_apps" -ForegroundColor Green
}

# Apply changes
Write-Host ""
Write-Host "Applying Spicetify changes..." -ForegroundColor Yellow
& spicetify apply 2>$null

# ─────────────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Installation Complete!                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Installed to: $appDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "    1. Restart Spotify" -ForegroundColor White
Write-Host "    2. Click the lyrics icon in the sidebar" -ForegroundColor White
Write-Host "    3. Configure your Gemini API key in settings" -ForegroundColor White
Write-Host ""
Write-Host "  For updates, run this command again." -ForegroundColor DarkGray
Write-Host ""
