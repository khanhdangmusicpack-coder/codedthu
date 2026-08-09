/* =========================================================================
   exercise.js - Logic cho trang exercise.html (?id=...)
   Chạy code THẬT qua backend (server.js -> JDoodle API).
   ========================================================================= */

// server.js phục vụ chung cả giao diện web lẫn API /api/run trên CÙNG một
// địa chỉ, nên để rỗng là gọi đúng domain hiện tại - không cần chỉnh khi deploy.
const API_BASE_URL = "";

document.addEventListener("DOMContentLoaded", () => {
  window.dataReady.then(() => {
    const params = new URLSearchParams(location.search);
    const exerciseId = params.get("id");
    const exercise = getExerciseById(exerciseId);

    if (!exercise) {
      document.getElementById("exerciseContent").innerHTML = `
        <div style="padding:40px 0;text-align:center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;color:var(--gray-300);"></i>
          <p style="color:var(--gray-500);margin-top:10px;">Không tìm thấy bài tập yêu cầu.</p>
          <a class="btn btn-primary" href="subjects.html" style="margin-top:14px;">Quay lại danh sách môn học</a>
        </div>`;
      return;
    }

    renderBreadcrumb(exercise);
    renderExerciseContent(exercise);
  });
});

function renderBreadcrumb(exercise) {
  const subject = getSubjectById(exercise.subjectId);
  document.getElementById("exerciseBreadcrumb").innerHTML = `
    <a href="index.html">Trang chủ</a><span class="sep">/</span>
    <a href="subjects.html">Môn học</a><span class="sep">/</span>
    <a href="subject-detail.html?id=${subject.id}">${subject.name}</a><span class="sep">/</span>
    <span>${exercise.title}</span>
  `;
}

function renderExerciseContent(exercise) {
  const subject = getSubjectById(exercise.subjectId);
  const content = exercise.content || { text: exercise.description || "", image: null };
  const inputText = exercise.input || "Chưa có ví dụ dữ liệu đầu vào.";
  const outputText = exercise.output || "Chưa có ví dụ dữ liệu đầu ra.";

  document.getElementById("exerciseContent").innerHTML = `
    <div class="detail-top" style="margin-bottom:10px;">
      <div class="detail-icon"><i class="${subject.icon}"></i></div>
      <div style="flex-grow:1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <h1 style="margin:0 0 6px;">${exercise.title}</h1>
        </div>
        <p class="detail-desc">${exercise.description}</p>
        <div class="detail-meta-row">
          <span class="badge-diff ${difficultyClass(exercise.difficulty)}">${exercise.difficulty}</span>
          <span><i class="fa-solid fa-book"></i> <a href="subject-detail.html?id=${subject.id}">${subject.name}</a></span>
          <span><i class="fa-solid fa-code"></i> ${exercise.language}</span>
          <span><i class="fa-solid fa-tag"></i> ${exercise.topic}</span>
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box"><div class="info-label">Ngày cập nhật</div><div class="info-value"><i class="fa-regular fa-calendar" style="color:var(--blue-500);"></i> ${formatDate(exercise.updatedDate)}</div></div>
    </div>

    <div class="panel" style="margin-bottom:20px;">
      <h3 style="margin-top:0;font-size:1rem;">Nội dung bài tập</h3>
      <p style="font-size:.9rem;line-height:1.7;color:var(--gray-700);margin:0;">${content.text}</p>
      ${content.image ? `<img src="${content.image}" alt="Minh hoạ bài tập" style="width:100%;border-radius:10px;margin-top:14px;display:block;">` : ""}
    </div>

    <h3 style="margin:0 0 10px;font-size:1rem;color:var(--gray-700);">Ví dụ:</h3>
    <div class="io-row" style="margin-bottom:20px;">
      <div class="panel">
        <h3 style="margin-top:0;font-size:1rem;"><i class="fa-solid fa-right-to-bracket" style="color:var(--blue-500);"></i> Input</h3>
        <p style="font-size:.86rem;line-height:1.6;color:var(--gray-700);margin:0;">${inputText}</p>
      </div>
      <div class="panel">
        <h3 style="margin-top:0;font-size:1rem;"><i class="fa-solid fa-right-from-bracket" style="color:var(--blue-500);"></i> Output</h3>
        <p style="font-size:.86rem;line-height:1.6;color:var(--gray-700);margin:0;">${outputText}</p>
      </div>
    </div>

    <div class="io-row" style="margin-bottom:20px;align-items:start;">
      <div class="panel">
        <h3 style="margin-top:0;font-size:1rem;"><i class="fa-solid fa-cloud-arrow-up" style="color:var(--blue-500);"></i> Nộp file bài làm</h3>
        <div class="code-dropzone" id="codeDropzone">
          <input type="file" id="codeFileInput" hidden>
          <i class="fa-solid fa-file-arrow-up code-dropzone-icon"></i>
          <p class="code-dropzone-text">Kéo thả file code vào đây, hoặc <span class="code-dropzone-link">chọn file</span></p>
          <p class="code-dropzone-filename" id="selectedFileName"></p>
        </div>

        <button class="btn btn-primary btn-block" id="runTestsBtn" style="margin-top:14px;" disabled>
          <i class="fa-solid fa-play"></i> Chạy &amp; chấm bài
        </button>
      </div>

      <div class="panel" id="testResultsPanel">
        <h3 style="margin-top:0;font-size:1rem;"><i class="fa-solid fa-terminal" style="color:var(--blue-500);"></i> Kết quả thực thi</h3>
        <div id="testResultsSummary" class="test-summary"></div>
        <div id="outputSection" style="margin-top:10px;">
          <p style="font-size:.85rem;color:var(--gray-500);margin:0;">Chưa có kết quả. Hãy chọn file bài làm và bấm "Chạy &amp; chấm bài" để xem kết quả chấm tại đây.</p>
        </div>
      </div>
    </div>
  `;

  initCodeSubmission(exercise);
}

