$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$cloudflared = (Get-Command cloudflared.exe -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
    $possiblePath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if (Test-Path $possiblePath) {
        $cloudflared = $possiblePath
    }
}

if (-not $cloudflared) {
    throw "No se encontro cloudflared."
}

$configPath = Join-Path $env:USERPROFILE ".cloudflared\redgps-examen.yml"
$urlFile = Join-Path $root "URL_FIJA.txt"

if (-not (Test-Path $configPath)) {
    throw "Primero ejecuta configurar-url-fija.bat"
}

try {
    Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 3 | Out-Null
} catch {
    Start-Process -FilePath powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$root\start-server.ps1" -WorkingDirectory $root -WindowStyle Hidden
    Start-Sleep -Seconds 8
}

if (Test-Path $urlFile) {
    $url = Get-Content $urlFile
    Start-Process $url
}

Write-Host "Iniciando URL fija. Deja esta ventana abierta."
& $cloudflared tunnel --config $configPath run
