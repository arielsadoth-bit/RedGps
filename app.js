let questions = [];
let jobPositions = [];
let jobPositionsLoaded = false;

const state = {
  activeExam: null,
  answers: {},
  timerId: null,
  remainingSeconds: 0,
  lastResult: null,
  candidateAccessDenied: false,
  selectedHistoryId: null,
  answerFilters: {
    text: "",
  },
  createdExamFilters: {
    email: "",
    dateFrom: "",
    dateTo: "",
  },
  createdExamsPage: 1,
  questionBankPage: 1,
  candidateExamPage: 1,
  selectedQuestionArea: "Área de Desarrollo",
  selectedQuestionIds: new Set(),
  questionSelectionInitialized: false,
  questionBankOpen: false,
  areaBankVisible: true,
  isFinishingExam: false,
  examLocked: false,
  securityFinishTriggered: false,
  securityFinishReason: "",
  unansweredQuestionIds: new Set(),
};

const questionBank = document.querySelector("#questionBank");
const questionBankLayout = document.querySelector("#questionBankLayout");
const areaBankSidebar = document.querySelector("#areaBankSidebar");
const examNameInput = document.querySelector("#examName");
const candidateEmailInput = document.querySelector("#candidateEmail");
const candidateIntroNameInput = document.querySelector("#candidateIntroName");
const candidateIntroEmailInput = document.querySelector("#candidateIntroEmail");
const startCandidateExamButton = document.querySelector("#startCandidateExamButton");
const questionCountInput = document.querySelector("#questionCount");
const createManualExamButton = document.querySelector("#createManualExamButton");
const examForm = document.querySelector("#examForm");
const resultList = document.querySelector("#resultList");
const resultSummary = document.querySelector("#resultSummary");
const scoreLabel = document.querySelector("#scoreLabel");
const modeLabel = document.querySelector("#modeLabel");
const sessionUserLabel = document.querySelector("#sessionUserLabel");
const timer = document.querySelector("#timer");
const candidateNameInput = document.querySelector("#candidateName");
const answersSummary = document.querySelector("#answersSummary");
const answersList = document.querySelector("#answersList");
const createdExamsSummary = document.querySelector("#createdExamsSummary");
const createdExamsList = document.querySelector("#createdExamsList");
const linkTrackingSummary = document.querySelector("#linkTrackingSummary");
const linkTrackingList = document.querySelector("#linkTrackingList");
const generatedExamLinkInput = document.querySelector("#generatedExamLink");
const copyGeneratedLinkButton = document.querySelector("#copyGeneratedLinkButton");
const backToCreateExamButton = document.querySelector("#backToCreateExamButton");
const liveMonitorSummary = document.querySelector("#liveMonitorSummary");
const liveMonitorList = document.querySelector("#liveMonitorList");
const refreshLiveMonitorButton = document.querySelector("#refreshLiveMonitorButton");
const answerKeyList = document.querySelector("#answerKeyList");
const questionForm = document.querySelector("#questionForm");
const questionAreaInput = document.querySelector("#questionArea");
const questionTypeInput = document.querySelector("#questionType");
const questionPointsInput = document.querySelector("#questionPoints");
const questionTitleInput = document.querySelector("#questionTitle");
const questionPromptInput = document.querySelector("#questionPrompt");
const questionOptionInputs = Array.from(document.querySelectorAll(".question-option-input"));
const questionCorrectAnswerInput = document.querySelector("#questionCorrectAnswer");
const questionExpectedInput = document.querySelector("#questionExpected");
const questionKeywordsInput = document.querySelector("#questionKeywords");
const questionFunctionNameInput = document.querySelector("#questionFunctionName");
const questionLanguageInput = document.querySelector("#questionLanguage");
const questionTestsInput = document.querySelector("#questionTests");
const questionTestsHelp = document.querySelector("#questionTestsHelp");
const questionSolutionInput = document.querySelector("#questionSolution");
const questionManagerStatus = document.querySelector("#questionManagerStatus");
const closedQuestionFields = document.querySelector("#closedQuestionFields");
const openQuestionFields = document.querySelector("#openQuestionFields");
const codeQuestionFields = document.querySelector("#codeQuestionFields");
const questionManagerModal = document.querySelector("#questionManagerModal");
const openQuestionManagerButton = document.querySelector("#openQuestionManagerButton");
const closeQuestionManagerButton = document.querySelector("#closeQuestionManagerButton");
const positionManagerModal = document.querySelector("#positionManagerModal");
const openPositionManagerButton = document.querySelector("#openPositionManagerButton");
const closePositionManagerButton = document.querySelector("#closePositionManagerButton");
const positionForm = document.querySelector("#positionForm");
const newPositionNameInput = document.querySelector("#newPositionName");
const positionManagerStatus = document.querySelector("#positionManagerStatus");
const positionManagerList = document.querySelector("#positionManagerList");
const userManagerModal = document.querySelector("#userManagerModal");
const openUserManagerButton = document.querySelector("#openUserManagerButton");
const closeUserManagerButton = document.querySelector("#closeUserManagerButton");
const userForm = document.querySelector("#userForm");
const newUserEmailInput = document.querySelector("#newUserEmail");
const newUserPasswordInput = document.querySelector("#newUserPassword");
const newUserRoleInput = document.querySelector("#newUserRole");
const userManagerStatus = document.querySelector("#userManagerStatus");
const userManagerList = document.querySelector("#userManagerList");
const loginScreen = document.querySelector("#loginScreen");
const loginForm = document.querySelector("#loginForm");
const loginUser = document.querySelector("#loginUser");
const loginPassword = document.querySelector("#loginPassword");
const loginError = document.querySelector("#loginError");
const togglePasswordButton = document.querySelector("#togglePasswordButton");
const intruderAlert = document.querySelector("#intruderAlert");
const closeIntruderAlertButton = document.querySelector("#closeIntruderAlertButton");
const finishExamConfirm = document.querySelector("#finishExamConfirm");
const finishExamConfirmMessage = document.querySelector("#finishExamConfirmMessage");
const confirmFinishExamButton = document.querySelector("#confirmFinishExamButton");
const reviewPendingButton = document.querySelector("#reviewPendingButton");
const clearHistoryConfirm = document.querySelector("#clearHistoryConfirm");
const confirmClearHistoryButton = document.querySelector("#confirmClearHistoryButton");
const cancelClearHistoryButton = document.querySelector("#cancelClearHistoryButton");
const deletePositionConfirm = document.querySelector("#deletePositionConfirm");
const deletePositionConfirmMessage = document.querySelector("#deletePositionConfirmMessage");
const confirmDeletePositionButton = document.querySelector("#confirmDeletePositionButton");
const cancelDeletePositionButton = document.querySelector("#cancelDeletePositionButton");
const logoutButton = document.querySelector("#logoutButton");
const urlParams = new URLSearchParams(location.search);
const isCandidateLink = urlParams.has("exam");
const SESSION_KEY = "redgpsInterviewerSession";
const USER_KEY = "redgpsInterviewerUser";
const TOKEN_KEY = "redgpsInterviewToken";
const ROLE_KEY = "redgpsInterviewerRole";
const DELIVERY_RESET_KEY = "redgpsDeliveryResetVersion";
const DELIVERY_RESET_VERSION = "20260803-entrega-limpia";
const CREATED_EXAMS_PAGE_SIZE = 5;
const DEFAULT_JOB_POSITIONS = [
  "Área de Desarrollo",
  "Área de Operaciones",
  "Área Comercial",
  "Área de Marketing",
  "Área Administrativa",
  "Área de Dirección",
];
let intruderAudioContext = null;
let intruderAlarmTimer = null;
let liveExamSaveTimer = null;
let liveMonitorRefreshTimer = null;

function clearDeliveryLocalDataOnce() {
  if (localStorage.getItem(DELIVERY_RESET_KEY) === DELIVERY_RESET_VERSION) {
    return;
  }

  const keysToRemove = [
    "activeExam",
    "lastResult",
    "examHistory",
    "createdExamHistory",
  ];

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("examDraft:") || key.startsWith("examFinished:") || keysToRemove.includes(key)) {
      localStorage.removeItem(key);
    }
  });

  localStorage.setItem(DELIVERY_RESET_KEY, DELIVERY_RESET_VERSION);
}

async function loadQuestions() {
  if (!location.protocol.startsWith("http")) {
    return;
  }

  const [questionsResponse] = await Promise.all([
    fetchWithTimeout(`${location.origin}/api/questions`, {}, 9000),
    loadJobPositions(),
  ]);
  questions = await questionsResponse.json();
  syncQuestionAreaOptions();
  syncQuestionCountLimit();
}

async function loadJobPositions() {
  if (!location.protocol.startsWith("http")) {
    jobPositions = DEFAULT_JOB_POSITIONS.map((name) => ({ name }));
    jobPositionsLoaded = false;
    syncQuestionAreaOptions();
    return;
  }

  try {
    const response = await fetchWithTimeout(`${location.origin}/api/positions`, {}, 9000);
    const data = response.ok ? await response.json() : [];
    jobPositionsLoaded = response.ok;
    jobPositions = Array.isArray(data)
      ? data
          .map((position) => ({
            id: position.id || position.Id || "",
            name: String(position.name || position.Name || position.nombre || position.puesto || "").trim(),
            active: position.active ?? position.Active ?? true,
            createdAt: position.createdAt || position.creado_en || "",
          }))
          .filter((position) => position.name)
      : DEFAULT_JOB_POSITIONS.map((name) => ({ name }));
  } catch {
    jobPositions = DEFAULT_JOB_POSITIONS.map((name) => ({ name }));
    jobPositionsLoaded = false;
  }

  syncQuestionAreaOptions();
}

function getAuthHeaders() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { "X-Interview-Token": token } : {};
}

function getActionIcon(name) {
  if (name === "eye") {
    return `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    `;
  }

  if (name === "menu") {
    return `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </svg>
    `;
  }

  return `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  `;
}

function normalizeAreaText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getKnownPositionNames() {
  const source = jobPositions.length || jobPositionsLoaded
    ? jobPositions
    : DEFAULT_JOB_POSITIONS.map((name) => ({ name }));
  const names = source
    .map((position) => String(position.name || position).trim())
    .filter(Boolean);

  return [...new Set(names)];
}

function isKnownPositionActive(name) {
  const normalizedName = normalizeAreaText(name);
  return getKnownPositionNames().some((position) => normalizeAreaText(position) === normalizedName);
}

function getQuestionBankArea(question) {
  const rawArea = String(question.area || "").trim();
  const area = normalizeAreaText(rawArea);
  const exactPosition = getKnownPositionNames().find((position) => normalizeAreaText(position) === area);

  if (exactPosition) {
    return exactPosition;
  }

  if (
    area.includes("desarrollo") ||
    area.includes("software") ||
    area.includes("mobile") ||
    area.includes("android") ||
    area.includes("ios") ||
    area.includes("programacion")
  ) {
    return isKnownPositionActive("Área de Desarrollo") ? "Área de Desarrollo" : "Otras áreas";
  }

  if (area.includes("operacion")) return isKnownPositionActive("Área de Operaciones") ? "Área de Operaciones" : "Otras áreas";
  if (area.includes("comercial") || area.includes("ventas")) return isKnownPositionActive("Área Comercial") ? "Área Comercial" : "Otras áreas";
  if (area.includes("marketing") || area.includes("mercadotecnia")) return isKnownPositionActive("Área de Marketing") ? "Área de Marketing" : "Otras áreas";
  if (area.includes("administrativa") || area.includes("administracion")) return isKnownPositionActive("Área Administrativa") ? "Área Administrativa" : "Otras áreas";
  if (area.includes("direccion") || area.includes("directiva")) return isKnownPositionActive("Área de Dirección") ? "Área de Dirección" : "Otras áreas";

  return "Otras áreas";
}

function getAvailableBankAreas() {
  const areas = [...getKnownPositionNames()];
  questions.forEach((question) => {
    const area = getQuestionBankArea(question);
    if (area && !areas.includes(area)) {
      areas.push(area);
    }
  });

  return areas.length ? areas : (jobPositionsLoaded ? [] : [...DEFAULT_JOB_POSITIONS]);
}

