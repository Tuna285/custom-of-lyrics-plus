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
Write-Host "+============================================================+" -ForegroundColor Cyan
Write-Host "|         Lyrics Plus Translate - Installer                  |" -ForegroundColor Cyan
Write-Host "|     AI-powered lyrics translation for Spotify              |" -ForegroundColor Cyan
Write-Host "+============================================================+" -ForegroundColor Cyan
Write-Host ""

# Configuration
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
    "README_VI.md",
    "CHANGELOG.md",
    "LICENSE",
    "install.ps1",
    "uninstall.ps1"
)

# Asset files (in assets/ folder)
$assetsToDownload = @(
    "preview.gif",
    "chinese_conversion.png",
    "japanese_conversion.png",
    "korean_conversion.png",
    "manual_download.png"
)

# [0/6] Close Spotify to prevent file lock issues
Write-Host "[0/6] Checking for running Spotify..." -ForegroundColor Yellow

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

# [1/6] Check Spicetify installation
Write-Host "[1/6] Checking Spicetify installation..." -ForegroundColor Yellow

$spicetifyPath = ""
try {
    $spicetifyPath = (Get-Command spicetify -ErrorAction Stop).Source
    Write-Host "  [OK] Spicetify found at: $spicetifyPath" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Spicetify not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Spicetify first:" -ForegroundColor Yellow
    Write-Host "  iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# [2/6] Get CustomApps path
Write-Host "[2/6] Locating CustomApps directory..." -ForegroundColor Yellow

$spicetifyConfig = & spicetify -c 2>$null
if (-not $spicetifyConfig) {
    $spicetifyConfig = Join-Path $env:APPDATA "spicetify"
}
$configDir = Split-Path $spicetifyConfig -Parent
$customAppsDir = Join-Path $env:LOCALAPPDATA "spicetify\CustomApps"

if (-not (Test-Path $customAppsDir)) {
    New-Item -ItemType Directory -Path $customAppsDir -Force | Out-Null
}

$appDir = Join-Path $customAppsDir $appName
Write-Host "  [OK] CustomApps directory: $customAppsDir" -ForegroundColor Green

# [3/6] Prepare installation directory with retry logic
Write-Host "[3/6] Preparing installation directory..." -ForegroundColor Yellow

$maxRetries = 3
$retryCount = 0
$removed = $false

while (-not $removed -and $retryCount -lt $maxRetries) {
    if (Test-Path $appDir) {
        try {
            Write-Host "  -> Removing existing $appName installation..." -ForegroundColor DarkYellow
            Remove-Item -Recurse -Force $appDir -ErrorAction Stop
            $removed = $true
        }
        catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "  [WARN] Folder locked, retrying in 2 seconds... ($retryCount/$maxRetries)" -ForegroundColor DarkYellow
                Start-Sleep -Seconds 2
            }
            else {
                Write-Host "  [ERROR] Cannot remove folder. Please close any editors or apps using these files." -ForegroundColor Red
                Write-Host "    Folder: $appDir" -ForegroundColor DarkYellow
                exit 1
            }
        }
    }
    else {
        $removed = $true
    }
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $appDir "assets") -Force | Out-Null
Write-Host "  [OK] Created: $appDir" -ForegroundColor Green

# [4/6] Download files
Write-Host "[4/6] Downloading files..." -ForegroundColor Yellow

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
    }
    catch {
        Write-Host "  [WARN] Failed to download: $file (optional)" -ForegroundColor DarkYellow
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
    }
    catch {
        Write-Host "  [WARN] Failed to download: assets/$asset (optional)" -ForegroundColor DarkYellow
    }
}

Write-Host "  [OK] Downloaded $downloadedCount files" -ForegroundColor Green

# [5/6] Configure Spicetify
Write-Host "[5/6] Configuring Spicetify..." -ForegroundColor Yellow

$currentApps = & spicetify config custom_apps 2>$null
if ($currentApps -notmatch $appName) {
    & spicetify config custom_apps "$appName" 2>$null
    Write-Host "  [OK] Added $appName to custom_apps" -ForegroundColor Green
}
else {
    Write-Host "  [OK] $appName already in custom_apps" -ForegroundColor Green
}

# [6/6] Apply changes
Write-Host ""
Write-Host "[6/6] Applying Spicetify changes..." -ForegroundColor Yellow
& spicetify apply 2>$null

# Done!
Write-Host ""
Write-Host "+============================================================+" -ForegroundColor Green
Write-Host "|              Installation Complete!                        |" -ForegroundColor Green
Write-Host "+============================================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Installed to: $appDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "    1. Start Spotify" -ForegroundColor White
Write-Host "    2. Click the lyrics icon in the sidebar" -ForegroundColor White
Write-Host "    3. Configure your Gemini API key in settings" -ForegroundColor White
Write-Host ""
Write-Host "  For updates, run this command again." -ForegroundColor DarkGray
Write-Host ""
