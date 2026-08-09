/* =========================================================================
   data.js
   -------------------------------------------------------------------------
   Trước đây "cơ sở dữ liệu" của website được khai báo trực tiếp trong file
   này dưới dạng JSON thuần. Giờ dữ liệu được chuyển sang file Excel:

       assets/data/exercises.xlsx
         - Sheet "Subjects"  -> danh sách môn học
         - Sheet "Exercises" -> danh sách bài tập

   File này chỉ có nhiệm vụ TẢI và ĐỌC file Excel đó (bằng thư viện SheetJS,
   đã được nhúng qua CDN ở mỗi trang HTML, ngay trước thẻ <script> của file
   này), rồi dựng lại 2 mảng toàn cục "subjects" và "exercises" giống hệt
   cấu trúc cũ để các file common.js / home.js / subjects.js /
   subject-detail.js / exercise.js dùng lại mà không phải sửa gì nhiều.

   Vì việc đọc file là bất đồng bộ (fetch), các trang phải đợi dữ liệu tải
   xong trước khi render. Biến "window.dataReady" là một Promise sẽ resolve
   khi "subjects" và "exercises" đã có dữ liệu:

       window.dataReady.then(() => { ...render... });

   Lưu ý: cột "input"/"output" chỉ dùng để hiển thị VÍ DỤ cho học sinh xem trên
   trang chi tiết bài tập. Cột "test_input"/"test_output" là test case dùng
   RIÊNG để chấm điểm (so sánh với kết quả chạy thật), không hiển thị công khai.

   Muốn thêm/sửa/xoá môn học hoặc bài tập: mở file
   assets/data/exercises.xlsx bằng Excel, sửa trực tiếp trong 2 sheet rồi
   lưu lại (không cần sửa code).
   ========================================================================= */

// Đường dẫn tới file dữ liệu Excel
const DATA_FILE_URL = "assets/data/exercises.xlsx";

// Khai báo trước 2 mảng toàn cục, ban đầu rỗng - sẽ được điền sau khi tải xong
let subjects = [];
let exercises = [];

// Promise dùng chung: các file JS khác "await" hoặc ".then()" vào đây
// trước khi render bất cứ gì cần tới subjects/exercises.
window.dataReady = (async function loadDataFromExcel() {
  try {
    const res = await fetch(DATA_FILE_URL);
    if (!res.ok) throw new Error(`Không tải được file dữ liệu (HTTP ${res.status})`);
    const buffer = await res.arrayBuffer();

    // XLSX được nhúng qua CDN (xem thẻ <script> trong các file .html)
    const workbook = XLSX.read(buffer, { type: "array" });

    const subjectsSheet = workbook.Sheets["Subjects"];
    const exercisesSheet = workbook.Sheets["Exercises"];
    if (!subjectsSheet || !exercisesSheet) {
      throw new Error('File Excel phải có 2 sheet tên "Subjects" và "Exercises".');
    }

    const rawSubjects = XLSX.utils.sheet_to_json(subjectsSheet, { defval: "" });
    const rawExercises = XLSX.utils.sheet_to_json(exercisesSheet, { defval: "" });

    // Dựng lại mảng "subjects" đúng cấu trúc website đang dùng
    subjects.length = 0;
    rawSubjects.forEach((row) => {
      subjects.push({
        id: String(row.id).trim(),
        name: row.name,
        shortDesc: row.shortDesc,
        language: row.language,
        icon: row.icon,
        topics: String(row.topics || "")
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean)
      });
    });

    // Dựng lại mảng "exercises" - đã tinh gọn: KHÔNG còn estimatedTime,
    // tags, views. input/output có thể để trống, tự điền trong Excel.
    exercises.length = 0;
    rawExercises.forEach((row) => {
      exercises.push({
        id: String(row.id).trim(),
        subjectId: String(row.subjectId).trim(),
        title: row.title,
        description: row.description,
        difficulty: row.difficulty,
        topic: row.topic,
        language: row.language,
        updatedDate: row.updatedDate,
        content: {
          text: row.content_text || "",
          image: row.content_image || null
        },
        input: row.input || "",
        output: row.output || "",
        testInput: row.test_input || "",
        testOutput: row.test_output || ""
      });
    });

    document.dispatchEvent(new CustomEvent("cshub:dataReady"));
    return { subjects, exercises };
  } catch (err) {
    console.error("Lỗi khi tải dữ liệu từ Excel:", err);
    document.dispatchEvent(new CustomEvent("cshub:dataError", { detail: err }));
    throw err;
  }
})();
