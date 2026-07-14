let questions = [];

const state = {
  activeExam: null,
  answers: {},
  timerId: null,
  remainingSeconds: 0,
  lastResult: null,
  candidateAccessDenied: false,
  selectedHistoryId: null,
};

const questionBank = document.querySelector("#questionBank");
const examForm = document.querySelector("#examForm");
const resultList = document.querySelector("#resultList");
const resultSummary = document.querySelector("#resultSummary");
const scoreLabel = document.querySelector("#scoreLabel");
const modeLabel = document.querySelector("#modeLabel");
const timer = document.querySelector("#timer");
const candidateNameInput = document.querySelector("#candidateName");
const answersSummary = document.querySelector("#answersSummary");
const answersList = document.querySelector("#answersList");
const answerKeyList = document.querySelector("#answerKeyList");
const loginScreen = document.querySelector("#loginScreen");
const loginForm = document.querySelector("#loginForm");
const loginUser = document.querySelector("#loginUser");
const loginPassword = document.querySelector("#loginPassword");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");
const urlParams = new URLSearchParams(location.search);
const isCandidateLink = urlParams.has("exam");
const SESSION_KEY = "redgpsInterviewerSession";
const USER_KEY = "redgpsInterviewerUser";
const TOKEN_KEY = "redgpsInterviewToken";

async function loadQuestions() {
  if (!location.protocol.startsWith("http")) {
    return;
  }

  const response = await fetchWithTimeout(`${location.origin}/api/questions`, {}, 9000);
  questions = await response.json();
}

function getAuthHeaders() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { "X-Interview-Token": token } : {};
}

function renderQuestionBank() {
  questionBank.innerHTML = questions
    .map(
      (question) => `
        <article class="question-card">
          <div class="question-top">
            <input type="checkbox" id="${question.id}" value="${question.id}" checked />
            <div>
              <h3>${question.title}</h3>
              <p>${question.prompt}</p>
              <div class="tag-row">
                <span class="tag">${question.area}</span>
                <span class="tag">${getQuestionTypeLabel(question)}</span>
                <span class="tag">${question.points} pts</span>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewId}`).classList.add("active");

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  const labels = {
    interviewerView: "Entrevistador",
    candidateView: "Candidato",
    resultsView: "Resultados",
    answersView: "Respuestas",
    answerKeyView: "Correctas",
  };
  modeLabel.textContent = labels[viewId];
}

function getSelectedQuestions() {
  return [...document.querySelectorAll("#questionBank input:checked")]
    .map((input) => questions.find((question) => question.id === input.value))
    .filter(Boolean);
}

function createExam() {
  const selectedQuestions = getSelectedQuestions();

  if (selectedQuestions.length < 5) {
    alert("Selecciona al menos 5 preguntas para generar el examen aleatorio.");
    return;
  }

  if (!selectedQuestions.some((question) => question.type === "code")) {
    alert("Selecciona al menos una pregunta practica para generar un examen teorico-practico.");
    return;
  }

  if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    alert("Para enviar el examen a otra persona, abre abrir-publico.bat y genera el examen desde la URL https://...trycloudflare.com. Desde localhost solo funciona en tu computadora.");
    return;
  }

  state.activeExam = {
    id: createId(),
    createdAt: new Date().toISOString(),
    timeLimit: Number(document.querySelector("#timeLimit").value),
    questions: pickExamQuestions(selectedQuestions, 5),
  };

  localStorage.setItem("activeExam", JSON.stringify(state.activeExam));
  const questionIds = state.activeExam.questions.map((question) => question.id).join(",");
  const link = `${getExamBaseUrl()}${location.pathname}?exam=${state.activeExam.id}&time=${state.activeExam.timeLimit}&q=${questionIds}`;
  document.querySelector("#examLink").value = link;
  document.querySelector("#examLinkBox").classList.remove("hidden");
  renderExam();
  alert("Examen generado con link publico listo para enviar.");
}

function getExamBaseUrl() {
  return location.origin;
}

function pickRandomQuestions(source, count) {
  const shuffled = [...source];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = getRandomNumber(index + 1);
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
}

function pickExamQuestions(source, count) {
  const practicalQuestions = source.filter((question) => question.type === "code");
  const selectedPractical = pickRandomQuestions(practicalQuestions, 1);
  const remainingPool = source.filter((question) => !selectedPractical.includes(question));
  return [...selectedPractical, ...pickRandomQuestions(remainingPool, count - selectedPractical.length)];
}

function getQuestionTypeLabel(question) {
  const labels = {
    closed: "Teorica cerrada",
    open: "Teorica abierta",
    code: "Practica",
  };

  return labels[question.type] || "Pregunta";
}

function createId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `exam-${timePart}-${randomPart}`;
}

