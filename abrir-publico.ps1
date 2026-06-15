$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$publicUrlFile = Join-Path $root "URL_PUBLICA.txt"
if (Test-Path $publicUrlFile) {
  Remove-Item $publicUrlFile -Force
}

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

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
Write-Host "Cuando aparezca y responda correctamente, se copiara automaticamente al portapapeles y se abrira en el navegador."
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
    $candidateUrl = $Matches[0]
    Write-Host ""
    Write-Host "Probando URL publica:"
    Write-Host $candidateUrl

    $ready = $false
    for ($attempt = 1; $attempt -le 12; $attempt++) {
      try {
        Invoke-WebRequest -Uri $candidateUrl -UseBasicParsing -TimeoutSec 5 | Out-Null
        $ready = $true
        break
      } catch {
        Write-Host "Esperando que Cloudflare active la URL... intento $attempt/12"
        Start-Sleep -Seconds 3
      }
    }

    if ($ready) {
      $publicUrl = $candidateUrl
      Set-Content -Path $publicUrlFile -Value $publicUrl -Encoding UTF8
      Set-Clipboard $publicUrl
      Start-Process $publicUrl
      Write-Host ""
      Write-Host "URL PUBLICA LISTA Y COPIADA:"
      Write-Host $publicUrl
      Write-Host ""
      Write-Host "Usa esta URL para entrar desde fuera de tu red."
      Write-Host ""
    } else {
      Write-Host ""
      Write-Host "Cloudflare entrego una URL, pero todavia no responde. Cierra esta ventana e intenta abrir-publico.bat otra vez."
      Write-Host ""
    }
  }
}
