using System.Text.Json;
using System.Collections.Concurrent;
using System.Text;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:8080");

var app = builder.Build();
var root = app.Environment.ContentRootPath;
var dataDirectory = Path.Combine(root, "data");
var databasePath = Path.Combine(dataDirectory, "redgps_exam.db");
var sessions = new ConcurrentDictionary<string, string>();

Directory.CreateDirectory(dataDirectory);
InitializeDatabase(databasePath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(root),
});

app.MapPost("/api/login", async (HttpRequest request) =>
{
    using var document = await JsonDocument.ParseAsync(request.Body);
    var user = GetString(document.RootElement, "user").Trim().ToLowerInvariant();
    var password = GetString(document.RootElement, "password");

    if (!AppData.Interviewers.TryGetValue(user, out var savedPassword) || savedPassword != password)
    {
        return Results.Unauthorized();
    }

    var token = Guid.NewGuid().ToString("N");
    sessions[token] = user;
    return Results.Json(new { ok = true, user, token });
});

app.MapGet("/api/questions", () => Results.Json(AppData.Questions.Select(ToPublicQuestion)));

app.MapGet("/api/answer-key", (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out _))
    {
        return Results.Unauthorized();
    }

    return Results.Json(AppData.Questions.Select(question => new
    {
        question.Id,
        question.Area,
        question.Type,
        question.Title,
        question.Prompt,
        question.Points,
        question.Expected,
        CorrectAnswer = question.CorrectAnswer,
        question.Options
    }));
});

app.MapGet("/api/results", (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out _))
    {
        return Results.Unauthorized();
    }

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

app.MapPost("/api/evaluate", async (HttpRequest request) =>
{
    using var document = await JsonDocument.ParseAsync(request.Body);
    var rootElement = document.RootElement;
    var savedResult = EvaluateExam(rootElement, includeExpected: true);
    var result = EvaluateExam(rootElement, includeExpected: false);

    if (savedResult is null || result is null)
    {
        return Results.BadRequest(new { error = "El resultado no tiene id." });
    }

    using var connection = OpenConnection(databasePath);
    SaveResult(connection, JsonSerializer.SerializeToElement(savedResult));

    return Results.Json(result);
});

app.MapPost("/api/results", async (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out _))
    {
        return Results.Unauthorized();
    }

    using var document = await JsonDocument.ParseAsync(request.Body);
    using var connection = OpenConnection(databasePath);
    SaveResult(connection, document.RootElement);

    return Results.Ok(new { ok = true });
});

static void SaveResult(SqliteConnection connection, JsonElement rootElement)
{
    var id = GetString(rootElement, "id");
    if (string.IsNullOrWhiteSpace(id))
    {
        throw new InvalidOperationException("El resultado no tiene id.");
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
}

app.MapDelete("/api/results", (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out _))
    {
        return Results.Unauthorized();
    }

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
    var allowedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "",
        "index.html",
        "styles.css",
        "app.js",
        "assets/redgps-logo.svg"
    };

    var fileProvider = new PhysicalFileProvider(root);
    var contentTypeProvider = new FileExtensionContentTypeProvider();
    var requestPath = context.Request.Path.Value?.TrimStart('/') ?? "";

    if (!allowedFiles.Contains(requestPath))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsync("No encontrado");
        return;
    }

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

static bool TryGetInterviewer(HttpRequest request, ConcurrentDictionary<string, string> sessions, out string user)
{
    user = "";
    var token = request.Headers["X-Interview-Token"].FirstOrDefault() ?? "";
    if (!string.IsNullOrWhiteSpace(token) && sessions.TryGetValue(token, out var savedUser))
    {
        user = savedUser;
        return true;
    }

    return false;
}

static object ToPublicQuestion(ExamQuestion question) => new
{
    question.Id,
    question.Area,
    question.Type,
    question.Title,
    question.Prompt,
    question.Points,
    question.Options
};

static object ToResultQuestion(ExamQuestion question, bool includeExpected)
{
    if (!includeExpected)
    {
        return ToPublicQuestion(question);
    }

    return new
    {
        question.Id,
        question.Area,
        question.Type,
        question.Title,
        question.Prompt,
        question.Points,
        question.Options,
        question.Expected
    };
}

