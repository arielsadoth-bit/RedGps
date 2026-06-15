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
    throw "No se encontro cloudflared. Instala Cloudflare.cloudflared con winget."
}

$cert = Join-Path $env:USERPROFILE ".cloudflared\cert.pem"
if (-not (Test-Path $cert)) {
    Write-Host ""
    Write-Host "Primero inicia sesion en Cloudflare."
    Write-Host "Se abrira una pagina para elegir el dominio."
    Write-Host ""
    & $cloudflared tunnel login
}

if (-not (Test-Path $cert)) {
    throw "No se encontro el certificado de Cloudflare. Vuelve a ejecutar este script despues de iniciar sesion."
}

$hostname = Read-Host "Escribe la URL fija completa (ejemplo: examen.redgps.com)"
if ([string]::IsNullOrWhiteSpace($hostname) -or $hostname -notmatch "^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$") {
    throw "La URL fija no es valida. Ejemplo correcto: examen.redgps.com"
}

$tunnelName = "redgps-examen"
$cloudflaredDir = Join-Path $env:USERPROFILE ".cloudflared"
$configPath = Join-Path $cloudflaredDir "redgps-examen.yml"
$urlFile = Join-Path $root "URL_FIJA.txt"

$tunnelsJson = & $cloudflared tunnel list --output json 2>$null
$existingTunnel = $null
if (-not [string]::IsNullOrWhiteSpace($tunnelsJson)) {
    $existingTunnel = ($tunnelsJson | ConvertFrom-Json) | Where-Object { $_.name -eq $tunnelName } | Select-Object -First 1
}

if (-not $existingTunnel) {
    Write-Host "Creando tunel fijo '$tunnelName'..."
    & $cloudflared tunnel create $tunnelName
    $tunnelsJson = & $cloudflared tunnel list --output json
    $existingTunnel = ($tunnelsJson | ConvertFrom-Json) | Where-Object { $_.name -eq $tunnelName } | Select-Object -First 1
}

if (-not $existingTunnel) {
    throw "No se pudo crear o encontrar el tunel fijo."
}

$tunnelId = $existingTunnel.id
$credentialsPath = Join-Path $cloudflaredDir "$tunnelId.json"

@"
tunnel: $tunnelId
credentials-file: $credentialsPath

ingress:
  - hostname: $hostname
    service: http://localhost:8080
  - service: http_status:404
"@ | Set-Content -Path $configPath -Encoding ASCII

Write-Host "Conectando DNS de $hostname al tunel..."
& $cloudflared tunnel route dns $tunnelName $hostname

Set-Content -Path $urlFile -Value "https://$hostname" -Encoding ASCII

Write-Host ""
Write-Host "URL fija configurada:"
Write-Host "https://$hostname"
Write-Host ""
Write-Host "Para abrirla usa: iniciar-url-fija.bat"
Write-Host ""

Start-Process "https://$hostname"
