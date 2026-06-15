$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$publicUrlFile = Join-Path $root "URL_PUBLICA.txt"
if (Test-Path $publicUrlFile) {
  Remove-Item $publicUrlFile -Force
}

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

try {
  Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 3 | Out-Null
} catch {
  Start-Process -FilePath powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$root\start-server.ps1" -WorkingDirectory $root -WindowStyle Hidden
  Start-Sleep -Seconds 8
}

Write-Host ""
Write-Host "Generando URL publica..."
Write-Host "Cuando aparezca, se copiara automaticamente al portapapeles y se abrira en el navegador."
Write-Host "Pega esa URL en el campo 'URL publica para candidatos' antes de generar el examen."
Write-Host "Deja esta ventana abierta mientras el candidato contesta."
Write-Host ""

$processInfo = [System.Diagnostics.ProcessStartInfo]::new()
$processInfo.FileName = $cloudflared
$processInfo.Arguments = 'tunnel --url http://localhost:8080'
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $false

$process = [System.Diagnostics.Process]::Start($processInfo)
$publicUrl = $null
$urlPattern = "https://[a-zA-Z0-9-]+\.trycloudflare\.com"

while (-not $process.HasExited) {
  $line = $process.StandardError.ReadLine()

  if ($null -eq $line) {
    Start-Sleep -Milliseconds 150
    continue
  }

  Write-Host $line

  if (-not $publicUrl -and $line -match $urlPattern) {
    $publicUrl = $Matches[0]
    Set-Content -Path $publicUrlFile -Value $publicUrl -Encoding UTF8
    Set-Clipboard $publicUrl
    Start-Process $publicUrl
    Write-Host ""
    Write-Host "URL PUBLICA COPIADA:"
    Write-Host $publicUrl
    Write-Host ""
    Write-Host "Ahora pega esta URL en el campo 'URL publica para candidatos' y genera el examen."
    Write-Host ""
  }
}
