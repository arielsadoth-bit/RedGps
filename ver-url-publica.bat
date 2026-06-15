@echo off
cd /d "%~dp0"
if exist URL_PUBLICA.txt (
  start "" URL_PUBLICA.txt
) else (
  echo Todavia no existe URL_PUBLICA.txt
  echo Primero abre abrir-publico.bat y espera unos segundos.
  pause
)
