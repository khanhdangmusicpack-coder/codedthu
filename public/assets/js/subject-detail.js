/* =========================================================================
   subject-detail.js - Logic cho trang subject-detail.html (?id=...)
   Đợi window.dataReady (tải xong từ assets/data/exercises.xlsx) trước khi
   render, vì dữ liệu giờ được đọc bất đồng bộ từ file Excel.
   ========================================================================= */

const PER_PAGE = 6;
let currentPage = 1;
let currentSubject = null;

document.addEventListener("DOMContentLoaded", () => {
  window.dataReady.then(() => {
    const params = new URLSearchParams(location.search);
    const subjectId = params.get("id");
    currentSubject = getSubjectById(subjectId);

    if (!currentSubject) {
      // Không tìm thấy môn học -> quay lại danh sách môn học
      document.querySelector("main").innerHTML = `
        <div class="container" style="padding:60px 0;text-align:center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;color:var(--gray-300);"></i>
          <p style="color:var(--gray-500);margin-top:10px;">Không tìm thấy môn học yêu cầu.</p>
          <a class="btn btn-primary" href="subjects.html" style="margin-top:14px;">Quay lại danh sách môn học</a>
        </div>`;
      return;
    }

    renderSubjectHeader();
    initTopicOptions();
    initFilterEvents();
    applyExerciseFilters();
  });
});

// ---------------------------------------------------------------------
// HEADER: THÔNG TIN MÔN HỌC
// ---------------------------------------------------------------------
function renderSubjectHeader() {
  document.title = `${currentSubject.name} - CS Exercise Hub`;
  document.getElementById("breadcrumbSubject").textContent = currentSubject.name;

  const count = getExercisesBySubject(currentSubject.id).length;

  document.getElementById("subjectDetailTop").innerHTML = `
    <div class="detail-icon"><i class="${currentSubject.icon}"></i></div>
    <div>
      <h1>${currentSubject.name}</h1>
      <p class="detail-desc">${currentSubject.shortDesc}</p>
      <div class="detail-meta-row">
        <span><i class="fa-solid fa-code"></i> ${currentSubject.language}</span>
        <span><i class="fa-solid fa-list-check"></i> ${count} bài tập</span>
      </div>
    </div>
  `;

  document.getElementById("subjectInfoGrid").innerHTML = `
    <div class="info-box"><div class="info-label">Ngôn ngữ</div><div class="info-value">${currentSubject.language}</div></div>
  `;
}

// ---------------------------------------------------------------------
// BỘ LỌC: điền option chủ đề dựa theo bài tập của môn này
// ---------------------------------------------------------------------
function initTopicOptions() {
  const topics = [...new Set(getExercisesBySubject(currentSubject.id).map((e) => e.topic))];
  const select = document.getElementById("fTopic");
  topics.forEach((t) => select.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`));
}

function initFilterEvents() {
  document.getElementById("fSearch").addEventListener("input", debounce(() => { currentPage = 1; applyExerciseFilters(); }, 200));
  document.getElementById("fTopic").addEventListener("change", () => { currentPage = 1; applyExerciseFilters(); });
  document.getElementById("sortSelect").addEventListener("change", () => { currentPage = 1; applyExerciseFilters(); });

  document.querySelectorAll("#fDifficulty .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#fDifficulty .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentPage = 1;
      applyExerciseFilters();
    });
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("fSearch").value = "";
    document.getElementById("fTopic").value = "";
    document.getElementById("sortSelect").value = "name";
    document.querySelectorAll("#fDifficulty .chip").forEach((c) => c.classList.remove("active"));
    document.querySelector('#fDifficulty .chip[data-value=""]').classList.add("active");
    currentPage = 1;
    applyExerciseFilters();
  });
}

// ---------------------------------------------------------------------
// ÁP DỤNG LỌC + SẮP XẾP + PHÂN TRANG
// ---------------------------------------------------------------------
function applyExerciseFilters() {
  const search = document.getElementById("fSearch").value.trim().toLowerCase();
  const difficulty = document.querySelector("#fDifficulty .chip.active").getAttribute("data-value");
  const topic = document.getElementById("fTopic").value;
  const sortBy = document.getElementById("sortSelect").value;

  let result = getExercisesBySubject(currentSubject.id).filter((ex) => {
    const matchSearch = !search || ex.title.toLowerCase().includes(search) || ex.description.toLowerCase().includes(search);
    const matchDiff = !difficulty || ex.difficulty === difficulty;
    const matchTopic = !topic || ex.topic === topic;
    return matchSearch && matchDiff && matchTopic;
  });

  const diffOrder = { "Dễ": 0, "Trung bình": 1, "Khó": 2 };
  if (sortBy === "name") result.sort((a, b) => a.title.localeCompare(b.title, "vi"));
  else if (sortBy === "difficulty") result.sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);
  else if (sortBy === "newest") result.sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate));

  document.getElementById("resultCount").textContent = `${result.length} bài tập`;

  const grid = document.getElementById("exerciseGrid");
  const empty = document.getElementById("emptyState");

  if (result.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  grid.style.display = "grid";
  empty.style.display = "none";

  const pageItems = paginate(result, currentPage, PER_PAGE);
  grid.innerHTML = pageItems.map((ex) => renderExerciseCard(ex, { showSubject: false })).join("");

  renderPagination(document.getElementById("pagination"), result.length, PER_PAGE, currentPage, (page) => {
    currentPage = page;
    applyExerciseFilters();
    window.scrollTo({ top: document.querySelector(".toolbar").offsetTop - 100, behavior: "smooth" });
  });
}
