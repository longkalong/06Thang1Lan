/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: HỆ THỐNG THU THẬP & XUẤT KẾT QUẢ THI PCCC & CNCH
 * ==============================================================================
 * CẬP NHẬT MỚI NHẤT THEO YÊU CẦU:
 * 1. LUÔN GHI VÀO SHEET ĐẦU TIÊN (Index 0 - Tab ngoài cùng bên trái của file Google Sheet).
 *    -> Tuyệt đối không tạo hay chuyển sang sheet tên "KetQuaThi".
 * 2. THÊM 20 CỘT TRẮC NGHIỆM: TN1, TN2, ..., TN20
 *    -> Mỗi ô có định dạng "A|B" (Đáp án đúng | Đáp án thí sinh chọn).
 *    -> Giám khảo nhìn vào biết ngay câu nào đúng (hai chữ giống nhau: A|A), câu nào sai (A|B, B|D) hoặc bỏ trống (A|-).
 * 3. TỰ LUẬN ĐỐI CHIẾU TRỰC TIẾP TRÊN SHEET:
 *    -> Gồm Câu hỏi Tự luận 1, Bài làm của thí sinh, Đáp án chuẩn gạch đầu dòng (- ý 1, - ý 2...).
 *    -> Gồm Câu hỏi Tự luận 2, Bài làm của thí sinh, Đáp án chuẩn gạch đầu dòng.
 *    -> Kèm sẵn các cột Điểm TL1, Điểm TL2, Tổng điểm chung, Xếp loại, Nhận xét.
 * 4. HÀM doGet() xuất dữ liệu JSON phục vụ Trang In Kết Quả Giám Khảo.
 * ==============================================================================
 */

// Hàm lấy sheet đầu tiên của bảng tính
function getTargetSheet() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss) {
    // Dự phòng: Mở theo ID nếu script chạy ở dạng Standalone (độc lập)
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

  // YÊU CẦU BẮT BUỘC: LUÔN LẤY SHEET ĐẦU TIÊN (TAB ĐẦU TIÊN BÊN TRÁI)
  var sheets = ss.getSheets();
  return sheets[0];
}

// Xử lý nộp bài thi (POST từ web)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Khóa 10s tránh xung đột khi nhiều người nộp cùng một lúc

  try {
    var sheet = getTargetSheet();

    // Định nghĩa danh sách tiêu đề cột chuẩn
    var headers = [
      "Dấu thời gian",
      "Họ và tên",
      "Đơn vị",
      "Cấp bậc / Chức vụ",
      "Mã đề thi",
      "Tên bộ đề",
      "Thời gian làm bài",
      "Điểm Trắc nghiệm (/20)",
      "Điểm Trắc nghiệm (Thang 10)"
    ];

    // Thêm 20 cột viết tắt TN1..TN20 theo đúng yêu cầu
    for (var i = 1; i <= 20; i++) {
      headers.push("TN" + i);
    }

    // Thêm các cột Tự luận đối chiếu và chấm điểm
    headers.push("Câu hỏi Tự luận 1");
    headers.push("Bài làm Tự luận 1 (Thí sinh)");
    headers.push("Đáp án chuẩn Tự luận 1 (Gạch đầu dòng)");
    headers.push("Điểm TL1");
    headers.push("Câu hỏi Tự luận 2");
    headers.push("Bài làm Tự luận 2 (Thí sinh)");
    headers.push("Đáp án chuẩn Tự luận 2 (Gạch đầu dòng)");
    headers.push("Điểm TL2");
    headers.push("Tổng điểm chung");
    headers.push("Xếp loại");
    headers.push("Nhận xét của Giám khảo");

    // Khởi tạo dòng tiêu đề nếu sheet trống hoặc chưa có cột TN1
    if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === "") {
      sheet.appendRow(headers);
      formatHeader(sheet, headers.length);
    } else if (sheet.getLastRow() <= 1 && sheet.getRange(1, 10).getValue() !== "TN1") {
      // Nếu sheet mới có dòng tiêu đề cũ (chưa có TN1), cập nhật ngay thành dòng tiêu đề mới
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeader(sheet, headers.length);
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
      data.duration || "",
      data.mcqScoreText || "",
      data.mcqScoreTenScale || 0
    ];

    // Thêm 20 câu trắc nghiệm TN1..TN20 dạng A|B (Đáp án đúng|Đáp án thí sinh)
    var tn = data.tnAnswers || [];
    for (var j = 0; j < 20; j++) {
      rowData.push(tn[j] || "-|-");
    }

    // Thêm các cột tự luận (Câu hỏi, bài làm thí sinh, đáp án chuẩn gạch đầu dòng)
    rowData.push(data.tl1Question || "");
    rowData.push(data.tl1UserAnswer || data.essay1 || "");
    rowData.push(data.tl1KeyPoints || "");
    rowData.push(""); // Điểm TL1 (Giám khảo chấm)
    rowData.push(data.tl2Question || "");
    rowData.push(data.tl2UserAnswer || data.essay2 || "");
    rowData.push(data.tl2KeyPoints || "");
    rowData.push(""); // Điểm TL2 (Giám khảo chấm)
    rowData.push(""); // Tổng điểm chung
    rowData.push(""); // Xếp loại
    rowData.push(""); // Nhận xét

    sheet.appendRow(rowData);

    // Căn chỉnh hàng dữ liệu vừa thêm
    var lastRow = sheet.getLastRow();
    // Căn giữa cột Dấu thời gian, Mã đề, Thời gian làm, Điểm và 20 cột TN1..TN20
    sheet.getRange(lastRow, 5, 1, 25).setHorizontalAlignment("center");
    // Tự động ngắt dòng (Wrap text) cho các cột Tự luận
    sheet.getRange(lastRow, 30, 1, 8).setWrap(true);

    // Trả về JSON xác nhận thành công
    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: "success", 
        message: "Đã ghi nhận bài thi thành công vào sheet đầu tiên của bảng tính",
        sheetName: sheet.getName(),
        row: lastRow
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