function syncQuestionAreaOptions() {
  if (!questionAreaInput) {
    return;
  }

  const areas = getAvailableBankAreas();
  const previousValue = questionAreaInput.value || state.selectedQuestionArea;
  questionAreaInput.innerHTML = areas
    .map((area) => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`)
    .join("");
  const selectedArea = areas.find((area) => area === previousValue)
    || areas.find((area) => area === state.selectedQuestionArea)
    || areas[0]
    || "";
  questionAreaInput.value = selectedArea;
}

function getQuestionsForSelectedArea() {
  const availableAreas = getAvailableBankAreas();
  if (!availableAreas.includes(state.selectedQuestionArea)) {
    state.selectedQuestionArea = availableAreas[0] || "";
  }

  return questions.filter((question) => getQuestionBankArea(question) === state.selectedQuestionArea);
}

function renderAreaBankSidebar() {
  if (!areaBankSidebar) {
    return;
  }

  const areas = getAvailableBankAreas();
  const options = areas
    .map((area) => {
      const count = questions.filter((question) => getQuestionBankArea(question) === area).length;
      return `<option value="${escapeHtml(area)}" ${area === state.selectedQuestionArea ? "selected" : ""}>${escapeHtml(area)} (${count})</option>`;
    })
    .join("");

  areaBankSidebar.innerHTML = `
    <div class="area-bank-panel area-bank-select-panel">
      <label class="field area-bank-select-field">
        Banco por puesto
        <select id="areaBankSelect">
          ${options}
        </select>
      </label>
    </div>
  `;

  areaBankSidebar.querySelector("#areaBankSelect")?.addEventListener("change", (event) => {
    state.selectedQuestionArea = event.target.value || DEFAULT_JOB_POSITIONS[0];
    state.questionBankPage = 1;
    renderQuestionBank();
    syncQuestionCountLimit();
  });
}

function renderQuestionBank() {
  syncSelectedQuestionsWithBank();
  renderAreaBankSidebar();
  const bankQuestions = getQuestionsForSelectedArea();
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(bankQuestions.length / pageSize));
  state.questionBankPage = Math.min(Math.max(1, state.questionBankPage), totalPages);
  const pageStart = (state.questionBankPage - 1) * pageSize;
  const pageQuestions = bankQuestions.slice(pageStart, pageStart + pageSize);
  const selectedCount = bankQuestions.filter((question) => state.selectedQuestionIds.has(question.id)).length;
  const allAreaSelected = bankQuestions.length > 0
    && bankQuestions.every((question) => state.selectedQuestionIds.has(question.id));
  const selectionButtonLabel = allAreaSelected ? "Deseleccionar todo" : "Seleccionar todo";
  const rangeLabel = bankQuestions.length
    ? `Mostrando ${pageStart + 1}-${Math.min(pageStart + pageSize, bankQuestions.length)} de ${bankQuestions.length}`
    : "Sin preguntas activas";

  questionBank.innerHTML = `
    <div class="question-bank-toggle">
      <div class="question-bank-toggle-main">
        <strong>${selectedCount}</strong>
        <div class="question-bank-toggle-copy">
          <span>${escapeHtml(state.selectedQuestionArea)}</span>
          <small>${selectedCount} de ${bankQuestions.length} seleccionada(s) para el examen</small>
        </div>
      </div>
      <div class="question-bank-toggle-actions">
        <button class="ghost-button" id="toggleQuestionBankButton" type="button">${state.questionBankOpen ? "Ocultar preguntas" : "Ver preguntas"}</button>
      </div>
    </div>
    <div class="question-bank-list ${state.questionBankOpen ? "" : "hidden"}" id="questionBankList">
      <div class="question-bank-toolbar">
        <strong>Banco de preguntas</strong>
        <button class="ghost-button" id="toggleQuestionSelectionButton" type="button">${selectionButtonLabel}</button>
        <span>${rangeLabel}</span>
      </div>
      ${pageQuestions
        .map(
          (question) => `
          <article class="question-card">
            <div class="question-top">
              <input type="checkbox" id="${question.id}" value="${question.id}" ${state.selectedQuestionIds.has(question.id) ? "checked" : ""} />
              <div class="question-content">
                <h3>${question.title}</h3>
                <p>${question.prompt}</p>
                <div class="tag-row">
                  <span class="tag">${question.area}</span>
                  <span class="tag">${getQuestionTypeLabel(question)}</span>
                  ${question.type === "code" ? `<span class="tag">Lenguaje: ${escapeHtml(getRunnerLanguage(question.runner))}</span>` : ""}
                  <span class="tag">${question.points} pts</span>
                </div>
              </div>
              ${
                isAdminUser()
                  ? `<button class="danger-button icon-button question-delete-button" type="button" data-question-id="${escapeHtml(question.id)}" aria-label="Borrar pregunta" title="Borrar pregunta">${getActionIcon("trash")}</button>`
                  : ""
              }
            </div>
          </article>
        `
        )
        .join("")}
      ${renderQuestionBankPagination(totalPages)}
    </div>
  `;

  document.querySelector("#toggleQuestionBankButton")?.addEventListener("click", () => {
    state.questionBankOpen = !state.questionBankOpen;
    const list = document.querySelector("#questionBankList");
    list?.classList.toggle("hidden", !state.questionBankOpen);
    document.querySelector("#toggleQuestionBankButton").textContent = state.questionBankOpen
      ? "Ocultar preguntas"
      : "Ver preguntas";
  });

  document.querySelector("#toggleQuestionSelectionButton")?.addEventListener("click", toggleQuestionSelection);

  document.querySelectorAll(".question-delete-button").forEach((button) => {
    button.addEventListener("click", () => {
      deleteQuestionById(button.dataset.questionId || "");
    });
  });

  document.querySelectorAll("#questionBank input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        state.selectedQuestionIds.add(input.value);
      } else {
        state.selectedQuestionIds.delete(input.value);
      }
      updateQuestionSelectionToggleLabel();
      updateQuestionBankSelectionCount();
    });
  });

  document.querySelectorAll(".question-bank-page-button").forEach((button) => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.page);
      if (!Number.isInteger(page) || page < 1 || page > totalPages) {
        return;
      }

      state.questionBankPage = page;
      renderQuestionBank();
    });
  });

  updateQuestionSelectionToggleLabel();
  updateAreaBankVisibility();
}

function updateAreaBankVisibility() {
  questionBankLayout?.classList.remove("area-bank-hidden");
}

function syncSelectedQuestionsWithBank() {
  const activeIds = new Set(questions.map((question) => question.id));

  if (!(state.selectedQuestionIds instanceof Set)) {
    state.selectedQuestionIds = new Set();
  }

  if (!state.questionSelectionInitialized) {
    activeIds.forEach((id) => state.selectedQuestionIds.add(id));
    state.questionSelectionInitialized = true;
    return;
  }

  [...state.selectedQuestionIds].forEach((id) => {
    if (!activeIds.has(id)) {
      state.selectedQuestionIds.delete(id);
    }
  });
}

function renderQuestionBankPagination(totalPages) {
  if (totalPages <= 1) {
    return "";
  }

  return `
    <div class="pagination-bar question-bank-pagination">
      <span>Página ${state.questionBankPage} de ${totalPages}</span>
      <div class="pagination-actions">
        <button class="ghost-button question-bank-page-button" type="button" data-page="${state.questionBankPage - 1}" ${state.questionBankPage <= 1 ? "disabled" : ""}>Anterior</button>
        <button class="ghost-button question-bank-page-button" type="button" data-page="${state.questionBankPage + 1}" ${state.questionBankPage >= totalPages ? "disabled" : ""}>Siguiente</button>
      </div>
    </div>
  `;
}

function updateQuestionBankSelectionCount() {
  const badge = questionBank?.querySelector(".question-bank-toggle strong");
  const label = questionBank?.querySelector(".question-bank-toggle small");
  if (badge || label) {
    const bankQuestions = getQuestionsForSelectedArea();
    const selectedCount = bankQuestions.filter((question) => state.selectedQuestionIds.has(question.id)).length;
    if (badge) {
      badge.textContent = String(selectedCount);
    }
    if (label) {
      label.textContent = `${selectedCount} de ${bankQuestions.length} seleccionada(s) para el examen`;
    }
  }
}

function syncQuestionCountLimit() {
  if (!questionCountInput) {
    return;
  }

  const maxQuestions = Math.max(1, getQuestionsForSelectedArea().length);
  questionCountInput.max = String(maxQuestions);

  const currentValue = Number(questionCountInput.value);
  if (!Number.isInteger(currentValue) || currentValue < 1) {
    questionCountInput.value = "1";
    return;
  }

  if (currentValue > maxQuestions) {
    questionCountInput.value = String(maxQuestions);
  }
}

function getCodeSolutionPlaceholder(language) {
  const selectedLanguage = String(language || "JavaScript").toLowerCase();

  if (selectedLanguage === "python") {
    return "def validar_login(correo, contrasena):\n    return \"@\" in correo and len(contrasena) >= 8";
  }

  if (selectedLanguage === "java") {
    return "public static boolean validarLogin(String correo, String contrasena) {\n    return correo.contains(\"@\") && contrasena.length() >= 8;\n}";
  }

  if (selectedLanguage === "c#") {
    return "public static bool ValidarLogin(string correo, string contrasena) {\n    return correo.Contains(\"@\") && contrasena.Length >= 8;\n}";
  }

  if (selectedLanguage === "kotlin") {
    return "fun validarLogin(correo: String, contrasena: String): Boolean {\n    return correo.contains(\"@\") && contrasena.length >= 8\n}";
  }

  if (selectedLanguage === "swift") {
    return "func validarLogin(correo: String, contrasena: String) -> Bool {\n    return correo.contains(\"@\") && contrasena.count >= 8\n}";
  }

  if (selectedLanguage === "php") {
    return "function validarLogin($correo, $contrasena) {\n    return strpos($correo, '@') !== false && strlen($contrasena) >= 8;\n}";
  }

  if (selectedLanguage === "sql") {
    return "SELECT * FROM usuarios WHERE activo = 1;";
  }

  if (selectedLanguage === "dart") {
    return "bool validarLogin(String correo, String contrasena) {\n  return correo.contains('@') && contrasena.length >= 8;\n}";
  }

  return "function validarLogin(correo, contrasena) {\n  return correo.includes('@') && contrasena.length >= 8;\n}";
}

function updateCodeQuestionLanguageGuide() {
  const language = "JavaScript";

  if (questionLanguageInput) {
    questionLanguageInput.value = language;
  }

  if (questionTestsInput) {
    questionTestsInput.placeholder = '[{"name":"Caso valido","args":["correo@redgps.com","12345678"],"expected":true}]';
  }

  if (questionTestsHelp) {
    questionTestsHelp.textContent = "Las pruebas automaticas se ejecutan con el mismo motor JavaScript que usa el candidato durante el examen.";
  }

  if (questionSolutionInput) {
    questionSolutionInput.placeholder = getCodeSolutionPlaceholder(language);
  }
}

function toggleQuestionFormFields() {
  const type = questionTypeInput?.value || "closed";
  closedQuestionFields?.classList.toggle("hidden", type !== "closed");
  openQuestionFields?.classList.toggle("hidden", type !== "open");
  codeQuestionFields?.classList.toggle("hidden", type !== "code");

  questionOptionInputs.forEach((input, index) => {
    input.required = type === "closed" && index < 2;
  });

  if (questionCorrectAnswerInput) {
    questionCorrectAnswerInput.required = type === "closed";
  }

  if (questionExpectedInput) {
    questionExpectedInput.required = type === "open";
    questionExpectedInput.placeholder = "Escribe la respuesta correcta o explicacion esperada.";
  }

  if (questionKeywordsInput) {
    questionKeywordsInput.required = false;
  }

  if (questionFunctionNameInput) {
    questionFunctionNameInput.required = type === "code";
  }

  if (questionTestsInput) {
    questionTestsInput.required = type === "code";
  }

  updateCodeQuestionLanguageGuide();
}

function parseQuestionOptions() {
  return questionOptionInputs
    .map((input) => ({
      key: (input.dataset.optionKey || "").trim().toUpperCase(),
      text: input.value.trim(),
    }))
    .filter((option) => option.key && option.text);
}

function parseQuestionKeywords(value) {
  return String(value)
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function parseQuestionRunner() {
  const functionName = questionFunctionNameInput?.value.trim() || "";
  const language = "JavaScript";
  const testsText = questionTestsInput?.value.trim() || "";
  const solutionCode = questionSolutionInput?.value.trim() || "";

  if (!functionName && !testsText && !solutionCode) {
    return null;
  }

  let tests = [];
  if (testsText) {
    tests = JSON.parse(testsText);
  }

  return { functionName, language, tests, solutionCode };
}

async function saveQuestionFromForm(event) {
  event.preventDefault();

  if (!isAdminUser()) {
    showQuestionManagerStatus("Solo un administrador puede guardar preguntas.", true);
    return;
  }

  const type = questionTypeInput.value;
  let runner = null;

  try {
    runner = type === "code" ? parseQuestionRunner() : null;
  } catch {
    showQuestionManagerStatus("Las pruebas de código deben estar en formato JSON válido.", true);
    questionTestsInput?.focus();
    return;
  }

  const payload = {
    area: questionAreaInput.value.trim(),
    type,
    title: questionTitleInput.value.trim(),
    prompt: questionPromptInput.value.trim(),
    points: Number(questionPointsInput.value),
    options: type === "closed" ? parseQuestionOptions() : [],
    correctAnswer: type === "closed" ? questionCorrectAnswerInput.value.trim().toUpperCase() : "",
    expected: type === "code"
      ? (questionSolutionInput?.value.trim() || `${runner?.functionName || ""} JavaScript`.trim())
      : questionExpectedInput.value.trim(),
    keywords: type === "code" ? [] : parseQuestionKeywords(questionKeywordsInput.value),
    runner,
  };

  showQuestionManagerStatus("Guardando pregunta...", false);
  const response = await fetchWithTimeout(`${location.origin}/api/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  }, 9000);

  if (response.status === 401 || response.status === 403) {
    expireInterviewerSession(response.status === 403);
    showQuestionManagerStatus("Tu sesión expiró. Inicia sesión.", true);
    return;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    showQuestionManagerStatus(data.error || "No se pudo guardar la pregunta.", true);
    return;
  }

  questionForm.reset();
  questionPointsInput.value = "20";
  questionLanguageInput.value = "JavaScript";
  syncQuestionAreaOptions();
  if (questionAreaInput && state.selectedQuestionArea) {
    questionAreaInput.value = state.selectedQuestionArea;
  }
  if (questionSolutionInput) {
    questionSolutionInput.value = "";
  }
  toggleQuestionFormFields();

  await loadQuestions();
  renderQuestionBank();
  await renderAnswerKey();
  showQuestionManagerStatus("Pregunta guardada en la base de datos y agregada al banco.", false);
}

function showQuestionManagerStatus(message, isError) {
  if (!questionManagerStatus) {
    return;
  }

  questionManagerStatus.textContent = message;
  questionManagerStatus.classList.remove("hidden");
  questionManagerStatus.classList.toggle("error-summary", Boolean(isError));
}

