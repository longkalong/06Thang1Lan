import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

folder = r"d:\AI\du_an_trac_nghiem_pccc"

all_sanitized = {}

for i in range(1, 11):
    idx = f"{i:02d}"
    src_file = os.path.join(folder, f"bo_de_{idx}.json")
    dst_file = os.path.join(folder, f"cau_hoi_bo_de_{idx}.json")
    
    with open(src_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    sanitized_de = {
        "maDe": data["maDe"],
        "tenDe": data["tenDe"],
        "thoiGianLamBaiPhut": data.get("thoiGianLamBaiPhut", 30),
        "soCauTracNghiem": len(data.get("tracNghiem", [])),
        "soCauTuLuan": len(data.get("tuLuan", [])),
        "tracNghiem": [],
        "tuLuan": []
    }
    
    for q in data.get("tracNghiem", []):
        # KHÔNG đưa dapan vào file câu hỏi
        sanitized_de["tracNghiem"].append({
            "ID": q["ID"],
            "cauHoi": q["cauHoi"],
            "luaChon": q["luaChon"]
        })
        
    for q in data.get("tuLuan", []):
        # Đưa câu hỏi tự luận vào, không đưa đáp án / barem chi tiết tránh lộ
        sanitized_de["tuLuan"].append({
            "ID": q["ID"],
            "cauHoi": q["cauHoi"],
            "thangDiem": q.get("thangDiem", 2.0),
            "ghiChu": "Thí sinh trình bày đầy đủ các ý chính theo quy chuẩn chiến thuật PCCC & CNCH."
        })
        
    with open(dst_file, 'w', encoding='utf-8') as f:
        json.dump(sanitized_de, f, ensure_ascii=False, indent=2)
        
    all_sanitized[data["maDe"]] = sanitized_de
    print(f"-> Tạo xong file an toàn không lộ đáp án: cau_hoi_bo_de_{idx}.json")

# Tạo file danh mục tổng hợp các đề (để app web biết có bao nhiêu đề)
danh_sach_de = []
for k, v in all_sanitized.items():
    danh_sach_de.append({
        "maDe": v["maDe"],
        "tenDe": v["tenDe"],
        "thoiGianPhut": v["thoiGianLamBaiPhut"],
        "soCauTracNghiem": v["soCauTracNghiem"],
        "soCauTuLuan": v["soCauTuLuan"]
    })

with open(os.path.join(folder, "danh_sach_de_thi.json"), 'w', encoding='utf-8') as f:
    json.dump(danh_sach_de, f, ensure_ascii=False, indent=2)

print("\n[OK] Đã tạo xong danh_sach_de_thi.json và 10 file câu hỏi an toàn không chứa đáp án!")
