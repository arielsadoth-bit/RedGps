using System.Text.Json;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:8080");

var app = builder.Build();
var root = app.Environment.ContentRootPath;
var dataDirectory = Path.Combine(root, "data");
var databasePath = Path.Combine(dataDirectory, "redgps_exam.db");

Directory.CreateDirectory(dataDirectory);
InitializeDatabase(databasePath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(root),
});

app.MapGet("/api/results", () =>
{
    using var connection = OpenConnection(databasePath);
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT datos_json
        FROM resultados_examenes
        ORDER BY finalizado_en DESC
        LIMIT 50
        """;

    using var reader = command.ExecuteReader();
    var results = new List<JsonElement>();

    while (reader.Read())
    {
        using var document = JsonDocument.Parse(reader.GetString(0));
        results.Add(document.RootElement.Clone());
    }

    return Results.Json(results);
});

app.MapPost("/api/exam-access/{examId}", async (string examId, HttpRequest request) =>
{
    using var document = await JsonDocument.ParseAsync(request.Body);
    var token = GetString(document.RootElement, "token");

    if (string.IsNullOrWhiteSpace(examId) || string.IsNullOrWhiteSpace(token))
    {
        return Results.BadRequest(new { allowed = false, message = "El enlace del examen no es valido." });
    }

    using var connection = OpenConnection(databasePath);
    using var transaction = connection.BeginTransaction();

    using (var insertCommand = connection.CreateCommand())
    {
        insertCommand.Transaction = transaction;
        insertCommand.CommandText = """
            INSERT OR IGNORE INTO enlaces_examenes (id_examen, token_candidato, tomado_en)
            VALUES ($examId, $token, $takenAt)
            """;
        insertCommand.Parameters.AddWithValue("$examId", examId);
        insertCommand.Parameters.AddWithValue("$token", token);
        insertCommand.Parameters.AddWithValue("$takenAt", DateTime.UtcNow.ToString("O"));
        insertCommand.ExecuteNonQuery();
    }

    using var readCommand = connection.CreateCommand();
    readCommand.Transaction = transaction;
    readCommand.CommandText = "SELECT token_candidato FROM enlaces_examenes WHERE id_examen = $examId";
    readCommand.Parameters.AddWithValue("$examId", examId);
    var storedToken = Convert.ToString(readCommand.ExecuteScalar()) ?? "";
    transaction.Commit();

    return Results.Json(new
    {
        allowed = storedToken == token,
        message = storedToken == token
            ? "Examen habilitado."
            : "Este enlace ya fue abierto por otra persona."
    });
});

app.MapPost("/api/results", async (HttpRequest request) =>
{
    using var document = await JsonDocument.ParseAsync(request.Body);
    var rootElement = document.RootElement;

    var id = GetString(rootElement, "id");
    if (string.IsNullOrWhiteSpace(id))
    {
        return Results.BadRequest(new { error = "El resultado no tiene id." });
    }

    var score = GetInt(rootElement, "score");
    var manualScore = GetNullableInt(rootElement, "manualScore");
    var earnedPoints = GetInt(rootElement, "earnedPoints");
    var totalPoints = GetInt(rootElement, "totalPoints");
    var candidateName = GetString(rootElement, "candidateName");
    var manualNote = GetString(rootElement, "manualNote");
    var modifiedBy = GetFirstString(rootElement, "modifiedBy", "modificadoPor");
    var modifiedAt = GetFirstString(rootElement, "modifiedAt", "modificadoEn", "reviewedAt");
    var startedAt = GetString(rootElement, "startedAt");
    var finishedAt = GetString(rootElement, "finishedAt");
    var payload = JsonSerializer.Serialize(rootElement);

    using var connection = OpenConnection(databasePath);
    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO resultados_examenes
            (id, nombre_candidato, calificacion, calificacion_manual, puntos_obtenidos, puntos_totales, iniciado_en, finalizado_en, nota_manual, modificado_por, modificado_en, datos_json)
        VALUES
            ($id, $candidateName, $score, $manualScore, $earnedPoints, $totalPoints, $startedAt, $finishedAt, $manualNote, $modifiedBy, $modifiedAt, $payload)
        ON CONFLICT(id) DO UPDATE SET
            nombre_candidato = excluded.nombre_candidato,
            calificacion = excluded.calificacion,
            calificacion_manual = excluded.calificacion_manual,
            puntos_obtenidos = excluded.puntos_obtenidos,
            puntos_totales = excluded.puntos_totales,
            iniciado_en = excluded.iniciado_en,
            finalizado_en = excluded.finalizado_en,
            nota_manual = excluded.nota_manual,
            modificado_por = excluded.modificado_por,
            modificado_en = excluded.modificado_en,
            datos_json = excluded.datos_json
        """;
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$candidateName", candidateName);
    command.Parameters.AddWithValue("$score", score);
    command.Parameters.AddWithValue("$manualScore", manualScore is null ? DBNull.Value : manualScore);
    command.Parameters.AddWithValue("$earnedPoints", earnedPoints);
    command.Parameters.AddWithValue("$totalPoints", totalPoints);
    command.Parameters.AddWithValue("$startedAt", startedAt);
    command.Parameters.AddWithValue("$finishedAt", finishedAt);
    command.Parameters.AddWithValue("$manualNote", manualNote);
    command.Parameters.AddWithValue("$modifiedBy", modifiedBy);
    command.Parameters.AddWithValue("$modifiedAt", modifiedAt);
    command.Parameters.AddWithValue("$payload", payload);
    command.ExecuteNonQuery();
    SaveAnswerRows(connection, id, rootElement, modifiedBy, modifiedAt);

    return Results.Ok(new { ok = true });
});