async function deleteQuestionById(questionId) {
  if (!isAdminUser()) {
    expireInterviewerSession(true);
    return;
  }

  const question = questions.find((item) => item.id === questionId);
  if (!question) {
    alert("No se encontro la pregunta seleccionada.");
    return;
  }

  const confirmed = confirm(
    `Vas a borrar la pregunta "${question.title}". Ya no aparecerá para crear exámenes nuevos.`
  );

  if (!confirmed) {
    return;
  }

  const response = await fetchWithTimeout(`${location.origin}/api/questions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ ids: [questionId] }),
  }, 9000);

  if (response.status === 401 || response.status === 403) {
    expireInterviewerSession(response.status === 403);
    return;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    alert(data.error || "No se pudieron borrar las preguntas seleccionadas.");
    return;
  }

  const data = await response.json().catch(() => ({}));
  if (!data.deleted) {
    alert("La pregunta ya no estaba activa o no se pudo borrar.");
  }

  await loadQuestions();
  renderQuestionBank();
  await renderAnswerKey();
}

async function openQuestionManagerModal() {
  if (!isAdminUser()) {
    expireInterviewerSession(true);
    return;
  }

  const users = await getUsersFromServer();
  if (!users) {
    return;
  }

  toggleQuestionFormFields();
  await loadJobPositions();
  syncQuestionAreaOptions();
  if (questionAreaInput && state.selectedQuestionArea) {
    questionAreaInput.value = state.selectedQuestionArea;
  }
  questionManagerModal?.classList.remove("hidden");
  questionTitleInput?.focus();
}

function closeQuestionManagerModal() {
  questionManagerModal?.classList.add("hidden");
}

async function openPositionManagerModal() {
  if (!isAdminUser()) {
    expireInterviewerSession(true);
    return;
  }

  await renderPositionManager();
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.remove("active"));
  openPositionManagerButton?.classList.add("active");
  positionManagerModal?.classList.remove("hidden");
  newPositionNameInput?.focus();
}

function closePositionManagerModal() {
  positionManagerModal?.classList.add("hidden");
  openPositionManagerButton?.classList.remove("active");
  const activeView = document.querySelector(".view.active");
  if (activeView?.id) {
    document.querySelector(`.nav-button[data-view="${activeView.id}"]`)?.classList.add("active");
  }
}

async function renderPositionManager() {
  if (!positionManagerList) {
    return;
  }

  await loadJobPositions();
  const positions = getKnownPositionNames();

  if (!positions.length) {
    positionManagerList.innerHTML = "<p>No hay puestos registrados.</p>";
    return;
  }

  positionManagerList.innerHTML = `
    <div class="user-table-wrap">
      <table class="user-table position-table">
        <thead>
          <tr>
            <th>Puesto</th>
            <th>Preguntas activas</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${positions.map((position) => {
            const count = questions.filter((question) => getQuestionBankArea(question) === position).length;
            return `
              <tr>
                <td><strong>${escapeHtml(position)}</strong></td>
                <td><strong>${count}</strong></td>
                <td>
                  <button class="danger-button icon-text-button position-delete-button" type="button" data-position-name="${escapeHtml(position)}" aria-label="Borrar puesto" title="Borrar puesto">
                    ${getActionIcon("trash")}
                    <span>Borrar</span>
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  positionManagerList.querySelectorAll(".position-delete-button").forEach((button) => {
    button.addEventListener("click", () => {
      deletePosition(button.dataset.positionName || "");
    });
  });
}

async function createPositionFromForm(event) {
  event.preventDefault();

  if (!isAdminUser()) {
    showPositionManagerStatus("Solo un administrador puede crear puestos.", true);
    return;
  }

  const name = newPositionNameInput.value.trim().replace(/\s+/g, " ");
  if (name.length < 3) {
    showPositionManagerStatus("Escribe un nombre de puesto válido.", true);
    newPositionNameInput.focus();
    return;
  }

  const response = await fetchWithTimeout(`${location.origin}/api/positions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ name }),
  }, 9000);

  if (response.status === 401 || response.status === 403) {
    expireInterviewerSession(response.status === 403);
    showPositionManagerStatus("Tu sesión expiró. Inicia sesión.", true);
    return;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    showPositionManagerStatus(data.error || "No se pudo guardar el puesto.", true);
    return;
  }

  positionForm.reset();
  state.selectedQuestionArea = name;
  await loadQuestions();
  renderQuestionBank();
  await renderPositionManager();
  showPositionManagerStatus("Puesto agregado. Ya puedes crear preguntas para ese puesto.", false);
}