// ---------------------------------------------------------------------
// NỘP FILE BÀI LÀM (kéo thả) + CHẠY CODE THẬT qua backend
// ---------------------------------------------------------------------
function initCodeSubmission(exercise) {
  const dropzone = document.getElementById("codeDropzone");
  const fileInput = document.getElementById("codeFileInput");
  const fileNameEl = document.getElementById("selectedFileName");
  const runBtn = document.getElementById("runTestsBtn");
  let selectedFile = null;

  function setSelectedFile(file) {
    if (!file) return;
    selectedFile = file;
    fileNameEl.innerHTML = `<i class="fa-solid fa-file-code"></i> ${file.name} <span class="code-dropzone-filesize">(${formatFileSize(file.size)})</span>`;
    dropzone.classList.add("has-file");
    runBtn.disabled = false;
    document.getElementById("testResultsSummary").innerHTML = "";
    document.getElementById("outputSection").innerHTML = `<p style="font-size:.85rem;color:var(--gray-500);margin:0;">Đã chọn file "${file.name}". Bấm "Chạy & chấm bài" để xem kết quả.</p>`;
  }

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => setSelectedFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "dragend"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  });

  runBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    runBtn.disabled = true;
    runBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang chấm...`;

    try {
      const code = await selectedFile.text();
      const stdin = exercise.testInput || "";
      const result = await runCodeOnBackend(exercise, code, stdin);
      renderExecutionResult(result, selectedFile, exercise);
    } catch (err) {
      renderExecutionError(err);
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<i class="fa-solid fa-play"></i> Chạy & chấm bài`;
    }
  });
}

