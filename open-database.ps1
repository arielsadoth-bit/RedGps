$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlite = Join-Path $root "tools\sqlite\sqlite3.exe"
$database = Join-Path $root "data\redgps_exam.db"
$sqliteStudio = "C:\Program Files\SQLiteStudio\SQLiteStudio.exe"

if (Test-Path $sqliteStudio) {
    Start-Process -FilePath $sqliteStudio -ArgumentList "`"$database`""
    return
}

& $sqlite $database
