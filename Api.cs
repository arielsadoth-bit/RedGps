using System.Text.Json;
using System.Collections.Concurrent;
using System.Text;
using System.Security.Cryptography;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var app = builder.Build();
var root = app.Environment.ContentRootPath;
var configuredDataDirectory = Environment.GetEnvironmentVariable("DATA_DIR");
var dataDirectory = string.IsNullOrWhiteSpace(configuredDataDirectory)
    ? Path.Combine(root, "data")
    : configuredDataDirectory;
var databasePath = Path.Combine(dataDirectory, "redgps_exam.db");
var sessions = new ConcurrentDictionary<string, InterviewSession>();

Directory.CreateDirectory(dataDirectory);
InitializeDatabase(databasePath);

app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = new PhysicalFileProvider(root),
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(root),
});

app.MapPost("/api/login", async (HttpRequest request) =>
{
    using var document = await JsonDocument.ParseAsync(request.Body);
    var user = GetString(document.RootElement, "user").Trim().ToLowerInvariant();
    var password = GetString(document.RootElement, "password");

    using var connection = OpenConnection(databasePath);
    if (!IsAuthorizedInterviewer(connection, user, password))
    {
        return Results.Unauthorized();
    }

    var role = GetInterviewerRole(connection, user);
    var token = Guid.NewGuid().ToString("N");
    sessions[token] = new InterviewSession(user, role);
    return Results.Json(new { ok = true, user, role, token });
});

app.MapGet("/api/questions", () =>
{
    using var connection = OpenConnection(databasePath);
    return Results.Json(LoadQuestions(connection, activeOnly: true).Select(ToPublicQuestion));
});

app.MapPost("/api/questions", async (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out _, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede agregar preguntas." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var document = await JsonDocument.ParseAsync(request.Body);
    var (question, error) = BuildQuestionFromRequest(document.RootElement);
    if (question is null)
    {
        return Results.BadRequest(new { error });
    }

    using var connection = OpenConnection(databasePath);
    SaveQuestion(connection, question);

    return Results.Json(ToPublicQuestion(question));
});

app.MapDelete("/api/questions", async (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out _, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede borrar preguntas." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var document = await JsonDocument.ParseAsync(request.Body);
    var ids = GetFirstStringArray(document.RootElement, "ids", "questionIds", "preguntas")
        .Select(id => id.Trim())
        .Where(id => !string.IsNullOrWhiteSpace(id))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    if (ids.Count == 0)
    {
        return Results.BadRequest(new { error = "Selecciona al menos una pregunta." });
    }

    using var connection = OpenConnection(databasePath);
    using var transaction = connection.BeginTransaction();
    using var command = connection.CreateCommand();
    command.Transaction = transaction;
    command.CommandText = "UPDATE banco_preguntas SET activo = 0 WHERE id = $id";
    var idParameter = command.CreateParameter();
    idParameter.ParameterName = "$id";
    command.Parameters.Add(idParameter);

    var deleted = 0;
    foreach (var id in ids)
    {
        idParameter.Value = id;
        deleted += command.ExecuteNonQuery();
    }

    transaction.Commit();
    return Results.Json(new { ok = true, deleted });
});

app.MapGet("/api/users", (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out _, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede ver usuarios." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var connection = OpenConnection(databasePath);
    return Results.Json(LoadInterviewerUsers(connection));
});

app.MapPost("/api/users", async (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out _, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede crear usuarios." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var document = await JsonDocument.ParseAsync(request.Body);
    var (user, error) = BuildInterviewerUserFromRequest(document.RootElement, requirePassword: true);
    if (user is null)
    {
        return Results.BadRequest(new { error });
    }

    using var connection = OpenConnection(databasePath);
    SaveInterviewerUser(connection, user.Email, user.Password, user.Role, user.Active);
    return Results.Ok(new { ok = true });
});

app.MapPost("/api/users/update", async (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out var session, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede modificar usuarios." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var document = await JsonDocument.ParseAsync(request.Body);
    var email = GetString(document.RootElement, "email").Trim().ToLowerInvariant();
    var role = NormalizeRole(GetString(document.RootElement, "role"));
    var active = GetBool(document.RootElement, "active", true);
    var password = GetString(document.RootElement, "password");

    if (!IsValidEmailAddress(email))
    {
        return Results.BadRequest(new { error = "El correo no es valido." });
    }

    if (string.Equals(email, session.User, StringComparison.OrdinalIgnoreCase) && (!active || role != "admin"))
    {
        return Results.BadRequest(new { error = "No puedes quitarte tu propio permiso de administrador." });
    }

    if (!string.IsNullOrWhiteSpace(password) && !IsValidInterviewerPassword(password))
    {
        return Results.BadRequest(new { error = "La contrasena debe tener entre 6 y 8 caracteres." });
    }

    using var connection = OpenConnection(databasePath);
    UpdateInterviewerUser(connection, email, role, active, password);
    return Results.Ok(new { ok = true });
});

