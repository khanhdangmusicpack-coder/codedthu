/* =========================================================================
   common.js
   Các hàm dùng chung cho TẤT CẢ các trang: dark mode, menu mobile,
   back-to-top, LocalStorage (lịch sử xem), tìm kiếm nhanh,
   render thẻ môn học / bài tập, phân trang...
   ========================================================================= */

// ---------------------------------------------------------------------
// LOCALSTORAGE KEYS
// ---------------------------------------------------------------------
const LS_KEYS = {
  THEME: "cshub_theme"
};

// ---------------------------------------------------------------------
// DARK MODE
// ---------------------------------------------------------------------
function initDarkMode() {
  const saved = localStorage.getItem(LS_KEYS.THEME) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateDarkModeIcon(saved);

  const btn = document.getElementById("darkModeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(LS_KEYS.THEME, next);
      updateDarkModeIcon(next);
    });
  }
}

function updateDarkModeIcon(theme) {
  const icon = document.querySelector("#darkModeToggle i");
  if (!icon) return;
  icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

// ---------------------------------------------------------------------
// MOBILE MENU
// ---------------------------------------------------------------------
function initMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
}

// ---------------------------------------------------------------------
// BACK TO TOP
// ---------------------------------------------------------------------
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 400);
  });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ---------------------------------------------------------------------
// HÀM KHỞI TẠO CHUNG - gọi ở mọi trang sau khi DOM đã sẵn sàng
// Phần không phụ thuộc dữ liệu (subjects/exercises) chạy ngay; phần tìm
// kiếm header cần dữ liệu nên đợi window.dataReady tải xong từ Excel.
// ---------------------------------------------------------------------
function initCommonUI() {
  initDarkMode();
  initMobileMenu();
  initBackToTop();
  highlightActiveNav();
  window.dataReady.then(initHeaderSearch).catch(() => {});
}

// ---------------------------------------------------------------------
// Gạch chân link nav đang active dựa theo tên file hiện tại
// ---------------------------------------------------------------------
function highlightActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === current) a.classList.add("active");
  });
}

// ---------------------------------------------------------------------
// TIỆN ÍCH CHUNG
// ---------------------------------------------------------------------

// debounce: trì hoãn việc gọi hàm để tránh gọi liên tục khi gõ phím
function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getSubjectById(id) {
  return subjects.find((s) => s.id === id);
}

function getExerciseById(id) {
  return exercises.find((e) => e.id === id);
}

