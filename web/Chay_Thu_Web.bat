@echo off
chcp 65001 >nul
echo ========================================================
echo   ĐANG KHỞI CHẠY HỆ THỐNG KIỂM TRA PCCC & CNCH
echo ========================================================
echo.
echo 1. Mở trang web kiểm tra trên trình duyệt mặc định...
start "" "http://localhost:8080/index.html"
echo.
echo 2. Đang khởi chạy máy chủ cục bộ cổng 8080...
echo (Nhấn Ctrl + C để dừng máy chủ)
echo.
python -m http.server 8080
pause
