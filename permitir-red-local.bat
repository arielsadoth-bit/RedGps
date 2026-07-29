@echo off
setlocal

net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall delete rule name="RedGPS Local 8080" >nul 2>&1
netsh advfirewall firewall add rule name="RedGPS Local 8080" dir=in action=allow protocol=TCP localport=8080 profile=private

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set REDGPS_IP=%%i

echo.
echo Listo. El puerto 8080 quedo permitido para la red privada.
echo.
echo Abre desde el celular:
if defined REDGPS_IP (
  echo http://%REDGPS_IP%:8080
) else (
  echo http://IP-DE-ESTA-COMPUTADORA:8080
)
echo.
pause
