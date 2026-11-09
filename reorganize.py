import os
import shutil
import glob

base = r"d:\AI\du_an_trac_nghiem_pccc"

dirs = {
    "de_thi": os.path.join(base, "de_thi"),
    "dap_an": os.path.join(base, "dap_an"),
    "tai_lieu": os.path.join(base, "tai_lieu"),
    "web": os.path.join(base, "web"),
    "web_data": os.path.join(base, "web", "data"),
}

for d in dirs.values():
    os.makedirs(d, exist_ok=True)

# 1. Di chuyển tài liệu
for pat in ["Tai_lieu_Chien_thuat_PCCC_va_CNCH_Chuan.*", "chuyen_de_chien_thuat_pccc_cnch.md"]:
    for f in glob.glob(os.path.join(base, pat)):
        shutil.move(f, os.path.join(dirs["tai_lieu"], os.path.basename(f)))

# 2. Di chuyển đề thi
for pat in ["bo_de_*.json", "cau_hoi_bo_de_*.json", "danh_sach_de_thi.json", "tong_hop_10_bo_de.json"]:
    for f in glob.glob(os.path.join(base, pat)):
        shutil.move(f, os.path.join(dirs["de_thi"], os.path.basename(f)))

# 3. Di chuyển đáp án & hướng dẫn nguồn
for pat in ["dap_an_bo_de_*.json", "Huong_dan_Trich_dan_Nguon_Dap_an_De_*.md", "tong_hop_dap_an_10_bo_de.json"]:
    for f in glob.glob(os.path.join(base, pat)):
        shutil.move(f, os.path.join(dirs["dap_an"], os.path.basename(f)))

# 4. Di chuyển dữ liệu web data
for pat in ["cau_hoi_bundle.js", "dap_an_bundle.js"]:
    for f in glob.glob(os.path.join(base, pat)):
        shutil.move(f, os.path.join(dirs["web_data"], os.path.basename(f)))

# 5. Di chuyển file ứng dụng web
for pat in ["index.html", "style.css", "app.js", "phieu_in.html", "google_sheets_script.js", "Chay_Thu_Web.bat", "README_HUONG_DAN.md"]:
    for f in glob.glob(os.path.join(base, pat)):
        shutil.move(f, os.path.join(dirs["web"], os.path.basename(f)))

print("Reorganization complete!")