function showDeletePositionConfirmation(name, count) {
  const fallbackMessage = count
    ? `El puesto "${name}" tiene ${count} pregunta(s) activa(s). ¿Deseas eliminarlo?`
    : `¿Deseas eliminar el puesto "${name}"?`;

  if (!deletePositionConfirm || !confirmDeletePositionButton || !cancelDeletePositionButton || !deletePositionConfirmMessage) {
    return Promise.resolve(confirm(fallbackMessage));
  }

  deletePositionConfirmMessage.textContent = count
    ? `El puesto "${name}" dejara de aparecer en el banco. Sus ${count} pregunta(s) se conservaran en la base de datos.`
    : `El puesto "${name}" dejara de aparecer en el banco de preguntas.`;
  deletePositionConfirm.classList.remove("hidden");
  cancelDeletePositionButton.focus();

  return new Promise((resolve) => {
    const close = (confirmed) => {
      deletePositionConfirm.classList.add("hidden");
      confirmDeletePositionButton.removeEventListener("click", onConfirm);
      cancelDeletePositionButton.removeEventListener("click", onCancel);
      deletePositionConfirm.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKeyDown);
      resolve(confirmed);
    };

    const onConfirm = () => close(true);
    const onCancel = () => close(false);
    const onOverlayClick = (event) => {
      if (event.target === deletePositionConfirm) {
        close(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    confirmDeletePositionButton.addEventListener("click", onConfirm);
    cancelDeletePositionButton.addEventListener("click", onCancel);
    deletePositionConfirm.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

async function deletePosition(positionName) {
  if (!isAdminUser()) {
    expireInterviewerSession(true);
    return;
  }

  const name = String(positionName || "").trim();
  if (!name) {
    return;
  }

  const count = questions.filter((question) => getQuestionBankArea(question) === name).length;
  const confirmed = await showDeletePositionConfirmation(name, count);

  if (!confirmed) {
    return;
  }

  const response = await fetchWithTimeout(`${location.origin}/api/positions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ name }),
  }, 9000);

  if (response.status === 401 || response.status === 403) {
    expireInterviewerSession(response.status === 403);
    showPositionManagerStatus("Tu sesión expiró. Inicia sesión.", true);
    return;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    showPositionManagerStatus(data.error || "No se pudo quitar el puesto.", true);
    return;
  }

  await loadQuestions();
  const areas = getAvailableBankAreas();
  state.selectedQuestionArea = areas[0] || "";
  renderQuestionBank();
  await renderPositionManager();
  showPositionManagerStatus("Puesto quitado. Si lo necesitas otra vez, agregalo de nuevo.", false);
}

function showPositionManagerStatus(message, isError) {
  if (!positionManagerStatus) {
    return;
  }

  positionManagerStatus.textContent = message;
  positionManagerStatus.classList.remove("hidden");
  positionManagerStatus.classList.toggle("error-summary", Boolean(isError));
}

async function openUserManagerModal() {
  if (!isAdminUser()) {
    expireInterviewerSession(true);
    return;
  }

  const users = await getUsersFromServer();
  if (!users) {
    return;
  }

  document.querySelectorAll(".nav-button").forEach((button) => button.classList.remove("active"));
  openUserManagerButton?.classList.add("active");
  userManagerModal?.classList.remove("hidden");
  await renderUserManager(users);
  newUserEmailInput?.focus();
}

function closeUserManagerModal() {
  userManagerModal?.classList.add("hidden");
  openUserManagerButton?.classList.remove("active");
  const activeView = document.querySelector(".view.active");
  if (activeView?.id) {
    document.querySelector(`.nav-button[data-view="${activeView.id}"]`)?.classList.add("active");
  }
}

async function getUsersFromServer() {
  const response = await fetchWithTimeout(`${location.origin}/api/users`, {
    headers: getAuthHeaders(),
  }, 9000);

  if (response.status === 401 || response.status === 403) {
    expireInterviewerSession(response.status === 403);
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const users = await response.json();
  return Array.isArray(users) ? users : [];
}

async function renderUserManager(users = null) {
  if (!userManagerList) {
    return;
  }

  users = users || await getUsersFromServer();
  if (!users) {
    return;
  }

  if (!users.length) {
    userManagerList.innerHTML = "<p>No hay usuarios registrados.</p>";
    return;
  }

  userManagerList.innerHTML = `
    <div class="user-table-wrap">
      <table class="user-table">
        <thead>
          <tr>
            <th>Correo</th>
            <th>Rol</th>
            <th>Acceso</th>
            <th>Nueva contraseña</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(renderUserRow).join("")}
        </tbody>
      </table>
    </div>
  `;
  bindUserManagerControls();
}

function renderUserRow(user) {
  return `
    <tr data-user-email="${escapeHtml(user.email)}">
      <td>
        <strong>${escapeHtml(user.email)}</strong>
        <small>${user.createdAt ? new Date(user.createdAt).toLocaleString("es-MX") : "Sin fecha"}</small>
      </td>
      <td>
        <select class="user-role-select">
          ${["admin", "entrevistador", "revisor", "lectura"].map((role) => `
            <option value="${role}" ${user.role === role ? "selected" : ""}>${getRoleLabel(role)}</option>
          `).join("")}
        </select>
      </td>
      <td>
        <label class="inline-check">
          <input class="user-active-check" type="checkbox" ${user.active ? "checked" : ""} />
          <span class="user-active-label">${user.active ? "Activo" : "Inactivo"}</span>
        </label>
      </td>
      <td>
        <input class="user-password-input" type="password" minlength="6" maxlength="8" placeholder="Opcional: 6 a 8" />
      </td>
      <td>
        <button class="secondary-button save-user-button" type="button">Guardar</button>
      </td>
    </tr>
  `;
}

function getRoleLabel(role) {
  const labels = {
    admin: "Administrador",
    entrevistador: "Entrevistador",
    revisor: "Revisor",
    lectura: "Lectura",
  };

  return labels[role] || "Entrevistador";
}

function bindUserManagerControls() {
  userManagerList?.querySelectorAll(".user-active-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const label = checkbox.closest(".inline-check")?.querySelector(".user-active-label");
      if (label) {
        label.textContent = checkbox.checked ? "Activo" : "Inactivo";
      }
    });
  });

  userManagerList?.querySelectorAll(".save-user-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest("tr");
      const password = row.querySelector(".user-password-input").value.trim();
      if (password && !isValidInterviewerPassword(password)) {
        showUserManagerStatus("La contraseña debe tener entre 6 y 8 caracteres.", true);
        row.querySelector(".user-password-input").focus();
        return;
      }

      button.disabled = true;
      button.textContent = "Guardando";
      await saveUserUpdate({
        email: row.dataset.userEmail,
        role: row.querySelector(".user-role-select").value,
        active: row.querySelector(".user-active-check").checked,
        password,
      });
      button.disabled = false;
      button.textContent = "Guardar";
    });
  });
}

async function saveUserUpdate(payload) {
  const response = await fetchWithTimeout(`${location.origin}/api/users/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  }, 9000);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    showUserManagerStatus(data.error || "No se pudo guardar el usuario.", true);
    return;
  }

  showUserManagerStatus("Usuario actualizado.", false);
  await renderUserManager();
}

async function createUserFromForm(event) {
  event.preventDefault();

  if (!isAdminUser()) {
    showUserManagerStatus("Solo un administrador puede crear usuarios.", true);
    return;
  }

  const payload = {
    email: newUserEmailInput.value.trim(),
    password: newUserPasswordInput.value.trim(),
    role: newUserRoleInput.value,
    active: true,
  };

  if (!isValidInterviewerPassword(payload.password)) {
    showUserManagerStatus("La contraseña debe tener entre 6 y 8 caracteres.", true);
    newUserPasswordInput.focus();
    return;
  }

  const response = await fetchWithTimeout(`${location.origin}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  }, 9000);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    showUserManagerStatus(data.error || "No se pudo agregar el usuario.", true);
    return;
  }

  userForm.reset();
  newUserRoleInput.value = "entrevistador";
  showUserManagerStatus("Usuario agregado y contraseña protegida.", false);
  await renderUserManager();
}

function isValidInterviewerPassword(password) {
  const length = password.trim().length;
  return length >= 6 && length <= 8;
}

function showUserManagerStatus(message, isError) {
  if (!userManagerStatus) {
    return;
  }

  userManagerStatus.textContent = message;
  userManagerStatus.classList.remove("hidden");
  userManagerStatus.classList.toggle("error-summary", Boolean(isError));
}

function showView(viewId) {
  if ((viewId === "linkTrackingView" || viewId === "liveMonitorView") && !isAdminUser()) {
    viewId = "interviewerView";
  }

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewId}`).classList.add("active");

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  const labels = {
    interviewerView: "Crear examen",
    generatedLinkView: "Link generado",
    createdExamsView: "Exámenes",
    linkTrackingView: "Seguimiento de enlaces",
    liveMonitorView: "Monitoreo en vivo",
    candidateIntroView: "Datos del candidato",
    candidateView: "Responder examen",
    resultsView: "Resultados del candidato",
    answersView: "Respuestas guardadas",
    answerKeyView: "Respuestas correctas",
  };
  modeLabel.dataset.viewLabel = labels[viewId] || "";
  updateSessionBadge();
  applyRoleVisibility();
}

function getSelectedQuestions() {
  syncSelectedQuestionsWithBank();
  return getQuestionsForSelectedArea().filter((question) => state.selectedQuestionIds.has(question.id));
}

function updateQuestionSelectionToggleLabel() {
  const toggleQuestionSelectionButton = document.querySelector("#toggleQuestionSelectionButton");
  if (!toggleQuestionSelectionButton) {
    return;
  }

  syncSelectedQuestionsWithBank();
  const bankQuestions = getQuestionsForSelectedArea();
  const allSelected = bankQuestions.length > 0 && bankQuestions.every((question) => state.selectedQuestionIds.has(question.id));
  toggleQuestionSelectionButton.textContent = allSelected ? "Deseleccionar todo" : "Seleccionar todo";
  updateQuestionBankSelectionCount();
}

function toggleQuestionSelection() {
  syncSelectedQuestionsWithBank();
  const bankQuestions = getQuestionsForSelectedArea();
  const allSelected = bankQuestions.length > 0 && bankQuestions.every((question) => state.selectedQuestionIds.has(question.id));

  if (allSelected) {
    bankQuestions.forEach((question) => state.selectedQuestionIds.delete(question.id));
  } else {
    bankQuestions.forEach((question) => state.selectedQuestionIds.add(question.id));
  }

  renderQuestionBank();
  updateQuestionSelectionToggleLabel();
}

async function createExam(mode = "random") {
  const bankQuestions = getQuestionsForSelectedArea();
  const selectedQuestions = getSelectedQuestions();
  const questionCount = Number(questionCountInput.value);
  const examName = examNameInput.value.trim();
  const maxQuestions = bankQuestions.length;

  if (!examName) {
    alert("Escribe el nombre del examen.");
    examNameInput.focus();
    return;
  }

  if (maxQuestions < 1) {
    alert(`No hay preguntas activas en ${state.selectedQuestionArea}. Agrega preguntas o cambia de area.`);
    return;
  }

  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > maxQuestions) {
    alert(`La cantidad de preguntas debe estar entre 1 y ${maxQuestions}.`);
    questionCountInput.focus();
    return;
  }

  let examQuestions = [];

  if (mode === "manual") {
    if (selectedQuestions.length !== questionCount) {
      alert(`Selecciona exactamente ${questionCount} pregunta(s). Actualmente tienes ${selectedQuestions.length} seleccionada(s).`);
      questionCountInput.focus();
      return;
    }

    examQuestions = selectedQuestions;
  } else {
    examQuestions = pickRandomQuestions(bankQuestions, questionCount);
  }

  state.candidateExamPage = 1;

  state.activeExam = {
    id: createId(),
    name: examName,
    createdAt: new Date().toISOString(),
    timeLimit: Number(document.querySelector("#timeLimit").value),
    area: state.selectedQuestionArea,
    questions: examQuestions,
  };

  localStorage.setItem("activeExam", JSON.stringify(state.activeExam));
  const questionIds = state.activeExam.questions.map((question) => question.id).join(",");
  const linkParams = new URLSearchParams({
    exam: state.activeExam.id,
    time: String(state.activeExam.timeLimit),
    q: questionIds,
  });
  const link = `${getExamBaseUrl()}${location.pathname}?${linkParams.toString()}`;
  document.querySelector("#examLink").value = link;
  if (generatedExamLinkInput) {
    generatedExamLinkInput.value = link;
  }
  document.querySelector("#examLinkBox").classList.remove("hidden");
  state.questionBankOpen = false;
  renderQuestionBank();
  await saveCreatedExam({
    id: state.activeExam.id,
    examName,
    candidateName: "",
    candidateEmail: "",
    questionCount: state.activeExam.questions.length,
    linkCount: 1,
    link,
    timeLimit: state.activeExam.timeLimit,
    createdBy: getCurrentInterviewerUser(),
    questionIds: state.activeExam.questions.map((question) => question.id),
    createdAt: state.activeExam.createdAt,
  });
  await renderCreatedExams();
  renderExam();
  showView("generatedLinkView");
}

function getExamBaseUrl() {
  return location.origin;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasValidCandidateIdentity() {
  return candidateNameInput.value.trim().length >= 3
    && isValidEmail(candidateEmailInput.value.trim().toLowerCase());
}

function getUnansweredQuestions() {
  if (!state.activeExam) {
    return [];
  }

  const formData = new FormData(examForm);
  return state.activeExam.questions.filter((question) => {
    const answer = String(formData.get(question.id) || "").trim();
    return !answer;
  });
}

function renderUnansweredNotice() {
  const count = state.unansweredQuestionIds.size;

  if (!count) {
    return "";
  }

  return `
    <div class="unanswered-notice" id="unansweredNotice">
      <strong>Faltan ${count} pregunta(s) por responder.</strong>
      <span>Las preguntas pendientes están marcadas para que puedas contestarlas antes de finalizar.</span>
    </div>
  `;
}

function updateUnansweredNotice() {
  const notice = document.querySelector("#unansweredNotice");

  if (!notice) {
    return;
  }

  const count = state.unansweredQuestionIds.size;

  if (!count) {
    notice.remove();
    return;
  }

  notice.innerHTML = `
    <strong>Faltan ${count} pregunta(s) por responder.</strong>
    <span>Las preguntas pendientes están marcadas para que puedas contestarlas antes de finalizar.</span>
  `;
}

function markUnansweredQuestions(unansweredQuestions) {
  state.unansweredQuestionIds = new Set(unansweredQuestions.map((question) => question.id));
}

function clearAnsweredQuestionMark(field) {
  if (!field?.name || !state.unansweredQuestionIds.has(field.name)) {
    return;
  }

  const formData = new FormData(examForm);
  const answer = String(formData.get(field.name) || "").trim();

  if (!answer) {
    return;
  }

  state.unansweredQuestionIds.delete(field.name);
  field.closest(".answer-card")?.classList.remove("missing-answer");
  field.closest(".answer-card")?.querySelector(".missing-answer-note")?.remove();
  updateUnansweredNotice();
}

function focusUnansweredQuestion(question) {
  if (!state.activeExam || !question) {
    return;
  }

  const firstMissingIndex = state.activeExam.questions.findIndex((item) => item.id === question.id);
  const pageSize = 5;
  state.candidateExamPage = Math.floor(firstMissingIndex / pageSize) + 1;
  renderExam();

  setTimeout(() => {
    const textField = document.querySelector(`#answer-${CSS.escape(question.id)}`);
    const optionField = Array.from(examForm.querySelectorAll("input, textarea"))
      .find((field) => field.name === question.id);
    const field = textField || optionField;
    const card = field?.closest(".answer-card");

    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }, 0);
}

function updateFinishExamButtonState() {
  const finishButton = document.querySelector("#finishExamButton");
  if (!finishButton || state.isFinishingExam || state.candidateAccessDenied || state.examLocked) {
    return;
  }

  finishButton.disabled = false;
  finishButton.title = Boolean(state.activeExam) && !hasValidCandidateIdentity()
    ? "Captura nombre y correo válido para finalizar."
    : "";
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
  const selectedPractical = practicalQuestions.length ? pickRandomQuestions(practicalQuestions, 1) : [];
  if (count === 1) {
    return selectedPractical.length ? selectedPractical : pickRandomQuestions(source, 1);
  }

  const remainingPool = source.filter((question) => !selectedPractical.includes(question));
  return [...selectedPractical, ...pickRandomQuestions(remainingPool, count - selectedPractical.length)];
}

function getQuestionTypeLabel(question) {
  const labels = {
    closed: "Teórica cerrada",
    open: "Teórica abierta",
    code: "Práctica",
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
    examForm.innerHTML = "<p>No hay examen generado todavía.</p>";
    timer.textContent = "--:--";
    return;
  }

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(state.activeExam.questions.length / pageSize));
  state.candidateExamPage = Math.min(Math.max(1, state.candidateExamPage), totalPages);
  const pageStart = (state.candidateExamPage - 1) * pageSize;
  const rangeLabel = `Preguntas ${pageStart + 1}-${Math.min(pageStart + pageSize, state.activeExam.questions.length)} de ${state.activeExam.questions.length}`;

  examForm.innerHTML = `
    <div class="exam-page-toolbar">
      <strong>${rangeLabel}</strong>
      <span>Página ${state.candidateExamPage} de ${totalPages}</span>
    </div>
    ${renderUnansweredNotice()}
    ${state.activeExam.questions
      .map((question, index) => `
        <div class="exam-question-page ${Math.floor(index / pageSize) + 1 === state.candidateExamPage ? "" : "hidden"}">
          ${renderAnswerField(question, index)}
        </div>
      `)
      .join("")}
    ${renderCandidateExamPagination(totalPages)}
  `;
  restoreCandidateName();
  restoreDraftAnswers();
  bindDraftSaving();
  bindCandidateExamPagination(totalPages);
  updateFinishExamButtonState();
  if (state.examLocked || getFinishedResult()) {
    lockCandidateExam();
  }
  queueLiveExamUpdate();
}

function showCandidateIntro() {
  const examFromLink = getExamFromLink();
  const savedExam = localStorage.getItem("activeExam");
  state.activeExam = examFromLink || state.activeExam;
  state.activeExam = state.activeExam || (savedExam ? JSON.parse(savedExam) : null);

  if (!state.activeExam) {
    showView("candidateIntroView");
    return;
  }

  const savedDraft = localStorage.getItem(getDraftKey());
  const parsedDraft = savedDraft ? JSON.parse(savedDraft) : {};
  candidateIntroNameInput.value = parsedDraft.__candidateName || "";
  candidateIntroEmailInput.value = parsedDraft.__candidateEmail || "";
  showView("candidateIntroView");
}

async function startCandidateExamFromIntro() {
  const candidateName = candidateIntroNameInput.value.trim();
  const candidateEmail = candidateIntroEmailInput.value.trim().toLowerCase();

  if (candidateName.length < 3) {
    alert("Escribe tu nombre completo para iniciar el examen.");
    candidateIntroNameInput.focus();
    return;
  }

  if (!isValidEmail(candidateEmail)) {
    alert("Escribe un correo valido para iniciar el examen.");
    candidateIntroEmailInput.focus();
    return;
  }

  candidateNameInput.value = candidateName;
  candidateEmailInput.value = candidateEmail;
  state.activeExam.createdAt = getExamStartTime(state.activeExam.id);
  localStorage.setItem("activeExam", JSON.stringify(state.activeExam));
  saveDraftAnswers();
  await sendLiveExamUpdate("Datos confirmados");
  showView("candidateView");
  renderExam();
  startTimer();
  bindCandidateSecurityRules();
}

function lockCandidateExam() {
  state.examLocked = true;
  clearInterval(state.timerId);
  timer.textContent = "Finalizado";
  candidateNameInput.disabled = true;
  candidateEmailInput.disabled = true;

  examForm.querySelectorAll("input, textarea, select, button").forEach((field) => {
    field.disabled = true;
  });

  const finishButton = document.querySelector("#finishExamButton");
  if (finishButton) {
    finishButton.disabled = true;
    finishButton.textContent = "Examen finalizado";
  }
}

function renderCandidateExamPagination(totalPages) {
  if (totalPages <= 1) {
    return "";
  }

  return `
    <div class="pagination-bar exam-pagination">
      <span>Avanza por secciones. Tus respuestas se guardan mientras contestas.</span>
      <div class="pagination-actions">
        <button class="ghost-button exam-page-button" type="button" data-page="${state.candidateExamPage - 1}" ${state.candidateExamPage <= 1 ? "disabled" : ""}>Anterior</button>
        <button class="ghost-button exam-page-button" type="button" data-page="${state.candidateExamPage + 1}" ${state.candidateExamPage >= totalPages ? "disabled" : ""}>Siguiente</button>
      </div>
    </div>
  `;
}

function bindCandidateExamPagination(totalPages) {
  document.querySelectorAll(".exam-page-button").forEach((button) => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.page);
      if (!Number.isInteger(page) || page < 1 || page > totalPages) {
        return;
      }

      saveDraftAnswers();
      state.candidateExamPage = page;
      renderExam();
      examForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function showExamBlockedMessage() {
  clearInterval(state.timerId);
  state.examLocked = true;
  timer.textContent = "Bloqueado";
  candidateNameInput.disabled = true;
  candidateEmailInput.disabled = true;
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
    createdAt: localStorage.getItem(`examStartedAt:${urlParams.get("exam")}`) || "",
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
  const isMissing = state.unansweredQuestionIds.has(question.id);
  const missingClass = isMissing ? " missing-answer" : "";
  const missingMessage = isMissing ? `<p class="missing-answer-note">Falta responder esta pregunta.</p>` : "";

  if (question.type === "closed") {
    return `
      <article class="answer-card${missingClass}" data-question-id="${question.id}">
        <label>${index + 1}. ${question.prompt}<span>${question.area} | ${getQuestionTypeLabel(question)}</span></label>
        ${missingMessage}
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
    const language = getRunnerLanguage(question.runner);
    const runner = question.runner
      ? `
        <div class="code-runner-bar">
          <span>Lenguaje: <strong>${language}</strong> | Función esperada: <strong>${question.runner.functionName}</strong></span>
          <button class="secondary-button run-code-button" type="button" data-question-id="${question.id}">Ejecutar pruebas</button>
        </div>
        <div class="code-test-output" id="test-output-${question.id}"></div>
      `
      : "";

    return `
      <article class="answer-card code-answer-card${missingClass}" data-question-id="${question.id}">
        <label for="answer-${question.id}">
          ${index + 1}. ${question.prompt}
          <span>${question.area} | ${getQuestionTypeLabel(question)} | Lenguaje: ${language}</span>
        </label>
        ${missingMessage}
        <textarea class="code-editor" id="answer-${question.id}" name="${question.id}" spellcheck="false" placeholder="Escribe aquí tu solución en ${language}."></textarea>
        ${runner}
      </article>
    `;
  }

  return `
    <article class="answer-card${missingClass}" data-question-id="${question.id}">
      <label for="answer-${question.id}">
        ${index + 1}. ${question.prompt}
        <span>${question.area} | ${getQuestionTypeLabel(question)}</span>
      </label>
      ${missingMessage}
      <textarea id="answer-${question.id}" name="${question.id}" placeholder="Escribe aquí tu respuesta"></textarea>
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
  answers.__candidateEmail = candidateEmailInput.value.trim();
  localStorage.setItem(getDraftKey(), JSON.stringify(answers));
  queueLiveExamUpdate();
}

function getLiveAnswersSnapshot() {
  if (!state.activeExam) {
    return [];
  }

  const formData = new FormData(examForm);
  const answers = Object.fromEntries(formData.entries());

  return state.activeExam.questions.map((question, index) => {
    const rawAnswer = String(answers[question.id] || "").trim();
    let displayAnswer = rawAnswer;

    if (question.type === "closed" && rawAnswer) {
      const selectedOption = question.options?.find((option) => option.key === rawAnswer);
      displayAnswer = selectedOption ? `${rawAnswer}) ${selectedOption.text}` : rawAnswer;
    }

    return {
      id: question.id,
      number: index + 1,
      title: question.title,
      prompt: question.prompt,
      area: question.area,
      type: getQuestionTypeLabel(question),
      answer: displayAnswer,
      answered: Boolean(rawAnswer),
    };
  });
}

function queueLiveExamUpdate(status = "Contestando", delay = 120) {
  if (!isCandidateLink || !state.activeExam || state.candidateAccessDenied) {
    return;
  }

  if (liveExamSaveTimer) {
    clearTimeout(liveExamSaveTimer);
  }

  liveExamSaveTimer = setTimeout(() => {
    liveExamSaveTimer = null;
    sendLiveExamUpdate(status).catch(() => {});
  }, delay);
}

function flushLiveExamUpdate(status = "Contestando") {
  if (!isCandidateLink || !state.activeExam || state.candidateAccessDenied) {
    return;
  }

  if (liveExamSaveTimer) {
    clearTimeout(liveExamSaveTimer);
    liveExamSaveTimer = null;
  }

  sendLiveExamUpdate(status).catch(() => {});
}

async function sendLiveExamUpdate(status = "Contestando", keepalive = false) {
  if (!isCandidateLink || !state.activeExam || state.candidateAccessDenied) {
    return;
  }

  const token = getCandidateToken();
  if (!token) {
    return;
  }

  const answers = getLiveAnswersSnapshot();
  const payload = {
    token,
    candidateName: candidateNameInput.value.trim(),
    candidateEmail: candidateEmailInput.value.trim().toLowerCase(),
    status,
    remainingSeconds: state.remainingSeconds,
    answeredCount: answers.filter((answer) => answer.answered).length,
    totalQuestions: state.activeExam.questions.length,
    answers,
  };

  const request = fetch(`${location.origin}/api/live-exams/${encodeURIComponent(state.activeExam.id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive,
    body: JSON.stringify(payload),
  });

  if (keepalive) {
    request.catch(() => {});
    return;
  }

  await request;
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
    if (questionId === "__candidateName" || questionId === "__candidateEmail") {
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
    field.addEventListener("input", () => {
      saveDraftAnswers();
      clearAnsweredQuestionMark(field);
    });
    field.addEventListener("change", () => {
      saveDraftAnswers();
      clearAnsweredQuestionMark(field);
      flushLiveExamUpdate();
    });
  });
  examForm.querySelectorAll(".run-code-button").forEach((button) => {
    button.addEventListener("click", () => runCodeTests(button.dataset.questionId));
  });
  [candidateNameInput, candidateEmailInput].forEach((input) => {
    input.addEventListener("input", () => {
      saveDraftAnswers();
      updateFinishExamButtonState();
      queueLiveExamUpdate("Contestando", 80);
    });
    input.addEventListener("change", () => {
      updateFinishExamButtonState();
      flushLiveExamUpdate();
    });
  });
}

async function runCodeTests(questionId) {
  const question = state.activeExam.questions.find((item) => item.id === questionId);
  const output = document.querySelector(`#test-output-${CSS.escape(questionId)}`);
  const editor = document.querySelector(`#answer-${CSS.escape(questionId)}`);

  if (!question?.runner || !output || !editor) {
    return;
  }

  await runCodeTestsForAnswer(question, editor.value, output);
}

async function runCodeTestsForAnswer(question, code, output) {
  const runner = getQuestionRunner(question) || question?.runner;

  if (!runner || !output) {
    return;
  }

  output.innerHTML = `<div class="test-line pending">Ejecutando pruebas...</div>`;

  try {
    const results = await executeCodeRunner(code, runner);
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
  const normalizedRunner = {
    functionName: runner.functionName || runner.FunctionName,
    tests: (runner.tests || runner.Tests || []).map((test) => ({
      name: test.name || test.Name || "Prueba",
      args: test.args || test.Args || [],
      expected: test.expected ?? test.Expected,
    })),
  };

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
      reject(new Error("El código tardó demasiado. Revisa ciclos infinitos."));
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

    worker.postMessage({ code, runner: normalizedRunner });
  });
}

function restoreCandidateName() {
  const savedDraft = localStorage.getItem(getDraftKey());
  const parsedDraft = savedDraft ? JSON.parse(savedDraft) : {};
  const savedName = parsedDraft.__candidateName || "";
  const savedEmail = parsedDraft.__candidateEmail || "";
  candidateNameInput.value = savedName || state.activeExam?.candidateName || "";
  candidateEmailInput.value = savedEmail || state.activeExam?.candidateEmail || "";
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
    lockCandidateExam();
    showView("resultsView");
    return;
  }

  clearInterval(state.timerId);
  state.remainingSeconds = getRemainingSeconds();
  updateTimerLabel();

  if (state.remainingSeconds <= 0) {
    triggerSecurityFinish("El tiempo del examen se terminó.");
    return;
  }

  state.timerId = setInterval(() => {
    state.remainingSeconds = getRemainingSeconds();
    updateTimerLabel();

    if (state.remainingSeconds <= 0) {
      triggerSecurityFinish("El tiempo del examen se terminó.");
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

function shouldAutoFinishForSecurity() {
  return (
    isCandidateLink &&
    state.activeExam &&
    !state.candidateAccessDenied &&
    !state.securityFinishTriggered &&
    !state.isFinishingExam &&
    !getFinishedResult()
  );
}

function triggerSecurityFinish(reason) {
  if (!shouldAutoFinishForSecurity()) {
    return;
  }

  state.securityFinishTriggered = true;
  state.securityFinishReason = reason;
  finishExam({ forced: true });
}

function showFinishExamConfirmation(unansweredCount) {
  const hasUnanswered = unansweredCount > 0;
  const message = hasUnanswered
    ? `Aun tienes ${unansweredCount} pregunta(s) sin responder. Puedes revisar las pendientes o finalizar ahora con las respuestas capturadas.`
    : "Estas por finalizar tu evaluacion. Una vez enviada, ya no podras modificar tus respuestas.";

  if (!finishExamConfirm || !confirmFinishExamButton || !reviewPendingButton || !finishExamConfirmMessage) {
    return Promise.resolve(confirm(message));
  }

  finishExamConfirmMessage.textContent = message;
  reviewPendingButton.textContent = hasUnanswered ? "Revisar pendientes" : "Seguir revisando";
  finishExamConfirm.classList.remove("hidden");
  confirmFinishExamButton.focus();

  return new Promise((resolve) => {
    const close = (confirmed) => {
      finishExamConfirm.classList.add("hidden");
      confirmFinishExamButton.removeEventListener("click", onConfirm);
      reviewPendingButton.removeEventListener("click", onReview);
      finishExamConfirm.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKeyDown);
      resolve(confirmed);
    };

    const onConfirm = () => close(true);
    const onReview = () => close(false);
    const onOverlayClick = (event) => {
      if (event.target === finishExamConfirm) {
        close(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    confirmFinishExamButton.addEventListener("click", onConfirm);
    reviewPendingButton.addEventListener("click", onReview);
    finishExamConfirm.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

function showClearHistoryConfirmation() {
  const fallbackMessage = "Esta accion eliminara de forma permanente los resultados y respuestas guardadas en la base de datos. ¿Deseas continuar?";

  if (!clearHistoryConfirm || !confirmClearHistoryButton || !cancelClearHistoryButton) {
    return Promise.resolve(confirm(fallbackMessage));
  }

  clearHistoryConfirm.classList.remove("hidden");
  cancelClearHistoryButton.focus();

  return new Promise((resolve) => {
    const close = (confirmed) => {
      clearHistoryConfirm.classList.add("hidden");
      confirmClearHistoryButton.removeEventListener("click", onConfirm);
      cancelClearHistoryButton.removeEventListener("click", onCancel);
      clearHistoryConfirm.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKeyDown);
      resolve(confirmed);
    };

    const onConfirm = () => close(true);
    const onCancel = () => close(false);
    const onOverlayClick = (event) => {
      if (event.target === clearHistoryConfirm) {
        close(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    confirmClearHistoryButton.addEventListener("click", onConfirm);
    cancelClearHistoryButton.addEventListener("click", onCancel);
    clearHistoryConfirm.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);
  });
}

function bindCandidateSecurityRules() {
  if (!isCandidateLink) {
    return;
  }

  const devtoolsThreshold = 160;
  let devtoolsCheckTimer = null;
  const detectDevTools = () => {
    const widthGap = Math.abs(window.outerWidth - window.innerWidth);
    const heightGap = Math.abs(window.outerHeight - window.innerHeight);
    if (widthGap > devtoolsThreshold || heightGap > devtoolsThreshold) {
      triggerSecurityFinish("El candidato abrió las herramientas de inspección del navegador.");
    }
  };

  const finishForLostFocus = () => {
    triggerSecurityFinish("El candidato cambió de pestaña, minimizó o salió de la página.");
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      finishForLostFocus();
    }
  });

  window.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!document.hasFocus()) {
        finishForLostFocus();
      }
    }, 120);
  });

  window.addEventListener("pagehide", () => {
    triggerSecurityFinish("El candidato cerró o abandonó la página del examen.");
  });

  window.addEventListener("resize", detectDevTools);
  window.addEventListener("keydown", (event) => {
    const key = String(event.key || "").toLowerCase();
    const opensDevTools = event.key === "F12"
      || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));

    if (opensDevTools) {
      event.preventDefault();
      triggerSecurityFinish("El candidato intentó abrir las herramientas de inspección del navegador.");
    }
  });

  devtoolsCheckTimer = window.setInterval(() => {
    if (!shouldAutoFinishForSecurity()) {
      window.clearInterval(devtoolsCheckTimer);
      return;
    }

    const startedAt = performance.now();
    debugger;
    if (performance.now() - startedAt > 120) {
      triggerSecurityFinish("El candidato abrió las herramientas de inspección del navegador.");
      return;
    }

    detectDevTools();
  }, 1000);

  detectDevTools();
}

async function finishExam(options = {}) {
  const forced = Boolean(options.forced);

  if (state.isFinishingExam) {
    return;
  }

  if (!state.activeExam) {
    if (!forced) {
      alert("Primero genera un examen.");
    }
    return;
  }

  try {
    state.isFinishingExam = true;
    const typedCandidateName = candidateNameInput.value.trim();
    const typedCandidateEmail = candidateEmailInput.value.trim().toLowerCase();
    const candidateName = typedCandidateName || "Candidato sin nombre";
    const candidateEmail = isValidEmail(typedCandidateEmail) ? typedCandidateEmail : "";

    if (!forced && typedCandidateName.length < 3) {
      alert("Escribe tu nombre completo antes de finalizar el examen.");
      candidateNameInput.focus();
      return;
    }

    if (!forced && !isValidEmail(typedCandidateEmail)) {
      alert("Escribe un correo válido antes de finalizar el examen.");
      candidateEmailInput.focus();
      return;
    }

    if (!forced) {
      const unansweredQuestions = getUnansweredQuestions();
      const hasUnanswered = unansweredQuestions.length > 0;
      const confirmed = await showFinishExamConfirmation(unansweredQuestions.length);

      if (!confirmed) {
        if (hasUnanswered) {
          markUnansweredQuestions(unansweredQuestions);
          focusUnansweredQuestion(unansweredQuestions[0]);
        }
        return;
      }
    }

    state.unansweredQuestionIds.clear();
    const formData = new FormData(examForm);
    state.answers = Object.fromEntries(formData.entries());
    const codeResults = await buildCodeResultsForServer();
    lockCandidateExam();
    await sendLiveExamUpdate(forced ? "Finalizado automatico" : "Finalizado", forced);
    state.lastResult = await evaluateAnswersOnServer(
      candidateName,
      candidateEmail,
      forced,
      codeResults
    );
    localStorage.setItem(getFinishedKey(), JSON.stringify(state.lastResult));
    localStorage.removeItem(getDraftKey());
    saveResultLocally(state.lastResult);
    renderResults();
    showView("resultsView");
    markServerSaveStatus(
      forced
        ? "El examen se finalizó automáticamente porque saliste de la pantalla del examen."
        : "Resultado guardado para el entrevistador."
    );
  } catch (error) {
    console.error(error);
    if (!forced) {
      alert("No se pudo finalizar el examen. Revisa que las preguntas hayan cargado correctamente.");
      document.querySelector("#finishExamButton").disabled = false;
      updateFinishExamButtonState();
    }
  } finally {
    state.isFinishingExam = false;
    if (!forced) {
      updateFinishExamButtonState();
    }
  }
}

async function buildCodeResultsForServer() {
  const resultsByQuestion = {};

  if (!state.activeExam?.questions) {
    return resultsByQuestion;
  }

  for (const question of state.activeExam.questions) {
    const runner = getQuestionRunner(question) || question.runner;
    if (question.type !== "code" || !runner) {
      continue;
    }

    try {
      const results = await executeCodeRunner(state.answers[question.id] || "", runner);
      resultsByQuestion[question.id] = {
        passed: results.filter((result) => result.passed).length,
        total: results.length,
        results,
      };
    } catch (error) {
      const tests = runner.tests || runner.Tests || [];
      resultsByQuestion[question.id] = {
        passed: 0,
        total: tests.length,
        error: error.message || String(error),
      };
    }
  }

  return resultsByQuestion;
}

async function evaluateAnswersOnServer(candidateName, candidateEmail, keepalive = false, codeResults = {}) {
  const response = await fetchWithTimeout(`${location.origin}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive,
    body: JSON.stringify({
      id: state.activeExam.id,
      candidateToken: getCandidateToken(),
      candidateName,
      candidateEmail,
      securityReason: state.securityFinishReason,
      questionIds: state.activeExam.questions.map((question) => question.id),
      answers: state.answers,
      codeResults,
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
    candidateEmail: candidateEmailInput.value.trim().toLowerCase(),
    securityReason: state.securityFinishReason,
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
      markServerSaveStatus("Resultado guardado en este teléfono, pero no se pudo enviar al entrevistador.");
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
    resultSummary.textContent = "Inicia sesión para cargar los resultados guardados en la base de datos.";
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
    resultSummary.textContent = "Aún no hay respuestas evaluadas.";
    resultList.innerHTML = "";
    scoreLabel.textContent = "0/100";
    return;
  }

  scoreLabel.textContent = `${state.lastResult.score}/100`;
  const displayName = state.lastResult.candidateName || "Candidato sin nombre";
  const manualLabel =
    state.lastResult.manualScore !== null && state.lastResult.manualScore !== undefined
      ? ` Calificación ajustada por entrevistador: ${state.lastResult.manualScore}/100.`
      : "";
  resultSummary.textContent = isCandidateLink
    ? `Obtuviste ${state.lastResult.earnedPoints} de ${state.lastResult.totalPoints} puntos. Estamos guardando tu resultado para el entrevistador.`
    : `${displayName} obtuvo ${state.lastResult.earnedPoints} de ${state.lastResult.totalPoints} puntos. Calificación automática: ${state.lastResult.automaticScore ?? state.lastResult.score}/100.${manualLabel}`;
  if (!isCandidateLink && state.lastResult.securityReason) {
    resultSummary.textContent += ` Finalización automática: ${state.lastResult.securityReason}`;
  }
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
  const runner = getQuestionRunner(item);
  const codeReviewRunner =
    getQuestionType(item) === "code" && runner
      ? `
        <div class="code-runner-bar review-code-runner">
          <span>Lenguaje: <strong>${escapeHtml(getRunnerLanguage(runner))}</strong> | Función esperada: <strong>${escapeHtml(runner.functionName || runner.FunctionName || "")}</strong></span>
          <button class="secondary-button review-run-code-button" type="button">Ejecutar pruebas</button>
        </div>
        <div class="code-test-output review-code-output"></div>
      `
      : "";
  const reviewControls = `
      ${codeReviewRunner}
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

function getQuestionRunner(item) {
  return item?.runner || item?.Runner || getQuestionValue(item, "runner", "Runner") || null;
}

function getRunnerLanguage(runner) {
  return runner?.language || runner?.Language || "JavaScript";
}

function getQuestionOptions(item) {
  const options = getQuestionValue(item, "options", "Options");
  return Array.isArray(options) ? options : [];
}

function isWithinDateRange(dateValue, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  if (!dateValue) {
    return false;
  }

  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  if (dateFrom) {
    const fromTimestamp = new Date(`${dateFrom}T00:00:00`).getTime();
    if (timestamp < fromTimestamp) {
      return false;
    }
  }

  if (dateTo) {
    const toTimestamp = new Date(`${dateTo}T23:59:59.999`).getTime();
    if (timestamp > toTimestamp) {
      return false;
    }
  }

  return true;
}

function hasActiveFilters(filters) {
  return Boolean(filters.text || filters.email || filters.dateFrom || filters.dateTo);
}

function filterSavedResults(history) {
  const filters = state.answerFilters;
  const textTerm = normalizeText(filters.text.trim());

  return history.filter((result) => {
    const candidateName = result.candidateName || "Candidato sin nombre";
    const candidateEmail = result.candidateEmail || "";
    const searchableText = normalizeText(`${candidateName} ${candidateEmail} ${result.id}`);

    return !textTerm || searchableText.includes(textTerm);
  });
}

function filterCreatedExams(exams) {
  const filters = state.createdExamFilters;
  const emailTerm = normalizeText(filters.email.trim());

  return exams
    .filter((exam) => {
      const candidateName = exam.candidateName || "";
      const candidateEmail = exam.candidateEmail || "";
      const createdBy = exam.createdBy || exam.creadoPor || "";
      const searchableEmail = normalizeText(`${candidateName} ${candidateEmail} ${createdBy}`);

      return (!emailTerm || searchableEmail.includes(emailTerm))
        && isWithinDateRange(exam.createdAt, filters.dateFrom, filters.dateTo);
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

async function renderSavedAnswers() {
  if (!isCandidateLink && location.protocol.startsWith("http") && !hasInterviewerSession()) {
    answersSummary.classList.remove("hidden");
    answersSummary.textContent = "Inicia sesión para cargar los exámenes guardados en la base de datos.";
    answersList.innerHTML = "";
    return;
  }

  const history = (await getServerHistory()).filter((result) => result && result.id && result.evaluated);

  if (!history.length) {
    answersSummary.classList.remove("hidden");
    answersSummary.textContent = "Aún no hay exámenes guardados.";
    answersList.innerHTML = "";
    return;
  }

  const filteredHistory = filterSavedResults(history);
  const hasFilters = hasActiveFilters(state.answerFilters);

  answersSummary.textContent = "";
  answersSummary.classList.add("hidden");
  const selectedResult = state.selectedHistoryId
    ? history.find((result) => result.id === state.selectedHistoryId)
    : null;
  answersList.innerHTML = `
    <div class="answers-tools">
      <label class="field search-field">
        Buscar candidato
        <input id="answerSearchInput" value="${escapeHtml(state.answerFilters.text)}" placeholder="Nombre, correo o id" autocomplete="off" />
      </label>
      <button class="ghost-button ${hasFilters ? "" : "hidden"}" id="clearAnswerSearchButton" type="button">Limpiar filtros</button>
      <span class="answers-count">${filteredHistory.length} de ${history.length} examen(es)</span>
    </div>
    <div class="answers-table-wrap">
      <table class="answers-table">
        <thead>
          <tr>
            <th>Candidato</th>
            <th>Calificación</th>
            <th>Automática</th>
            <th>Finalizado</th>
            <th>Respuestas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filteredHistory.length
            ? filteredHistory.map((result) => renderCandidateRow(result, result.id === state.selectedHistoryId)).join("")
            : renderNoSearchResultsRow(hasFilters)}
        </tbody>
      </table>
    </div>
    ${selectedResult ? `<div class="answer-detail-modal" role="dialog" aria-modal="true">${renderSavedAnswerDetail(selectedResult)}</div>` : ""}
  `;
  bindAnswerSearchControls();
  bindCandidateTableControls();
  bindManualScoreControls(history);
}

async function saveCreatedExam(exam) {
  const localHistory = getCreatedExamHistory();
  const updatedHistory = [exam, ...localHistory.filter((item) => item.id !== exam.id)].slice(0, 200);
  localStorage.setItem("createdExamHistory", JSON.stringify(updatedHistory));

  if (!location.protocol.startsWith("http") || !hasInterviewerSession()) {
    return;
  }

  try {
    const response = await fetchWithTimeout(`${location.origin}/api/exams`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(exam),
    }, 9000);

    if (response.status === 401 || response.status === 403) {
      expireInterviewerSession(response.status === 403);
    }
  } catch {
    console.warn("No se pudo guardar el examen creado en el servidor.");
  }
}

function getCreatedExamHistory() {
  const savedHistory = localStorage.getItem("createdExamHistory");
  return savedHistory ? JSON.parse(savedHistory) : [];
}

async function getServerCreatedExams() {
  if (location.protocol.startsWith("http") && hasInterviewerSession()) {
    try {
      const response = await fetchWithTimeout(`${location.origin}/api/exams`, {
        headers: getAuthHeaders(),
      }, 9000);

      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [data];
      }

      if (response.status === 401 || response.status === 403) {
        expireInterviewerSession(response.status === 403);
      }
    } catch {
      console.warn("No se pudieron cargar los exámenes creados del servidor.");
    }

    return [];
  }

  return getCreatedExamHistory();
}

async function getLinkStats() {
  if (!location.protocol.startsWith("http") || !hasInterviewerSession()) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(`${location.origin}/api/link-stats`, {
      headers: getAuthHeaders(),
    }, 9000);

    if (response.ok) {
      return response.json();
    }

    if (response.status === 401 || response.status === 403) {
      expireInterviewerSession(response.status === 403);
    }
  } catch {
    console.warn("No se pudieron cargar las estadísticas de enlaces.");
  }

  return null;
}

async function getServerLinkTracking() {
  if (!location.protocol.startsWith("http") || !hasInterviewerSession() || !isAdminUser()) {
    return [];
  }

  try {
    const response = await fetchWithTimeout(`${location.origin}/api/link-tracking`, {
      headers: getAuthHeaders(),
    }, 9000);

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }

    if (response.status === 401 || response.status === 403) {
      expireInterviewerSession(response.status === 403);
    }
  } catch {
    console.warn("No se pudo cargar el seguimiento de enlaces.");
  }

  return [];
}

async function renderCreatedExams() {
  if (!createdExamsSummary || !createdExamsList) {
    return;
  }

  if (!isCandidateLink && location.protocol.startsWith("http") && !hasInterviewerSession()) {
    createdExamsSummary.classList.remove("hidden");
    createdExamsSummary.textContent = "Inicia sesión para cargar los exámenes creados.";
    createdExamsList.innerHTML = "";
    return;
  }

  const exams = await getServerCreatedExams();
  if (!exams.length) {
    createdExamsSummary.classList.remove("hidden");
    createdExamsSummary.textContent = "Aún no hay exámenes creados.";
    createdExamsList.innerHTML = "";
    return;
  }

  const filteredExams = filterCreatedExams(exams);
  const hasFilters = hasActiveFilters(state.createdExamFilters);
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / CREATED_EXAMS_PAGE_SIZE));
  state.createdExamsPage = Math.min(Math.max(1, state.createdExamsPage), totalPages);
  const pageStart = (state.createdExamsPage - 1) * CREATED_EXAMS_PAGE_SIZE;
  const pageExams = filteredExams.slice(pageStart, pageStart + CREATED_EXAMS_PAGE_SIZE);

  createdExamsSummary.textContent = "";
  createdExamsSummary.classList.add("hidden");
  createdExamsList.innerHTML = `
    <div class="answers-tools table-filter-tools">
      <label class="field search-field">
        Correo
        <input id="createdExamEmailFilter" value="${escapeHtml(state.createdExamFilters.email)}" placeholder="Candidato o quien lo creó" autocomplete="off" />
      </label>
      <label class="field search-field">
        Desde
        <input id="createdExamDateFromFilter" type="date" value="${escapeHtml(state.createdExamFilters.dateFrom)}" />
      </label>
      <label class="field search-field">
        Hasta
        <input id="createdExamDateToFilter" type="date" value="${escapeHtml(state.createdExamFilters.dateTo)}" />
      </label>
      <button class="ghost-button ${hasFilters ? "" : "hidden"}" id="clearCreatedExamFiltersButton" type="button">Limpiar filtros</button>
    </div>
    <div class="created-exams-table-wrap">
      <table class="created-exams-table">
        <thead>
          <tr>
            <th>Nombre del examen</th>
            <th>Núm. preguntas</th>
            <th>Generado por</th>
            <th>Candidato</th>
            <th>Link único de acceso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pageExams.length
            ? pageExams.map(renderCreatedExamRow).join("")
            : renderNoSearchResultsRow(hasFilters)}
        </tbody>
      </table>
    </div>
    ${filteredExams.length > CREATED_EXAMS_PAGE_SIZE ? renderCreatedExamsPagination(filteredExams.length, totalPages) : ""}
  `;
  bindCreatedExamControls();
}

async function renderLinkTracking() {
  if (!linkTrackingSummary || !linkTrackingList) {
    return;
  }

  if (!isAdminUser()) {
    linkTrackingSummary.classList.remove("hidden");
    linkTrackingSummary.textContent = "Solo los administradores pueden ver el seguimiento de enlaces.";
    linkTrackingList.innerHTML = "";
    return;
  }

  const [stats, links] = await Promise.all([
    getLinkStats(),
    getServerLinkTracking(),
  ]);

  linkTrackingSummary.textContent = "";
  linkTrackingSummary.classList.add("hidden");
  linkTrackingList.innerHTML = `
    ${renderLinkStats(stats)}
    <div class="created-exams-table-wrap">
      <table class="created-exams-table link-tracking-table">
        <thead>
          <tr>
            <th>Examen</th>
            <th>Preguntas</th>
            <th>Candidato</th>
            <th>Generado por</th>
            <th>Estado</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          ${links.length ? links.map(renderLinkTrackingRow).join("") : renderNoLinkTrackingRow()}
        </tbody>
      </table>
    </div>
  `;
  bindLinkTrackingControls();
}

async function renderLiveMonitor() {
  if (!liveMonitorSummary || !liveMonitorList) {
    return;
  }

  if (!isAdminUser()) {
    liveMonitorSummary.classList.remove("hidden");
    liveMonitorSummary.textContent = "Solo los administradores pueden ver el monitoreo en vivo.";
    liveMonitorList.innerHTML = "";
    return;
  }

  try {
    const response = await fetchWithTimeout(`${location.origin}/api/live-exams`, {
      headers: getAuthHeaders(),
    }, 9000);

    if (!response.ok) {
      throw new Error("No se pudo cargar el monitoreo.");
    }

    const exams = await response.json();
    liveMonitorSummary.classList.remove("hidden");
    liveMonitorSummary.textContent = exams.length
      ? `${exams.length} examen(es) con actividad reciente.`
      : "Aun no hay candidatos contestando.";
    liveMonitorList.innerHTML = exams.length
      ? exams.map(renderLiveMonitorCard).join("")
      : "";
  } catch (error) {
    liveMonitorSummary.classList.remove("hidden");
    liveMonitorSummary.textContent = "No se pudo cargar el monitoreo en vivo.";
    liveMonitorList.innerHTML = "";
  }
}

function renderLiveMonitorCard(exam) {
  const answers = Array.isArray(exam.answers) ? exam.answers : [];
  const updatedAt = exam.updatedAt ? new Date(exam.updatedAt).toLocaleString("es-MX") : "Sin actualizacion";
  const remaining = formatRemainingTime(Number(exam.remainingSeconds || 0));
  const statusClass = String(exam.status || "").startsWith("Finalizado") ? "completed" : "opened";

  return `
    <article class="live-monitor-card">
      <div class="live-monitor-head">
        <div>
          <span class="tracking-status ${statusClass}">${escapeHtml(exam.status || "Contestando")}</span>
          <h3>${escapeHtml(exam.candidateName || "Candidato sin nombre")}</h3>
          <p>${escapeHtml(exam.candidateEmail || "Sin correo")} · ${escapeHtml(exam.examId || "")}</p>
        </div>
        <div class="live-monitor-stats">
          <strong>${Number(exam.answeredCount || 0)}/${Number(exam.totalQuestions || answers.length || 0)}</strong>
          <span>respondidas</span>
          <strong>${remaining}</strong>
          <span>restante</span>
        </div>
      </div>
      <small class="live-monitor-updated">Actualizado: ${updatedAt}</small>
      <div class="live-answer-grid">
        ${answers.length ? answers.map(renderLiveAnswerItem).join("") : "<p>El candidato aun no ha contestado preguntas.</p>"}
      </div>
    </article>
  `;
}

function renderLiveAnswerItem(answer) {
  return `
    <div class="live-answer-item ${answer.answered ? "answered" : ""}">
      <strong>${Number(answer.number || 0)}. ${escapeHtml(answer.title || "Pregunta sin titulo")}</strong>
      <span>${escapeHtml(answer.area || "")} · ${escapeHtml(answer.type || "")}</span>
      <p>${escapeHtml(answer.answer || "Sin respuesta")}</p>
    </div>
  `;
}

function formatRemainingTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds || 0);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderLinkStats(stats) {
  if (!stats) {
    return "";
  }

  const cards = [
    ["Hoy", stats.day],
    ["Últimos 7 días", stats.week],
    ["Este mes", stats.month],
  ];

  return `
    <div class="link-stats-grid" aria-label="Seguimiento de enlaces">
      ${cards.map(([label, values]) => `
        <article class="link-stat-card">
          <span>${label}</span>
          <strong>${Number(values?.generated || 0)}</strong>
          <p>links generados</p>
          <small>${Number(values?.opened || 0)} abiertos · ${Number(values?.completed || 0)} terminados</small>
        </article>
      `).join("")}
    </div>
  `;
}

function renderLinkTrackingRow(exam) {
  const createdAt = exam.createdAt ? new Date(exam.createdAt).toLocaleString("es-MX") : "Sin fecha";
  const tracking = getExamTrackingStatus(exam);

  return `
    <tr>
      <td>
        <strong>${escapeHtml(exam.examName || "Evaluación técnica")}</strong>
        <small>${escapeHtml(exam.id || "")}</small>
      </td>
      <td>${Number(exam.questionCount || 0)}</td>
      <td>${escapeHtml(exam.candidateEmail || "Sin correo")}</td>
      <td>
        <strong>${escapeHtml(exam.createdBy || "Sin registro")}</strong>
        <small>${createdAt}</small>
      </td>
      <td>
        <span class="tracking-status ${tracking.className}">${tracking.label}</span>
        <small>${tracking.dateLabel}</small>
      </td>
      <td>
        <div class="created-link-cell">
          <a href="${escapeHtml(exam.link || "#")}" target="_blank" rel="noopener">${escapeHtml(exam.link || "Sin enlace")}</a>
          <button class="ghost-button copy-tracking-link-button" type="button" data-link="${escapeHtml(exam.link || "")}">Copiar</button>
        </div>
      </td>
    </tr>
  `;
}

function renderNoLinkTrackingRow() {
  return `
    <tr>
      <td class="empty-table-cell" colspan="6">Aún no hay enlaces generados.</td>
    </tr>
  `;
}

function renderCreatedExamsPagination(totalItems, totalPages) {
  const firstItem = (state.createdExamsPage - 1) * CREATED_EXAMS_PAGE_SIZE + 1;
  const lastItem = Math.min(state.createdExamsPage * CREATED_EXAMS_PAGE_SIZE, totalItems);

  return `
    <div class="pagination-bar">
      <span>Mostrando ${firstItem}-${lastItem} de ${totalItems}</span>
      <div class="pagination-actions">
        <button class="ghost-button created-page-button" type="button" data-page="${state.createdExamsPage - 1}" ${state.createdExamsPage <= 1 ? "disabled" : ""}>Anterior</button>
        <strong>Página ${state.createdExamsPage} de ${totalPages}</strong>
        <button class="ghost-button created-page-button" type="button" data-page="${state.createdExamsPage + 1}" ${state.createdExamsPage >= totalPages ? "disabled" : ""}>Siguiente</button>
      </div>
    </div>
  `;
}

function renderCreatedExamRow(exam) {
  const createdAt = exam.createdAt ? new Date(exam.createdAt).toLocaleString("es-MX") : "Sin fecha";
  const candidateName = exam.candidateName || "";
  const candidateEmail = exam.candidateEmail || "";
  return `
    <tr>
      <td>
        <strong>${escapeHtml(exam.examName || "Evaluación técnica")}</strong>
        <small>${createdAt}</small>
      </td>
      <td>${Number(exam.questionCount || 0)}</td>
      <td>${escapeHtml(exam.createdBy || exam.creadoPor || "Sin registro")}</td>
      <td>
        <strong>${escapeHtml(candidateName || "Sin nombre")}</strong>
        <small>${escapeHtml(candidateEmail || "Sin correo")}</small>
      </td>
      <td>
        <div class="created-link-cell">
          <a href="${escapeHtml(exam.link || "#")}" target="_blank" rel="noopener">${escapeHtml(exam.link || "Sin enlace")}</a>
        </div>
      </td>
      <td>
        <button class="ghost-button copy-created-link-button" type="button" data-link="${escapeHtml(exam.link || "")}">Copiar</button>
      </td>
    </tr>
  `;
}

function getExamTrackingStatus(exam) {
  if (exam.completedAt) {
    return {
      className: "completed",
      label: "Examen terminado",
      dateLabel: new Date(exam.completedAt).toLocaleString("es-MX"),
    };
  }

  if (exam.openedAt) {
    return {
      className: "opened",
      label: "Link abierto",
      dateLabel: new Date(exam.openedAt).toLocaleString("es-MX"),
    };
  }

  return {
    className: "generated",
    label: "Link generado",
    dateLabel: exam.createdAt ? new Date(exam.createdAt).toLocaleString("es-MX") : "Sin fecha",
  };
}

function bindCreatedExamControls() {
  bindCreatedExamFilterControls();
  bindCreatedExamPaginationControls();

  createdExamsList?.querySelectorAll(".copy-created-link-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const link = button.dataset.link || "";
      if (!link) {
        return;
      }

      await copyText(link);
      button.textContent = "Copiado";
      setTimeout(() => {
        button.textContent = "Copiar";
      }, 1400);
    });
  });
}