function getRandomNumber(max) {
  if (window.crypto && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function renderExam() {
  if (state.candidateAccessDenied) {
    showExamBlockedMessage();
    return;
  }

  const examFromLink = getExamFromLink();
  const savedExam = localStorage.getItem("activeExam");
  state.activeExam = examFromLink || state.activeExam;
  state.activeExam = state.activeExam || (savedExam ? JSON.parse(savedExam) : null);

  if (!state.activeExam) {
    examForm.innerHTML = "<p>No hay examen generado todavia.</p>";
    timer.textContent = "--:--";
    return;
  }

  examForm.innerHTML = state.activeExam.questions
    .map((question, index) => renderAnswerField(question, index))
    .join("");
  restoreCandidateName();
  restoreDraftAnswers();
  bindDraftSaving();
}

function showExamBlockedMessage() {
  clearInterval(state.timerId);
  timer.textContent = "Bloqueado";
  candidateNameInput.disabled = true;
  document.querySelector("#finishExamButton").disabled = true;
  examForm.innerHTML = `
    <article class="result-card wrong">
      <h3>Este enlace ya fue usado</h3>
      <p>Por seguridad, este examen solo puede abrirse una vez. Pide al entrevistador que genere un nuevo enlace.</p>
    </article>
  `;
}

function getExamFromLink() {
  if (!urlParams.has("exam") || !urlParams.has("q")) {
    return null;
  }

  const questionIds = urlParams.get("q").split(",");
  const selectedQuestions = questionIds
    .map((id) => questions.find((question) => question.id === id))
    .filter(Boolean);

  if (!selectedQuestions.length) {
    return null;
  }

  return {
    id: urlParams.get("exam"),
    createdAt: getExamStartTime(urlParams.get("exam")),
    timeLimit: Number(urlParams.get("time") || 20),
    questions: selectedQuestions,
  };
}

function getExamStartTime(examId) {
  const key = `examStartedAt:${examId}`;
  const savedStart = localStorage.getItem(key);

  if (savedStart) {
    return savedStart;
  }

  const startedAt = new Date().toISOString();
  localStorage.setItem(key, startedAt);
  return startedAt;
}

function renderAnswerField(question, index) {
  if (question.type === "closed") {
    return `
      <article class="answer-card">
        <label>${index + 1}. ${question.prompt}<span>${question.area} | ${getQuestionTypeLabel(question)}</span></label>
        <div class="option-list">
          ${question.options
            .map(
              (option) => `
                <label class="option-item">
                  <input type="radio" name="${question.id}" value="${option.key}" />
                  <span>${option.key}) ${option.text}</span>
                </label>
              `
            )
            .join("")}
        </div>
      </article>
    `;
  }

  if (question.type === "code") {
    const runner = question.runner
      ? `
        <div class="code-runner-bar">
          <span>Funcion esperada: <strong>${question.runner.functionName}</strong></span>
          <button class="secondary-button run-code-button" type="button" data-question-id="${question.id}">Ejecutar pruebas</button>
        </div>
        <div class="code-test-output" id="test-output-${question.id}"></div>
      `
      : "";

    return `
      <article class="answer-card code-answer-card">
        <label for="answer-${question.id}">
          ${index + 1}. ${question.prompt}
          <span>${question.area} | ${getQuestionTypeLabel(question)}</span>
        </label>
        <textarea class="code-editor" id="answer-${question.id}" name="${question.id}" spellcheck="false" placeholder="Escribe aqui tu solucion. Puedes usar JavaScript, pseudocodigo claro o el lenguaje que domines."></textarea>
        ${runner}
      </article>
    `;
  }

  return `
    <article class="answer-card">
      <label for="answer-${question.id}">
        ${index + 1}. ${question.prompt}
        <span>${question.area} | ${getQuestionTypeLabel(question)}</span>
      </label>
      <textarea id="answer-${question.id}" name="${question.id}" placeholder="Escribe aqui tu respuesta"></textarea>
    </article>
  `;
}

function getDraftKey() {
  return state.activeExam ? `examDraft:${state.activeExam.id}` : "examDraft";
}

function getFinishedKey() {
  return state.activeExam ? `examFinished:${state.activeExam.id}` : "examFinished";
}

function saveDraftAnswers() {
  if (!state.activeExam) {
    return;
  }

  const formData = new FormData(examForm);
  const answers = Object.fromEntries(formData.entries());
  answers.__candidateName = candidateNameInput.value.trim();
  localStorage.setItem(getDraftKey(), JSON.stringify(answers));
}

function restoreDraftAnswers() {
  if (!state.activeExam) {
    return;
  }

  const savedDraft = localStorage.getItem(getDraftKey());

  if (!savedDraft) {
    return;
  }

  const answers = JSON.parse(savedDraft);

  Object.entries(answers).forEach(([questionId, answer]) => {
    if (questionId === "__candidateName") {
      return;
    }

    const field = examForm.querySelector(`[name="${questionId}"]`);

    if (!field) {
      return;
    }

    if (field.type === "radio") {
      const option = examForm.querySelector(`[name="${questionId}"][value="${CSS.escape(answer)}"]`);
      if (option) {
        option.checked = true;
      }
      return;
    }

    field.value = answer;
  });
}

function bindDraftSaving() {
  examForm.querySelectorAll("textarea, input").forEach((field) => {
    field.addEventListener("input", saveDraftAnswers);
    field.addEventListener("change", saveDraftAnswers);
  });
  examForm.querySelectorAll(".run-code-button").forEach((button) => {
    button.addEventListener("click", () => runCodeTests(button.dataset.questionId));
  });
  candidateNameInput.addEventListener("input", saveDraftAnswers);
}

async function runCodeTests(questionId) {
  const question = state.activeExam.questions.find((item) => item.id === questionId);
  const output = document.querySelector(`#test-output-${CSS.escape(questionId)}`);
  const editor = document.querySelector(`#answer-${CSS.escape(questionId)}`);

  if (!question?.runner || !output || !editor) {
    return;
  }

  output.innerHTML = `<div class="test-line pending">Ejecutando pruebas...</div>`;

  try {
    const results = await executeCodeRunner(editor.value, question.runner);
    const passed = results.filter((result) => result.passed).length;
    output.innerHTML = `
      <div class="test-summary">${passed}/${results.length} pruebas pasadas</div>
      ${results
        .map(
          (result) => `
            <div class="test-line ${result.passed ? "passed" : "failed"}">
              <strong>${result.passed ? "OK" : "Fallo"}</strong> ${escapeHtml(result.name)}
              ${result.passed ? "" : `<span>Esperado: ${escapeHtml(JSON.stringify(result.expected))} | Recibido: ${escapeHtml(JSON.stringify(result.actual))}</span>`}
            </div>
          `
        )
        .join("")}
    `;
  } catch (error) {
    output.innerHTML = `<div class="test-line failed"><strong>Error</strong> ${escapeHtml(error.message)}</div>`;
  }
}

function executeCodeRunner(code, runner) {
  return new Promise((resolve, reject) => {
    const workerSource = `
      const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

      self.onmessage = async (event) => {
        const { code, runner } = event.data;
        try {
          const factory = new Function(code + "\\nreturn typeof " + runner.functionName + " === 'function' ? " + runner.functionName + " : null;");
          const fn = factory();

          if (!fn) {
            throw new Error("No se encontro la funcion " + runner.functionName + ".");
          }

          const results = [];
          for (const test of runner.tests) {
            const actual = await fn(...test.args);
            results.push({
              name: test.name,
              expected: test.expected,
              actual,
              passed: deepEqual(actual, test.expected),
            });
          }

          self.postMessage({ ok: true, results });
        } catch (error) {
          self.postMessage({ ok: false, error: error.message || String(error) });
        }
      };
    `;
    const blob = new Blob([workerSource], { type: "text/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("El codigo tardo demasiado. Revisa ciclos infinitos."));
    }, 2500);

    worker.onmessage = (event) => {
      clearTimeout(timeout);
      worker.terminate();

      if (event.data.ok) {
        resolve(event.data.results);
        return;
      }

      reject(new Error(event.data.error));
    };

    worker.onerror = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(event.message));
    };

    worker.postMessage({ code, runner });
  });
}

