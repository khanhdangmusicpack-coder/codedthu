/* =========================================================================
   server.js
   Server DUY NHẤT cho CodeDthu: vừa phục vụ giao diện web (thư mục public/),
   vừa làm backend nhận code từ trình duyệt -> gửi sang JDoodle Compiler API
   (dịch vụ chạy code có free tier, cần đăng ký clientId/clientSecret) ->
   trả về stdout/stderr cho frontend hiển thị.

   Gộp chung 1 server như vậy để khi deploy chỉ cần 1 dịch vụ, 1 địa chỉ URL
   duy nhất (không cần deploy frontend và backend ở 2 nơi khác nhau).

   LƯU Ý QUAN TRỌNG:
   Trước đây backend dùng Piston API (miễn phí, không cần đăng ký), nhưng
   Piston đã ngừng mở public API miễn phí từ 15/02/2026 (yêu cầu xin token
   riêng, không cấp cho đồ án sinh viên). Vì vậy đã chuyển sang JDoodle
   Compiler API - có free plan ~200 lượt gọi/ngày, đủ dùng để demo/báo cáo.

   Chuẩn bị trước khi chạy:
     1) Đăng ký tài khoản tại https://www.jdoodle.com
     2) Vào mục "Compiler API" -> Subscribe gói Free -> lấy Client ID & Client Secret
     3) Local (chạy trên máy mình): tạo file .env (cùng cấp với server.js):
          JDOODLE_CLIENT_ID=xxxxxxxxxxxx
          JDOODLE_CLIENT_SECRET=xxxxxxxxxxxx
        Khi deploy lên host công khai (vd Render): khai báo 2 biến này trong
        phần "Environment Variables" của host, KHÔNG commit vào code để
        tránh lộ khoá.

   Chạy:
     npm install
     npm start
   Mặc định lắng nghe ở http://localhost:3787 - mở địa chỉ này bằng trình
   duyệt là thấy ngay giao diện web (không cần mở file HTML riêng).
   ========================================================================= */

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3787;
const JDOODLE_EXECUTE_URL = "https://api.jdoodle.com/v1/execute";
const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID || "";
const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET || "";

app.use(cors());                       // vô hại khi gộp chung, giữ lại phòng khi tách domain sau này
app.use(express.json({ limit: "2mb" })); // code nộp lên thường rất nhỏ, 2mb là dư sức

// Phục vụ toàn bộ giao diện web (index.html, assets/...) từ thư mục public/
app.use(express.static(path.join(__dirname, "public")));

// -------------------------------------------------------------------------
// MAP: "language" trong data.js (tên môn) -> mã ngôn ngữ + versionIndex JDoodle
// (tra cứu tại https://www.jdoodle.com/docs/compiler-apis/supported-languages-versions/)
// -------------------------------------------------------------------------
const LANGUAGE_MAP = {
  "C":          { language: "c",      versionIndex: "7", label: "GCC 15.2.1" },
  "C++":        { language: "cpp17",  versionIndex: "3", label: "C++17 - GCC 15.2.1" },
  "Java":       { language: "java",   versionIndex: "6", label: "JDK 25.0.2" },
  "Python":     { language: "python3",versionIndex: "6", label: "Python 3.14.3" },
  "C#":         { language: "csharp", versionIndex: "6", label: ".NET 10.0" },
  "JavaScript": { language: "nodejs", versionIndex: "7", label: "Node.js 25.8.1" }
  // "SQL", "HTML/CSS", "Lý thuyết": không phải ngôn ngữ có thể "chạy" theo
  // kiểu biên dịch/thực thi -> xử lý riêng, trả lỗi thân thiện phía dưới.
};

// -------------------------------------------------------------------------
// GET /api/health - kiểm tra backend còn sống
// -------------------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "cs-exercise-hub-backend",
    jdoodleConfigured: Boolean(JDOODLE_CLIENT_ID && JDOODLE_CLIENT_SECRET)
  });
});

