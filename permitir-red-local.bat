@echo off
setlocal

net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall delete rule name="RedGPS Local 8080" >nul 2>&1
netsh advfirewall firewall add rule name="RedGPS Local 8080" dir=in action=allow protocol=TCP localport=8080 profile=private

echo.
echo Listo. El puerto 8080 quedo permitido para la red privada.
echo.
echo Abre desde el celular:
echo http://192.168.5.9:8080
echo.
pause
