# -*- coding: utf-8 -*-
"""
Kịch bản tự động hóa 3 AI dự thi hệ thống kiểm tra Chiến thuật PCCC & CNCH
Mỗi AI đại diện cho 1 thí sinh với phong cách thao tác khác nhau:
- AI 1: Nghiêm túc, làm tuần tự, tự luận chi tiết.
- AI 2: Thao tác linh tinh, đổi phương án, nhảy cóc câu, tự luận ngắn gọn.
- AI 3: Điền bừa ngẫu nhiên, làm nhanh, nộp bài thần tốc.
Tất cả đều tự động nộp bài và đồng bộ điểm về Google Sheet.
"""

import os
import sys
import time
import random
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

WEB_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8889

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

def run_server():
    with socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

CANDIDATES = [
    {
        "id": 1,
        "name": "AI 01 - Đại úy Nguyễn Văn Hùng",
        "unit": "Phòng PC07",
        "rank": "Chỉ huy",
        "essay1": "1. Trinh sát toàn diện gốc lửa, hướng khói độc và vị trí người bị nạn.\n2. Thiết lập 3 vùng kiểm soát: Vùng nóng, Vùng ấm, Vùng lạnh.\n3. Triển khai lăng giá làm mát cấu kiện chịu lực ngăn nguy cơ sụp đổ công trình.",
        "essay2": "1. Ưu tiên cứu người bị nạn theo nguy cơ trực tiếp.\n2. Phun bọt hòa không khí bao phủ dập tắt cháy chất lỏng.\n3. Bố trí tổ trinh sát giám sát hiện tượng sôi trào và nổ thứ cấp.",
        "behavior": "careful"
    },
    {
        "id": 2,
        "name": "AI 02 - Thượng úy Trần Minh Đức",
        "unit": "Đội Chữa cháy và CNCH Khu vực 2",
        "rank": "Cán bộ",
        "essay1": "Triển khai đội hình lăng B tiếp cận từ cầu thang bộ thoát hiểm. Sử dụng mặt nạ phòng độc cách ly và thiết bị banh cắt thủy lực mở lối.",
        "essay2": "Cắt điện cục bộ khu vực cháy, phun nước sương làm mát ngăn cháy lan sang phân xưởng lân cận.",
        "behavior": "random_switch"
    },
    {
        "id": 3,
        "name": "AI 03 - Hạ sĩ Lê Quốc Bảo",
        "unit": "Đội Cảnh sát PCCC và CNCH trên sông, biển",
        "rank": "CSNV",
        "essay1": "Tiếp cận hiện trường bằng ca nô chuyên dụng, quăng phao cứu sinh tròn và bè cứu sinh đưa các nạn nhân vào bờ an toàn.",
        "essay2": "Khởi động máy bơm chữa cháy hút nước sông trực tiếp làm mát mạn tàu và dập tắt đám cháy trong buồng máy.",
        "behavior": "speedrun"
    }
]