function bindLinkTrackingControls() {
  linkTrackingList?.querySelectorAll(".copy-tracking-link-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const link = button.dataset.link || "";
      if (!link) {
        return;
      }

      await copyText(link);
      button.textContent = "Copiado";
      setTimeout(() => {
        button.textContent = "Copiar";
      }, 1400);
    });
  });
}

function bindCreatedExamPaginationControls() {
  createdExamsList?.querySelectorAll(".created-page-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const page = Number(button.dataset.page);
      if (!Number.isInteger(page) || page < 1) {
        return;
      }

      state.createdExamsPage = page;
      await renderCreatedExams();
    });
  });
}

function bindCreatedExamFilterControls() {
  const filters = [
    ["#createdExamEmailFilter", "email"],
    ["#createdExamDateFromFilter", "dateFrom"],
    ["#createdExamDateToFilter", "dateTo"],
  ];

  filters.forEach(([selector, key]) => {
    const input = document.querySelector(selector);
    if (!input) {
      return;
    }

    input.addEventListener("input", async () => {
      state.createdExamFilters[key] = input.value;
      state.createdExamsPage = 1;
      await renderCreatedExams();
      const nextInput = document.querySelector(selector);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.type !== "date") {
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      }
    });
  });

  document.querySelector("#clearCreatedExamFiltersButton")?.addEventListener("click", async () => {
    state.createdExamFilters = {
      email: "",
      dateFrom: "",
      dateTo: "",
    };
    state.createdExamsPage = 1;
    await renderCreatedExams();
    document.querySelector("#createdExamEmailFilter")?.focus();
  });
}