app.MapDelete("/api/results", () =>
{
    using var connection = OpenConnection(databasePath);
    using var command = connection.CreateCommand();
    command.CommandText = """
        DELETE FROM respuestas_examenes;
        DELETE FROM resultados_examenes;
        DELETE FROM enlaces_examenes;
        """;
    command.ExecuteNonQuery();

    return Results.Ok(new { ok = true });
});

app.MapFallback(async context =>
{
    var fileProvider = new PhysicalFileProvider(root);
    var contentTypeProvider = new FileExtensionContentTypeProvider();
    var requestPath = context.Request.Path.Value?.TrimStart('/') ?? "";
    var relativePath = string.IsNullOrWhiteSpace(requestPath) ? "index.html" : requestPath;
    var fileInfo = fileProvider.GetFileInfo(relativePath);

    if (!fileInfo.Exists || fileInfo.IsDirectory)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsync("No encontrado");
        return;
    }

    if (!contentTypeProvider.TryGetContentType(fileInfo.Name, out var contentType))
    {
        contentType = "application/octet-stream";
    }

    context.Response.ContentType = contentType;
    await context.Response.SendFileAsync(fileInfo);
});

app.Run();

static SqliteConnection OpenConnection(string databasePath)
{
    var connection = new SqliteConnection($"Data Source={databasePath}");
    connection.Open();
    return connection;
}