def simulate_candidate(browser, candidate_info):
    cid = candidate_info["id"]
    name = candidate_info["name"]
    unit = candidate_info["unit"]
    rank = candidate_info["rank"]
    behavior = candidate_info["behavior"]

    print(f"\n========================================================")
    print(f"🤖 [AI {cid}] BẮT ĐẦU: {name} ({unit} - {rank})")
    print(f"   Phong cách: {behavior.upper()}")
    print(f"========================================================")

    page = browser.new_page(viewport={"width": 430, "height": 932}) # Mô phỏng màn hình điện thoại (Mobile First)
    
    # 1. Truy cập trang web
    page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    time.sleep(0.5)

    # 2. Nhập thông tin dự thi
    print(f"[{name}] -> Đang điền Họ tên, Đơn vị, Chức vụ...")
    page.fill("#inp-fullname", name)
    page.select_option("#inp-unit", unit)
    page.select_option("#inp-rank", rank)
    time.sleep(0.3)

    # 3. Bấm bắt đầu làm bài
    print(f"[{name}] -> Bấm Bắt đầu làm bài thi (hệ thống bốc đề ngẫu nhiên)...")
    page.click("#btn-start-exam")
    page.wait_for_selector("#screen-exam.active", timeout=5000)

    exam_title = page.text_content("#exam-display-name")
    print(f"[{name}] -> Đã nhận: {exam_title}")

    # 4. Thao tác làm 20 câu trắc nghiệm
    print(f"[{name}] -> Đang tiến hành làm 20 câu trắc nghiệm...")

    if behavior == "random_switch":
        # Thao tác linh tinh: nhảy cóc lung tung, đổi ý chọn lại
        print(f"[{name}] -> (Chế độ linh tinh: Nhảy lung tung giữa các câu, đổi đáp án qua lại)")
        for step in range(25):
            target_q = random.randint(0, 19)
            # Nhảy tới câu bằng thanh stepper
            page.click(f"#stepper-btn-{target_q}")
            time.sleep(0.05)
            # Click 1 phương án
            options = page.query_selector_all("#single-mcq-container .option-item")
            if options:
                opt = random.choice(options)
                opt.click()
                time.sleep(0.05)
                # Đổi ý chọn phương án khác!
                if random.random() < 0.5:
                    opt2 = random.choice(options)
                    opt2.click()
        # Đảm bảo câu nào chưa làm thì hoàn tất nốt
        for q_idx in range(20):
            page.click(f"#stepper-btn-{q_idx}")
            time.sleep(0.03)
            options = page.query_selector_all("#single-mcq-container .option-item")
            if options:
                random.choice(options).click()

    elif behavior == "speedrun":
        # Điền bừa cực nhanh
        print(f"[{name}] -> (Chế độ điền bừa siêu tốc)")
        for q_idx in range(20):
            page.click(f"#stepper-btn-{q_idx}")
            time.sleep(0.03)
            options = page.query_selector_all("#single-mcq-container .option-item")
            if options:
                # Chọn bừa 1 trong 4 lựa chọn
                random.choice(options).click()

    else:
        # Cẩn thận: duyệt tuần tự từ câu 1 đến câu 20
        print(f"[{name}] -> (Chế độ tuần tự cẩn thận)")
        for q_idx in range(20):
            time.sleep(0.08)
            options = page.query_selector_all("#single-mcq-container .option-item")
            if options:
                # Chọn 1 lựa chọn
                chosen_idx = random.choice([0, 1, 2, 3])
                options[chosen_idx].click()
            if q_idx < 19:
                page.click("#btn-mcq-next")

    # 5. Chuyển sang phần Tự luận
    print(f"[{name}] -> Chuyển sang Thẻ TỰ LUẬN...")
    page.click("#tab-btn-essay")
    time.sleep(0.3)

    # Làm câu tự luận 1
    page.click("#pill-essay-0")
    time.sleep(0.2)
    page.fill("#current-essay-textarea", candidate_info["essay1"])
    print(f"[{name}] -> Đã viết bài Tự luận 1 ({len(candidate_info['essay1'])} ký tự)")

    # Làm câu tự luận 2
    page.click("#pill-essay-1")
    time.sleep(0.2)
    page.fill("#current-essay-textarea", candidate_info["essay2"])
    print(f"[{name}] -> Đã viết bài Tự luận 2 ({len(candidate_info['essay2'])} ký tự)")

    # 6. Bấm Nộp bài thi
    print(f"[{name}] -> Bấm NỘP BÀI THI...")
    page.locator(".btn-trigger-submit").first.click()
    page.wait_for_selector("#modal-submit-confirm.active", timeout=3000)
    time.sleep(0.3)

    print(f"[{name}] -> Bấm Xác nhận nộp bài trong hộp thoại...")
    page.click("#btn-confirm-submit")

    # 7. Chờ kết quả và tự động gửi Google Sheet
    print(f"[{name}] -> Đang chờ hệ thống chấm điểm và gửi Google Sheets...")
    page.wait_for_selector("#screen-result.active", timeout=10000)

    # Đợi thông báo đồng bộ Google Sheet hoàn tất
    time.sleep(3.5)

    score_val = page.text_content("#res-score-number").strip()
    try:
        score_ten = f"{float(score_val) * 0.5:.1f}/10"
    except Exception:
        score_ten = "N/A"

    stat_correct = page.text_content("#stat-correct-count").strip()
    stat_incorrect = page.text_content("#stat-incorrect-count").strip()
    stat_unanswered = page.text_content("#stat-unanswered-count").strip()
    status_text = page.text_content("#sheets-sync-status").strip()

    # Chụp ảnh minh chứng
    screenshot_path = os.path.join(WEB_DIR, f"ket_qua_ai_0{cid}.png")
    page.screenshot(path=screenshot_path, full_page=True)

    print(f"🎉 [{name}] HOÀN THÀNH!")
    print(f"   - Điểm trắc nghiệm: {score_val}/20 câu đúng ({score_ten}) [Đúng: {stat_correct}, Sai: {stat_incorrect}, Chưa chọn: {stat_unanswered}]")
    print(f"   - Trạng thái Google Sheet: {status_text[:60]}...")
    print(f"   - Ảnh chụp bài thi: ket_qua_ai_0{cid}.png")

    page.close()

    return {
        "candidate": name,
        "unit": unit,
        "rank": rank,
        "exam": exam_title,
        "score": f"{score_val}/20",
        "score_ten": score_ten,
        "stat": f"Đúng {stat_correct} | Sai {stat_incorrect} | Chưa làm {stat_unanswered}",
        "screenshot": f"ket_qua_ai_0{cid}.png"
    }

def main():
    start_time = time.time()

    # 1. Bật web server nội bộ
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(1)

    print("=================================================================")
    print("🚀 BẮT ĐẦU CHẠY THỰC NGHIỆM 3 AI TỰ ĐỘNG THI & GỬI GOOGLE SHEET")
    print("=================================================================")

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        for cand in CANDIDATES:
            res = simulate_candidate(browser, cand)
            results.append(res)
            time.sleep(1)

        browser.close()

    elapsed = round(time.time() - start_time, 1)

    print("\n" + "=" * 65)
    print(f"🏆 TẤT CẢ 3 AI ĐÃ HOÀN TẤT BÀI THI TRONG {elapsed} GIÂY (MỤC TIÊU < 5 PHÚT)")
    print("=" * 65)
    for r in results:
        print(f"• {r['candidate']} | {r['unit']} | {r['exam']} -> ĐIỂM: {r['score']} ({r['score_ten']})")
    print("=" * 65)
    print("Toàn bộ 3 bài thi đã được đồng bộ tự động vào Google Sheet 'kiểm tra 6 tháng cuối năm 2026'!")

if __name__ == "__main__":
    main()