function renderNoSearchResultsRow(hasFilters) {
  return `
    <tr>
      <td class="empty-table-cell" colspan="6">
        ${hasFilters ? "No se encontraron exámenes con esos filtros." : "No hay exámenes para mostrar."}
      </td>
    </tr>
  `;
}

function renderCandidateRow(result, isSelected) {
  const candidateName = result.candidateName || "Candidato sin nombre";
  const candidateEmail = result.candidateEmail || "Sin correo";
  const finishedAt = result.finishedAt ? new Date(result.finishedAt).toLocaleString("es-MX") : "Sin fecha";
  const automaticScore = result.automaticScore ?? result.score ?? 0;
  const displayScore = getDisplayScore(result);
  const adjustedLabel = result.manualScore !== null && result.manualScore !== undefined ? "Ajustada" : "Sin ajuste";
  const answerCount = Array.isArray(result.evaluated) ? result.evaluated.length : 0;

  return `
    <tr class="${isSelected ? "selected" : ""}">
      <td>
        <strong>${escapeHtml(candidateName)}</strong>
        <small>${escapeHtml(candidateEmail)}</small>
        <small>${escapeHtml(result.id)}</small>
      </td>
      <td><span class="table-score">${displayScore}/100</span><small>${adjustedLabel}</small></td>
      <td>${automaticScore}/100</td>
      <td>${finishedAt}</td>
      <td>${answerCount}</td>
      <td>
        <div class="table-actions">
          <button class="secondary-button icon-button view-answer-button" type="button" data-result-id="${result.id}" aria-label="Ver examen" title="Ver examen">${getActionIcon("eye")}</button>
          <button class="danger-button icon-button delete-answer-button" type="button" data-result-id="${result.id}" data-candidate-name="${escapeHtml(candidateName)}" aria-label="Borrar examen" title="Borrar examen">${getActionIcon("trash")}</button>
        </div>
      </td>
    </tr>
  `;
}

