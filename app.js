const TOTAL_PROVAS = 15;
const testSelect = document.getElementById("test-select");
const questionsContainer = document.getElementById("questions-container");
const finishBtn = document.getElementById("finish-btn");
const resultDiv = document.getElementById("result");
const statusDiv = document.getElementById("status");

let currentTest = null;
let answerKey = null;
const localData = window.SIMULADO_DATA || null;

function showStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.classList.toggle("error", isError);
  statusDiv.classList.remove("hidden");
}

function clearEvaluation() {
  finishBtn.classList.add("hidden");
  resultDiv.classList.add("hidden");
  resultDiv.replaceChildren();
  questionsContainer.replaceChildren();
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${url}.`);
  }
  return response.json();
}

function renderQuestions(questions) {
  questions.forEach((question) => {
    const questionDiv = document.createElement("section");
    questionDiv.className = "question";
    questionDiv.dataset.questionNumber = question.number;

    const text = document.createElement("div");
    text.className = "question-text";
    const number = document.createElement("strong");
    number.textContent = `${question.number}. `;
    text.append(number, document.createTextNode(question.text));
    questionDiv.appendChild(text);

    const options = document.createElement("div");
    options.className = "options";
    question.options.forEach((option) => {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q${question.number}`;
      radio.value = option.label;
      label.append(radio, document.createTextNode(` ${option.label}) ${option.text}`));
      options.appendChild(label);
    });
    questionDiv.appendChild(options);
    questionsContainer.appendChild(questionDiv);
  });
}

async function selectTest(testId) {
  clearEvaluation();
  currentTest = null;
  if (!testId) {
    statusDiv.classList.add("hidden");
    return;
  }

  showStatus("Carregando prova...");
  try {
    const data = localData ? localData.provas[testId] : await loadJson(`data/provas/prova-${testId}.json`);
    currentTest = data;
    if (!data.questions.length) {
      showStatus(`O arquivo da Prova ${testId} foi criado, mas os enunciados não estavam estruturados no HTML original.`);
      return;
    }
    renderQuestions(data.questions);
    showStatus(`${data.questions.length} questões carregadas para a Prova ${testId}.`);
    finishBtn.classList.remove("hidden");
  } catch (error) {
    showStatus("Falha ao carregar a prova. Abra a página por um servidor local para permitir a leitura dos arquivos JSON.", true);
  }
}

function finishTest() {
  if (!currentTest || !answerKey) {
    showStatus("O gabarito ainda não foi carregado. Recarregue a página e tente novamente.", true);
    return;
  }

  const answers = answerKey[currentTest.prova];
  if (!answers || answers.length !== currentTest.questions.length) {
    showStatus("Não foi encontrado um gabarito compatível para esta prova.", true);
    return;
  }

  let correctCount = 0;
  for (const question of currentTest.questions) {
    const questionDiv = questionsContainer.querySelector(`[data-question-number="${question.number}"]`);
    const selected = questionDiv.querySelector("input:checked");
    const expected = answers[question.number - 1];
    const feedback = document.createElement("div");
    feedback.className = "feedback";
    if (selected && selected.value === expected) {
      correctCount++;
      questionDiv.classList.add("correct");
      feedback.textContent = "Acertou!";
    } else if (!selected) {
      questionDiv.classList.add("incorrect");
      feedback.textContent = `Não respondida. Resposta correta: ${expected}`;
    } else {
      questionDiv.classList.add("incorrect");
      feedback.textContent = `Errou! Resposta correta: ${expected}`;
    }
    questionDiv.appendChild(feedback);
    questionDiv.querySelectorAll("input").forEach((input) => {
      input.disabled = true;
    });
  }

  const total = currentTest.questions.length;
  const score = ((correctCount / total) * 10).toFixed(2).replace(".", ",");
  resultDiv.innerHTML = `<p>Você acertou <strong>${correctCount}</strong> de <strong>${total}</strong> questões.</p>
    <p>Erros: <strong>${total - correctCount}</strong></p>
    <p>Nota final: <strong>${score}</strong></p>`;
  resultDiv.classList.remove("hidden");
  finishBtn.classList.add("hidden");
  showStatus("Simulado finalizado.");
}

async function initialize() {
  for (let n = 1; n <= TOTAL_PROVAS; n++) {
    const id = String(n).padStart(2, "0");
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `Prova ${id}`;
    testSelect.appendChild(option);
  }

  if (localData) {
    answerKey = localData.gabarito;
    return;
  }

  try {
    answerKey = await loadJson("data/gabarito.json");
  } catch (error) {
    showStatus("Não foi possível carregar o gabarito.", true);
  }
}

testSelect.addEventListener("change", (event) => selectTest(event.target.value));
finishBtn.addEventListener("click", finishTest);
initialize();