function restoreCandidateName() {
  const savedDraft = localStorage.getItem(getDraftKey());
  const savedName = savedDraft ? JSON.parse(savedDraft).__candidateName : "";
  candidateNameInput.value = savedName || "";
}

function startTimer() {
  if (state.candidateAccessDenied) {
    showExamBlockedMessage();
    return;
  }

  if (!state.activeExam) {
    renderExam();
  }

  if (!state.activeExam) {
    return;
  }

  const finishedResult = getFinishedResult();

  if (finishedResult) {
    state.lastResult = finishedResult;
    renderResults();
    showView("resultsView");
    return;
  }

  clearInterval(state.timerId);
  state.remainingSeconds = getRemainingSeconds();
  updateTimerLabel();

  if (state.remainingSeconds <= 0) {
    finishExam();
    return;
  }

  state.timerId = setInterval(() => {
    state.remainingSeconds = getRemainingSeconds();
    updateTimerLabel();

    if (state.remainingSeconds <= 0) {
      finishExam();
    }
  }, 1000);
}

function getFinishedResult() {
  if (!state.activeExam) {
    return null;
  }

  const savedResult = localStorage.getItem(getFinishedKey());
  return savedResult ? JSON.parse(savedResult) : null;
}

function getRemainingSeconds() {
  const startedAt = new Date(state.activeExam.createdAt).getTime();
  const limitMs = state.activeExam.timeLimit * 60 * 1000;
  const endsAt = startedAt + limitMs;
  return Math.ceil((endsAt - Date.now()) / 1000);
}

