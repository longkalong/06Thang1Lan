import os
import re
import sys

def check_verbatim():
    sys.stdout.reconfigure(encoding='utf-8')
    folder = r"d:\AI\du_an_trac_nghiem_pccc"
    source_file = os.path.join(folder, "Tai_lieu_Chien_thuat_PCCC_va_CNCH_Chuan.md")
    
    with open(source_file, 'r', encoding='utf-8') as f:
        source_text = f.read()
        
    print(f"Tổng dung lượng tài liệu gốc: {len(source_text):,} ký tự")
    
    # Chuẩn hóa khoảng trắng để tìm kiếm linh hoạt hơn
    clean_source = re.sub(r'\s+', ' ', source_text).lower()
    
    total_quotes = 0
    exact_matches = 0
    near_matches = 0
    failed_quotes = []
    
    for i in range(1, 11):
        idx = f"{i:02d}"
        md_file = os.path.join(folder, f"Huong_dan_Trich_dan_Nguon_Dap_an_De_{idx}.md")
        with open(md_file, 'r', encoding='utf-8') as f:
            md_text = f.read()
            
        # Tìm các đoạn blockquote (bắt đầu bằng >)
        # Các đoạn trích dẫn nguyên văn thường nằm trong > "..." hoặc > *...*
        quotes = re.findall(r'>\s*[\*\"\']?(.*?)[\*\"\']?\s*$', md_text, re.MULTILINE)
        
        de_total = 0
        de_matches = 0
        
        for q in quotes:
            q_clean = q.strip(' *"\'>-')
            # Bỏ qua các dòng tiêu đề như "Tài liệu gốc đối chiếu", "Cam kết", "Đặc điểm bộ đề"
            if len(q_clean) < 25 or "tai_lieu" in q_clean.lower() or "cam kết" in q_clean.lower() or "đặc điểm" in q_clean.lower():
                continue
                
            de_total += 1
            total_quotes += 1
            
            # Lấy 1 cụm từ cốt lõi khoảng 30-40 ký tự từ đoạn trích
            words = q_clean.split()
            if len(words) >= 6:
                sample_phrase = ' '.join(words[:8]).lower()
                sample_phrase = re.sub(r'[^\w\s]', '', sample_phrase)
            else:
                sample_phrase = q_clean.lower()
                
            clean_phrase = re.sub(r'\s+', ' ', sample_phrase)
            
            if clean_phrase in clean_source:
                de_matches += 1
                exact_matches += 1
            else:
                # Thử tìm đoạn giữa
                if len(words) >= 12:
                    mid_phrase = ' '.join(words[4:10]).lower()
                    mid_phrase = re.sub(r'[^\w\s]', '', mid_phrase)
                    if mid_phrase in clean_source:
                        de_matches += 1
                        near_matches += 1
                        continue
                failed_quotes.append((idx, q_clean[:80]))
                
        print(f"Đề {idx}: Đã đối chiếu {de_matches}/{de_total} đoạn trích dẫn khớp nguyên văn tài liệu gốc.")
        
    print("="*60)
    print(f"Tổng số đoạn trích dẫn được kiểm tra: {total_quotes}")
    print(f"Số đoạn khớp nguyên văn trực tiếp: {exact_matches}")
    print(f"Số đoạn khớp đoạn lân cận: {near_matches}")
    print(f"Số đoạn cần kiểm tra lại: {len(failed_quotes)}")
    print("="*60)
    
    if failed_quotes:
        print("\nCác đoạn cần rà soát lại:")
        for idx, fq in failed_quotes[:10]:
            print(f"- Đề {idx}: {fq}...")

if __name__ == '__main__':
    check_verbatim()
