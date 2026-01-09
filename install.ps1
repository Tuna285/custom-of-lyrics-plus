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

# Check for Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if ($currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host ""
    Write-Host "[ERROR] DO NOT RUN AS ADMINISTRATOR!" -ForegroundColor Red
    Write-Host "Spicetify cannot apply changes when running as Admin." -ForegroundColor Yellow
    Write-Host "Please close this window and run PowerShell normally." -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "+===================================================================+" -ForegroundColor Cyan
Write-Host "|                 Lyrics Plus Translate - Installer                 |" -ForegroundColor Cyan
Write-Host "|             AI-powered lyrics translation for Spotify             |" -ForegroundColor Cyan
Write-Host "+===================================================================+" -ForegroundColor Cyan
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
    "version.json",
    "README.md",
    "README_VI.md",
    "CHANGELOG.md",
    "LICENSE",
    "install.ps1",
    "uninstall.ps1",
    "i18n/LangEN.js",
    "i18n/LangVI.js",
    "i18n/I18n.js",
    "parsers/LRCParser.js",
    "utils/Utils.js",
    "services/AdBlocker.js",
    "utils/Config.js",
    "services/IDBCache.js",
    "utils/Cache.js",
    "utils/TranslationUtils.js",
    "services/UpdateService.js",
    "components/VideoManager.js",
    "utils/Prompts.js",
    "services/LyricsFetcher.js",
    "services/GeminiClient.js",
    "services/Translator.js",
    "components/Components.js",
    "providers/ProviderLRCLIB.js",
    "providers/ProviderMusixmatch.js",
    "providers/ProviderNetease.js",
    "providers/ProviderGenius.js",
    "providers/Providers.js",
    "components/SyncedLyrics.js",
    "components/UnsyncedLyrics.js",
    "components/TabBar.js",
    "components/Settings.js",
    "components/OptionsMenu.js",
    "components/PlaybarButton.js",
    "components/VideoBackground.js"
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
Write-Host "  [OK] Created: $appDir" -ForegroundColor Green

# [4/6] Download files
Write-Host "[4/6] Downloading files..." -ForegroundColor Yellow
Write-Host "  Downloading..." -ForegroundColor DarkGray

$downloadedCount = 0

foreach ($file in $filesToDownload) {
    $url = "$baseUrl/$file"
    $dest = Join-Path $appDir $file
    
    # Create subdirectory if needed
    $parentDir = Split-Path $dest -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
        $downloadedCount++
    }
    catch {
        Write-Host "  [WARN] Failed: $file" -ForegroundColor DarkYellow
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

# Run spicetify apply
& spicetify apply

# Check for failure
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  [ERROR] Spicetify apply failed!" -ForegroundColor Red
    Write-Host "  Please check the errors above." -ForegroundColor Yellow
    exit 1
}

# Done!
Write-Host ""
Write-Host "+======================================================================+" -ForegroundColor Green
Write-Host "|                        Installation Complete!                        |" -ForegroundColor Green
Write-Host "+======================================================================+" -ForegroundColor Green
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