function updateTimerLabel() {
  const minutes = Math.max(0, Math.floor(state.remainingSeconds / 60));
  const seconds = Math.max(0, state.remainingSeconds % 60);
  timer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function finishExam() {
  if (!state.activeExam) {
    alert("Primero genera un examen.");
    return;
  }

  try {
    const candidateName = candidateNameInput.value.trim();

    if (!candidateName) {
      alert("Escribe tu nombre completo antes de finalizar el examen.");
      candidateNameInput.focus();
      return;
    }

    clearInterval(state.timerId);
    const formData = new FormData(examForm);
    state.answers = Object.fromEntries(formData.entries());
    state.lastResult = await evaluateAnswersOnServer(candidateName);
    localStorage.setItem(getFinishedKey(), JSON.stringify(state.lastResult));
    localStorage.removeItem(getDraftKey());
    saveResultLocally(state.lastResult);
    renderResults();
    showView("resultsView");
    markServerSaveStatus("Resultado guardado para el entrevistador.");
  } catch (error) {
    console.error(error);
    alert("No se pudo finalizar el examen. Revisa que las preguntas hayan cargado correctamente.");
  }
}

async function evaluateAnswersOnServer(candidateName) {
  const response = await fetchWithTimeout(`${location.origin}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: state.activeExam.id,
      candidateName,
      questionIds: state.activeExam.questions.map((question) => question.id),
      answers: state.answers,
      startedAt: state.activeExam.createdAt,
      finishedAt: new Date().toISOString(),
    }),
  }, 9000);

  if (!response.ok) {
    throw new Error("No se pudo evaluar el examen.");
  }

  return response.json();
}

function evaluateAnswers() {
  const evaluated = state.activeExam.questions.map((question) => {
    return question.type === "closed" ? evaluateClosed(question) : evaluateOpen(question);
  });

  const totalPoints = state.activeExam.questions.reduce((sum, question) => sum + question.points, 0);
  const earnedPoints = evaluated.reduce((sum, item) => sum + item.earned, 0);
  const score = Math.round((earnedPoints / totalPoints) * 100);

  return {
    id: state.activeExam.id,
    candidateName: candidateNameInput.value.trim(),
    score,
    automaticScore: score,
    manualScore: null,
    manualNote: "",
    earnedPoints,
    totalPoints,
    evaluated,
    answers: state.answers,
    startedAt: state.activeExam.createdAt,
    finishedAt: new Date().toISOString(),
  };
}

function evaluateClosed(question) {
  const answer = state.answers[question.id] || "";
  const isCorrect = answer === question.correctAnswer;
  const wrongFeedback = isCandidateLink
    ? "La opcion seleccionada no fue correcta."
    : `La respuesta correcta era ${question.correctAnswer}) ${question.expected}.`;

  return {
    question,
    answer,
    earned: isCorrect ? question.points : 0,
    stateLabel: isCorrect ? "Correcta" : "Incorrecta",
    stateClass: isCorrect ? "correct" : "wrong",
    feedback: isCorrect ? "La opcion seleccionada es correcta." : wrongFeedback,
  };
}

function evaluateOpen(question) {
  const answer = state.answers[question.id] || "";
  const normalizedAnswer = normalizeText(answer);
  const foundKeywords = question.keywords.filter((keyword) =>
    normalizedAnswer.includes(normalizeText(keyword))
  );
  const keywordRatio = foundKeywords.length / question.keywords.length;
  const similarity = getTextSimilarity(answer, question.expected);
  const ratio = Math.max(keywordRatio, similarity);
  const earned = Math.round(question.points * ratio);
  const missing = question.keywords.filter((keyword) => !foundKeywords.includes(keyword));

  let stateLabel = "Incorrecta";
  let stateClass = "wrong";
  let feedback = `Faltaron elementos clave: ${missing.join(", ")}.`;

  if (ratio >= 0.8) {
    stateLabel = "Correcta";
    stateClass = "correct";
    feedback = "La respuesta se acerca correctamente a la respuesta esperada.";
  } else if (ratio >= 0.45) {
    stateLabel = "Parcial";
    stateClass = "partial";
    feedback = `La respuesta se acerca, pero faltan puntos importantes: ${missing.join(", ")}.`;
  }

  return {
    question,
    answer,
    foundKeywords,
    earned,
    stateLabel,
    stateClass,
    feedback,
  };
}

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#.+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTextSimilarity(answer, expected) {
  const answerWords = new Set(normalizeText(answer).split(" ").filter((word) => word.length > 3));
  const expectedWords = new Set(normalizeText(expected).split(" ").filter((word) => word.length > 3));

  if (!answerWords.size || !expectedWords.size) {
    return 0;
  }

  const matches = [...expectedWords].filter((word) => answerWords.has(word)).length;
  return matches / expectedWords.size;
}

function saveResultLocally(result) {
  const history = getHistory();
  const updatedHistory = [result, ...history].slice(0, 20);
  localStorage.setItem("lastResult", JSON.stringify(result));
  localStorage.setItem("examHistory", JSON.stringify(updatedHistory));
}

async function saveResultOnServer(result) {
  if (location.protocol.startsWith("http")) {
    try {
      await fetchWithTimeout(`${location.origin}/api/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(result),
        keepalive: true,
      }, 9000);
    } catch {
      markServerSaveStatus("Resultado guardado en este telefono, pero no se pudo enviar al entrevistador.");
      console.warn("No se pudo guardar el resultado en el servidor local.");
    }
  }
}

function getCandidateToken() {
  const examId = urlParams.get("exam");
  const key = `candidateToken:${examId}`;
  const savedToken = localStorage.getItem(key);

  if (savedToken) {
    return savedToken;
  }

  const token =
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, token);
  return token;
}

