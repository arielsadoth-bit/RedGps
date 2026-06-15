$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlite = Join-Path $root "tools\sqlite\sqlite3.exe"
$database = Join-Path $root "data\redgps_exam.db"
$sqliteStudio = "C:\Program Files\SQLiteStudio\SQLiteStudio.exe"
$sqliteStudioSettings = Join-Path $env:LOCALAPPDATA "SalSoft\SQLiteStudio\settings3"

if (Test-Path $sqliteStudio) {
    if ((Test-Path $sqliteStudioSettings) -and (Test-Path $database)) {
        $databasePath = $database.Replace("\", "/")
        & $sqlite $sqliteStudioSettings "INSERT OR REPLACE INTO dblist(name, path, options) VALUES('redgps_exam', '$databasePath', '{}'); INSERT OR REPLACE INTO groups(id, name, parent, [order], open, dbname, db_expanded) VALUES(1, 'redgps_exam', NULL, 0, 1, 'redgps_exam', 1);"
    }

    Start-Process -FilePath $sqliteStudio
    return
}

& $sqlite $database
