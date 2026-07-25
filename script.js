const questionsContainer = document.getElementById("questionsContainer");
const questionTemplate = document.getElementById("questionTemplate");
const preview = document.getElementById("worksheetPreview");

const titleInput = document.getElementById("worksheetTitle");
const subtitleInput = document.getElementById("worksheetSubtitle");
const watermarkInput = document.getElementById("watermarkText");
const nameLabelInput = document.getElementById("nameLabel");
const dateLabelInput = document.getElementById("dateLabel");
const includeAnswerKeyInput = document.getElementById("includeAnswerKey");

document.getElementById("addQuestionBtn").addEventListener("click", () => addQuestion());
document.getElementById("previewBtn").addEventListener("click", renderPreview);
document.getElementById("printBtn").addEventListener("click", () => {
  renderPreview();
  window.print();
});
document.getElementById("downloadPdfBtn").addEventListener("click", downloadPdf);

[titleInput, subtitleInput, watermarkInput, nameLabelInput, dateLabelInput, includeAnswerKeyInput].forEach((element) => {
  element.addEventListener("input", renderPreview);
  element.addEventListener("change", renderPreview);
});

function addQuestion(data = {}) {
  const fragment = questionTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".question-card");
  const questionText = fragment.querySelector(".question-text");
  const answerInputs = [...fragment.querySelectorAll(".answer-text")];
  const correctRadios = [...fragment.querySelectorAll(".correct-answer")];

  const uniqueName = `correct-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  correctRadios.forEach((radio) => {
    radio.name = uniqueName;
  });

  questionText.value = data.question || "";
  answerInputs.forEach((input, index) => {
    input.value = data.answers?.[index] || "";
  });

  if (Number.isInteger(data.correctIndex) && correctRadios[data.correctIndex]) {
    correctRadios[data.correctIndex].checked = true;
  }

  card.querySelector(".remove-question-button").addEventListener("click", () => {
    card.remove();
    renumberQuestions();
    renderPreview();
  });

  card.querySelectorAll("input, textarea").forEach((element) => {
    element.addEventListener("input", renderPreview);
    element.addEventListener("change", renderPreview);
  });

  questionsContainer.appendChild(fragment);
  renumberQuestions();
  renderPreview();
}

function renumberQuestions() {
  [...questionsContainer.querySelectorAll(".question-card")].forEach((card, index) => {
    card.querySelector(".question-number").textContent = index + 1;
  });
}

function getQuestions() {
  return [...questionsContainer.querySelectorAll(".question-card")].map((card) => {
    const answers = [...card.querySelectorAll(".answer-text")].map((input) => input.value.trim());
    const checked = card.querySelector(".correct-answer:checked");

    return {
      question: card.querySelector(".question-text").value.trim(),
      answers,
      correctIndex: checked ? Number(checked.value) : null
    };
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;"
    };
    return entities[character];
  });
}

function makeWatermarkDataUrl(text) {
  if (!text) return "none";

  const safeText = escapeXml(text);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="250" viewBox="0 0 360 250">
      <text x="180" y="125"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-42 180 125)"
        font-family="Arial, Helvetica, sans-serif"
        font-size="27"
        font-weight="400"
        letter-spacing="1"
        fill="#c9cdd3"
        fill-opacity="0.42">${safeText}</text>
    </svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function applyPreviewWatermark() {
  const watermark = watermarkInput.value.trim();
  preview.style.backgroundImage = makeWatermarkDataUrl(watermark);
  preview.style.backgroundSize = watermark ? "360px 250px" : "auto";
}

function renderPreview() {
  applyPreviewWatermark();

  const title = titleInput.value.trim() || "Multiple Choice Worksheet";
  const subtitle = subtitleInput.value.trim();
  const nameLabel = nameLabelInput.value.trim() || "Name";
  const dateLabel = dateLabelInput.value.trim() || "Date";
  const questions = getQuestions();
  const letters = ["A", "B", "C", "D"];

  const completedQuestions = questions.filter(
    (item) => item.question || item.answers.some(Boolean)
  );

  const subtitleHtml = subtitle
    ? `<div class="preview-subtitle">${escapeHtml(subtitle)}</div>`
    : "";

  const studentLinesHtml = `
    <div class="student-lines">
      <div class="student-line">${escapeHtml(nameLabel)}:</div>
      <div class="student-line">${escapeHtml(dateLabel)}:</div>
    </div>
  `;

  if (!completedQuestions.length) {
    preview.innerHTML = `
      <h1 class="preview-title">${escapeHtml(title)}</h1>
      ${subtitleHtml}
      ${studentLinesHtml}
      <p class="empty-preview">Add a question to begin building the worksheet.</p>
    `;
    return;
  }

  const questionHtml = completedQuestions.map((item, index) => {
    const answersHtml = item.answers.map((answer, answerIndex) => `
      <div class="preview-answer">${letters[answerIndex]}. ${escapeHtml(answer || "________________________")}</div>
    `).join("");

    return `
      <section class="preview-question">
        <p class="preview-question-text">${index + 1}. ${escapeHtml(item.question || "________________________")}</p>
        <div class="preview-answers">${answersHtml}</div>
      </section>
    `;
  }).join("");

  let answerKeyHtml = "";
  if (includeAnswerKeyInput.checked) {
    const keyItems = completedQuestions.map((item, index) => {
      const answer = item.correctIndex === null ? "—" : letters[item.correctIndex];
      return `<div>${index + 1}. ${answer}</div>`;
    }).join("");

    answerKeyHtml = `
      <section class="answer-key">
        <h2>Answer Key</h2>
        <div class="answer-key-list">${keyItems}</div>
      </section>
    `;
  }

  preview.innerHTML = `
    <h1 class="preview-title">${escapeHtml(title)}</h1>
    ${subtitleHtml}
    ${studentLinesHtml}
    ${questionHtml}
    ${answerKeyHtml}
  `;
}

function validateForPdf(questions) {
  if (!questions.length) {
    alert("Please add at least one question before downloading the PDF.");
    return false;
  }

  const hasIncompleteQuestion = questions.some(
    (item) => !item.question || item.answers.some((answer) => !answer)
  );

  if (hasIncompleteQuestion) {
    return confirm("Some questions or answers are blank. Download the PDF anyway?");
  }

  return true;
}

function downloadPdf() {
  const questions = getQuestions().filter(
    (item) => item.question || item.answers.some(Boolean)
  );

  if (!validateForPdf(questions)) return;

  if (!window.jspdf) {
    alert("The PDF library could not be loaded. Please check your internet connection or use Print / Save as PDF.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const usableWidth = pageWidth - margin * 2;
  const letters = ["A", "B", "C", "D"];
  const watermark = watermarkInput.value.trim();
  let y = 58;

  const drawWatermark = () => {
    if (!watermark) return;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(22);
    doc.setTextColor(220, 223, 228);

    const horizontalGap = 245;
    const verticalGap = 175;

    for (let row = -1; row * verticalGap < pageHeight + verticalGap; row += 1) {
      const rowOffset = row % 2 === 0 ? 0 : horizontalGap / 2;
      for (let x = -120 + rowOffset; x < pageWidth + 180; x += horizontalGap) {
        const watermarkLines = doc.splitTextToSize(watermark, 220);
        doc.text(watermarkLines, x, row * verticalGap + 90, { angle: 42, align: "center" });
      }
    }

    doc.setTextColor(0, 0, 0);
  };

  const addPage = () => {
    doc.addPage();
    drawWatermark();
    y = 58;
  };

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - margin) addPage();
  };

  const drawTitleAndStudentLines = () => {
    const title = titleInput.value.trim() || "Multiple Choice Worksheet";
    const subtitle = subtitleInput.value.trim();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const titleLines = doc.splitTextToSize(title, usableWidth);
    doc.text(titleLines, pageWidth / 2, y, { align: "center" });
    y += titleLines.length * 22 + 8;

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const subtitleLines = doc.splitTextToSize(subtitle, usableWidth);
      doc.text(subtitleLines, pageWidth / 2, y, { align: "center" });
      y += subtitleLines.length * 15 + 14;
    } else {
      y += 12;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const nameLabel = nameLabelInput.value.trim() || "Name";
    const dateLabel = dateLabelInput.value.trim() || "Date";

    doc.text(`${nameLabel}:`, margin, y);
    doc.line(margin + 38, y + 2, pageWidth / 2 + 35, y + 2);
    doc.text(`${dateLabel}:`, pageWidth / 2 + 55, y);
    doc.line(pageWidth / 2 + 88, y + 2, pageWidth - margin, y + 2);
    y += 34;
  };

  drawWatermark();
  drawTitleAndStudentLines();

  questions.forEach((item, questionIndex) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);

    const questionLines = doc.splitTextToSize(
      `${questionIndex + 1}. ${item.question || "________________________"}`,
      usableWidth
    );

    const answerLineSets = item.answers.map((answer, answerIndex) =>
      doc.splitTextToSize(
        `${letters[answerIndex]}. ${answer || "________________________"}`,
        usableWidth - 28
      )
    );

    const neededHeight =
      questionLines.length * 15 +
      answerLineSets.reduce((sum, lines) => sum + lines.length * 14 + 5, 0) +
      18;

    ensureSpace(neededHeight);

    doc.text(questionLines, margin, y);
    y += questionLines.length * 15 + 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    answerLineSets.forEach((lines) => {
      doc.text(lines, margin + 20, y);
      y += lines.length * 14 + 5;
    });

    y += 10;
  });

  if (includeAnswerKeyInput.checked) {
    addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Answer Key", pageWidth / 2, y, { align: "center" });
    y += 32;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    questions.forEach((item, index) => {
      ensureSpace(20);
      const answer = item.correctIndex === null ? "—" : letters[item.correctIndex];
      doc.text(`${index + 1}. ${answer}`, margin, y);
      y += 18;
    });
  }

  const safeTitle = (titleInput.value.trim() || "worksheet")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  doc.save(`${safeTitle || "worksheet"}.pdf`);
}

// Start with an empty worksheet.
renderPreview();