async function claimCandidateLink() {
  if (!isCandidateLink || !location.protocol.startsWith("http")) {
    return true;
  }

  const examId = urlParams.get("exam");
  const token = getCandidateToken();

  try {
    const response = await fetchWithTimeout(`${location.origin}/api/exam-access/${encodeURIComponent(examId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }, 9000);
    const data = await response.json();

    if (!data.allowed) {
      state.candidateAccessDenied = true;
      showExamBlockedMessage();
      return false;
    }

    return true;
  } catch {
    state.candidateAccessDenied = true;
    showExamBlockedMessage();
    return false;
  }
}

function getHistory() {
  const savedHistory = localStorage.getItem("examHistory");
  return savedHistory ? JSON.parse(savedHistory) : [];
}

async function renderResults() {
  if (!isCandidateLink && location.protocol.startsWith("http") && !hasInterviewerSession()) {
    state.lastResult = null;
    scoreLabel.textContent = "0/100";
    resultSummary.textContent = "Inicia sesion para cargar los resultados guardados en la base de datos.";
    resultList.innerHTML = "";
    return;
  }

  if (!isCandidateLink && location.protocol.startsWith("http")) {
    const history = (await getServerHistory()).filter((result) => result && result.id && result.evaluated);

    if (history.length) {
      state.lastResult = history[0];
      localStorage.setItem("lastResult", JSON.stringify(state.lastResult));
    } else {
      state.lastResult = null;
    }
  } else {
    const savedResult = localStorage.getItem("lastResult");
    state.lastResult = state.lastResult || (savedResult ? JSON.parse(savedResult) : null);
  }

  if (!state.lastResult) {
    resultSummary.textContent = "Aun no hay respuestas evaluadas.";
    resultList.innerHTML = "";
    scoreLabel.textContent = "0/100";
    return;
  }

  scoreLabel.textContent = `${state.lastResult.score}/100`;
  const displayName = state.lastResult.candidateName || "Candidato sin nombre";
  const manualLabel =
    state.lastResult.manualScore !== null && state.lastResult.manualScore !== undefined
      ? ` Calificacion ajustada por entrevistador: ${state.lastResult.manualScore}/100.`
      : "";
  resultSummary.textContent = isCandidateLink
    ? `Obtuviste ${state.lastResult.earnedPoints} de ${state.lastResult.totalPoints} puntos. Estamos guardando tu resultado para el entrevistador.`
    : `${displayName} obtuvo ${state.lastResult.earnedPoints} de ${state.lastResult.totalPoints} puntos. Calificacion automatica: ${state.lastResult.automaticScore ?? state.lastResult.score}/100.${manualLabel}`;
  resultList.innerHTML = state.lastResult.evaluated.map(renderResultCard).join("");
}

function markServerSaveStatus(message) {
  if (isCandidateLink && state.lastResult) {
    resultSummary.textContent = `Obtuviste ${state.lastResult.earnedPoints} de ${state.lastResult.totalPoints} puntos. ${message}`;
  }
}

function renderResultCard(item) {
  const earned = getEffectiveEarned(item);
  const stateLabel = getEffectiveStateLabel(item);
  const stateClass = getEffectiveStateClass(item);
  const points = getQuestionPoints(item);
  const title = getQuestionTitle(item);
  const expected = getQuestionExpected(item);
  const expectedAnswer =
    isCandidateLink || !expected
      ? ""
      : `<p><strong>Esperado:</strong> ${expected}</p>`;
  const manualDetail =
    !isCandidateLink && item.manualEarned !== undefined && item.manualEarned !== null
      ? `<p class="review-note">Ajuste manual: ${item.manualEarned}/${points} pts${item.manualNote ? ` | ${escapeHtml(item.manualNote)}` : ""}${item.modifiedBy ? ` | Modifico: ${escapeHtml(item.modifiedBy)}` : ""}</p>`
      : "";

  return `
    <article class="result-card ${stateClass}">
      <h3>${escapeHtml(title)}</h3>
      <p class="result-state">${stateLabel}: ${earned}/${points} pts</p>
      <p>${item.feedback}</p>
      ${expectedAnswer}
      ${manualDetail}
      <code>${escapeHtml(formatAnswer(item))}</code>
    </article>
  `;
}

function renderReviewResultCard(result, item, index) {
  const points = getQuestionPoints(item);
  const baseCard = renderResultCard(item).replace(
    "<article",
    `<article data-question-index="${index}"`
  );
  const effectiveEarned = getEffectiveEarned(item);
  const reviewControls = `
      <div class="question-review-panel">
        <div class="question-review-grid">
          <label class="field">
            Puntaje de esta respuesta
            <input class="question-score-input" type="number" min="0" max="${points}" value="${effectiveEarned}" />
          </label>
          <label class="field">
            Motivo del ajuste
            <input class="question-note-input" value="${escapeHtml(item.manualNote || "")}" placeholder="Ej. respuesta valida para el puesto" />
          </label>
          <button class="secondary-button save-question-score-button" type="button">Guardar puntaje</button>
        </div>
        <span class="question-save-status"></span>
      </div>
    </article>
  `;

  return baseCard.replace("</article>", reviewControls);
}

function getEffectiveEarned(item) {
  if (item.manualEarned === undefined || item.manualEarned === null || item.manualEarned === "") {
    return item.earned;
  }

  const manualEarned = Number(item.manualEarned);
  return Number.isFinite(manualEarned) ? manualEarned : item.earned;
}

function getEffectiveStateLabel(item) {
  if (item.manualEarned === undefined || item.manualEarned === null) {
    return item.stateLabel;
  }

  const earned = getEffectiveEarned(item);
  if (earned >= getQuestionPoints(item)) {
    return "Correcta ajustada";
  }
  if (earned > 0) {
    return "Parcial ajustada";
  }
  return "Incorrecta ajustada";
}

function getEffectiveStateClass(item) {
  if (item.manualEarned === undefined || item.manualEarned === null) {
    return item.stateClass;
  }

  const earned = getEffectiveEarned(item);
  if (earned >= getQuestionPoints(item)) {
    return "correct";
  }
  if (earned > 0) {
    return "partial";
  }
  return "wrong";
}

function formatAnswer(item) {
  if (getQuestionType(item) === "closed") {
    const option = getQuestionOptions(item).find((choice) => choice.key === item.answer || choice.Key === item.answer);
    const optionText = option ? option.text || option.Text || "" : "";
    return item.answer ? `${item.answer}) ${optionText}` : "Sin respuesta";
  }

  return item.answer || "Sin respuesta";
}

function getQuestionValue(item, lowerName, upperName) {
  const question = item?.question || item?.Question || {};
  return question[lowerName] ?? question[upperName];
}

function getQuestionPoints(item) {
  const points = Number(getQuestionValue(item, "points", "Points"));
  return Number.isFinite(points) && points > 0 ? points : Number(item?.points || 0);
}

function getQuestionTitle(item) {
  return (
    getQuestionValue(item, "title", "Title") ||
    getQuestionValue(item, "prompt", "Prompt") ||
    item?.title ||
    "Pregunta sin titulo"
  );
}

function getQuestionExpected(item) {
  return getQuestionValue(item, "expected", "Expected") || "";
}

function getQuestionType(item) {
  return getQuestionValue(item, "type", "Type") || "";
}

function getQuestionOptions(item) {
  const options = getQuestionValue(item, "options", "Options");
  return Array.isArray(options) ? options : [];
}

async function renderSavedAnswers() {
  if (!isCandidateLink && location.protocol.startsWith("http") && !hasInterviewerSession()) {
    answersSummary.textContent = "Inicia sesion para cargar los examenes guardados en la base de datos.";
    answersList.innerHTML = "";
    return;
  }

  const history = (await getServerHistory()).filter((result) => result && result.id && result.evaluated);

  if (!history.length) {
    answersSummary.textContent = "Aun no hay examenes guardados.";
    answersList.innerHTML = "";
    return;
  }

  answersSummary.textContent = `Hay ${history.length} examen(es) guardado(s) en este navegador.`;
  if (!state.selectedHistoryId || !history.some((result) => result.id === state.selectedHistoryId)) {
    state.selectedHistoryId = history[0].id;
  }

  const selectedResult = history.find((result) => result.id === state.selectedHistoryId);
  answersList.innerHTML = `
    <div class="answers-browser">
      <div class="answer-candidate-list" aria-label="Examenes contestados">
        ${history.map((result) => renderCandidateSummary(result, result.id === state.selectedHistoryId)).join("")}
      </div>
      <div class="answer-detail">
        ${selectedResult ? renderSavedAnswerDetail(selectedResult) : ""}
      </div>
    </div>
  `;
  bindCandidateSummaryControls(history);
  bindManualScoreControls(history);
}

function renderCandidateSummary(result, isSelected) {
  const candidateName = result.candidateName || "Candidato sin nombre";
  const finishedAt = result.finishedAt ? new Date(result.finishedAt).toLocaleString("es-MX") : "Sin fecha";
  const automaticScore = result.automaticScore ?? result.score ?? 0;
  const displayScore = getDisplayScore(result);
  const adjustedLabel = result.manualScore !== null && result.manualScore !== undefined ? "Ajustada" : "Automatica";

  return `
    <button class="candidate-summary-card ${isSelected ? "active" : ""}" type="button" data-result-id="${result.id}">
      <span>
        <strong>${escapeHtml(candidateName)}</strong>
        <small>${finishedAt}</small>
      </span>
      <span class="summary-score">${displayScore}/100</span>
      <span class="summary-meta">${adjustedLabel} | Auto ${automaticScore}/100</span>
    </button>
  `;
}

function renderSavedAnswerDetail(result) {
  const currentUser = getCurrentInterviewerUser();
  const candidateName = result.candidateName || "Candidato sin nombre";
  const finishedAt = result.finishedAt ? new Date(result.finishedAt).toLocaleString("es-MX") : "Sin fecha";

  return `
    <article class="history-card" data-result-id="${result.id}">
      <div class="history-detail-heading">
        <div>
          <p class="eyebrow">Examen seleccionado</p>
          <h3>${escapeHtml(candidateName)} | ${getDisplayScore(result)}/100</h3>
        </div>
        <span class="status-pill">${result.evaluated.length} respuestas</span>
      </div>
      <p>Calificacion automatica: ${result.automaticScore ?? result.score}/100</p>
      <p>Finalizado: ${finishedAt}</p>
      <div class="manual-score-panel">
        <div class="manual-score-grid">
          <label class="field">
            Persona que modifica
            <input class="reviewer-name-input" value="${escapeHtml(currentUser)}" readonly />
          </label>
          <label class="field">
            Calificacion final
            <input class="manual-score-input" type="number" min="0" max="100" value="${getDisplayScore(result)}" />
          </label>
          <label class="field">
            Nota del entrevistador
            <input class="manual-note-input" value="${escapeHtml(result.manualNote || "")}" placeholder="Motivo del ajuste" />
          </label>
          <button class="primary-button save-manual-score-button" type="button">Guardar ajuste</button>
        </div>
        <span class="manual-save-status"></span>
      </div>
      ${result.evaluated.map((item, index) => renderReviewResultCard(result, item, index)).join("")}
    </article>
  `;
}

function bindCandidateSummaryControls() {
  answersList.querySelectorAll(".candidate-summary-card").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedHistoryId = button.dataset.resultId;
      await renderSavedAnswers();
    });
  });
}

function getDisplayScore(result) {
  return result.manualScore !== null && result.manualScore !== undefined
    ? result.manualScore
    : result.score;
}

function bindManualScoreControls(history) {
  answersList.querySelectorAll(".history-card").forEach((card) => {
    const result = history.find((item) => item.id === card.dataset.resultId);
    const saveButton = card.querySelector(".save-manual-score-button");
    const scoreInput = card.querySelector(".manual-score-input");
    const noteInput = card.querySelector(".manual-note-input");
    const reviewerInput = card.querySelector(".reviewer-name-input");
    const status = card.querySelector(".manual-save-status");

    saveButton.addEventListener("click", async () => {
      const manualScore = Number(scoreInput.value);
      const reviewerName = reviewerInput.value.trim();
      const modifiedAt = new Date().toISOString();

      if (!Number.isFinite(manualScore) || manualScore < 0 || manualScore > 100) {
        status.textContent = "La calificacion debe estar entre 0 y 100.";
        return;
      }

      if (!reviewerName) {
        status.textContent = "Escribe quien modifico la calificacion.";
        reviewerInput.focus();
        return;
      }

      const updatedResult = {
        ...result,
        manualScore,
        manualNote: noteInput.value.trim(),
        score: manualScore,
        modifiedBy: reviewerName,
        modificadoPor: reviewerName,
        modifiedAt,
        modificadoEn: modifiedAt,
        reviewedAt: modifiedAt,
      };

      status.textContent = "Guardando...";
      await saveResultOnServer(updatedResult);
      saveResultLocally(updatedResult);
      status.textContent = "Ajuste guardado en la base de datos.";
      await renderSavedAnswers();
      await renderResults();
    });

    card.querySelectorAll(".save-question-score-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const resultCard = button.closest(".result-card");
        const questionIndex = Number(resultCard.dataset.questionIndex);
        const scoreInput = resultCard.querySelector(".question-score-input");
        const noteInput = resultCard.querySelector(".question-note-input");
        const questionStatus = resultCard.querySelector(".question-save-status");
        const item = result.evaluated[questionIndex];
        const manualEarned = Number(scoreInput.value);
        const reviewerName = reviewerInput.value.trim();
        const modifiedAt = new Date().toISOString();

        if (!reviewerName) {
          questionStatus.textContent = "Escribe quien modifico la calificacion.";
          reviewerInput.focus();
          return;
        }

        const maxQuestionPoints = getQuestionPoints(item);
        if (!Number.isFinite(manualEarned) || manualEarned < 0 || manualEarned > maxQuestionPoints) {
          questionStatus.textContent = `El puntaje debe estar entre 0 y ${maxQuestionPoints}.`;
          return;
        }

        const updatedEvaluated = result.evaluated.map((currentItem, index) =>
          index === questionIndex
            ? {
                ...currentItem,
                manualEarned,
                manualNote: noteInput.value.trim(),
                modifiedBy: reviewerName,
                modifiedAt,
              }
            : currentItem
        );
        const updatedResult = recalculateResultScore({
          ...result,
          evaluated: updatedEvaluated,
          modifiedBy: reviewerName,
          modificadoPor: reviewerName,
          modifiedAt,
          modificadoEn: modifiedAt,
          reviewedAt: modifiedAt,
        });

        questionStatus.textContent = "Guardando...";
        await saveResultOnServer(updatedResult);
        saveResultLocally(updatedResult);
        questionStatus.textContent = "Puntaje guardado en la base de datos.";
        await renderSavedAnswers();
        await renderResults();
      });
    });
  });
}

function recalculateResultScore(result) {
  const totalPoints = result.totalPoints || result.evaluated.reduce((sum, item) => sum + getQuestionPoints(item), 0);
  const earnedPoints = result.evaluated.reduce((sum, item) => sum + getEffectiveEarned(item), 0);
  const score = Math.round((earnedPoints / totalPoints) * 100);

  return {
    ...result,
    earnedPoints,
    totalPoints,
    score,
    manualScore: score,
  };
}

async function renderAnswerKey() {
  try {
    const response = await fetchWithTimeout(`${location.origin}/api/answer-key`, {
      headers: getAuthHeaders(),
    }, 9000);

    if (!response.ok) {
      answerKeyList.innerHTML = "<p>Inicia sesion para ver las respuestas correctas.</p>";
      return;
    }

    const answerKey = await response.json();
    answerKeyList.innerHTML = answerKey
    .map((question) => {
      const correctAnswer =
        question.type === "closed"
          ? `${question.correctAnswer}) ${question.expected}`
          : question.expected;

      return `
        <article class="result-card">
          <h3>${question.title}</h3>
          <div class="tag-row">
            <span class="tag">${question.area}</span>
            <span class="tag">${getQuestionTypeLabel(question)}</span>
            <span class="tag">${question.points} pts</span>
          </div>
          <p><strong>Pregunta:</strong> ${question.prompt}</p>
          <p><strong>Respuesta correcta:</strong></p>
          <code>${escapeHtml(correctAnswer)}</code>
        </article>
      `;
    })
    .join("");
  } catch {
    answerKeyList.innerHTML = "<p>No se pudieron cargar las respuestas correctas.</p>";
  }
}

async function getServerHistory() {
  if (location.protocol.startsWith("http")) {
    try {
      const response = await fetchWithTimeout(`${location.origin}/api/results`, {
        headers: getAuthHeaders(),
      }, 9000);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [data];
      }
      if (response.status === 401 || response.status === 403) {
        expireInterviewerSession();
        return [];
      }
    } catch {
      console.warn("No se pudo leer el historial del servidor local.");
    }

    return [];
  }

  return getHistory();
}

function expireInterviewerSession() {
  if (isCandidateLink) {
    return;
  }

  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  loginScreen.classList.remove("hidden");
  loginError.textContent = "Tu sesion expiro. Inicia sesion otra vez para ver la base de datos.";
  loginError.classList.remove("hidden");
}

async function fetchWithTimeout(url, options = {}, timeout = 3500) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timerId);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", async () => {
    showView(button.dataset.view);
    if (button.dataset.view === "candidateView") {
      renderExam();
      startTimer();
    }
    if (button.dataset.view === "resultsView") {
      renderResults();
    }
    if (button.dataset.view === "answersView") {
      renderSavedAnswers();
    }
    if (button.dataset.view === "answerKeyView") {
      await renderAnswerKey();
    }
  });
});

document.querySelector("#createExamButton").addEventListener("click", createExam);

document.querySelector("#selectAllButton").addEventListener("click", () => {
  document.querySelectorAll("#questionBank input").forEach((input) => {
    input.checked = true;
  });
});

document.querySelector("#copyLinkButton").addEventListener("click", async () => {
  const examLink = document.querySelector("#examLink");

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(examLink.value);
    } else {
      examLink.select();
      document.execCommand("copy");
    }

    document.querySelector("#copyLinkButton").textContent = "Copiado";
    setTimeout(() => {
      document.querySelector("#copyLinkButton").textContent = "Copiar";
    }, 1400);
  } catch {
    examLink.select();
    alert("No se pudo copiar automaticamente. El enlace ya quedo seleccionado para copiarlo con Ctrl + C.");
  }
});

document.querySelector("#finishExamButton").addEventListener("click", finishExam);

document.querySelector("#clearHistoryButton").addEventListener("click", () => {
  localStorage.removeItem("examHistory");
  localStorage.removeItem("lastResult");
  state.lastResult = null;
  if (location.protocol.startsWith("http")) {
    fetch("/api/results", { method: "DELETE", headers: getAuthHeaders() });
  }
  renderResults();
  renderSavedAnswers();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = loginUser.value.trim();

  const response = await fetchWithTimeout(`${location.origin}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, password: loginPassword.value }),
  }, 9000);

  if (response.ok) {
    const session = await response.json();
    sessionStorage.setItem(SESSION_KEY, "true");
    sessionStorage.setItem(USER_KEY, session.user);
    sessionStorage.setItem(TOKEN_KEY, session.token);
    loginUser.value = "";
    loginPassword.value = "";
    loginError.textContent = "Usuario o contrasena incorrectos.";
    loginError.classList.add("hidden");
    loginScreen.classList.add("hidden");
    await renderResults();
    await renderSavedAnswers();
    await renderAnswerKey();
    return;
  }

  loginError.textContent = "Usuario o contrasena incorrectos.";
  loginError.classList.remove("hidden");
  loginPassword.select();
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  loginScreen.classList.remove("hidden");
  loginUser.focus();
});

function protectInterviewerPanel() {
  if (isCandidateLink) {
    loginScreen.classList.add("hidden");
    return;
  }

  if (hasInterviewerSession()) {
    loginScreen.classList.add("hidden");
    return;
  }

  loginScreen.classList.remove("hidden");
  loginUser.focus();
}

function hasInterviewerSession() {
  return sessionStorage.getItem(SESSION_KEY) === "true" && Boolean(sessionStorage.getItem(TOKEN_KEY));
}

function getCurrentInterviewerUser() {
  return sessionStorage.getItem(USER_KEY) || "";
}

async function initializeApp() {
  await loadQuestions();
  renderQuestionBank();
  protectInterviewerPanel();

  if (isCandidateLink) {
    document.body.classList.add("candidate-mode");
    showView("candidateView");
    const allowed = await claimCandidateLink();
    if (allowed) {
      renderExam();
      startTimer();
    }
    return;
  }

  if (hasInterviewerSession()) {
    await renderResults();
    await renderSavedAnswers();
    await renderAnswerKey();
  }

  renderExam();
}

initializeApp();


