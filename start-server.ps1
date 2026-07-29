$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$publishPath = Join-Path $root "obj\local-publish"

dotnet publish ".\RedGpsExam.csproj" -c Release -r win-x64 --self-contained false -o $publishPath

$env:ASPNETCORE_URLS = "http://0.0.0.0:8080"
& (Join-Path $publishPath "RedGpsExam.exe")
