$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlite = Join-Path $root "tools\sqlite\sqlite3.exe"
$database = Join-Path $root "data\redgps_exam.db"

& $sqlite $database ".tables"
& $sqlite $database ".schema vista_resultados"
& $sqlite $database "SELECT * FROM vista_resultados ORDER BY finalizado_en DESC;"
& $sqlite $database ".schema vista_respuestas"
& $sqlite $database "SELECT * FROM vista_respuestas ORDER BY id_examen, numero_pregunta;"
& $sqlite $database ".schema vista_enlaces_usados"
& $sqlite $database "SELECT * FROM vista_enlaces_usados ORDER BY tomado_en DESC;"