static object? EvaluateExam(JsonElement request, bool includeExpected)
{
    var id = GetString(request, "id");
    if (string.IsNullOrWhiteSpace(id))
    {
        return null;
    }

    var questionIds = GetQuestionIds(request).Take(5).ToList();
    if (questionIds.Count == 0)
    {
        return null;
    }

    var answers = request.TryGetProperty("answers", out var answersElement) && answersElement.ValueKind == JsonValueKind.Object
        ? answersElement
        : default;

    var selectedQuestions = questionIds
        .Select(idValue => AppData.Questions.FirstOrDefault(question => question.Id == idValue))
        .Where(question => question is not null)
        .Cast<ExamQuestion>()
        .ToList();

    var evaluated = selectedQuestions.Select(question =>
    {
        var answer = GetString(answers, question.Id);
        return question.Type == "closed"
            ? EvaluateClosed(question, answer, includeExpected)
            : EvaluateOpen(question, answer, includeExpected);
    }).ToList();
    var totalPoints = selectedQuestions.Sum(question => question.Points);
    var earnedPoints = evaluated.Sum(item => (int)item.GetType().GetProperty("earned")!.GetValue(item)!);
    var score = totalPoints == 0 ? 0 : (int)Math.Round((double)earnedPoints / totalPoints * 100);
    var answerDictionary = new Dictionary<string, string>();
    if (answers.ValueKind == JsonValueKind.Object)
    {
        foreach (var property in answers.EnumerateObject())
        {
            answerDictionary[property.Name] = property.Value.ValueKind == JsonValueKind.String
                ? property.Value.GetString() ?? ""
                : property.Value.ToString();
        }
    }

    return new
    {
        id,
        candidateName = GetString(request, "candidateName"),
        score,
        automaticScore = score,
        manualScore = (int?)null,
        manualNote = "",
        earnedPoints,
        totalPoints,
        evaluated,
        answers = answerDictionary,
        startedAt = GetString(request, "startedAt"),
        finishedAt = GetString(request, "finishedAt")
    };
}

static IEnumerable<string> GetQuestionIds(JsonElement request)
{
    if (request.TryGetProperty("questionIds", out var questionIds) && questionIds.ValueKind == JsonValueKind.Array)
    {
        foreach (var item in questionIds.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                yield return item.GetString() ?? "";
            }
        }
    }
}

static object EvaluateClosed(ExamQuestion question, string answer, bool includeExpected)
{
    var isCorrect = answer == question.CorrectAnswer;
    var feedback = isCorrect
        ? "La opcion seleccionada es correcta."
        : "La opcion seleccionada no fue correcta.";

    return new
    {
        question = ToResultQuestion(question, includeExpected),
        answer,
        earned = isCorrect ? question.Points : 0,
        stateLabel = isCorrect ? "Correcta" : "Incorrecta",
        stateClass = isCorrect ? "correct" : "wrong",
        feedback
    };
}

static object EvaluateOpen(ExamQuestion question, string answer, bool includeExpected)
{
    var normalizedAnswer = NormalizeText(answer);
    var foundKeywords = question.Keywords
        .Where(keyword => normalizedAnswer.Contains(NormalizeText(keyword)))
        .ToList();
    var keywordRatio = question.Keywords.Count == 0 ? 0 : (double)foundKeywords.Count / question.Keywords.Count;
    var similarity = GetTextSimilarity(answer, question.Expected);
    var ratio = Math.Max(keywordRatio, similarity);
    var earned = (int)Math.Round(question.Points * ratio);
    var missing = question.Keywords.Where(keyword => !foundKeywords.Contains(keyword)).ToList();

    var stateLabel = "Incorrecta";
    var stateClass = "wrong";
    var feedback = $"Faltaron elementos clave: {string.Join(", ", missing)}.";

    if (ratio >= 0.8)
    {
        stateLabel = "Correcta";
        stateClass = "correct";
        feedback = "La respuesta se acerca correctamente a la respuesta esperada.";
    }
    else if (ratio >= 0.45)
    {
        stateLabel = "Parcial";
        stateClass = "partial";
        feedback = $"La respuesta se acerca, pero faltan puntos importantes: {string.Join(", ", missing)}.";
    }

    return new
    {
        question = ToResultQuestion(question, includeExpected),
        answer,
        foundKeywords,
        earned,
        stateLabel,
        stateClass,
        feedback
    };
}

