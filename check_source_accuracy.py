import os
import json
import re
import sys

def check_accuracy():
    sys.stdout.reconfigure(encoding='utf-8')
    folder = r"d:\AI\du_an_trac_nghiem_pccc"
    source_file = os.path.join(folder, "Tai_lieu_Chien_thuat_PCCC_va_CNCH_Chuan.md")
    
    with open(source_file, 'r', encoding='utf-8') as f:
        source_text = f.read()
    clean_source = re.sub(r'\s+', ' ', source_text).lower()
    
    for i in range(1, 11):
        idx = f"{i:02d}"
        f_de = os.path.join(folder, f"bo_de_{idx}.json")
        with open(f_de, 'r', encoding='utf-8') as f:
            de = json.load(f)
            
        unmatched_questions = []
        for q in de['tracNghiem']:
            qid = q['ID']
            ans_idx = q['dapan'] - 1
            correct_opt = q['luaChon'][ans_idx]
            
            # Bỏ prefix "A. ", "B. ", "C. ", "D. "
            opt_clean = re.sub(r'^[A-D]\.\s*', '', correct_opt).strip()
            
            # Trích các cụm từ có nghĩa (4-6 từ) từ đáp án đúng
            words = [w for w in re.findall(r'\b\w+\b', opt_clean.lower()) if len(w) > 1]
            found = False
            
            # Thử các cụm 4 từ liên tiếp
            for start in range(len(words) - 3):
                chunk = ' '.join(words[start:start+4])
                if chunk in clean_source:
                    found = True
                    break
                    
            if not found:
                unmatched_questions.append((qid, opt_clean))
                
        print(f"Bộ đề {idx}: {20 - len(unmatched_questions)}/20 câu có đáp án đúng khớp cụm từ trong tài liệu gốc.")
        if unmatched_questions:
            for qid, text in unmatched_questions:
                print(f"  [-] {qid}: {text[:70]}...")

if __name__ == '__main__':
    check_accuracy()
