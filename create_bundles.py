import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

folder = r"d:\AI\du_an_trac_nghiem_pccc"

all_questions = {}
all_answers = {}
danh_sach_de = []

for i in range(1, 11):
    idx = f"{i:02d}"
    
    # 1. Câu hỏi (không chứa đáp án)
    q_file = os.path.join(folder, f"cau_hoi_bo_de_{idx}.json")
    with open(q_file, 'r', encoding='utf-8') as f:
        q_data = json.load(f)
    all_questions[q_data["maDe"]] = q_data
    
    danh_sach_de.append({
        "maDe": q_data["maDe"],
        "tenDe": q_data["tenDe"],
        "thoiGianPhut": q_data.get("thoiGianLamBaiPhut", 30),
        "soCauTracNghiem": len(q_data.get("tracNghiem", [])),
        "soCauTuLuan": len(q_data.get("tuLuan", []))
    })
    
    # 2. Đáp án
    a_file = os.path.join(folder, f"dap_an_bo_de_{idx}.json")
    with open(a_file, 'r', encoding='utf-8') as f:
        a_data = json.load(f)
    all_answers[a_data["maDe"]] = a_data

# Ghi file cau_hoi_bundle.js
with open(os.path.join(folder, "cau_hoi_bundle.js"), 'w', encoding='utf-8') as f:
    f.write("// DỮ LIỆU CÂU HỎI THI AN TOÀN - KHÔNG CHỨA ĐÁP ÁN (Tránh lộ đề trước khi nộp)\n")
    f.write(f"window.DANH_SACH_DE = {json.dumps(danh_sach_de, ensure_ascii=False, indent=2)};\n\n")
    f.write(f"window.CAU_HOI_BO_DE = {json.dumps(all_questions, ensure_ascii=False, indent=2)};\n")

print(f"[OK] Đã tạo cau_hoi_bundle.js ({len(all_questions)} bộ đề không đáp án)")

# Ghi file dap_an_bundle.js (Chỉ load sau khi thí sinh bấm Nộp bài)
with open(os.path.join(folder, "dap_an_bundle.js"), 'w', encoding='utf-8') as f:
    f.write("// DỮ LIỆU ĐÁP ÁN CHẤM THI - CHỈ ĐƯỢC LOAD SAU KHI THÍ SINH ĐÃ BẤM NỘP BÀI\n")
    f.write(f"window.DAP_AN_BO_DE = {json.dumps(all_answers, ensure_ascii=False, indent=2)};\n")

print(f"[OK] Đã tạo dap_an_bundle.js ({len(all_answers)} bộ đáp án)")
