import os
import json
import sys

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    folder = r"d:\AI\du_an_trac_nghiem_pccc"
    all_de = []
    all_da = []
    
    print("=== KIỂM TRA 10 BỘ ĐỀ THI PCCC & CNCH ===")
    all_passed = True
    
    for i in range(1, 11):
        idx = f"{i:02d}"
        f_de = os.path.join(folder, f"bo_de_{idx}.json")
        f_da = os.path.join(folder, f"dap_an_bo_de_{idx}.json")
        f_md = os.path.join(folder, f"Huong_dan_Trich_dan_Nguon_Dap_an_De_{idx}.md")
        
        # Check existence
        for p, label in [(f_de, "Đề JSON"), (f_da, "Đáp án JSON"), (f_md, "Trích dẫn MD")]:
            if not os.path.exists(p):
                print(f"[-] Thiếu file {label}: {p}")
                all_passed = False
                continue
                
        with open(f_de, "r", encoding="utf-8") as f:
            de = json.load(f)
        with open(f_da, "r", encoding="utf-8") as f:
            da = json.load(f)
            
        n_mcq = len(de.get("tracNghiem", []))
        n_essay = len(de.get("tuLuan", []))
        
        da_mcq = len(da.get("dapAnTracNghiem", []))
        da_essay = len(da.get("dapAnTuLuan", []))
        
        md_size = os.path.getsize(f_md)
        
        status = "OK" if (n_mcq == 20 and n_essay == 2 and da_mcq == 20 and da_essay == 2) else "LỖI"
        if status == "LỖI":
            all_passed = False
            
        print(f"[{status}] Bộ đề {idx} ({de.get('maDe')}): {n_mcq} TN / {n_essay} TL | Đáp án: {da_mcq} TN / {da_essay} TL | Hướng dẫn: {md_size:,} bytes")
        
        all_de.append(de)
        all_da.append(da)
        
    if all_passed:
        # Tạo file tổng hợp để web tiện load
        with open(os.path.join(folder, "tong_hop_10_bo_de.json"), "w", encoding="utf-8") as f:
            json.dump({"tongSoBoDe": len(all_de), "danhSachBoDe": all_de}, f, ensure_ascii=False, indent=2)
            
        with open(os.path.join(folder, "tong_hop_dap_an_10_bo_de.json"), "w", encoding="utf-8") as f:
            json.dump({"tongSoBoDe": len(all_da), "danhSachDapAn": all_da}, f, ensure_ascii=False, indent=2)
            
        print("\n=> TẤT CẢ 10 BỘ ĐỀ ĐỀU HỢP LỆ VÀ ĐÃ TỔNG HỢP XONG THÀNH CÔNG!")
    else:
        print("\n=> CÓ LỖI XẢY RA TRONG CÁC BỘ ĐỀ!")

if __name__ == "__main__":
    main()