app.MapGet("/api/answer-key", (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out _))
    {
        return Results.Unauthorized();
    }

    using var connection = OpenConnection(databasePath);
    return Results.Json(LoadQuestions(connection, activeOnly: true).Select(question => new
    {
        question.Id,
        question.Area,
        question.Type,
        question.Title,
        question.Prompt,
        question.Points,
        question.Expected,
        CorrectAnswer = question.CorrectAnswer,
        question.Options,
        Runner = ToPublicRunner(question.Runner),
        SolutionCode = question.Runner?.SolutionCode ?? ""
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
        WHERE COALESCE(eliminado, 0) = 0
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

app.MapGet("/api/exams", (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out _))
    {
        return Results.Unauthorized();
    }

    using var connection = OpenConnection(databasePath);
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT
            e.id,
            e.nombre_examen,
            e.cantidad_preguntas,
            e.cantidad_links,
            COALESCE(NULLIF(e.correo_candidato, ''), r.correo_candidato, '') AS correo_candidato,
            e.link_acceso,
            e.tiempo_minutos,
            e.creado_por,
            e.creado_en,
            e.datos_json,
            COALESCE(l.tomado_en, '') AS abierto_en,
            COALESCE(r.finalizado_en, '') AS completado_en
        FROM examenes_creados e
        LEFT JOIN enlaces_examenes l ON l.id_examen = e.id
        LEFT JOIN resultados_examenes r ON r.id = e.id AND COALESCE(r.eliminado, 0) = 0
        ORDER BY e.creado_en DESC
        LIMIT 200
        """;

    using var reader = command.ExecuteReader();
    var exams = new List<object>();

    while (reader.Read())
    {
        using var document = JsonDocument.Parse(reader.GetString(9));
        var rootElement = document.RootElement;
        exams.Add(new
        {
            id = reader.GetString(0),
            examName = reader.GetString(1),
            questionCount = reader.GetInt32(2),
            linkCount = reader.GetInt32(3),
            candidateEmail = reader.GetString(4),
            link = reader.GetString(5),
            timeLimit = reader.GetInt32(6),
            createdBy = reader.GetString(7),
            createdAt = reader.GetString(8),
            openedAt = GetDbString(reader, 10),
            completedAt = GetDbString(reader, 11),
            questionIds = GetStringArray(rootElement, "questionIds")
        });
    }

    return Results.Json(exams);
});

app.MapGet("/api/link-tracking", (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out _, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede ver el seguimiento de enlaces." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var connection = OpenConnection(databasePath);
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT
            e.id,
            e.nombre_examen,
            e.cantidad_preguntas,
            e.cantidad_links,
            COALESCE(NULLIF(e.correo_candidato, ''), r.correo_candidato, '') AS correo_candidato,
            e.link_acceso,
            e.creado_por,
            e.creado_en,
            COALESCE(l.tomado_en, '') AS abierto_en,
            COALESCE(r.finalizado_en, '') AS completado_en
        FROM examenes_creados e
        LEFT JOIN enlaces_examenes l ON l.id_examen = e.id
        LEFT JOIN resultados_examenes r ON r.id = e.id AND COALESCE(r.eliminado, 0) = 0
        ORDER BY e.creado_en DESC
        LIMIT 300
        """;

    using var reader = command.ExecuteReader();
    var links = new List<object>();
    while (reader.Read())
    {
        links.Add(new
        {
            id = reader.GetString(0),
            examName = reader.GetString(1),
            questionCount = reader.GetInt32(2),
            linkCount = reader.GetInt32(3),
            candidateEmail = reader.GetString(4),
            link = reader.GetString(5),
            createdBy = reader.GetString(6),
            createdAt = reader.GetString(7),
            openedAt = GetDbString(reader, 8),
            completedAt = GetDbString(reader, 9)
        });
    }

    return Results.Json(links);
});

app.MapGet("/api/link-stats", (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out _, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede ver las estadisticas de enlaces." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var connection = OpenConnection(databasePath);
    var now = DateTime.UtcNow;
    var currentMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

    return Results.Json(new
    {
        day = BuildLinkStats(connection, now.Date),
        week = BuildLinkStats(connection, now.Date.AddDays(-6)),
        month = BuildLinkStats(connection, currentMonth)
    });
});

app.MapPost("/api/exams", async (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out var interviewer))
    {
        return Results.Unauthorized();
    }

    using var document = await JsonDocument.ParseAsync(request.Body);
    using var connection = OpenConnection(databasePath);
    SaveCreatedExam(connection, document.RootElement, interviewer);

    return Results.Ok(new { ok = true });
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

app.MapPost("/api/live-exams/{examId}", async (string examId, HttpRequest request) =>
{
    using var document = await JsonDocument.ParseAsync(request.Body);
    var token = GetString(document.RootElement, "token");

    if (string.IsNullOrWhiteSpace(examId) || string.IsNullOrWhiteSpace(token))
    {
        return Results.BadRequest(new { error = "El avance no tiene enlace valido." });
    }

    using var connection = OpenConnection(databasePath);
    if (!CandidateTokenMatches(connection, examId, token))
    {
        return Results.Json(new { error = "No autorizado." }, statusCode: StatusCodes.Status403Forbidden);
    }

    SaveLiveExamProgress(connection, examId, token, document.RootElement);
    return Results.Ok(new { ok = true });
});

app.MapGet("/api/live-exams", (HttpRequest request) =>
{
    if (!TryRequireRole(request, sessions, out _, "admin"))
    {
        return Results.Json(new { error = "Solo un administrador puede ver el monitoreo en vivo." }, statusCode: StatusCodes.Status403Forbidden);
    }

    using var connection = OpenConnection(databasePath);
    return Results.Json(LoadLiveExamProgress(connection));
});

app.MapPost("/api/evaluate", async (HttpRequest request) =>
{
    using var document = await JsonDocument.ParseAsync(request.Body);
    var rootElement = document.RootElement;
    var securityReason = GetString(rootElement, "securityReason");
    var candidateName = GetString(rootElement, "candidateName");
    var candidateEmail = GetString(rootElement, "candidateEmail");

    if (candidateName.Trim().Length < 3 || !IsValidEmailAddress(candidateEmail))
    {
        return Results.BadRequest(new { error = "Nombre y correo del candidato son obligatorios." });
    }

    using var connection = OpenConnection(databasePath);
    var questions = LoadQuestions(connection, activeOnly: false);
    var savedResult = EvaluateExam(rootElement, includeExpected: true, questions);
    var result = EvaluateExam(rootElement, includeExpected: false, questions);

    if (savedResult is null || result is null)
    {
        return Results.BadRequest(new { error = "El resultado no tiene id." });
    }

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
    var candidateEmail = GetString(rootElement, "candidateEmail");
    var manualNote = GetString(rootElement, "manualNote");
    var modifiedBy = GetFirstString(rootElement, "modifiedBy", "modificadoPor");
    var modifiedAt = GetFirstString(rootElement, "modifiedAt", "modificadoEn", "reviewedAt");
    var startedAt = GetString(rootElement, "startedAt");
    var finishedAt = GetString(rootElement, "finishedAt");
    var payload = JsonSerializer.Serialize(rootElement);

    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO resultados_examenes
            (id, nombre_candidato, correo_candidato, calificacion, calificacion_manual, puntos_obtenidos, puntos_totales, iniciado_en, finalizado_en, nota_manual, modificado_por, modificado_en, datos_json)
        VALUES
            ($id, $candidateName, $candidateEmail, $score, $manualScore, $earnedPoints, $totalPoints, $startedAt, $finishedAt, $manualNote, $modifiedBy, $modifiedAt, $payload)
        ON CONFLICT(id) DO UPDATE SET
            nombre_candidato = excluded.nombre_candidato,
            correo_candidato = excluded.correo_candidato,
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
    command.Parameters.AddWithValue("$candidateEmail", candidateEmail);
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
    UpdateCreatedExamCandidateEmail(connection, id, candidateEmail);
    SaveAnswerRows(connection, id, rootElement, modifiedBy, modifiedAt);
}

static void UpdateCreatedExamCandidateEmail(SqliteConnection connection, string resultId, string candidateEmail)
{
    if (string.IsNullOrWhiteSpace(candidateEmail))
    {
        return;
    }

    using var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE examenes_creados
        SET
            correo_candidato = $candidateEmail,
            datos_json = json_set(datos_json, '$.candidateEmail', $candidateEmail)
        WHERE id = $id
        """;
    command.Parameters.AddWithValue("$id", resultId);
    command.Parameters.AddWithValue("$candidateEmail", candidateEmail);
    command.ExecuteNonQuery();
}

static void SaveCreatedExam(SqliteConnection connection, JsonElement rootElement, string interviewer)
{
    var id = GetString(rootElement, "id");
    if (string.IsNullOrWhiteSpace(id))
    {
        throw new InvalidOperationException("El examen no tiene id.");
    }

    var examName = GetString(rootElement, "examName");
    var candidateEmail = GetString(rootElement, "candidateEmail");
    var questionCount = GetInt(rootElement, "questionCount");
    var timeLimit = GetInt(rootElement, "timeLimit");
    var link = GetString(rootElement, "link");
    var createdAt = GetString(rootElement, "createdAt");
    var payload = JsonSerializer.Serialize(rootElement);

    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO examenes_creados
            (id, nombre_examen, cantidad_preguntas, cantidad_links, correo_candidato, link_acceso, tiempo_minutos, creado_por, creado_en, datos_json)
        VALUES
            ($id, $examName, $questionCount, 1, $candidateEmail, $link, $timeLimit, $createdBy, $createdAt, $payload)
        ON CONFLICT(id) DO UPDATE SET
            nombre_examen = excluded.nombre_examen,
            cantidad_preguntas = excluded.cantidad_preguntas,
            cantidad_links = excluded.cantidad_links,
            correo_candidato = excluded.correo_candidato,
            link_acceso = excluded.link_acceso,
            tiempo_minutos = excluded.tiempo_minutos,
            creado_por = excluded.creado_por,
            creado_en = excluded.creado_en,
            datos_json = excluded.datos_json
        """;
    command.Parameters.AddWithValue("$id", id);
    command.Parameters.AddWithValue("$examName", examName);
    command.Parameters.AddWithValue("$questionCount", questionCount);
    command.Parameters.AddWithValue("$candidateEmail", candidateEmail);
    command.Parameters.AddWithValue("$link", link);
    command.Parameters.AddWithValue("$timeLimit", timeLimit);
    command.Parameters.AddWithValue("$createdBy", interviewer);
    command.Parameters.AddWithValue("$createdAt", createdAt);
    command.Parameters.AddWithValue("$payload", payload);
    command.ExecuteNonQuery();
}

app.MapDelete("/api/results", (HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out var interviewer))
    {
        return Results.Unauthorized();
    }

    using var connection = OpenConnection(databasePath);
    using var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE resultados_examenes
        SET eliminado = 1,
            eliminado_por = $deletedBy,
            eliminado_en = $deletedAt
        WHERE COALESCE(eliminado, 0) = 0;
        """;
    command.Parameters.AddWithValue("$deletedBy", interviewer);
    command.Parameters.AddWithValue("$deletedAt", DateTime.UtcNow.ToString("O"));
    command.ExecuteNonQuery();

    return Results.Ok(new { ok = true });
});

app.MapDelete("/api/results/{id}", (string id, HttpRequest request) =>
{
    if (!TryGetInterviewer(request, sessions, out var interviewer))
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(id))
    {
        return Results.BadRequest(new { error = "El id del examen no es valido." });
    }

    using var connection = OpenConnection(databasePath);
    using var resultCommand = connection.CreateCommand();
    resultCommand.CommandText = """
        UPDATE resultados_examenes
        SET eliminado = 1,
            eliminado_por = $deletedBy,
            eliminado_en = $deletedAt
        WHERE id = $id
            AND COALESCE(eliminado, 0) = 0
        """;
    resultCommand.Parameters.AddWithValue("$id", id);
    resultCommand.Parameters.AddWithValue("$deletedBy", interviewer);
    resultCommand.Parameters.AddWithValue("$deletedAt", DateTime.UtcNow.ToString("O"));
    var deleted = resultCommand.ExecuteNonQuery();

    return deleted > 0
        ? Results.Ok(new { ok = true })
        : Results.NotFound(new { error = "No se encontro ese examen." });
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
            correo_candidato TEXT NOT NULL DEFAULT '',
            calificacion INTEGER NOT NULL,
            calificacion_manual INTEGER,
            puntos_obtenidos INTEGER NOT NULL,
            puntos_totales INTEGER NOT NULL,
            iniciado_en TEXT NOT NULL,
            finalizado_en TEXT NOT NULL,
            nota_manual TEXT NOT NULL DEFAULT '',
            modificado_por TEXT NOT NULL DEFAULT '',
            modificado_en TEXT NOT NULL DEFAULT '',
            eliminado INTEGER NOT NULL DEFAULT 0,
            eliminado_por TEXT NOT NULL DEFAULT '',
            eliminado_en TEXT NOT NULL DEFAULT '',
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

        CREATE TABLE IF NOT EXISTS examenes_creados (
            id TEXT PRIMARY KEY,
            nombre_examen TEXT NOT NULL DEFAULT '',
            cantidad_preguntas INTEGER NOT NULL DEFAULT 0,
            cantidad_links INTEGER NOT NULL DEFAULT 1,
            correo_candidato TEXT NOT NULL DEFAULT '',
            link_acceso TEXT NOT NULL DEFAULT '',
            tiempo_minutos INTEGER NOT NULL DEFAULT 0,
            creado_por TEXT NOT NULL DEFAULT '',
            creado_en TEXT NOT NULL DEFAULT '',
            datos_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS usuarios_entrevistadores (
            correo TEXT PRIMARY KEY,
            contrasena TEXT NOT NULL DEFAULT '',
            rol TEXT NOT NULL DEFAULT 'entrevistador',
            activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS banco_preguntas (
            id TEXT PRIMARY KEY,
            area TEXT NOT NULL DEFAULT '',
            tipo TEXT NOT NULL DEFAULT '',
            titulo TEXT NOT NULL DEFAULT '',
            pregunta TEXT NOT NULL DEFAULT '',
            puntos INTEGER NOT NULL DEFAULT 20,
            opciones_json TEXT NOT NULL DEFAULT '[]',
            respuesta_correcta TEXT NOT NULL DEFAULT '',
            respuesta_esperada TEXT NOT NULL DEFAULT '',
            palabras_clave_json TEXT NOT NULL DEFAULT '[]',
            runner_json TEXT NOT NULL DEFAULT '',
            activo INTEGER NOT NULL DEFAULT 1,
            creado_en TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS monitoreo_examenes (
            id_examen TEXT PRIMARY KEY,
            token_candidato TEXT NOT NULL DEFAULT '',
            nombre_candidato TEXT NOT NULL DEFAULT '',
            correo_candidato TEXT NOT NULL DEFAULT '',
            estado TEXT NOT NULL DEFAULT 'Contestando',
            tiempo_restante INTEGER NOT NULL DEFAULT 0,
            respuestas_contestadas INTEGER NOT NULL DEFAULT 0,
            total_preguntas INTEGER NOT NULL DEFAULT 0,
            actualizado_en TEXT NOT NULL DEFAULT '',
            finalizado_en TEXT NOT NULL DEFAULT '',
            datos_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE INDEX IF NOT EXISTS idx_resultados_examenes_finalizado_en
        ON resultados_examenes(finalizado_en DESC);

        CREATE INDEX IF NOT EXISTS idx_respuestas_examenes_resultado
        ON respuestas_examenes(id_resultado);

        CREATE INDEX IF NOT EXISTS idx_examenes_creados_creado_en
        ON examenes_creados(creado_en DESC);

        CREATE INDEX IF NOT EXISTS idx_usuarios_entrevistadores_activo
        ON usuarios_entrevistadores(activo);

        CREATE INDEX IF NOT EXISTS idx_banco_preguntas_activo
        ON banco_preguntas(activo);

        CREATE INDEX IF NOT EXISTS idx_banco_preguntas_area
        ON banco_preguntas(area);

        CREATE INDEX IF NOT EXISTS idx_monitoreo_examenes_actualizado_en
        ON monitoreo_examenes(actualizado_en DESC);

        DROP VIEW IF EXISTS vista_resultados;
        CREATE VIEW vista_resultados AS
        SELECT
            id AS id_examen,
            nombre_candidato,
            correo_candidato,
            calificacion,
            COALESCE(calificacion_manual, calificacion) AS calificacion_final,
            puntos_obtenidos,
            puntos_totales,
            iniciado_en,
            finalizado_en,
            nota_manual,
            modificado_por,
            modificado_en
        FROM resultados_examenes
        WHERE COALESCE(eliminado, 0) = 0;

        DROP VIEW IF EXISTS vista_respuestas;
        CREATE VIEW vista_respuestas AS
        SELECT
            r.id_resultado AS id_examen,
            e.nombre_candidato,
            e.correo_candidato,
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
        LEFT JOIN resultados_examenes e ON e.id = r.id_resultado
        WHERE COALESCE(e.eliminado, 0) = 0;

        DROP VIEW IF EXISTS vista_enlaces_usados;
        CREATE VIEW vista_enlaces_usados AS
        SELECT
            id_examen,
            tomado_en
        FROM enlaces_examenes;

        DROP VIEW IF EXISTS vista_examenes_creados;
        CREATE VIEW vista_examenes_creados AS
        SELECT
            e.id AS id_examen,
            e.nombre_examen,
            e.cantidad_preguntas,
            e.cantidad_links,
            COALESCE(NULLIF(e.correo_candidato, ''), r.correo_candidato, '') AS correo_candidato,
            e.link_acceso,
            e.tiempo_minutos,
            e.creado_por,
            e.creado_en,
            COALESCE(l.tomado_en, '') AS abierto_en,
            COALESCE(r.finalizado_en, '') AS completado_en,
            CASE
                WHEN r.finalizado_en IS NOT NULL THEN 'Examen terminado'
                WHEN l.tomado_en IS NOT NULL THEN 'Link abierto'
                ELSE 'Link generado'
            END AS estado
        FROM examenes_creados e
        LEFT JOIN enlaces_examenes l ON l.id_examen = e.id
        LEFT JOIN resultados_examenes r ON r.id = e.id AND COALESCE(r.eliminado, 0) = 0;

        DROP VIEW IF EXISTS vista_seguimiento_enlaces;
        CREATE VIEW vista_seguimiento_enlaces AS
        SELECT
            e.id AS id_examen,
            e.nombre_examen,
            COALESCE(NULLIF(e.correo_candidato, ''), r.correo_candidato, '') AS correo_candidato,
            e.creado_por,
            e.creado_en AS link_generado_en,
            COALESCE(l.tomado_en, '') AS link_abierto_en,
            COALESCE(r.finalizado_en, '') AS examen_terminado_en,
            CASE
                WHEN r.finalizado_en IS NOT NULL THEN 'Examen terminado'
                WHEN l.tomado_en IS NOT NULL THEN 'Link abierto'
                ELSE 'Link generado'
            END AS estado
        FROM examenes_creados e
        LEFT JOIN enlaces_examenes l ON l.id_examen = e.id
        LEFT JOIN resultados_examenes r ON r.id = e.id AND COALESCE(r.eliminado, 0) = 0;

        DROP VIEW IF EXISTS vista_usuarios_entrevistadores;
        CREATE VIEW vista_usuarios_entrevistadores AS
        SELECT
            correo,
            CASE
                WHEN contrasena LIKE 'pbkdf2$%' THEN 'Protegida'
                ELSE 'Pendiente de proteger'
            END AS contrasena,
            'entrevistador' AS rol,
            CASE activo WHEN 1 THEN 'Activo' ELSE 'Inactivo' END AS estado,
            creado_en
        FROM usuarios_entrevistadores
        ORDER BY correo;

        DROP VIEW IF EXISTS vista_banco_preguntas;
        CREATE VIEW vista_banco_preguntas AS
        SELECT
            id,
            area,
            tipo,
            titulo,
            pregunta,
            puntos,
            opciones_json,
            respuesta_correcta,
            respuesta_esperada,
            palabras_clave_json,
            runner_json,
            CASE activo WHEN 1 THEN 'Activa' ELSE 'Inactiva' END AS estado,
            creado_en
        FROM banco_preguntas
        ORDER BY area, tipo, titulo;

        DROP VIEW IF EXISTS vista_monitoreo_en_vivo;
        CREATE VIEW vista_monitoreo_en_vivo AS
        SELECT
            id_examen,
            nombre_candidato,
            correo_candidato,
            estado,
            tiempo_restante,
            respuestas_contestadas,
            total_preguntas,
            actualizado_en,
            finalizado_en
        FROM monitoreo_examenes
        ORDER BY
            CASE estado WHEN 'Contestando' THEN 0 ELSE 1 END,
            actualizado_en DESC;
        """;
    command.ExecuteNonQuery();
    EnsureColumn(connection, "usuarios_entrevistadores", "rol", "TEXT NOT NULL DEFAULT 'entrevistador'");
    BackfillUserRoles(connection);
    RefreshUserView(connection);
    SeedInterviewers(connection);
    MigratePlaintextPasswords(connection);
    BackfillUserCreatedDates(connection);
    SeedQuestions(connection);
    EnsureColumn(connection, "resultados_examenes", "modificado_por", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(connection, "resultados_examenes", "modificado_en", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(connection, "resultados_examenes", "correo_candidato", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(connection, "resultados_examenes", "eliminado", "INTEGER NOT NULL DEFAULT 0");
    EnsureColumn(connection, "resultados_examenes", "eliminado_por", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(connection, "resultados_examenes", "eliminado_en", "TEXT NOT NULL DEFAULT ''");
    MigrateOldResultsTable(connection);
    BackfillAnswerRows(connection);
}

static void SeedInterviewers(SqliteConnection connection)
{
    using var countCommand = connection.CreateCommand();
    countCommand.CommandText = "SELECT COUNT(*) FROM usuarios_entrevistadores";
    var count = Convert.ToInt32(countCommand.ExecuteScalar());

    if (count > 0)
    {
        return;
    }

    foreach (var interviewer in AppData.DefaultInterviewers)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO usuarios_entrevistadores
                (correo, contrasena, rol, activo, creado_en)
            VALUES
                ($correo, $contrasena, $role, 1, $createdAt)
            """;
        command.Parameters.AddWithValue("$correo", interviewer.Key.ToLowerInvariant());
        command.Parameters.AddWithValue("$contrasena", HashPassword(interviewer.Value));
        command.Parameters.AddWithValue("$role", AppData.GetDefaultRole(interviewer.Key));
        command.Parameters.AddWithValue("$createdAt", DateTime.UtcNow.ToString("O"));
        command.ExecuteNonQuery();
    }
}

static void BackfillUserRoles(SqliteConnection connection)
{
    using var adminCommand = connection.CreateCommand();
    adminCommand.CommandText = """
        UPDATE usuarios_entrevistadores
        SET rol = 'admin'
        WHERE lower(correo) IN ('ariel@redgps.com', 'arielsadoth@gmail.com')
        """;
    adminCommand.ExecuteNonQuery();

    using var defaultCommand = connection.CreateCommand();
    defaultCommand.CommandText = """
        UPDATE usuarios_entrevistadores
        SET rol = 'entrevistador'
        WHERE trim(rol) = ''
            OR rol NOT IN ('admin', 'entrevistador', 'revisor', 'lectura')
        """;
    defaultCommand.ExecuteNonQuery();
}

static void RefreshUserView(SqliteConnection connection)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        DROP VIEW IF EXISTS vista_usuarios_entrevistadores;
        CREATE VIEW vista_usuarios_entrevistadores AS
        SELECT
            correo,
            rol,
            CASE
                WHEN contrasena LIKE 'pbkdf2$%' THEN 'Protegida'
                ELSE 'Pendiente de proteger'
            END AS contrasena,
            CASE activo WHEN 1 THEN 'Activo' ELSE 'Inactivo' END AS estado,
            creado_en
        FROM usuarios_entrevistadores
        ORDER BY rol, correo;
        """;
    command.ExecuteNonQuery();
}

static void MigratePlaintextPasswords(SqliteConnection connection)
{
    using var readCommand = connection.CreateCommand();
    readCommand.CommandText = """
        SELECT correo, contrasena
        FROM usuarios_entrevistadores
        WHERE contrasena NOT LIKE 'pbkdf2$%'
        """;

    var pendingPasswords = new List<(string User, string Password)>();
    using (var reader = readCommand.ExecuteReader())
    {
        while (reader.Read())
        {
            pendingPasswords.Add((reader.GetString(0), reader.GetString(1)));
        }
    }

    foreach (var item in pendingPasswords)
    {
        UpdateUserPasswordHash(connection, item.User, HashPassword(item.Password));
    }
}

static void BackfillUserCreatedDates(SqliteConnection connection)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE usuarios_entrevistadores
        SET creado_en = datetime('now', 'localtime')
        WHERE trim(creado_en) = ''
        """;
    command.ExecuteNonQuery();
}

static void SeedQuestions(SqliteConnection connection)
{
    using var countCommand = connection.CreateCommand();
    countCommand.CommandText = "SELECT COUNT(*) FROM banco_preguntas";
    var count = Convert.ToInt32(countCommand.ExecuteScalar());

    if (count > 0)
    {
        return;
    }

    foreach (var question in AppData.DefaultQuestions)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO banco_preguntas
                (id, area, tipo, titulo, pregunta, puntos, opciones_json, respuesta_correcta, respuesta_esperada, palabras_clave_json, runner_json, activo, creado_en)
            VALUES
                ($id, $area, $type, $title, $prompt, $points, $options, $correctAnswer, $expected, $keywords, $runner, 1, $createdAt)
            """;
        command.Parameters.AddWithValue("$id", question.Id);
        command.Parameters.AddWithValue("$area", question.Area);
        command.Parameters.AddWithValue("$type", question.Type);
        command.Parameters.AddWithValue("$title", question.Title);
        command.Parameters.AddWithValue("$prompt", question.Prompt);
        command.Parameters.AddWithValue("$points", question.Points);
        command.Parameters.AddWithValue("$options", JsonSerializer.Serialize(question.Options));
        command.Parameters.AddWithValue("$correctAnswer", question.CorrectAnswer);
        command.Parameters.AddWithValue("$expected", question.Expected);
        command.Parameters.AddWithValue("$keywords", JsonSerializer.Serialize(question.Keywords));
        command.Parameters.AddWithValue("$runner", question.Runner is null ? "" : JsonSerializer.Serialize(question.Runner));
        command.Parameters.AddWithValue("$createdAt", DateTime.UtcNow.ToString("O"));
        command.ExecuteNonQuery();
    }
}

static void SaveQuestion(SqliteConnection connection, ExamQuestion question)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO banco_preguntas
            (id, area, tipo, titulo, pregunta, puntos, opciones_json, respuesta_correcta, respuesta_esperada, palabras_clave_json, runner_json, activo, creado_en)
        VALUES
            ($id, $area, $type, $title, $prompt, $points, $options, $correctAnswer, $expected, $keywords, $runner, 1, $createdAt)
        ON CONFLICT(id) DO UPDATE SET
            area = excluded.area,
            tipo = excluded.tipo,
            titulo = excluded.titulo,
            pregunta = excluded.pregunta,
            puntos = excluded.puntos,
            opciones_json = excluded.opciones_json,
            respuesta_correcta = excluded.respuesta_correcta,
            respuesta_esperada = excluded.respuesta_esperada,
            palabras_clave_json = excluded.palabras_clave_json,
            runner_json = excluded.runner_json,
            activo = 1
        """;
    command.Parameters.AddWithValue("$id", question.Id);
    command.Parameters.AddWithValue("$area", question.Area);
    command.Parameters.AddWithValue("$type", question.Type);
    command.Parameters.AddWithValue("$title", question.Title);
    command.Parameters.AddWithValue("$prompt", question.Prompt);
    command.Parameters.AddWithValue("$points", question.Points);
    command.Parameters.AddWithValue("$options", JsonSerializer.Serialize(question.Options));
    command.Parameters.AddWithValue("$correctAnswer", question.CorrectAnswer);
    command.Parameters.AddWithValue("$expected", question.Expected);
    command.Parameters.AddWithValue("$keywords", JsonSerializer.Serialize(question.Keywords));
    command.Parameters.AddWithValue("$runner", question.Runner is null ? "" : JsonSerializer.Serialize(question.Runner));
    command.Parameters.AddWithValue("$createdAt", DateTime.UtcNow.ToString("O"));
    command.ExecuteNonQuery();
}

static List<ExamQuestion> LoadQuestions(SqliteConnection connection, bool activeOnly)
{
    using var command = connection.CreateCommand();
    command.CommandText = activeOnly
        ? """
            SELECT id, area, tipo, titulo, pregunta, puntos, opciones_json, respuesta_correcta, respuesta_esperada, palabras_clave_json, runner_json
            FROM banco_preguntas
            WHERE activo = 1
            ORDER BY rowid ASC
            """
        : """
            SELECT id, area, tipo, titulo, pregunta, puntos, opciones_json, respuesta_correcta, respuesta_esperada, palabras_clave_json, runner_json
            FROM banco_preguntas
            ORDER BY rowid ASC
            """;

    using var reader = command.ExecuteReader();
    var questions = new List<ExamQuestion>();

    while (reader.Read())
    {
        var options = DeserializeJson<List<ExamOption>>(GetDbString(reader, 6)) ?? [];
        var keywords = DeserializeJson<List<string>>(GetDbString(reader, 9)) ?? [];
        var runnerJson = GetDbString(reader, 10);
        var runner = string.IsNullOrWhiteSpace(runnerJson)
            ? null
            : DeserializeJson<CodeRunner>(runnerJson);

        questions.Add(new ExamQuestion(
            GetDbString(reader, 0),
            GetDbString(reader, 1),
            GetDbString(reader, 2),
            GetDbString(reader, 3),
            GetDbString(reader, 4),
            reader.GetInt32(5),
            options,
            GetDbString(reader, 7),
            GetDbString(reader, 8),
            keywords,
            runner
        ));
    }

    return questions;
}

static (ExamQuestion? Question, string Error) BuildQuestionFromRequest(JsonElement root)
{
    var area = GetFirstString(root, "area", "Area").Trim();
    var type = GetFirstString(root, "type", "tipo", "Type").Trim().ToLowerInvariant();
    var title = GetFirstString(root, "title", "titulo", "Title").Trim();
    var prompt = GetFirstString(root, "prompt", "pregunta", "Prompt").Trim();
    var id = GetFirstString(root, "id", "Id").Trim();
    var points = GetInt(root, "points");
    var correctAnswer = GetFirstString(root, "correctAnswer", "respuestaCorrecta", "respuesta_correcta").Trim().ToUpperInvariant();
    var expected = GetFirstString(root, "expected", "respuestaEsperada", "respuesta_esperada").Trim();
    var options = GetQuestionOptionsFromRequest(root);
    var keywords = GetQuestionKeywordsFromRequest(root);
    var runner = GetQuestionRunnerFromRequest(root);

    if (string.IsNullOrWhiteSpace(area))
    {
        return (null, "Escribe el area de la pregunta.");
    }

    if (type is not ("closed" or "open" or "code"))
    {
        return (null, "Selecciona un tipo valido: cerrada, abierta o practica.");
    }

    if (string.IsNullOrWhiteSpace(title))
    {
        return (null, "Escribe el titulo de la pregunta.");
    }

    if (string.IsNullOrWhiteSpace(prompt))
    {
        return (null, "Escribe la pregunta.");
    }

    if (points < 1 || points > 100)
    {
        return (null, "Los puntos deben estar entre 1 y 100.");
    }

    if (type == "closed")
    {
        if (options.Count < 2)
        {
            return (null, "Agrega al menos dos opciones para una pregunta cerrada.");
        }

        if (string.IsNullOrWhiteSpace(correctAnswer) || !options.Any(option => string.Equals(option.Key, correctAnswer, StringComparison.OrdinalIgnoreCase)))
        {
            return (null, "La respuesta correcta debe coincidir con una clave de opcion, por ejemplo A.");
        }

        expected = string.IsNullOrWhiteSpace(expected)
            ? options.First(option => string.Equals(option.Key, correctAnswer, StringComparison.OrdinalIgnoreCase)).Text
            : expected;
    }
    else
    {
        options = [];
        correctAnswer = "";
        if (string.IsNullOrWhiteSpace(expected))
        {
            return (null, "Escribe la respuesta esperada para poder evaluar la pregunta.");
        }
    }

    if (keywords.Count == 0)
    {
        keywords = BuildKeywordsFromExpected(expected);
    }

    if (type != "code")
    {
        runner = null;
    }
    else if (runner is null)
    {
        return (null, "Configura la funcion y al menos una prueba JSON para una pregunta practica.");
    }

    if (string.IsNullOrWhiteSpace(id))
    {
        id = GenerateQuestionId(title);
    }

    return (new ExamQuestion(id, area, type, title, prompt, points, options, correctAnswer, expected, keywords, runner), "");
}

static T? DeserializeJson<T>(string value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return default;
    }

    try
    {
        return JsonSerializer.Deserialize<T>(value, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
    catch (JsonException)
    {
        return default;
    }
}

static string GetDbString(SqliteDataReader reader, int ordinal)
{
    return reader.IsDBNull(ordinal) ? "" : reader.GetString(ordinal);
}

static object BuildLinkStats(SqliteConnection connection, DateTime since)
{
    return new
    {
        generated = CountRowsSince(connection, "examenes_creados", "creado_en", since),
        opened = CountRowsSince(connection, "enlaces_examenes", "tomado_en", since),
        completed = CountActiveResultsSince(connection, since)
    };
}

static long CountRowsSince(SqliteConnection connection, string tableName, string columnName, DateTime since)
{
    using var command = connection.CreateCommand();
    command.CommandText = $"SELECT COUNT(*) FROM {tableName} WHERE {columnName} >= $since";
    command.Parameters.AddWithValue("$since", since.ToString("O"));
    return Convert.ToInt64(command.ExecuteScalar() ?? 0);
}

static long CountActiveResultsSince(SqliteConnection connection, DateTime since)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT COUNT(*)
        FROM resultados_examenes
        WHERE finalizado_en >= $since
            AND COALESCE(eliminado, 0) = 0
        """;
    command.Parameters.AddWithValue("$since", since.ToString("O"));
    return Convert.ToInt64(command.ExecuteScalar() ?? 0);
}

static bool CandidateTokenMatches(SqliteConnection connection, string examId, string token)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT token_candidato
        FROM enlaces_examenes
        WHERE id_examen = $examId
        LIMIT 1
        """;
    command.Parameters.AddWithValue("$examId", examId);
    var savedToken = Convert.ToString(command.ExecuteScalar()) ?? "";

    return !string.IsNullOrWhiteSpace(savedToken)
        && string.Equals(savedToken, token, StringComparison.Ordinal);
}

static void SaveLiveExamProgress(SqliteConnection connection, string examId, string token, JsonElement rootElement)
{
    var status = GetString(rootElement, "status");
    if (string.IsNullOrWhiteSpace(status))
    {
        status = "Contestando";
    }

    var updatedAt = DateTime.UtcNow.ToString("O");
    var finishedAt = status.StartsWith("Finalizado", StringComparison.OrdinalIgnoreCase)
        ? updatedAt
        : "";
    var payload = JsonSerializer.Serialize(rootElement);

    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO monitoreo_examenes (
            id_examen,
            token_candidato,
            nombre_candidato,
            correo_candidato,
            estado,
            tiempo_restante,
            respuestas_contestadas,
            total_preguntas,
            actualizado_en,
            finalizado_en,
            datos_json
        )
        VALUES (
            $examId,
            $token,
            $candidateName,
            $candidateEmail,
            $status,
            $remainingSeconds,
            $answeredCount,
            $totalQuestions,
            $updatedAt,
            $finishedAt,
            $payload
        )
        ON CONFLICT(id_examen) DO UPDATE SET
            token_candidato = excluded.token_candidato,
            nombre_candidato = excluded.nombre_candidato,
            correo_candidato = excluded.correo_candidato,
            estado = excluded.estado,
            tiempo_restante = excluded.tiempo_restante,
            respuestas_contestadas = excluded.respuestas_contestadas,
            total_preguntas = excluded.total_preguntas,
            actualizado_en = excluded.actualizado_en,
            finalizado_en = CASE
                WHEN excluded.finalizado_en <> '' THEN excluded.finalizado_en
                ELSE monitoreo_examenes.finalizado_en
            END,
            datos_json = excluded.datos_json
        """;
    command.Parameters.AddWithValue("$examId", examId);
    command.Parameters.AddWithValue("$token", token);
    command.Parameters.AddWithValue("$candidateName", GetString(rootElement, "candidateName"));
    command.Parameters.AddWithValue("$candidateEmail", GetString(rootElement, "candidateEmail"));
    command.Parameters.AddWithValue("$status", status);
    command.Parameters.AddWithValue("$remainingSeconds", GetInt(rootElement, "remainingSeconds"));
    command.Parameters.AddWithValue("$answeredCount", GetInt(rootElement, "answeredCount"));
    command.Parameters.AddWithValue("$totalQuestions", GetInt(rootElement, "totalQuestions"));
    command.Parameters.AddWithValue("$updatedAt", updatedAt);
    command.Parameters.AddWithValue("$finishedAt", finishedAt);
    command.Parameters.AddWithValue("$payload", payload);
    command.ExecuteNonQuery();
}

static List<object> LoadLiveExamProgress(SqliteConnection connection)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT
            id_examen,
            nombre_candidato,
            correo_candidato,
            estado,
            tiempo_restante,
            respuestas_contestadas,
            total_preguntas,
            actualizado_en,
            finalizado_en,
            datos_json
        FROM monitoreo_examenes
        ORDER BY
            CASE estado WHEN 'Contestando' THEN 0 ELSE 1 END,
            actualizado_en DESC
        LIMIT 100
        """;

    var items = new List<object>();
    using var reader = command.ExecuteReader();
    while (reader.Read())
    {
        var answers = new List<object>();
        var payload = GetDbString(reader, 9);

        try
        {
            using var document = JsonDocument.Parse(payload);
            if (document.RootElement.TryGetProperty("answers", out var answersElement) && answersElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var answer in answersElement.EnumerateArray())
                {
                    answers.Add(new
                    {
                        number = GetInt(answer, "number"),
                        title = GetString(answer, "title"),
                        prompt = GetString(answer, "prompt"),
                        area = GetString(answer, "area"),
                        type = GetString(answer, "type"),
                        answer = GetString(answer, "answer"),
                        answered = GetBool(answer, "answered", false)
                    });
                }
            }
        }
        catch (JsonException)
        {
            answers.Clear();
        }

        items.Add(new
        {
            examId = GetDbString(reader, 0),
            candidateName = GetDbString(reader, 1),
            candidateEmail = GetDbString(reader, 2),
            status = GetDbString(reader, 3),
            remainingSeconds = reader.GetInt32(4),
            answeredCount = reader.GetInt32(5),
            totalQuestions = reader.GetInt32(6),
            updatedAt = GetDbString(reader, 7),
            finishedAt = GetDbString(reader, 8),
            answers
        });
    }

    return items;
}

static bool IsAuthorizedInterviewer(SqliteConnection connection, string user, string password)
{
    if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(password))
    {
        return false;
    }

    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT contrasena
        FROM usuarios_entrevistadores
        WHERE lower(correo) = $correo
            AND activo = 1
        LIMIT 1
        """;
    command.Parameters.AddWithValue("$correo", user.ToLowerInvariant());
    var savedPassword = command.ExecuteScalar() as string;

    if (string.IsNullOrWhiteSpace(savedPassword) || !VerifyPassword(password, savedPassword))
    {
        return false;
    }

    if (!IsPasswordHash(savedPassword))
    {
        UpdateUserPasswordHash(connection, user, HashPassword(password));
    }

    return true;
}

