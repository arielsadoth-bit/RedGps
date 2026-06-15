$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlite = Join-Path $root "tools\sqlite\sqlite3.exe"
$database = Join-Path $root "data\redgps_exam.db"
$csv = Join-Path $root "data\resultados_examenes.csv"
$answersCsv = Join-Path $root "data\respuestas_examenes.csv"

& $sqlite $database ".headers on" ".mode csv" ".once $csv" "SELECT id AS id_examen, nombre_candidato, calificacion, calificacion_manual, puntos_obtenidos, puntos_totales, iniciado_en, finalizado_en, nota_manual, modificado_por, modificado_en FROM resultados_examenes ORDER BY finalizado_en DESC;"
& $sqlite $database ".headers on" ".mode csv" ".once $answersCsv" "SELECT id_resultado, numero_pregunta, area, tipo_pregunta, titulo_pregunta, pregunta, respuesta_candidato, respuesta_esperada, estado_automatico, puntos_automaticos, puntos_manual, puntos_finales, nota_manual, modificado_por, modificado_en FROM respuestas_examenes ORDER BY id_resultado, numero_pregunta;"

Start-Process $csv
Start-Process $answersCsv
