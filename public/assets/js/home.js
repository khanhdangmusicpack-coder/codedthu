/* =========================================================================
   home.js - Logic riêng cho trang chủ (index.html)
   Đợi window.dataReady (tải xong từ assets/data/exercises.xlsx) trước khi
   render, vì dữ liệu giờ được đọc bất đồng bộ từ file Excel.
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  window.dataReady.then(() => {
    renderStats();
    renderHomeSubjects();
  });
});

// ---------------------------------------------------------------------
// 1) THẺ THỐNG KÊ TỔNG QUAN
// ---------------------------------------------------------------------
function renderStats() {
  const totalTopics = new Set(exercises.map((e) => e.topic)).size;
  const easyCount = exercises.filter((e) => e.difficulty === "Dễ").length;
  const mediumCount = exercises.filter((e) => e.difficulty === "Trung bình").length;
  const hardCount = exercises.filter((e) => e.difficulty === "Khó").length;

  const stats = [
    { icon: "fa-solid fa-book", value: subjects.length, label: "Môn học" },
    { icon: "fa-solid fa-list-check", value: exercises.length, label: "Bài tập" },
    { icon: "fa-solid fa-tags", value: totalTopics, label: "Chủ đề" },
    { icon: "fa-solid fa-chart-simple", value: `${easyCount}/${mediumCount}/${hardCount}`, label: "Dễ / TB / Khó" }
  ];

  document.getElementById("statsGrid").innerHTML = stats.map((s) => `
    <div class="stat-card">
      <div class="stat-icon"><i class="${s.icon}"></i></div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join("");
}

// ---------------------------------------------------------------------
// 2) MÔN HỌC NỔI BẬT (6 môn đầu tiên)
// ---------------------------------------------------------------------
function renderHomeSubjects() {
  const preview = subjects.slice(0, 6);
  document.getElementById("homeSubjectGrid").innerHTML = preview.map(renderSubjectCard).join("");
}

