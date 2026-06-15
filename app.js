const questions = [
  {
    id: "soft-html",
    area: "Desarrollo de Software",
    type: "closed",
    title: "Que significa HTML",
    prompt: "Que significa HTML?",
    points: 20,
    options: [
      { key: "A", text: "Hyper Text Markup Language" },
      { key: "B", text: "High Transfer Machine Language" },
      { key: "C", text: "Hyper Tool Multi Language" },
      { key: "D", text: "Home Text Markup Language" },
    ],
    correctAnswer: "A",
    expected: "Hyper Text Markup Language",
  },
  {
    id: "soft-language",
    area: "Desarrollo de Software",
    type: "closed",
    title: "Lenguaje de programacion",
    prompt: "Cual de los siguientes es un lenguaje de programacion?",
    points: 20,
    options: [
      { key: "A", text: "CSS" },
      { key: "B", text: "JavaScript" },
      { key: "C", text: "HTML" },
      { key: "D", text: "XML" },
    ],
    correctAnswer: "B",
    expected: "JavaScript",
  },
  {
    id: "soft-db",
    area: "Desarrollo de Software",
    type: "closed",
    title: "Base de datos relacional",
    prompt: "Que base de datos es relacional?",
    points: 20,
    options: [
      { key: "A", text: "MongoDB" },
      { key: "B", text: "Firebase" },
      { key: "C", text: "MySQL" },
      { key: "D", text: "Redis" },
    ],
    correctAnswer: "C",
    expected: "MySQL",
  },
  {
    id: "soft-git",
    area: "Desarrollo de Software",
    type: "closed",
    title: "Guardar cambios en Git",
    prompt: "Que comando se utiliza para guardar cambios en Git?",
    points: 20,
    options: [
      { key: "A", text: "git push" },
      { key: "B", text: "git commit" },
      { key: "C", text: "git clone" },
      { key: "D", text: "git pull" },
    ],
    correctAnswer: "B",
    expected: "git commit",
  },
  {
    id: "soft-loop",
    area: "Desarrollo de Software",
    type: "closed",
    title: "Repetir instrucciones",
    prompt: "Que estructura se utiliza para repetir instrucciones?",
    points: 20,
    options: [
      { key: "A", text: "if" },
      { key: "B", text: "switch" },
      { key: "C", text: "for" },
      { key: "D", text: "case" },
    ],
    correctAnswer: "C",
    expected: "for",
  },
  {
    id: "soft-poo",
    area: "Desarrollo de Software",
    type: "open",
    title: "Programacion Orientada a Objetos",
    prompt: "Que es la Programacion Orientada a Objetos (POO)?",
    points: 20,
    expected:
      "Paradigma basado en clases y objetos que utiliza conceptos como encapsulamiento, herencia, polimorfismo y abstraccion.",
    keywords: ["paradigma", "clases", "objetos", "encapsulamiento", "herencia", "polimorfismo", "abstraccion"],
  },
  {
    id: "soft-front-back",
    area: "Desarrollo de Software",
    type: "open",
    title: "Frontend y Backend",
    prompt: "Explique la diferencia entre Frontend y Backend.",
    points: 20,
    expected:
      "Frontend: Parte visual con la que interactua el usuario. Backend: Logica de negocio, bases de datos y procesamiento del sistema.",
    keywords: ["frontend", "visual", "usuario", "backend", "logica", "base de datos", "procesamiento"],
  },
  {
    id: "soft-api",
    area: "Desarrollo de Software",
    type: "open",
    title: "API",
    prompt: "Que es una API y para que sirve?",
    points: 20,
    expected:
      "Permite la comunicacion entre sistemas o aplicaciones mediante solicitudes y respuestas.",
    keywords: ["comunicacion", "sistemas", "aplicaciones", "solicitudes", "respuestas"],
  },
  {
    id: "soft-performance",
    area: "Desarrollo de Software",
    type: "open",
    title: "Aplicacion lenta",
    prompt: "Que haria si una aplicacion se vuelve lenta?",
    points: 20,
    expected:
      "Analizar rendimiento, revisar consultas a bases de datos, optimizar codigo, reducir cargas innecesarias y monitorear recursos.",
    keywords: ["rendimiento", "consultas", "base de datos", "optimizar", "codigo", "cargas", "monitorear", "recursos"],
  },
  {
    id: "soft-web-flow",
    area: "Desarrollo de Software",
    type: "open",
    title: "Flujo de pagina web",
    prompt: "Explique el flujo desde que un usuario entra a una pagina web hasta que ve la informacion.",
    points: 20,
    expected:
      "El navegador envia una peticion al servidor, este procesa la solicitud, consulta la base de datos si es necesario y devuelve una respuesta para mostrarse en pantalla.",
    keywords: ["navegador", "peticion", "servidor", "procesa", "solicitud", "base de datos", "respuesta", "pantalla"],
  },
  {
    id: "mobile-android-language",
    area: "Desarrollo Mobile",
    type: "closed",
    title: "Lenguaje principal Android",
    prompt: "Cual es el lenguaje principal para Android actualmente?",
    points: 20,
    options: [
      { key: "A", text: "Swift" },
      { key: "B", text: "Kotlin" },
      { key: "C", text: "PHP" },
      { key: "D", text: "Python" },
    ],
    correctAnswer: "B",
    expected: "Kotlin",
  },
  {
    id: "mobile-ios-language",
    area: "Desarrollo Mobile",
    type: "closed",
    title: "Lenguaje principal iOS",
    prompt: "Cual es el lenguaje principal para iOS?",
    points: 20,
    options: [
      { key: "A", text: "Java" },
      { key: "B", text: "Kotlin" },
      { key: "C", text: "Swift" },
      { key: "D", text: "C#" },
    ],
    correctAnswer: "C",
    expected: "Swift",
  },
  {
    id: "mobile-xcode",
    area: "Desarrollo Mobile",
    type: "closed",
    title: "Herramienta iOS",
    prompt: "Que herramienta se utiliza principalmente para desarrollar aplicaciones iOS?",
    points: 20,
    options: [
      { key: "A", text: "Android Studio" },
      { key: "B", text: "Visual Studio" },
      { key: "C", text: "Xcode" },
      { key: "D", text: "Eclipse" },
    ],
    correctAnswer: "C",
    expected: "Xcode",
  },
  {
    id: "mobile-apk",
    area: "Desarrollo Mobile",
    type: "closed",
    title: "Formato Android",
    prompt: "Que formato utiliza Android para instalar aplicaciones?",
    points: 20,
    options: [
      { key: "A", text: ".ipa" },
      { key: "B", text: ".apk" },
      { key: "C", text: ".exe" },
      { key: "D", text: ".dmg" },
    ],
    correctAnswer: "B",
    expected: ".apk",
  },
  {
    id: "mobile-cross-platform",
    area: "Desarrollo Mobile",
    type: "closed",
    title: "Una sola base de codigo",
    prompt: "Que framework permite desarrollar una aplicacion para Android e iOS con una sola base de codigo?",
    points: 20,
    options: [
      { key: "A", text: "Laravel" },
      { key: "B", text: "React Native" },
      { key: "C", text: "Spring Boot" },
      { key: "D", text: "Django" },
    ],
    correctAnswer: "B",
    expected: "React Native",
  },
  {
    id: "mobile-native-multi",
    area: "Desarrollo Mobile",
    type: "open",
    title: "Nativo y multiplataforma",
    prompt: "Explique la diferencia entre desarrollo nativo y multiplataforma.",
    points: 20,
    expected:
      "Nativo: Codigo especifico para Android o iOS. Multiplataforma: Un solo codigo para ambas plataformas.",
    keywords: ["nativo", "codigo especifico", "android", "ios", "multiplataforma", "un solo codigo", "ambas plataformas"],
  },
  {
    id: "mobile-activity",
    area: "Desarrollo Mobile",
    type: "open",
    title: "Activity en Android",
    prompt: "Que es una Activity en Android?",
    points: 20,
    expected:
      "Es una pantalla o interfaz con la que interactua el usuario dentro de una aplicacion.",
    keywords: ["pantalla", "interfaz", "interactua", "usuario", "aplicacion"],
  },
  {
    id: "mobile-lifecycle",
    area: "Desarrollo Mobile",
    type: "open",
    title: "Ciclo de vida movil",
    prompt: "Que es el ciclo de vida de una aplicacion movil?",
    points: 20,
    expected:
      "Son los estados por los que pasa una aplicacion: creacion, inicio, pausa, reanudacion y destruccion.",
    keywords: ["estados", "creacion", "inicio", "pausa", "reanudacion", "destruccion"],
  },
  {
    id: "mobile-rest",
    area: "Desarrollo Mobile",
    type: "open",
    title: "Consumir API REST",
    prompt: "Como consumiria una API REST desde una aplicacion movil?",
    points: 20,
    expected:
      "Realizando solicitudes HTTP (GET, POST, PUT, DELETE), procesando la respuesta y mostrando los datos al usuario.",
    keywords: ["solicitudes", "http", "get", "post", "put", "delete", "respuesta", "datos", "usuario"],
  },
  {
    id: "mobile-performance",
    area: "Desarrollo Mobile",
    type: "open",
    title: "Rendimiento movil",
    prompt: "Que haria para mejorar el rendimiento de una aplicacion movil?",
    points: 20,
    expected:
      "Optimizar imagenes, reducir llamadas innecesarias al servidor, usar cache, mejorar consultas y controlar el consumo de memoria.",
    keywords: ["optimizar", "imagenes", "llamadas", "servidor", "cache", "consultas", "memoria"],
  },
];

