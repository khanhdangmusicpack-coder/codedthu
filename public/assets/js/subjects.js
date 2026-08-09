/* =========================================================================
   subjects.js - Logic cho trang subjects.html
   Hiển thị + lọc + sắp xếp danh sách môn học
   Đợi window.dataReady (tải xong từ assets/data/exercises.xlsx) trước khi
   render, vì dữ liệu giờ được đọc bất đồng bộ từ file Excel.
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  window.dataReady.then(() => {
    initSubjectFilterOptions();
    initSubjectFilterEvents();
    applySubjectFilters();
  });
});

// ---------------------------------------------------------------------
// DANH SÁCH MÔN HỌC
// ---------------------------------------------------------------------
function initSubjectFilterOptions() {
  const languages = [...new Set(subjects.map((s) => s.language))].sort();

  const langSelect = document.getElementById("fLanguage");
  languages.forEach((lang) => {
    langSelect.insertAdjacentHTML("beforeend", `<option value="${lang}">${lang}</option>`);
  });
}

function initSubjectFilterEvents() {
  document.getElementById("fSearch").addEventListener("input", debounce(applySubjectFilters, 200));
  document.getElementById("fLanguage").addEventListener("change", applySubjectFilters);
  document.getElementById("sortSelect").addEventListener("change", applySubjectFilters);

  document.getElementById("resetSubjectFilters").addEventListener("click", () => {
    document.getElementById("fSearch").value = "";
    document.getElementById("fLanguage").value = "";
    document.getElementById("sortSelect").value = "name";
    applySubjectFilters();
  });
}

function applySubjectFilters() {
  const search = document.getElementById("fSearch").value.trim().toLowerCase();
  const language = document.getElementById("fLanguage").value;
  const sortBy = document.getElementById("sortSelect").value;

  let result = subjects.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search) || s.shortDesc.toLowerCase().includes(search);
    const matchLang = !language || s.language === language;
    return matchSearch && matchLang;
  });

  if (sortBy === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  } else if (sortBy === "exercises") {
    result.sort((a, b) => getExercisesBySubject(b.id).length - getExercisesBySubject(a.id).length);
  }

  document.getElementById("resultCount").textContent = `${result.length} môn học`;

  const grid = document.getElementById("subjectGrid");
  const empty = document.getElementById("emptyState");

  if (result.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
  } else {
    grid.style.display = "grid";
    empty.style.display = "none";
    grid.innerHTML = result.map(renderSubjectCard).join("");
  }
}
