/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: HỆ THỐNG THU THẬP & XUẤT BÀI THI CHIẾN THUẬT PCCC & CNCH
 * ==============================================================================
 * ĐẶC TÍNH MỚI:
 * 1. Tự động ghi vào SHEET ĐẦU TIÊN (Index 0) của bảng tính đang mở.
 * 2. Phục vụ cho nhiều đợt thi khác nhau (thí sinh thi đợt nào sẽ ghi tiếp vào sheet đầu).
 * 3. Hỗ trợ hàm doGet() xuất danh sách kết quả dạng JSON để Trang In Báo Cáo lấy dữ liệu.
 * ==============================================================================
 */

function getTargetSheet() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss) {
    // Dự phòng: Mở theo ID nếu chạy dưới dạng standalone script
    var backupIds = [
      "1po8arMgeze1sxLTTXm_jYbqkjv7_9ZVJ9Fyi0VyWkIg",
      "14aH8ZmbpAA0wQaScg7mcA6qpA1cR6aVdmSVbR61n8Mg"
    ];
    for (var i = 0; i < backupIds.length; i++) {
      try {
        ss = SpreadsheetApp.openById(backupIds[i]);
        if (ss) break;
      } catch (err) {}
    }
  }

  if (!ss) {
    throw new Error("Không tìm thấy bảng tính Google Sheet tương ứng!");
  }

  // YÊU CẦU: LUÔN LẤY SHEET ĐẦU TIÊN (TAB ĐẦU TIÊN)
  var sheets = ss.getSheets();
  return sheets[0];
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Khóa 10s tránh xung đột ghi đồng thời khi nhiều người nộp cùng lúc

  try {
    var sheet = getTargetSheet();

    // Nếu sheet đầu tiên chưa có dòng tiêu đề thì khởi tạo
    if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === "") {
      var headers = [
        "Dấu thời gian",
        "Họ và tên",
        "Đơn vị",
        "Cấp bậc / Chức vụ",
        "Mã đề thi",
        "Tên bộ đề",
        "Điểm Trắc nghiệm (câu)",
        "Điểm Trắc nghiệm (thang 10)",
        "Thời gian làm bài",
        "Bài làm Tự luận Câu 1",
        "Điểm Tự luận 1",
        "Bài làm Tự luận Câu 2",
        "Điểm Tự luận 2",
        "Tổng điểm chung",
        "Xếp loại",
        "Nhận xét của Giám khảo"
      ];
      sheet.appendRow(headers);
      
      // Định dạng dòng tiêu đề trang trọng
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#b91c1c");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Đọc payload JSON từ web gửi sang
    var data = JSON.parse(e.postData.contents);

    var rowData = [
      data.timestamp || new Date().toLocaleString("vi-VN"),
      data.fullName || "",
      data.unit || "",
      data.rank || "",
      data.examCode || "",
      data.examName || "",
      data.mcqScoreText || "",
      data.mcqScoreTenScale || 0,
      data.duration || "",
      data.essay1 || "",
      "", // Điểm Tự luận 1 (Giám khảo chấm sau)
      data.essay2 || "",
      "", // Điểm Tự luận 2 (Giám khảo chấm sau)
      "", // Công thức Tổng điểm hoặc điền sau
      "", // Xếp loại
      ""  // Nhận xét
    ];

    sheet.appendRow(rowData);

    // Trả về JSON thông báo thành công
    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: "success", 
        message: "Đã ghi nhận bài thi thành công vào sheet đầu tiên của bảng tính",
        sheetName: sheet.getName()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Xuất dữ liệu toàn bộ thí sinh trong sheet đầu tiên ra định dạng JSON
 * Giúp trang in kết quả (trang_in_ket_qua.html) tải danh sách bài thi tự động
 */
function doGet(e) {
  try {
    var sheet = getTargetSheet();
    var values = sheet.getDataRange().getValues();

    if (!values || values.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", count: 0, sheetName: sheet.getName(), data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = values[0];
    var results = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      // Nếu dòng trống cả họ tên lẫn thời gian thì bỏ qua
      if (!row[0] && !row[1]) continue;

      results.push({
        stt: i,
        timestamp: row[0] ? String(row[0]) : "",
        fullName: row[1] ? String(row[1]) : "",
        unit: row[2] ? String(row[2]) : "",
        rank: row[3] ? String(row[3]) : "",
        examCode: row[4] ? String(row[4]) : "",
        examName: row[5] ? String(row[5]) : "",
        mcqScoreText: row[6] ? String(row[6]) : "",
        mcqScoreTenScale: row[7] ? String(row[7]) : "0",
        duration: row[8] ? String(row[8]) : "",
        essay1: row[9] ? String(row[9]) : "",
        essayScore1: row[10] ? String(row[10]) : "",
        essay2: row[11] ? String(row[11]) : "",
        essayScore2: row[12] ? String(row[12]) : "",
        totalScore: row[13] ? String(row[13]) : "",
        grade: row[14] ? String(row[14]) : "",
        remarks: row[15] ? String(row[15]) : ""
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success", 
        sheetName: sheet.getName(),
        count: results.length, 
        data: results 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