static string NormalizeText(string value)
{
    var normalized = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
    var builder = new StringBuilder();

    foreach (var character in normalized)
    {
        var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character);
        if (category == System.Globalization.UnicodeCategory.NonSpacingMark)
        {
            continue;
        }

        builder.Append(char.IsLetterOrDigit(character) || char.IsWhiteSpace(character) || "#.+".Contains(character) ? character : ' ');
    }

    return string.Join(" ", builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
}

static double GetTextSimilarity(string answer, string expected)
{
    var answerWords = NormalizeText(answer).Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(word => word.Length > 3).ToHashSet();
    var expectedWords = NormalizeText(expected).Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(word => word.Length > 3).ToHashSet();

    if (answerWords.Count == 0 || expectedWords.Count == 0)
    {
        return 0;
    }

    return expectedWords.Count(word => answerWords.Contains(word)) / (double)expectedWords.Count;
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

record ExamOption(string Key, string Text);

record ExamQuestion(
    string Id,
    string Area,
    string Type,
    string Title,
    string Prompt,
    int Points,
    List<ExamOption> Options,
    string CorrectAnswer,
    string Expected,
    List<string> Keywords
);

static class AppData
{
public static readonly Dictionary<string, string> Interviewers = new(StringComparer.OrdinalIgnoreCase)
{
    ["ariel"] = "12345",
    ["hector"] = "12345",
    ["ilian"] = "12345",
    ["alejandro"] = "12345",
};

public static readonly List<ExamQuestion> Questions =
[
    new("soft-html", "Desarrollo de Software", "closed", "Que significa HTML", "Que significa HTML?", 20,
        [new("A", "Hyper Text Markup Language"), new("B", "High Transfer Machine Language"), new("C", "Hyper Tool Multi Language"), new("D", "Home Text Markup Language")],
        "A", "Hyper Text Markup Language", []),
    new("soft-language", "Desarrollo de Software", "closed", "Lenguaje de programacion", "Cual de los siguientes es un lenguaje de programacion?", 20,
        [new("A", "CSS"), new("B", "JavaScript"), new("C", "HTML"), new("D", "XML")],
        "B", "JavaScript", []),
    new("soft-db", "Desarrollo de Software", "closed", "Base de datos relacional", "Que base de datos es relacional?", 20,
        [new("A", "MongoDB"), new("B", "Firebase"), new("C", "MySQL"), new("D", "Redis")],
        "C", "MySQL", []),
    new("soft-git", "Desarrollo de Software", "closed", "Guardar cambios en Git", "Que comando se utiliza para guardar cambios en Git?", 20,
        [new("A", "git push"), new("B", "git commit"), new("C", "git clone"), new("D", "git pull")],
        "B", "git commit", []),
    new("soft-loop", "Desarrollo de Software", "closed", "Repetir instrucciones", "Que estructura se utiliza para repetir instrucciones?", 20,
        [new("A", "if"), new("B", "switch"), new("C", "for"), new("D", "case")],
        "C", "for", []),
    new("soft-poo", "Desarrollo de Software", "open", "Programacion Orientada a Objetos", "Que es la Programacion Orientada a Objetos (POO)?", 20,
        [], "", "Paradigma basado en clases y objetos que utiliza conceptos como encapsulamiento, herencia, polimorfismo y abstraccion.",
        ["paradigma", "clases", "objetos", "encapsulamiento", "herencia", "polimorfismo", "abstraccion"]),
    new("soft-front-back", "Desarrollo de Software", "open", "Frontend y Backend", "Explique la diferencia entre Frontend y Backend.", 20,
        [], "", "Frontend: Parte visual con la que interactua el usuario. Backend: Logica de negocio, bases de datos y procesamiento del sistema.",
        ["frontend", "visual", "usuario", "backend", "logica", "base de datos", "procesamiento"]),
    new("soft-api", "Desarrollo de Software", "open", "API", "Que es una API y para que sirve?", 20,
        [], "", "Permite la comunicacion entre sistemas o aplicaciones mediante solicitudes y respuestas.",
        ["comunicacion", "sistemas", "aplicaciones", "solicitudes", "respuestas"]),
    new("soft-performance", "Desarrollo de Software", "open", "Aplicacion lenta", "Que haria si una aplicacion se vuelve lenta?", 20,
        [], "", "Analizar rendimiento, revisar consultas a bases de datos, optimizar codigo, reducir cargas innecesarias y monitorear recursos.",
        ["rendimiento", "consultas", "base de datos", "optimizar", "codigo", "cargas", "monitorear", "recursos"]),
    new("soft-web-flow", "Desarrollo de Software", "open", "Flujo de pagina web", "Explique el flujo desde que un usuario entra a una pagina web hasta que ve la informacion.", 20,
        [], "", "El navegador envia una peticion al servidor, este procesa la solicitud, consulta la base de datos si es necesario y devuelve una respuesta para mostrarse en pantalla.",
        ["navegador", "peticion", "servidor", "procesa", "solicitud", "base de datos", "respuesta", "pantalla"]),
    new("mobile-android-language", "Desarrollo Mobile", "closed", "Lenguaje principal Android", "Cual es el lenguaje principal para Android actualmente?", 20,
        [new("A", "Swift"), new("B", "Kotlin"), new("C", "PHP"), new("D", "Python")],
        "B", "Kotlin", []),
    new("mobile-ios-language", "Desarrollo Mobile", "closed", "Lenguaje principal iOS", "Cual es el lenguaje principal para iOS?", 20,
        [new("A", "Java"), new("B", "Kotlin"), new("C", "Swift"), new("D", "C#")],
        "C", "Swift", []),
    new("mobile-xcode", "Desarrollo Mobile", "closed", "Herramienta iOS", "Que herramienta se utiliza principalmente para desarrollar aplicaciones iOS?", 20,
        [new("A", "Android Studio"), new("B", "Visual Studio"), new("C", "Xcode"), new("D", "Eclipse")],
        "C", "Xcode", []),
    new("mobile-apk", "Desarrollo Mobile", "closed", "Formato Android", "Que formato utiliza Android para instalar aplicaciones?", 20,
        [new("A", ".ipa"), new("B", ".apk"), new("C", ".exe"), new("D", ".dmg")],
        "B", ".apk", []),
    new("mobile-cross-platform", "Desarrollo Mobile", "closed", "Una sola base de codigo", "Que framework permite desarrollar una aplicacion para Android e iOS con una sola base de codigo?", 20,
        [new("A", "Laravel"), new("B", "React Native"), new("C", "Spring Boot"), new("D", "Django")],
        "B", "React Native", []),
    new("mobile-native-multi", "Desarrollo Mobile", "open", "Nativo y multiplataforma", "Explique la diferencia entre desarrollo nativo y multiplataforma.", 20,
        [], "", "Nativo: Codigo especifico para Android o iOS. Multiplataforma: Un solo codigo para ambas plataformas.",
        ["nativo", "codigo especifico", "android", "ios", "multiplataforma", "un solo codigo", "ambas plataformas"]),
    new("mobile-activity", "Desarrollo Mobile", "open", "Activity en Android", "Que es una Activity en Android?", 20,
        [], "", "Es una pantalla o interfaz con la que interactua el usuario dentro de una aplicacion.",
        ["pantalla", "interfaz", "interactua", "usuario", "aplicacion"]),
    new("mobile-lifecycle", "Desarrollo Mobile", "open", "Ciclo de vida movil", "Que es el ciclo de vida de una aplicacion movil?", 20,
        [], "", "Son los estados por los que pasa una aplicacion: creacion, inicio, pausa, reanudacion y destruccion.",
        ["estados", "creacion", "inicio", "pausa", "reanudacion", "destruccion"]),
    new("mobile-rest", "Desarrollo Mobile", "open", "Consumir API REST", "Como consumiria una API REST desde una aplicacion movil?", 20,
        [], "", "Realizando solicitudes HTTP (GET, POST, PUT, DELETE), procesando la respuesta y mostrando los datos al usuario.",
        ["solicitudes", "http", "get", "post", "put", "delete", "respuesta", "datos", "usuario"]),
    new("mobile-performance", "Desarrollo Mobile", "open", "Rendimiento movil", "Que haria para mejorar el rendimiento de una aplicacion movil?", 20,
        [], "", "Optimizar imagenes, reducir llamadas innecesarias al servidor, usar cache, mejorar consultas y controlar el consumo de memoria.",
        ["optimizar", "imagenes", "llamadas", "servidor", "cache", "consultas", "memoria"]),
];
}
