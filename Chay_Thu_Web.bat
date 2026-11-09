@echo off
chcp 65001 >nul
echo ========================================================
echo   ĐANG KHỞI CHẠY HỆ THỐNG KIỂM TRA PCCC & CNCH
echo ========================================================
echo.
cd /d "%~dp0web"
echo 1. Mở trang web kiểm tra trên trình duyệt...
start "" "http://localhost:8080/index.html"
echo 2. Khởi chạy máy chủ cục bộ tại thư mục web...
echo (Nhấn Ctrl + C để dừng máy chủ)
echo.
python -m http.server 8080
pause