const state = {
  activeExam: null,
  answers: {},
  timerId: null,
  remainingSeconds: 0,
  lastResult: null,
  candidateAccessDenied: false,
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
const INTERVIEWER_USERS = {
  ariel: "12345",
  hector: "12345",
  ilian: "12345",
  alejandro: "12345",
};
const SESSION_KEY = "redgpsInterviewerSession";
const USER_KEY = "redgpsInterviewerUser";

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
                <span class="tag">${question.type === "closed" ? "Cerrada" : "Abierta"}</span>
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

  if (["localhost", "127.0.0.1"].includes(location.hostname)) {
    alert("Para enviar el examen a otra persona, abre abrir-publico.bat y genera el examen desde la URL https://...trycloudflare.com. Desde localhost solo funciona en tu computadora.");
    return;
  }

  state.activeExam = {
    id: createId(),
    createdAt: new Date().toISOString(),
    timeLimit: Number(document.querySelector("#timeLimit").value),
    questions: pickRandomQuestions(selectedQuestions, 5),
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
        <label>${index + 1}. ${question.prompt}<span>${question.area} | Pregunta cerrada</span></label>
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

  return `
    <article class="answer-card">
      <label for="answer-${question.id}">
        ${index + 1}. ${question.prompt}
        <span>${question.area} | Pregunta abierta</span>
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
  candidateNameInput.addEventListener("input", saveDraftAnswers);
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

function finishExam() {
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
    state.lastResult = evaluateAnswers();
    localStorage.setItem(getFinishedKey(), JSON.stringify(state.lastResult));
    localStorage.removeItem(getDraftKey());
    saveResultLocally(state.lastResult);
    renderResults();
    showView("resultsView");
    saveResultOnServer(state.lastResult).then(() => {
      renderSavedAnswers();
      markServerSaveStatus("Resultado guardado para el entrevistador.");
    });
  } catch (error) {
    console.error(error);
    alert("No se pudo finalizar el examen. Revisa que las preguntas hayan cargado correctamente.");
  }
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
        headers: { "Content-Type": "application/json" },
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
  const savedResult = localStorage.getItem("lastResult");
  state.lastResult = state.lastResult || (savedResult ? JSON.parse(savedResult) : null);

  if (!isCandidateLink && location.protocol.startsWith("http")) {
    const history = (await getServerHistory()).filter((result) => result && result.id && result.evaluated);

    if (history.length) {
      state.lastResult = history[0];
      localStorage.setItem("lastResult", JSON.stringify(state.lastResult));
    }
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
  const expectedAnswer = isCandidateLink ? "" : `<p><strong>Esperado:</strong> ${item.question.expected}</p>`;
  const manualDetail =
    !isCandidateLink && item.manualEarned !== undefined && item.manualEarned !== null
      ? `<p class="review-note">Ajuste manual: ${item.manualEarned}/${item.question.points} pts${item.manualNote ? ` | ${escapeHtml(item.manualNote)}` : ""}${item.modifiedBy ? ` | Modifico: ${escapeHtml(item.modifiedBy)}` : ""}</p>`
      : "";

  return `
    <article class="result-card ${stateClass}">
      <h3>${item.question.title}</h3>
      <p class="result-state">${stateLabel}: ${earned}/${item.question.points} pts</p>
      <p>${item.feedback}</p>
      ${expectedAnswer}
      ${manualDetail}
      <code>${escapeHtml(formatAnswer(item))}</code>
    </article>
  `;
}

function renderReviewResultCard(result, item, index) {
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
            <input class="question-score-input" type="number" min="0" max="${item.question.points}" value="${effectiveEarned}" />
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
  if (earned >= item.question.points) {
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
  if (earned >= item.question.points) {
    return "correct";
  }
  if (earned > 0) {
    return "partial";
  }
  return "wrong";
}

function formatAnswer(item) {
  if (item.question.type === "closed") {
    const option = item.question.options.find((choice) => choice.key === item.answer);
    return item.answer ? `${item.answer}) ${option ? option.text : ""}` : "Sin respuesta";
  }

  return item.answer || "Sin respuesta";
}

async function renderSavedAnswers() {
  const history = (await getServerHistory()).filter((result) => result && result.id && result.evaluated);

  if (!history.length) {
    answersSummary.textContent = "Aun no hay examenes guardados.";
    answersList.innerHTML = "";
    return;
  }

  answersSummary.textContent = `Hay ${history.length} examen(es) guardado(s) en este navegador.`;
  const currentUser = getCurrentInterviewerUser();
  answersList.innerHTML = history
    .map(
      (result) => `
        <article class="history-card" data-result-id="${result.id}">
          <h3>${result.candidateName || "Candidato sin nombre"} | ${getDisplayScore(result)}/100</h3>
          <p>Calificacion automatica: ${result.automaticScore ?? result.score}/100</p>
          <p>Finalizado: ${new Date(result.finishedAt).toLocaleString("es-MX")}</p>
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
      `
    )
    .join("");
  bindManualScoreControls(history);
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

        if (!Number.isFinite(manualEarned) || manualEarned < 0 || manualEarned > item.question.points) {
          questionStatus.textContent = `El puntaje debe estar entre 0 y ${item.question.points}.`;
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
  const totalPoints = result.totalPoints || result.evaluated.reduce((sum, item) => sum + item.question.points, 0);
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

function renderAnswerKey() {
  answerKeyList.innerHTML = questions
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
            <span class="tag">${question.type === "closed" ? "Cerrada" : "Abierta"}</span>
            <span class="tag">${question.points} pts</span>
          </div>
          <p><strong>Pregunta:</strong> ${question.prompt}</p>
          <p><strong>Respuesta correcta:</strong></p>
          <code>${escapeHtml(correctAnswer)}</code>
        </article>
      `;
    })
    .join("");
}