// Gọi backend /api/run
async function runCodeOnBackend(exercise, code, stdin) {
  const res = await fetch(`${API_BASE_URL}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subjectLanguage: exercise.language,
      code,
      stdin
    })
  });

  if (!res.ok && res.status !== 200) {
    throw new Error(`Backend trả về lỗi HTTP ${res.status}`);
  }
  return res.json();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Chuẩn hoá chuỗi để so sánh khi chấm bài: bỏ qua khoảng trắng đầu/cuối dòng,
// nhiều khoảng trắng liên tiếp, và dòng trắng thừa ở đầu/cuối.
function normalizeForCompare(str) {
  return String(str ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------
// HIỂN THỊ KẾT QUẢ THỰC THI THẬT (stdout / stderr / lỗi biên dịch)
// ---------------------------------------------------------------------
function renderExecutionResult(result, file, exercise) {
  const panel = document.getElementById("testResultsPanel");
  const summary = document.getElementById("testResultsSummary");
  const outputSection = document.getElementById("outputSection");

  panel.style.display = "block";

  if (!result.success) {
    summary.innerHTML = `
      <span class="test-summary-badge fail">
        <i class="fa-solid fa-circle-exclamation"></i> Không thể chạy
      </span>
      <span class="test-summary-file"><i class="fa-solid fa-file-code"></i> ${file.name}</span>
    `;
    outputSection.innerHTML = `<pre style="white-space:pre-wrap;color:var(--red-600,#dc2626);">${escapeHtml(result.error || "Đã xảy ra lỗi không xác định.")}</pre>`;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  const compile = result.compile;
  const run = result.run;
  const compileFailed = compile && compile.code !== 0;
  const ranOk = !compileFailed && run && run.code === 0;
  const hasExpectedOutput = Boolean(exercise.testOutput && String(exercise.testOutput).trim());

  let passed = null;
  if (ranOk && hasExpectedOutput) {
    passed = normalizeForCompare(run.stdout) === normalizeForCompare(exercise.testOutput);
  }

  // ----- Badge trạng thái -----
  let badgeClass = "fail";
  let badgeIcon = "fa-circle-exclamation";
  let badgeText = "";

  if (compileFailed) {
    badgeText = "Lỗi biên dịch";
  } else if (!ranOk) {
    badgeText = `Thoát với mã lỗi ${run.code}`;
  } else if (!hasExpectedOutput) {
    badgeClass = "ok";
    badgeIcon = "fa-circle-check";
    badgeText = "Chạy thành công (bài chưa có test case để chấm)";
  } else if (passed) {
    badgeClass = "ok";
    badgeIcon = "fa-circle-check";
    badgeText = "Đạt";
  } else {
    badgeClass = "fail";
    badgeIcon = "fa-circle-xmark";
    badgeText = "Không đạt";
  }

  summary.innerHTML = `
    <span class="test-summary-badge ${badgeClass}">
      <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
    </span>
    <span class="test-summary-file"><i class="fa-solid fa-file-code"></i> ${file.name} · ${result.language} ${result.version}</span>
  `;

  let html = "";

  if (compileFailed) {
    html += `
      <h4 style="font-size:.85rem;margin:10px 0 4px;">Lỗi biên dịch</h4>
      <pre style="white-space:pre-wrap;color:var(--red-600,#dc2626);background:var(--gray-50,#f8f9fb);padding:10px;border-radius:8px;font-size:.8rem;">${escapeHtml(compile.stderr || compile.output || "")}</pre>
    `;
  } else if (hasExpectedOutput) {
    // Chấm theo cặp input/output mẫu: hiển thị chi tiết từng phần
    const actualBorder = ranOk
      ? (passed ? "1px solid var(--green-600, #1a9e63)" : "1px solid var(--red-600, #d8434a)")
      : "1px solid var(--gray-300)";

    html += `
      <h4 style="font-size:.85rem;margin:10px 0 4px;">Input dùng để chấm</h4>
      <pre style="white-space:pre-wrap;background:var(--gray-50,#f8f9fb);padding:10px;border-radius:8px;font-size:.8rem;min-height:24px;">${escapeHtml(exercise.testInput) || "<em style='color:var(--gray-400)'>(không có input)</em>"}</pre>

      <div class="io-row" style="margin-top:10px;">
        <div>
          <h4 style="font-size:.85rem;margin:0 0 4px;">Kết quả mong đợi</h4>
          <pre style="white-space:pre-wrap;background:var(--gray-50,#f8f9fb);padding:10px;border-radius:8px;font-size:.8rem;min-height:24px;">${escapeHtml(exercise.testOutput)}</pre>
        </div>
        <div>
          <h4 style="font-size:.85rem;margin:0 0 4px;">Kết quả thực tế (stdout)</h4>
          <pre style="white-space:pre-wrap;background:var(--gray-50,#f8f9fb);padding:10px;border-radius:8px;font-size:.8rem;min-height:24px;border:${actualBorder};">${escapeHtml(run.stdout) || "<em style='color:var(--gray-400)'>(không có output)</em>"}</pre>
        </div>
      </div>
    `;
    if (run.stderr) {
      html += `
        <h4 style="font-size:.85rem;margin:10px 0 4px;">Stderr</h4>
        <pre style="white-space:pre-wrap;color:var(--red-600,#dc2626);background:var(--gray-50,#f8f9fb);padding:10px;border-radius:8px;font-size:.8rem;">${escapeHtml(run.stderr)}</pre>
      `;
    }
  } else {
    // Bài chưa có output mẫu -> chỉ hiển thị kết quả chạy như trước
    html += `
      <h4 style="font-size:.85rem;margin:10px 0 4px;">Stdout (đầu ra chương trình)</h4>
      <pre style="white-space:pre-wrap;background:var(--gray-50,#f8f9fb);padding:10px;border-radius:8px;font-size:.8rem;min-height:24px;">${escapeHtml(run.stdout) || "<em style='color:var(--gray-400)'>(không có output)</em>"}</pre>
    `;
    if (run.stderr) {
      html += `
        <h4 style="font-size:.85rem;margin:10px 0 4px;">Stderr</h4>
        <pre style="white-space:pre-wrap;color:var(--red-600,#dc2626);background:var(--gray-50,#f8f9fb);padding:10px;border-radius:8px;font-size:.8rem;">${escapeHtml(run.stderr)}</pre>
      `;
    }
  }

  outputSection.innerHTML = html;
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderExecutionError(err) {
  const panel = document.getElementById("testResultsPanel");
  const summary = document.getElementById("testResultsSummary");
  const outputSection = document.getElementById("outputSection");

  panel.style.display = "block";
  summary.innerHTML = `
    <span class="test-summary-badge fail">
      <i class="fa-solid fa-plug-circle-xmark"></i> Không kết nối được backend
    </span>
  `;
  outputSection.innerHTML = `
    <p style="font-size:.85rem;color:var(--gray-600);margin:0;">
      Không gọi được backend. Nếu đang chạy trên máy mình, hãy chắc chắn bạn đã chạy
      <code>npm start</code> ở thư mục gốc dự án (server đang lắng nghe ở cổng 3787).
    </p>
    <pre style="white-space:pre-wrap;color:var(--red-600,#dc2626);margin-top:8px;">${escapeHtml(err.message)}</pre>
  `;
}
