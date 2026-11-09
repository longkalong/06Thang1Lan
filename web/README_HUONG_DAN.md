# HƯỚNG DẪN SỬ DỤNG VÀ VẬN HÀNH HỆ THỐNG KIỂM TRA PCCC & CNCH

Hệ thống đã được quy hoạch gọn gàng thành các thư mục độc lập:
- `de_thi/`: Lưu trữ 10 bộ đề thi chuẩn và câu hỏi an toàn (không lộ đáp án).
- `dap_an/`: Lưu trữ 10 file đáp án chi tiết và 10 file hướng dẫn trích dẫn nguồn nguyên văn.
- `tai_lieu/`: Lưu trữ tài liệu lý thuyết chuẩn nghiệp vụ (CV 1974).
- `web/`: Ứng dụng web thi trực tuyến tối ưu Mobile-First và Desktop.

---

## 🚀 1. CÁCH KHỞI CHẠY HỆ THỐNG

- **Khởi chạy nhanh:** Nhấp đúp vào file [`Chay_Thu_Web.bat`](file:///d:/AI/du_an_trac_nghiem_pccc/Chay_Thu_Web.bat) ở thư mục gốc `du_an_trac_nghiem_pccc` để mở máy chủ và tự động bật trình duyệt.
- **Trang thi của thí sinh:** Mở [`web/index.html`](file:///d:/AI/du_an_trac_nghiem_pccc/web/index.html).
- **Trang in kết quả dành riêng cho Ban Giám khảo:** Mở [`web/trang_in_ket_qua.html`](file:///d:/AI/du_an_trac_nghiem_pccc/web/trang_in_ket_qua.html).

---

## 📱 2. BA TÍNH NĂNG MỚI ĐÃ CẬP NHẬT HOÀN THIỆN

### 1️⃣ Kết quả tự động ghi vào SHEET ĐẦU TIÊN của bảng tính
- Mã Google Apps Script đã được tối ưu: **Luôn luôn ghi vào sheet đầu tiên (Index 0)** của bảng tính thay vì gán cứng một sheet cụ thể nào.
- Phù hợp cho việc tổ chức nhiều đợt thi: Thí sinh thi đợt nào sẽ tự động ghi tiếp thành các hàng mới vào tab trang tính đầu tiên.

### 2️⃣ Trang in kết quả riêng biệt cho Ban Giám khảo (`web/trang_in_ket_qua.html`)
- **Thí sinh không cần in:** Trang làm bài của thí sinh đã được loại bỏ nút in để tránh rườm rà.
- **Giám khảo chủ động in từ dữ liệu Google Sheet:**
  - Bấm nút **"Tải Dữ Liệu Tự Động Từ Google Sheet"** để kéo toàn bộ bài thi đã nộp về bảng quản trị.
  - Hoặc bấm **"Dán Nhanh Từ Bảng Google Sheet"** (copy từ Sheet dán vào).
  - Tùy chọn **"In Phiếu Cá Nhân (A4 Dọc)"**: Chọn 1 hoặc nhiều thí sinh, hệ thống tự động sinh phiếu kết quả chuẩn CAND (Quốc hiệu, Tiêu ngữ, điểm trắc nghiệm, bài tự luận, nhận xét và chữ ký 3 bên).
  - Tùy chọn **"In Bảng Tổng Hợp Điểm (A4)"**: Bảng tổng kết toàn bộ danh sách điểm đơn vị phục vụ lưu trữ, báo cáo.

### 3️⃣ Bộ đếm giây chạy theo thí sinh khi làm bài
- Khi bắt đầu làm bài, một **widget đồng hồ đếm ngược nổi (Floating Sticky Timer)** sẽ xuất hiện ở góc trên bên phải màn hình.
- Đồng hồ hiển thị chính xác **phút : giây** (`30:00`, `29:59`, `29:58`...) và **tự động chạy theo thí sinh khi cuộn trang lên/xuống**.
- Đồng thời ở thanh điều hướng chân trang trên điện thoại (Mobile Bottom Bar) cũng có bộ đếm giây hiển thị song song.
- Tự động đổi màu cảnh báo: Vàng cam khi còn dưới 5 phút, Đỏ nhấp nháy khi còn dưới 1 phút, và tự động thu bài khi hết 30 phút.