static string GetInterviewerRole(SqliteConnection connection, string user)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT rol
        FROM usuarios_entrevistadores
        WHERE lower(correo) = $correo
            AND activo = 1
        LIMIT 1
        """;
    command.Parameters.AddWithValue("$correo", user.ToLowerInvariant());
    var role = Convert.ToString(command.ExecuteScalar()) ?? "";
    return NormalizeRole(role);
}

static string NormalizeRole(string role)
{
    role = role.Trim().ToLowerInvariant();
    return role is "admin" or "entrevistador" or "revisor" or "lectura"
        ? role
        : "entrevistador";
}

static bool IsValidEmailAddress(string value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        return false;
    }

    var atIndex = value.IndexOf('@');
    var dotIndex = value.LastIndexOf('.');
    return atIndex > 0
        && dotIndex > atIndex + 1
        && dotIndex < value.Length - 1
        && !value.Contains(' ');
}

static bool IsPasswordHash(string value)
{
    return value.StartsWith("pbkdf2$", StringComparison.Ordinal);
}

static string HashPassword(string password)
{
    const int passwordHashIterations = 100_000;
    const int passwordSaltBytes = 16;
    const int passwordHashBytes = 32;
    var salt = RandomNumberGenerator.GetBytes(passwordSaltBytes);
    var hash = Rfc2898DeriveBytes.Pbkdf2(
        password,
        salt,
        passwordHashIterations,
        HashAlgorithmName.SHA256,
        passwordHashBytes);

    return $"pbkdf2${passwordHashIterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
}

static bool VerifyPassword(string password, string savedPassword)
{
    if (!IsPasswordHash(savedPassword))
    {
        return string.Equals(savedPassword, password, StringComparison.Ordinal);
    }

    var parts = savedPassword.Split('$');
    if (parts.Length != 4 || !int.TryParse(parts[1], out var iterations))
    {
        return false;
    }

    try
    {
        var salt = Convert.FromBase64String(parts[2]);
        var savedHash = Convert.FromBase64String(parts[3]);
        var enteredHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            savedHash.Length);

        return CryptographicOperations.FixedTimeEquals(savedHash, enteredHash);
    }
    catch (FormatException)
    {
        return false;
    }
}

static void UpdateUserPasswordHash(SqliteConnection connection, string user, string passwordHash)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        UPDATE usuarios_entrevistadores
        SET contrasena = $passwordHash
        WHERE lower(correo) = $correo
        """;
    command.Parameters.AddWithValue("$passwordHash", passwordHash);
    command.Parameters.AddWithValue("$correo", user.ToLowerInvariant());
    command.ExecuteNonQuery();
}