static void InitializeDatabase(string databasePath)
{
    using var connection = OpenConnection(databasePath);
    using var command = connection.CreateCommand();
    command.CommandText = """
        CREATE TABLE IF NOT EXISTS resultados_examenes (
            id TEXT PRIMARY KEY,
            nombre_candidato TEXT NOT NULL DEFAULT '',
            calificacion INTEGER NOT NULL,
            calificacion_manual INTEGER,
            puntos_obtenidos INTEGER NOT NULL,
            puntos_totales INTEGER NOT NULL,
            iniciado_en TEXT NOT NULL,
            finalizado_en TEXT NOT NULL,
            nota_manual TEXT NOT NULL DEFAULT '',
            modificado_por TEXT NOT NULL DEFAULT '',
            modificado_en TEXT NOT NULL DEFAULT '',
            datos_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS respuestas_examenes (
            id_resultado TEXT NOT NULL,
            numero_pregunta INTEGER NOT NULL,
            area TEXT NOT NULL DEFAULT '',
            tipo_pregunta TEXT NOT NULL DEFAULT '',
            titulo_pregunta TEXT NOT NULL DEFAULT '',
            pregunta TEXT NOT NULL DEFAULT '',
            respuesta_candidato TEXT NOT NULL DEFAULT '',
            respuesta_esperada TEXT NOT NULL DEFAULT '',
            estado_automatico TEXT NOT NULL DEFAULT '',
            puntos_automaticos INTEGER NOT NULL DEFAULT 0,
            puntos_manual INTEGER,
            puntos_finales INTEGER NOT NULL DEFAULT 0,
            nota_manual TEXT NOT NULL DEFAULT '',
            modificado_por TEXT NOT NULL DEFAULT '',
            modificado_en TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (id_resultado, numero_pregunta),
            FOREIGN KEY (id_resultado) REFERENCES resultados_examenes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS enlaces_examenes (
            id_examen TEXT PRIMARY KEY,
            token_candidato TEXT NOT NULL,
            tomado_en TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_resultados_examenes_finalizado_en
        ON resultados_examenes(finalizado_en DESC);

        CREATE INDEX IF NOT EXISTS idx_respuestas_examenes_resultado
        ON respuestas_examenes(id_resultado);

        DROP VIEW IF EXISTS vista_resultados;
        CREATE VIEW vista_resultados AS
        SELECT
            id AS id_examen,
            nombre_candidato,
            calificacion,
            COALESCE(calificacion_manual, calificacion) AS calificacion_final,
            puntos_obtenidos,
            puntos_totales,
            iniciado_en,
            finalizado_en,
            nota_manual,
            modificado_por,
            modificado_en
        FROM resultados_examenes;

        DROP VIEW IF EXISTS vista_respuestas;
        CREATE VIEW vista_respuestas AS
        SELECT
            r.id_resultado AS id_examen,
            e.nombre_candidato,
            r.numero_pregunta,
            r.area,
            r.tipo_pregunta,
            r.titulo_pregunta,
            r.pregunta,
            r.respuesta_candidato,
            r.respuesta_esperada,
            r.estado_automatico,
            r.puntos_automaticos,
            r.puntos_manual,
            r.puntos_finales,
            r.nota_manual,
            r.modificado_por,
            r.modificado_en
        FROM respuestas_examenes r
        LEFT JOIN resultados_examenes e ON e.id = r.id_resultado;

        DROP VIEW IF EXISTS vista_enlaces_usados;
        CREATE VIEW vista_enlaces_usados AS
        SELECT
            id_examen,
            tomado_en
        FROM enlaces_examenes;
        """;
    command.ExecuteNonQuery();
    EnsureColumn(connection, "resultados_examenes", "modificado_por", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(connection, "resultados_examenes", "modificado_en", "TEXT NOT NULL DEFAULT ''");
    MigrateOldResultsTable(connection);
    BackfillAnswerRows(connection);
}

static string GetString(JsonElement element, string propertyName)
{
    if (element.ValueKind != JsonValueKind.Object)
    {
        return "";
    }

    return element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String
        ? property.GetString() ?? ""
        : "";
}

static string GetFirstString(JsonElement element, params string[] propertyNames)
{
    foreach (var propertyName in propertyNames)
    {
        var value = GetString(element, propertyName);
        if (!string.IsNullOrWhiteSpace(value))
        {
            return value;
        }
    }

    return "";
}

static int GetInt(JsonElement element, string propertyName)
{
    if (element.ValueKind != JsonValueKind.Object)
    {
        return 0;
    }

    return element.TryGetProperty(propertyName, out var property) && property.TryGetInt32(out var value)
        ? value
        : 0;
}

static int? GetNullableInt(JsonElement element, string propertyName)
{
    if (element.ValueKind != JsonValueKind.Object)
    {
        return null;
    }

    if (!element.TryGetProperty(propertyName, out var property) || property.ValueKind == JsonValueKind.Null)
    {
        return null;
    }

    return property.TryGetInt32(out var value) ? value : null;
}

static void SaveAnswerRows(SqliteConnection connection, string resultId, JsonElement result, string resultModifiedBy, string resultModifiedAt)
{
    if (!result.TryGetProperty("evaluated", out var evaluated) || evaluated.ValueKind != JsonValueKind.Array)
    {
        return;
    }

    using var deleteCommand = connection.CreateCommand();
    deleteCommand.CommandText = "DELETE FROM respuestas_examenes WHERE id_resultado = $resultId";
    deleteCommand.Parameters.AddWithValue("$resultId", resultId);
    deleteCommand.ExecuteNonQuery();

    var questionNumber = 1;
    foreach (var answer in evaluated.EnumerateArray())
    {
        var question = answer.TryGetProperty("question", out var questionElement)
            ? questionElement
            : default;
        var automaticPoints = GetInt(answer, "earned");
        var manualPoints = GetNullableInt(answer, "manualEarned");
        var finalPoints = manualPoints ?? automaticPoints;
        var answerModifiedBy = GetFirstString(answer, "modifiedBy", "modificadoPor");
        var answerModifiedAt = GetFirstString(answer, "modifiedAt", "modificadoEn");

        using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT OR REPLACE INTO respuestas_examenes
                (id_resultado, numero_pregunta, area, tipo_pregunta, titulo_pregunta, pregunta, respuesta_candidato, respuesta_esperada, estado_automatico, puntos_automaticos, puntos_manual, puntos_finales, nota_manual, modificado_por, modificado_en)
            VALUES
                ($resultId, $questionNumber, $area, $type, $title, $prompt, $answer, $expected, $stateLabel, $automaticPoints, $manualPoints, $finalPoints, $manualNote, $modifiedBy, $modifiedAt)
            """;
        insertCommand.Parameters.AddWithValue("$resultId", resultId);
        insertCommand.Parameters.AddWithValue("$questionNumber", questionNumber);
        insertCommand.Parameters.AddWithValue("$area", GetString(question, "area"));
        insertCommand.Parameters.AddWithValue("$type", GetString(question, "type"));
        insertCommand.Parameters.AddWithValue("$title", GetString(question, "title"));
        insertCommand.Parameters.AddWithValue("$prompt", GetString(question, "prompt"));
        insertCommand.Parameters.AddWithValue("$answer", GetString(answer, "answer"));
        insertCommand.Parameters.AddWithValue("$expected", GetString(question, "expected"));
        insertCommand.Parameters.AddWithValue("$stateLabel", GetString(answer, "stateLabel"));
        insertCommand.Parameters.AddWithValue("$automaticPoints", automaticPoints);
        insertCommand.Parameters.AddWithValue("$manualPoints", manualPoints is null ? DBNull.Value : manualPoints);
        insertCommand.Parameters.AddWithValue("$finalPoints", finalPoints);
        insertCommand.Parameters.AddWithValue("$manualNote", GetString(answer, "manualNote"));
        insertCommand.Parameters.AddWithValue("$modifiedBy", answerModifiedBy);
        insertCommand.Parameters.AddWithValue("$modifiedAt", answerModifiedAt);
        insertCommand.ExecuteNonQuery();

        questionNumber++;
    }
}

static void BackfillAnswerRows(SqliteConnection connection)
{
    using var command = connection.CreateCommand();
    command.CommandText = "SELECT id, datos_json, modificado_por, modificado_en FROM resultados_examenes";

    var savedRows = new List<(string Id, string Payload, string ModifiedBy, string ModifiedAt)>();
    using (var reader = command.ExecuteReader())
    {
        while (reader.Read())
        {
            savedRows.Add((reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3)));
        }
    }

    foreach (var row in savedRows)
    {
        using var document = JsonDocument.Parse(row.Payload);
        SaveAnswerRows(connection, row.Id, document.RootElement, row.ModifiedBy, row.ModifiedAt);
    }
}

static bool TableExists(SqliteConnection connection, string tableName)
{
    using var command = connection.CreateCommand();
    command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = $tableName";
    command.Parameters.AddWithValue("$tableName", tableName);
    return Convert.ToInt32(command.ExecuteScalar()) > 0;
}

static void EnsureColumn(SqliteConnection connection, string tableName, string columnName, string definition)
{
    using var readCommand = connection.CreateCommand();
    readCommand.CommandText = $"PRAGMA table_info({tableName})";

    using var reader = readCommand.ExecuteReader();
    while (reader.Read())
    {
        if (string.Equals(reader.GetString(1), columnName, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }
    }

    using var alterCommand = connection.CreateCommand();
    alterCommand.CommandText = $"ALTER TABLE {tableName} ADD COLUMN {columnName} {definition}";
    alterCommand.ExecuteNonQuery();
}

static void MigrateOldResultsTable(SqliteConnection connection)
{
    if (!TableExists(connection, "exam_results"))
    {
        return;
    }

    using var migrateCommand = connection.CreateCommand();
    migrateCommand.CommandText = """
        INSERT OR REPLACE INTO resultados_examenes
            (id, nombre_candidato, calificacion, calificacion_manual, puntos_obtenidos, puntos_totales, iniciado_en, finalizado_en, nota_manual, modificado_por, modificado_en, datos_json)
        SELECT
            id,
            COALESCE(candidate_name, ''),
            score,
            manual_score,
            earned_points,
            total_points,
            started_at,
            finished_at,
            COALESCE(manual_note, ''),
            '',
            '',
            payload_json
        FROM exam_results;
        DROP TABLE exam_results;
        """;
    migrateCommand.ExecuteNonQuery();
}