// -------------------------------------------------------------------------
// GET /api/languages - liệt kê ngôn ngữ backend hỗ trợ chạy (để debug)
// -------------------------------------------------------------------------
app.get("/api/languages", (req, res) => {
  res.json({ supported: Object.keys(LANGUAGE_MAP) });
});

// -------------------------------------------------------------------------
// POST /api/run
// body: { subjectLanguage, code, stdin }
//   - subjectLanguage: giá trị exercise.language / subject.language trong data.js (vd "Python")
//   - code: nội dung file bài làm (dạng text)
//   - stdin: dữ liệu nhập vào chương trình khi chạy (tuỳ chọn)
// -------------------------------------------------------------------------
app.post("/api/run", async (req, res) => {
  try {
    const { subjectLanguage, code, stdin } = req.body || {};

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, error: "Thiếu nội dung code cần chạy." });
    }

    if (!JDOODLE_CLIENT_ID || !JDOODLE_CLIENT_SECRET) {
      return res.status(200).json({
        success: false,
        error: "Backend chưa được cấu hình JDOODLE_CLIENT_ID / JDOODLE_CLIENT_SECRET. Xem hướng dẫn ở đầu file server.js."
      });
    }

    const mapping = LANGUAGE_MAP[subjectLanguage];
    if (!mapping) {
      return res.status(200).json({
        success: false,
        unsupported: true,
        error: `Môn học ngôn ngữ "${subjectLanguage || "không xác định"}" hiện chưa hỗ trợ chạy code trực tiếp (chỉ hỗ trợ: ${Object.keys(LANGUAGE_MAP).join(", ")}).`
      });
    }

    let jdoodleRes;
    try {
      jdoodleRes = await fetch(JDOODLE_EXECUTE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: JDOODLE_CLIENT_ID,
          clientSecret: JDOODLE_CLIENT_SECRET,
          script: code,
          stdin: stdin || "",
          language: mapping.language,
          versionIndex: mapping.versionIndex
        })
      });
    } catch (networkErr) {
      return res.status(502).json({
        success: false,
        error: `Không gọi được JDoodle API (lỗi mạng): ${networkErr.message}`
      });
    }

    let data;
    try {
      data = await jdoodleRes.json();
    } catch (parseErr) {
      return res.status(502).json({
        success: false,
        error: `JDoodle trả về phản hồi không hợp lệ (HTTP ${jdoodleRes.status}).`
      });
    }

    if (!jdoodleRes.ok) {
      // Các mã lỗi thường gặp: 401 (sai clientId/clientSecret), 429 (hết quota 200 lượt/ngày)
      let hint = "";
      if (jdoodleRes.status === 401) hint = " (kiểm tra lại JDOODLE_CLIENT_ID/JDOODLE_CLIENT_SECRET)";
      if (jdoodleRes.status === 429) hint = " (có thể đã dùng hết 200 lượt gọi miễn phí trong ngày)";
      return res.status(502).json({
        success: false,
        error: `JDoodle trả về lỗi HTTP ${jdoodleRes.status}${hint}: ${data && data.error ? data.error : JSON.stringify(data)}`
      });
    }

    // data dạng: { output, statusCode, memory, cpuTime, error, isCompiled, isExecutionSuccess, compilationStatus }
    const ranOk = data.isExecutionSuccess !== false && !data.error;

    return res.json({
      success: true,
      language: mapping.language,
      version: mapping.label,
      compile: null, // JDoodle không tách riêng bước biên dịch, gộp vào "run"
      run: {
        stdout: ranOk ? (data.output || "") : "",
        stderr: ranOk ? "" : (data.output || data.error || "Chương trình chạy lỗi nhưng không có thông tin chi tiết."),
        code: ranOk ? 0 : 1
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Lỗi server nội bộ khi chạy code." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ CS Exercise Hub backend đang chạy tại http://localhost:${PORT}`);
  if (!JDOODLE_CLIENT_ID || !JDOODLE_CLIENT_SECRET) {
    console.warn("⚠️  Chưa cấu hình JDOODLE_CLIENT_ID / JDOODLE_CLIENT_SECRET trong file .env — /api/run sẽ báo lỗi cho tới khi cấu hình.");
  }
});