static List<object> LoadInterviewerUsers(SqliteConnection connection)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        SELECT correo, rol, activo, creado_en
        FROM usuarios_entrevistadores
        ORDER BY rol, correo
        """;

    using var reader = command.ExecuteReader();
    var users = new List<object>();
    while (reader.Read())
    {
        users.Add(new
        {
            email = GetDbString(reader, 0),
            role = NormalizeRole(GetDbString(reader, 1)),
            active = reader.GetInt32(2) == 1,
            createdAt = GetDbString(reader, 3)
        });
    }

    return users;
}

static void SaveInterviewerUser(SqliteConnection connection, string email, string password, string role, bool active)
{
    using var command = connection.CreateCommand();
    command.CommandText = """
        INSERT INTO usuarios_entrevistadores
            (correo, contrasena, rol, activo, creado_en)
        VALUES
            ($email, $password, $role, $active, $createdAt)
        ON CONFLICT(correo) DO UPDATE SET
            contrasena = excluded.contrasena,
            rol = excluded.rol,
            activo = excluded.activo
        """;
    command.Parameters.AddWithValue("$email", email.ToLowerInvariant());
    command.Parameters.AddWithValue("$password", HashPassword(password));
    command.Parameters.AddWithValue("$role", NormalizeRole(role));
    command.Parameters.AddWithValue("$active", active ? 1 : 0);
    command.Parameters.AddWithValue("$createdAt", DateTime.UtcNow.ToString("O"));
    command.ExecuteNonQuery();
}

static void UpdateInterviewerUser(SqliteConnection connection, string email, string role, bool active, string password)
{
    using var command = connection.CreateCommand();
    if (string.IsNullOrWhiteSpace(password))
    {
        command.CommandText = """
            UPDATE usuarios_entrevistadores
            SET rol = $role,
                activo = $active
            WHERE lower(correo) = $email
            """;
    }
    else
    {
        command.CommandText = """
            UPDATE usuarios_entrevistadores
            SET rol = $role,
                activo = $active,
                contrasena = $password
            WHERE lower(correo) = $email
            """;
        command.Parameters.AddWithValue("$password", HashPassword(password));
    }

    command.Parameters.AddWithValue("$email", email.ToLowerInvariant());
    command.Parameters.AddWithValue("$role", NormalizeRole(role));
    command.Parameters.AddWithValue("$active", active ? 1 : 0);
    command.ExecuteNonQuery();
}

static (InterviewerUserRequest? User, string Error) BuildInterviewerUserFromRequest(JsonElement root, bool requirePassword)
{
    var email = GetString(root, "email").Trim().ToLowerInvariant();
    var password = GetString(root, "password");
    var role = NormalizeRole(GetString(root, "role"));
    var active = GetBool(root, "active", true);

    if (!IsValidEmailAddress(email))
    {
        return (null, "El correo no es valido.");
    }

    if (requirePassword && !IsValidInterviewerPassword(password))
    {
        return (null, "La contrasena debe tener entre 6 y 8 caracteres.");
    }

    return (new InterviewerUserRequest(email, password, role, active), "");
}

static bool IsValidInterviewerPassword(string password)
{
    var length = password.Trim().Length;
    return length >= 6 && length <= 8;
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

static bool GetBool(JsonElement element, string propertyName, bool defaultValue)
{
    if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(propertyName, out var property))
    {
        return defaultValue;
    }

    return property.ValueKind switch
    {
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Number when property.TryGetInt32(out var number) => number == 1,
        JsonValueKind.String => property.GetString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true ||
                                property.GetString() == "1",
        _ => defaultValue
    };
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

static List<string> GetStringArray(JsonElement element, string propertyName)
{
    if (element.ValueKind != JsonValueKind.Object ||
        !element.TryGetProperty(propertyName, out var property) ||
        property.ValueKind != JsonValueKind.Array)
    {
        return [];
    }

    return property
        .EnumerateArray()
        .Where(item => item.ValueKind == JsonValueKind.String)
        .Select(item => item.GetString() ?? "")
        .Where(value => !string.IsNullOrWhiteSpace(value))
        .ToList();
}

static List<string> GetFirstStringArray(JsonElement element, params string[] propertyNames)
{
    foreach (var propertyName in propertyNames)
    {
        var values = GetStringArray(element, propertyName);
        if (values.Count > 0)
        {
            return values;
        }
    }

    return [];
}

static List<ExamOption> GetQuestionOptionsFromRequest(JsonElement element)
{
    if (element.ValueKind != JsonValueKind.Object ||
        !element.TryGetProperty("options", out var property) ||
        property.ValueKind != JsonValueKind.Array)
    {
        return [];
    }

    return property
        .EnumerateArray()
        .Where(item => item.ValueKind == JsonValueKind.Object)
        .Select(item => new ExamOption(
            GetFirstString(item, "key", "Key").Trim().ToUpperInvariant(),
            GetFirstString(item, "text", "Text").Trim()))
        .Where(option => !string.IsNullOrWhiteSpace(option.Key) && !string.IsNullOrWhiteSpace(option.Text))
        .GroupBy(option => option.Key, StringComparer.OrdinalIgnoreCase)
        .Select(group => group.First())
        .ToList();
}

static List<string> GetQuestionKeywordsFromRequest(JsonElement element)
{
    var keywords = GetFirstStringArray(element, "keywords", "palabrasClave", "palabras_clave");
    if (keywords.Count > 0)
    {
        return keywords.Select(keyword => keyword.Trim()).Where(keyword => keyword.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    var keywordText = GetFirstString(element, "keywordText", "palabrasClaveTexto").Trim();
    return keywordText
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(keyword => keyword.Length > 0)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();
}

static List<string> BuildKeywordsFromExpected(string expected)
{
    return NormalizeText(expected)
        .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(word => word.Length > 3)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .Take(12)
        .ToList();
}

static CodeRunner? GetQuestionRunnerFromRequest(JsonElement element)
{
    if (element.ValueKind != JsonValueKind.Object ||
        !element.TryGetProperty("runner", out var runnerElement) ||
        runnerElement.ValueKind != JsonValueKind.Object)
    {
        return null;
    }

    var functionName = GetFirstString(runnerElement, "functionName", "FunctionName").Trim();
    var language = GetFirstString(runnerElement, "language", "Language").Trim();
    var solutionCode = GetFirstString(runnerElement, "solutionCode", "SolutionCode", "codigoSolucion").Trim();
    var tests = GetCodeTestsFromRequest(runnerElement);

    if (string.IsNullOrWhiteSpace(functionName) || tests.Count == 0)
    {
        return null;
    }

    return new CodeRunner(functionName, string.IsNullOrWhiteSpace(language) ? "JavaScript" : language, tests, solutionCode);
}

static List<CodeTest> GetCodeTestsFromRequest(JsonElement runnerElement)
{
    if (!runnerElement.TryGetProperty("tests", out var testsElement) || testsElement.ValueKind != JsonValueKind.Array)
    {
        return [];
    }

    var tests = new List<CodeTest>();
    foreach (var testElement in testsElement.EnumerateArray().Where(item => item.ValueKind == JsonValueKind.Object))
    {
        var name = GetFirstString(testElement, "name", "Name").Trim();
        var args = testElement.TryGetProperty("args", out var argsElement) && argsElement.ValueKind == JsonValueKind.Array
            ? argsElement.EnumerateArray().Select(ConvertJsonValue).ToArray()
            : [];

        var expected = testElement.TryGetProperty("expected", out var expectedElement)
            ? ConvertJsonValue(expectedElement)
            : "";

        tests.Add(new CodeTest(string.IsNullOrWhiteSpace(name) ? $"Prueba {tests.Count + 1}" : name, args, expected));
    }

    return tests;
}

static object ConvertJsonValue(JsonElement element)
{
    return element.ValueKind switch
    {
        JsonValueKind.String => element.GetString() ?? "",
        JsonValueKind.Number when element.TryGetInt32(out var intValue) => intValue,
        JsonValueKind.Number when element.TryGetDouble(out var doubleValue) => doubleValue,
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Array => element.EnumerateArray().Select(ConvertJsonValue).ToArray(),
        JsonValueKind.Object => JsonSerializer.Deserialize<Dictionary<string, object>>(element.GetRawText()) ?? new Dictionary<string, object>(),
        _ => ""
    };
}

static string GenerateQuestionId(string title)
{
    var slug = string.Join("-", NormalizeText(title).Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(5));
    if (string.IsNullOrWhiteSpace(slug))
    {
        slug = "pregunta";
    }

    return $"{slug}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
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

static bool TryGetInterviewer(HttpRequest request, ConcurrentDictionary<string, InterviewSession> sessions, out string user)
{
    user = "";
    var token = request.Headers["X-Interview-Token"].FirstOrDefault() ?? "";
    if (!string.IsNullOrWhiteSpace(token) && sessions.TryGetValue(token, out var session))
    {
        user = session.User;
        return true;
    }

    return false;
}

static bool TryRequireRole(HttpRequest request, ConcurrentDictionary<string, InterviewSession> sessions, out InterviewSession session, params string[] allowedRoles)
{
    session = new InterviewSession("", "");
    var token = request.Headers["X-Interview-Token"].FirstOrDefault() ?? "";
    if (string.IsNullOrWhiteSpace(token) || !sessions.TryGetValue(token, out var savedSession))
    {
        return false;
    }

    var role = NormalizeRole(savedSession.Role);
    if (allowedRoles.Any(allowedRole => string.Equals(role, allowedRole, StringComparison.OrdinalIgnoreCase)))
    {
        session = savedSession with { Role = role };
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
    question.Options,
    Runner = ToPublicRunner(question.Runner)
};

static object? ToPublicRunner(CodeRunner? runner)
{
    if (runner is null)
    {
        return null;
    }

    return new
    {
        runner.FunctionName,
        runner.Language,
        runner.Tests
    };
}

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
        question.Expected,
        Runner = ToPublicRunner(question.Runner)
    };
}

static object? EvaluateExam(JsonElement request, bool includeExpected, IReadOnlyList<ExamQuestion> questions)
{
    var id = GetString(request, "id");
    if (string.IsNullOrWhiteSpace(id))
    {
        return null;
    }

    var questionIds = GetQuestionIds(request).Take(20).ToList();
    if (questionIds.Count == 0)
    {
        return null;
    }

    var answers = request.TryGetProperty("answers", out var answersElement) && answersElement.ValueKind == JsonValueKind.Object
        ? answersElement
        : default;

    var selectedQuestions = questionIds
        .Select(idValue => questions.FirstOrDefault(question => question.Id == idValue))
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
        candidateEmail = GetString(request, "candidateEmail"),
        score,
        automaticScore = score,
        manualScore = (int?)null,
        manualNote = "",
        earnedPoints,
        totalPoints,
        evaluated,
        answers = answerDictionary,
        securityReason = GetString(request, "securityReason"),
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
            (id, nombre_candidato, correo_candidato, calificacion, calificacion_manual, puntos_obtenidos, puntos_totales, iniciado_en, finalizado_en, nota_manual, modificado_por, modificado_en, datos_json)
        SELECT
            id,
            COALESCE(candidate_name, ''),
            '',
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
    List<string> Keywords,
    CodeRunner? Runner = null
);

record CodeRunner(string FunctionName, string Language, List<CodeTest> Tests, string SolutionCode = "");

record CodeTest(string Name, object[] Args, object Expected);

record InterviewSession(string User, string Role);

record InterviewerUserRequest(string Email, string Password, string Role, bool Active);

static class AppData
{
public static readonly Dictionary<string, string> DefaultInterviewers = new(StringComparer.OrdinalIgnoreCase)
{
    ["ariel@redgps.com"] = "12345",
    ["hector@redgps.com"] = "12345",
    ["ilian@redgps.com"] = "12345",
    ["alejandro@redgps.com"] = "12345",
    ["juan@redgps.com"] = "12345",
    ["arielsadoth@gmail.com"] = "12345",
};

public static string GetDefaultRole(string user)
{
    return user.Equals("ariel@redgps.com", StringComparison.OrdinalIgnoreCase) ||
        user.Equals("arielsadoth@gmail.com", StringComparison.OrdinalIgnoreCase)
            ? "admin"
            : "entrevistador";
}

public static readonly List<ExamQuestion> DefaultQuestions =
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
    new("soft-code-palindrome", "Desarrollo de Software", "code", "Problema practico: palindromo", "Escriba una funcion llamada esPalindromo(texto) que devuelva true si el texto es palindromo. Debe ignorar espacios, mayusculas y acentos. Ejemplo: 'Anita lava la tina' debe regresar true.", 20,
        [], "", "Normalizar el texto, convertir a minusculas, quitar espacios o caracteres no necesarios, invertir la cadena o comparar extremos y devolver un booleano.",
        ["function", "return", "tolowercase", "normalize", "replace", "reverse", "split", "join", "true", "normalizar", "minusculas", "espacios", "invertir", "comparar"],
        new("esPalindromo", "JavaScript",
        [
            new("frase con espacios", [ "Anita lava la tina" ], true),
            new("palabra simple", [ "Reconocer" ], true),
            new("texto no palindromo", [ "RedGPS" ], false),
        ])),
    new("soft-code-api-list", "Desarrollo de Software", "code", "Problema practico: filtrar API", "Escriba una funcion llamada filtrarUsuariosActivos(usuarios) que reciba una lista de usuarios y regrese solo los usuarios con active: true.", 20,
        [], "", "Recorrer o filtrar la lista de usuarios, validar la propiedad active y regresar solo los usuarios activos.",
        ["function", "return", "filter", "active", "usuarios", "filtrar", "activos"],
        new("filtrarUsuariosActivos", "JavaScript",
        [
            new("mezcla activos e inactivos", [ new object[] { new { id = 1, active = true }, new { id = 2, active = false }, new { id = 3, active = true } } ], new object[] { new { id = 1, active = true }, new { id = 3, active = true } }),
            new("sin activos", [ new object[] { new { id = 4, active = false } } ], Array.Empty<object>()),
            new("lista vacia", [ Array.Empty<object>() ], Array.Empty<object>()),
        ])),
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
    new("mobile-code-login", "Desarrollo Mobile", "code", "Problema practico: validacion login movil", "Escriba una funcion llamada validarLogin(correo, contrasena) que devuelva true si el correo tiene formato valido y la contrasena tiene minimo 8 caracteres.", 20,
        [], "", "Validar correo con formato valido, validar longitud minima de contrasena y devolver un booleano antes de llamar a una API.",
        ["function", "return", "correo", "email", "formato", "regex", "contrasena", "password", "length", "8", "true", "false"],
        new("validarLogin", "JavaScript",
        [
            new("datos validos", [ "ariel@redgps.com", "12345678" ], true),
            new("correo invalido", [ "ariel-redgps.com", "12345678" ], false),
            new("contrasena corta", [ "ariel@redgps.com", "123" ], false),
        ])),
    new("mobile-code-cache", "Desarrollo Mobile", "code", "Problema practico: cache de datos", "Escriba una funcion llamada resolverDatos(cache, respuestaApi, hayError) que devuelva respuestaApi si no hay error y tiene datos; si hay error o no hay datos, debe devolver cache.", 20,
        [], "", "Usar datos de API cuando esten disponibles, conservar cache local cuando haya error o respuesta vacia y evitar pantalla vacia.",
        ["function", "return", "cache", "api", "error", "datos", "length", "pantalla"],
        new("resolverDatos", "JavaScript",
        [
            new("api correcta", [ new object[] { "guardado" }, new object[] { "nuevo" }, false ], new object[] { "nuevo" }),
            new("api con error", [ new object[] { "guardado" }, new object[] { "nuevo" }, true ], new object[] { "guardado" }),
            new("api vacia", [ new object[] { "guardado" }, Array.Empty<object>(), false ], new object[] { "guardado" }),
        ])),
];
}