function getExercisesBySubject(subjectId) {
  return exercises.filter((e) => e.subjectId === subjectId);
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function difficultyClass(level) {
  if (level === "Dễ") return "easy";
  if (level === "Trung bình") return "medium";
  return "hard";
}

// ---------------------------------------------------------------------
// RENDER: THẺ MÔN HỌC
// ---------------------------------------------------------------------
function renderSubjectCard(subject) {
  const count = getExercisesBySubject(subject.id).length;
  return `
    <article class="subject-card">
      <div class="subject-card-top">
        <div class="subject-icon"><i class="${subject.icon}"></i></div>
        <div>
          <h3>${subject.name}</h3>
        </div>
      </div>
      <p class="subject-desc">${subject.shortDesc}</p>
      <div class="subject-meta">
        <span><i class="fa-solid fa-code"></i> ${subject.language}</span>
      </div>
      <div class="subject-card-footer">
        <span class="exercise-count-badge">${count} bài tập</span>
        <a class="btn btn-primary btn-sm" href="subject-detail.html?id=${subject.id}">
          Xem bài tập <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    </article>
  `;
}

// ---------------------------------------------------------------------
// RENDER: THẺ BÀI TẬP (đã tinh gọn: bỏ thời gian dự kiến, lượt xem, nhãn)
// ---------------------------------------------------------------------
function renderExerciseCard(ex, opts = {}) {
  const subject = getSubjectById(ex.subjectId);
  const showSubject = opts.showSubject !== false;
  return `
    <article class="exercise-card" data-id="${ex.id}">
      <div class="exercise-card-top">
        <h4><a href="exercise.html?id=${ex.id}">${ex.title}</a></h4>
      </div>
      <p class="ex-desc">${ex.description}</p>
      <div class="exercise-meta">
        <span class="badge-diff ${difficultyClass(ex.difficulty)}">${ex.difficulty}</span>
        <span><i class="fa-solid fa-tag"></i> ${ex.topic}</span>
      </div>
      <div class="exercise-card-footer">
        ${showSubject ? `<a class="subject-pill" href="subject-detail.html?id=${subject.id}">${subject.name}</a>` : `<span></span>`}
        <span style="font-size:.74rem;color:var(--gray-500)"><i class="fa-regular fa-calendar"></i> ${formatDate(ex.updatedDate)}</span>
      </div>
    </article>
  `;
}

// ---------------------------------------------------------------------
// PHÂN TRANG (Pagination)
// ---------------------------------------------------------------------
function paginate(array, page, perPage) {
  const start = (page - 1) * perPage;
  return array.slice(start, start + perPage);
}

function renderPagination(container, totalItems, perPage, currentPage, onPageChange) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  let html = `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button data-page="${p}" class="${p === currentPage ? "active" : ""}">${p}</button>`;
  }
  html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}><i class="fa-solid fa-chevron-right"></i></button>`;
  container.innerHTML = html;
  container.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.getAttribute("data-page"));
      if (page >= 1 && page <= totalPages) onPageChange(page);
    });
  });
}

// ---------------------------------------------------------------------
// TÌM KIẾM NHANH TRÊN HEADER (hiển thị dropdown kết quả ngay khi gõ)
// ---------------------------------------------------------------------
function initHeaderSearch() {
  const input = document.getElementById("headerSearchInput");
  const panel = document.getElementById("headerSearchResults");
  const clearBtn = document.getElementById("headerSearchClear");
  if (!input || !panel) return;

  const doSearch = debounce((query) => {
    query = query.trim().toLowerCase();
    clearBtn.style.display = query ? "block" : "none";
    if (!query) {
      panel.classList.remove("open");
      panel.innerHTML = "";
      return;
    }

    const matchedExercises = exercises.filter((ex) =>
      ex.title.toLowerCase().includes(query) ||
      ex.topic.toLowerCase().includes(query) ||
      getSubjectById(ex.subjectId).name.toLowerCase().includes(query)
    ).slice(0, 6);

    const matchedSubjects = subjects.filter((s) =>
      s.name.toLowerCase().includes(query)
    ).slice(0, 3);

    if (matchedExercises.length === 0 && matchedSubjects.length === 0) {
      panel.innerHTML = `<div class="search-empty">Không tìm thấy kết quả cho "${query}"</div>`;
      panel.classList.add("open");
      return;
    }

    let html = "";
    matchedSubjects.forEach((s) => {
      html += `<div class="search-result-item" onclick="location.href='subject-detail.html?id=${s.id}'">
        <div><div class="sr-title"><i class="fa-solid fa-book" style="color:var(--blue-600);margin-right:6px;"></i>${s.name}</div>
        <div class="sr-meta">Môn học · ${getExercisesBySubject(s.id).length} bài tập</div></div>
      </div>`;
    });
    matchedExercises.forEach((ex) => {
      const subject = getSubjectById(ex.subjectId);
      html += `<div class="search-result-item" onclick="location.href='exercise.html?id=${ex.id}'">
        <div><div class="sr-title">${ex.title}</div>
        <div class="sr-meta">${subject.name} · ${ex.topic}</div></div>
        <span class="badge-diff ${difficultyClass(ex.difficulty)}">${ex.difficulty}</span>
      </div>`;
    });
    panel.innerHTML = html;
    panel.classList.add("open");
  }, 200);

  input.addEventListener("input", (e) => doSearch(e.target.value));
  input.addEventListener("focus", (e) => { if (e.target.value) doSearch(e.target.value); });
  clearBtn.addEventListener("click", () => {
    input.value = "";
    panel.classList.remove("open");
    clearBtn.style.display = "none";
    input.focus();
  });

  // Đóng dropdown khi click ra ngoài
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) panel.classList.remove("open");
  });
}

// Chạy khởi tạo chung khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", initCommonUI);