// Định dạng dòng tiêu đề chuyên nghiệp
function formatHeader(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground("#b91c1c"); // Đỏ đô nhận diện CAND
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setWrap(true);
  sheet.setRowHeight(1, 40);
  sheet.setFrozenRows(1);
}

// Xuất danh sách kết quả cho Trang In
function doGet(e) {
  try {
    var sheet = getTargetSheet();
    var values = sheet.getDataRange().getDisplayValues();

    if (!values || values.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", count: 0, sheetName: sheet.getName(), data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var results = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (!row[0] && !row[1]) continue;

      if (row.length >= 30) {
        // Cấu trúc mới (có 20 cột TN1..TN20)
        var tnList = [];
        for (var t = 9; t < 29; t++) {
          tnList.push(row[t] ? String(row[t]) : "");
        }

        results.push({
          stt: i,
          timestamp: row[0] ? String(row[0]) : "",
          fullName: row[1] ? String(row[1]) : "",
          unit: row[2] ? String(row[2]) : "",
          rank: row[3] ? String(row[3]) : "",
          examCode: row[4] ? String(row[4]) : "",
          examName: row[5] ? String(row[5]) : "",
          duration: row[6] ? String(row[6]) : "",
          mcqScoreText: row[7] ? String(row[7]) : "",
          mcqScoreTenScale: row[8] ? String(row[8]) : "0",
          tnAnswers: tnList,
          tl1Question: row[29] ? String(row[29]) : "",
          essay1: row[30] ? String(row[30]) : "",
          tl1KeyPoints: row[31] ? String(row[31]) : "",
          essayScore1: row[32] ? String(row[32]) : "",
          tl2Question: row[33] ? String(row[33]) : "",
          essay2: row[34] ? String(row[34]) : "",
          tl2KeyPoints: row[35] ? String(row[35]) : "",
          essayScore2: row[36] ? String(row[36]) : "",
          totalScore: row[37] ? String(row[37]) : "",
          grade: row[38] ? String(row[38]) : "",
          remarks: row[39] ? String(row[39]) : ""
        });
      } else {
        // Cấu trúc cũ (16 cột)
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