function bindAnswerSearchControls() {
  const filters = [
    ["#answerSearchInput", "text"],
  ];
  const clearButton = document.querySelector("#clearAnswerSearchButton");

  filters.forEach(([selector, key]) => {
    const input = document.querySelector(selector);
    if (!input) {
      return;
    }

    input.addEventListener("input", async () => {
      state.answerFilters[key] = input.value;
      await renderSavedAnswers();
      const nextInput = document.querySelector(selector);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.type !== "date") {
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      }
    });
  });

  if (clearButton) {
    clearButton.addEventListener("click", async () => {
      state.answerFilters = {
        text: "",
      };
      await renderSavedAnswers();
      document.querySelector("#answerSearchInput")?.focus();
    });
  }
}

async function deleteResult(resultId) {
  const response = await fetchWithTimeout(`${location.origin}/api/results/${encodeURIComponent(resultId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  }, 9000);

  if (response.status === 401 || response.status === 403) {
    expireInterviewerSession(response.status === 403);
    throw new Error("Sesion expirada.");
  }

  if (!response.ok) {
    throw new Error("No se pudo borrar el examen.");
  }

  const history = getHistory().filter((result) => result.id !== resultId);
  localStorage.setItem("examHistory", JSON.stringify(history));
  const savedResult = localStorage.getItem("lastResult");
  if (savedResult && JSON.parse(savedResult).id === resultId) {
    localStorage.removeItem("lastResult");
    state.lastResult = null;
  }
}

function renderSavedAnswerDetail(result) {
  const currentUser = getCurrentInterviewerUser();
  const candidateName = result.candidateName || "Candidato sin nombre";
  const candidateEmail = result.candidateEmail || "Sin correo";
  const finishedAt = result.finishedAt ? new Date(result.finishedAt).toLocaleString("es-MX") : "Sin fecha";

  return `
    <article class="history-card" data-result-id="${result.id}">
      <div class="history-detail-heading">
        <div>
          <p class="eyebrow">Examen seleccionado</p>
          <h3>${escapeHtml(candidateName)} | ${getDisplayScore(result)}/100</h3>
          <p class="review-note">${escapeHtml(candidateEmail)}</p>
        </div>
        <div class="detail-heading-actions">
          <span class="status-pill">${result.evaluated.length} respuestas</span>
          <button class="ghost-button close-answer-detail-button" type="button">Cerrar</button>
        </div>
      </div>
      <p>Calificación automática: ${result.automaticScore ?? result.score}/100</p>
      <p>Finalizado: ${finishedAt}</p>
      ${result.securityReason ? `<p class="security-note">Finalización automática: ${escapeHtml(result.securityReason)}</p>` : ""}
      <div class="manual-score-panel">
        <div class="manual-score-grid">
          <label class="field">
            Persona que modifica
            <input class="reviewer-name-input" value="${escapeHtml(currentUser)}" readonly />
          </label>
          <label class="field">
            Calificación final
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

function bindCandidateTableControls() {
  const detailModal = answersList.querySelector(".answer-detail-modal");
  const closeDetailButton = answersList.querySelector(".close-answer-detail-button");
  if (closeDetailButton) {
    closeDetailButton.addEventListener("click", async () => {
      state.selectedHistoryId = null;
      await renderSavedAnswers();
    });
  }

  if (detailModal) {
    detailModal.addEventListener("click", async (event) => {
      if (event.target === detailModal) {
        state.selectedHistoryId = null;
        await renderSavedAnswers();
      }
    });
  }

  answersList.querySelectorAll(".view-answer-button").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedHistoryId = button.dataset.resultId;
      await renderSavedAnswers();
    });
  });

  answersList.querySelectorAll(".delete-answer-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const resultId = button.dataset.resultId;
      const candidateName = button.dataset.candidateName || "este candidato";

      if (!confirm(`Vas a borrar el examen de ${candidateName}. Esta acción también lo quitará de la base de datos. ¿Continuar?`)) {
        return;
      }

      button.disabled = true;
      button.setAttribute("aria-label", "Borrando examen");

      try {
        await deleteResult(resultId);
        if (state.selectedHistoryId === resultId) {
          state.selectedHistoryId = null;
        }
        await renderSavedAnswers();
        await renderResults();
      } catch (error) {
        console.error(error);
        alert("No se pudo borrar el examen. Intenta de nuevo.");
        button.disabled = false;
        button.setAttribute("aria-label", "Borrar examen");
      }
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

    card.querySelectorAll(".review-run-code-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const resultCard = button.closest(".result-card");
        const questionIndex = Number(resultCard.dataset.questionIndex);
        const item = result.evaluated[questionIndex];
        const output = resultCard.querySelector(".review-code-output");
        await runCodeTestsForAnswer(item, item.answer || "", output);
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
      answerKeyList.innerHTML = "<p>Inicia sesión para ver las respuestas correctas.</p>";
      return;
    }

    const answerKey = await response.json();
    answerKeyList.innerHTML = answerKey
    .map((question) => {
      const runner = getQuestionRunner(question);
      const correctAnswer =
        question.type === "closed"
          ? `${question.correctAnswer}) ${question.expected}`
          : question.expected;
      const solutionCode = question.solutionCode || question.SolutionCode || runner?.solutionCode || runner?.SolutionCode || "";

      return `
        <article class="result-card">
          <h3>${question.title}</h3>
          <div class="tag-row">
            <span class="tag">${question.area}</span>
            <span class="tag">${getQuestionTypeLabel(question)}</span>
            ${question.type === "code" ? `<span class="tag">Lenguaje: ${escapeHtml(getRunnerLanguage(runner))}</span>` : ""}
            <span class="tag">${question.points} pts</span>
          </div>
          <p><strong>Pregunta:</strong> ${question.prompt}</p>
          <p><strong>Respuesta correcta:</strong></p>
          <code>${escapeHtml(correctAnswer)}</code>
          ${question.type === "code" && solutionCode ? `
            <p><strong>Código de solución:</strong></p>
            <code>${escapeHtml(solutionCode)}</code>
          ` : ""}
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
        expireInterviewerSession(response.status === 403);
        return [];
      }
    } catch {
      console.warn("No se pudo leer el historial del servidor local.");
    }

    return [];
  }

  return getHistory();
}

function expireInterviewerSession(showIntruderAlert = false) {
  if (isCandidateLink) {
    return;
  }

  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  questionManagerModal?.classList.add("hidden");
  positionManagerModal?.classList.add("hidden");
  userManagerModal?.classList.add("hidden");
  openPositionManagerButton?.classList.remove("active");
  openUserManagerButton?.classList.remove("active");
  updateSessionBadge();
  loginScreen.classList.remove("hidden");
  loginError.textContent = "Tu sesión expiró. Inicia sesión.";
  loginError.classList.remove("login-error-lock");
  loginError.classList.remove("hidden");

  if (showIntruderAlert) {
    showIntruderAccessAlert();
  }
}

function showIntruderAccessAlert() {
  intruderAlert?.classList.remove("hidden");
  closeIntruderAlertButton?.focus();
  startIntruderAlarm();
}

function closeIntruderAccessAlert() {
  intruderAlert?.classList.add("hidden");
  stopIntruderAlarm();
}

function startIntruderAlarm() {
  stopIntruderAlarm();

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  intruderAudioContext = new AudioContextClass();
  let alarmStep = 0;
  const playBeep = () => {
    if (!intruderAudioContext) {
      return;
    }

    const now = intruderAudioContext.currentTime;
    const frequency = alarmStep % 2 === 0 ? 740 : 1180;
    alarmStep += 1;

    const oscillator = intruderAudioContext.createOscillator();
    const secondOscillator = intruderAudioContext.createOscillator();
    const gain = intruderAudioContext.createGain();
    oscillator.type = "square";
    secondOscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(frequency, now);
    secondOscillator.frequency.setValueAtTime(frequency * 1.5, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.34, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    oscillator.connect(gain);
    secondOscillator.connect(gain);
    gain.connect(intruderAudioContext.destination);
    oscillator.start();
    secondOscillator.start();
    oscillator.stop(now + 0.36);
    secondOscillator.stop(now + 0.36);
  };

  playBeep();
  intruderAlarmTimer = window.setInterval(playBeep, 390);
}

function stopIntruderAlarm() {
  if (intruderAlarmTimer) {
    window.clearInterval(intruderAlarmTimer);
    intruderAlarmTimer = null;
  }

  if (intruderAudioContext) {
    intruderAudioContext.close().catch(() => {});
    intruderAudioContext = null;
  }
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

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const temporaryInput = document.createElement("input");
  temporaryInput.value = value;
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.appendChild(temporaryInput);
  temporaryInput.select();
  document.execCommand("copy");
  temporaryInput.remove();
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
    if (!button.dataset.view) {
      return;
    }

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
    if (button.dataset.view === "createdExamsView") {
      await renderCreatedExams();
    }
    if (button.dataset.view === "linkTrackingView") {
      await renderLinkTracking();
    }
    if (button.dataset.view === "liveMonitorView") {
      await renderLiveMonitor();
    }
    if (button.dataset.view === "answerKeyView") {
      await renderAnswerKey();
    }
  });
});

document.querySelector("#createExamButton").addEventListener("click", () => {
  createExam("random");
});

createManualExamButton?.addEventListener("click", () => {
  createExam("manual");
});

copyGeneratedLinkButton?.addEventListener("click", async () => {
  const link = generatedExamLinkInput?.value || "";
  if (!link) {
    return;
  }

  await navigator.clipboard.writeText(link);
  copyGeneratedLinkButton.textContent = "Copiado";
  setTimeout(() => {
    copyGeneratedLinkButton.textContent = "Copiar";
  }, 1400);
});

backToCreateExamButton?.addEventListener("click", () => {
  showView("interviewerView");
});

startCandidateExamButton?.addEventListener("click", startCandidateExamFromIntro);

document.querySelector("#newExamShortcutButton")?.addEventListener("click", () => {
  showView("interviewerView");
});

openQuestionManagerButton?.addEventListener("click", openQuestionManagerModal);
closeQuestionManagerButton?.addEventListener("click", closeQuestionManagerModal);
questionManagerModal?.addEventListener("click", (event) => {
  if (event.target === questionManagerModal) {
    closeQuestionManagerModal();
  }
});
openPositionManagerButton?.addEventListener("click", openPositionManagerModal);
closePositionManagerButton?.addEventListener("click", closePositionManagerModal);
positionManagerModal?.addEventListener("click", (event) => {
  if (event.target === positionManagerModal) {
    closePositionManagerModal();
  }
});
openUserManagerButton?.addEventListener("click", openUserManagerModal);
closeUserManagerButton?.addEventListener("click", closeUserManagerModal);
userManagerModal?.addEventListener("click", (event) => {
  if (event.target === userManagerModal) {
    closeUserManagerModal();
  }
});
questionTypeInput?.addEventListener("change", toggleQuestionFormFields);
questionLanguageInput?.addEventListener("change", updateCodeQuestionLanguageGuide);
questionForm?.addEventListener("submit", saveQuestionFromForm);
positionForm?.addEventListener("submit", createPositionFromForm);
userForm?.addEventListener("submit", createUserFromForm);

function getPasswordEyeIcon(isVisible) {
  if (isVisible) {
    return `
      <svg class="password-eye-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l18 18"></path>
        <path d="M10.6 10.6A2.1 2.1 0 0 0 12 14.1c.6 0 1.1-.2 1.5-.6"></path>
        <path d="M9.9 5.8c.7-.2 1.4-.3 2.1-.3 6.2 0 9.9 6.5 9.9 6.5a17 17 0 0 1-2.7 3.4"></path>
        <path d="M6.4 7.1A17.8 17.8 0 0 0 2.1 12s3.7 6.5 9.9 6.5c1.5 0 2.8-.4 4-1"></path>
      </svg>
    `;
  }

  return `
    <svg class="password-eye-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M2.1 12s3.7-6.5 9.9-6.5S21.9 12 21.9 12s-3.7 6.5-9.9 6.5S2.1 12 2.1 12Z"></path>
      <circle cx="12" cy="12" r="2.8"></circle>
    </svg>
  `;
}

function updatePasswordToggleButton(isVisible) {
  if (!togglePasswordButton) return;
  togglePasswordButton.innerHTML = getPasswordEyeIcon(isVisible);
  const label = isVisible ? "Ocultar contrase\u00f1a" : "Mostrar contrase\u00f1a";
  togglePasswordButton.setAttribute("aria-label", label);
  togglePasswordButton.setAttribute("title", label);
}

togglePasswordButton?.addEventListener("click", () => {
  const shouldShowPassword = loginPassword.type === "password";
  loginPassword.type = shouldShowPassword ? "text" : "password";
  updatePasswordToggleButton(shouldShowPassword);
});

updatePasswordToggleButton(false);

closeIntruderAlertButton?.addEventListener("click", closeIntruderAccessAlert);
refreshLiveMonitorButton?.addEventListener("click", renderLiveMonitor);

document.querySelector("#copyLinkButton").addEventListener("click", async () => {
  const examLink = document.querySelector("#examLink");

  try {
    await copyText(examLink.value);

    document.querySelector("#copyLinkButton").textContent = "Copiado";
    setTimeout(() => {
      document.querySelector("#copyLinkButton").textContent = "Copiar";
    }, 1400);
  } catch {
    examLink.select();
    alert("No se pudo copiar automáticamente. El enlace ya quedó seleccionado para copiarlo con Ctrl + C.");
  }
});

document.querySelector("#finishExamButton").addEventListener("click", finishExam);

document.querySelector("#clearHistoryButton").addEventListener("click", async () => {
  const confirmed = await showClearHistoryConfirmation();

  if (!confirmed) {
    return;
  }

  localStorage.removeItem("examHistory");
  localStorage.removeItem("lastResult");
  state.lastResult = null;

  if (location.protocol.startsWith("http")) {
    try {
      const response = await fetchWithTimeout("/api/results", {
        method: "DELETE",
        headers: getAuthHeaders(),
      }, 9000);

      if (response.status === 401 || response.status === 403) {
        expireInterviewerSession(response.status === 403);
        return;
      }

      if (!response.ok) {
        alert("No se pudo limpiar el historial en la base de datos.");
        return;
      }
    } catch {
      alert("No se pudo conectar con la base de datos para limpiar el historial.");
      return;
    }
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
    sessionStorage.setItem(ROLE_KEY, session.role || "entrevistador");
    sessionStorage.setItem(TOKEN_KEY, session.token);
    loginUser.value = "";
    loginPassword.value = "";
    loginError.textContent = "Correo o contraseña incorrectos.";
    loginError.classList.remove("login-error-lock");
    loginError.classList.add("hidden");
    loginScreen.classList.add("hidden");
    applyRoleVisibility();
    await renderResults();
    await renderCreatedExams();
    await renderSavedAnswers();
    await renderAnswerKey();
    return;
  }

  const data = await response.json().catch(() => ({}));
  loginError.textContent = data.error || "No se pudo iniciar sesión. Verifica tus datos.";
  loginError.classList.toggle("login-error-lock", loginError.textContent.toLowerCase().includes("bloqueado"));
  loginError.classList.remove("hidden");
  if (loginError.textContent.toLowerCase().includes("correo")) {
    loginUser.select();
  } else {
    loginPassword.select();
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  updateSessionBadge();
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

function getCurrentInterviewerRole() {
  return sessionStorage.getItem(ROLE_KEY) || "entrevistador";
}

function isAdminUser() {
  return getCurrentInterviewerRole() === "admin";
}

function updateSessionBadge() {
  if (!modeLabel) {
    return;
  }

  if (isCandidateLink) {
    modeLabel.textContent = "Candidato";
    modeLabel.removeAttribute("title");
    if (sessionUserLabel) {
      sessionUserLabel.textContent = "";
    }
    return;
  }

  if (!hasInterviewerSession()) {
    modeLabel.textContent = "Sin sesión";
    modeLabel.removeAttribute("title");
    if (sessionUserLabel) {
      sessionUserLabel.textContent = "";
    }
    return;
  }

  const role = getRoleLabel(getCurrentInterviewerRole());
  const user = getCurrentInterviewerUser();
  modeLabel.textContent = role;
  modeLabel.title = user || role;
  if (sessionUserLabel) {
    sessionUserLabel.textContent = user || "";
  }
}

function applyRoleVisibility() {
  updateSessionBadge();
  document.querySelectorAll(".admin-nav-button").forEach((button) => {
    button.classList.toggle("hidden", !isAdminUser());
  });

  if (!isAdminUser()) {
    closeQuestionManagerModal();
    closePositionManagerModal();
    closeUserManagerModal();
    if (document.querySelector("#linkTrackingView")?.classList.contains("active")) {
      showView("interviewerView");
    }
    if (document.querySelector("#liveMonitorView")?.classList.contains("active")) {
      showView("interviewerView");
    }
  }
}

liveMonitorRefreshTimer = window.setInterval(() => {
  if (document.querySelector("#liveMonitorView")?.classList.contains("active") && isAdminUser()) {
    renderLiveMonitor();
  }
}, 1000);

async function initializeApp() {
  clearDeliveryLocalDataOnce();
  await loadQuestions();
  renderQuestionBank();
  toggleQuestionFormFields();
  protectInterviewerPanel();
  applyRoleVisibility();

  if (isCandidateLink) {
    document.body.classList.add("candidate-mode");
    const allowed = await claimCandidateLink();
    if (allowed) {
      showCandidateIntro();
    }
    return;
  }

  if (hasInterviewerSession()) {
    await renderResults();
    await renderCreatedExams();
    await renderSavedAnswers();
    await renderAnswerKey();
    if (isAdminUser()) {
      await renderLiveMonitor();
    }
  }

  renderExam();
}

initializeApp();