async function getServerHistory() {
  if (location.protocol.startsWith("http")) {
    try {
      const response = await fetchWithTimeout(`${location.origin}/api/results`, {}, 9000);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [data];
      }
    } catch {
      console.warn("No se pudo leer el historial del servidor local.");
    }
  }

  return getHistory();
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
  button.addEventListener("click", () => {
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
      renderAnswerKey();
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
    fetch("/api/results", { method: "DELETE" });
  }
  renderResults();
  renderSavedAnswers();
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = loginUser.value.trim();

  if (INTERVIEWER_USERS[user] === loginPassword.value) {
    sessionStorage.setItem(SESSION_KEY, "true");
    sessionStorage.setItem(USER_KEY, user);
    loginUser.value = "";
    loginPassword.value = "";
    loginError.classList.add("hidden");
    loginScreen.classList.add("hidden");
    return;
  }

  loginError.classList.remove("hidden");
  loginPassword.select();
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  loginScreen.classList.remove("hidden");
  loginUser.focus();
});

function protectInterviewerPanel() {
  if (isCandidateLink) {
    loginScreen.classList.add("hidden");
    return;
  }

  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    loginScreen.classList.add("hidden");
    return;
  }

  loginScreen.classList.remove("hidden");
  loginUser.focus();
}

function getCurrentInterviewerUser() {
  return sessionStorage.getItem(USER_KEY) || "";
}

async function initializeApp() {
  renderQuestionBank();
  renderResults();
  renderSavedAnswers();
  renderAnswerKey();
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

  renderExam();
}

initializeApp();
