import os
import json
import re
import sys

def audit_exams():
    sys.stdout.reconfigure(encoding='utf-8')
    folder = r"d:\AI\du_an_trac_nghiem_pccc"
    
    issues = []
    warnings = []
    
    all_question_ids = set()
    all_question_texts = set()
    
    ky_hieu_map = {1: 'A', 2: 'B', 3: 'C', 4: 'D'}
    
    print("="*60)
    print("BẮT ĐẦU KIỂM TRA TOÀN DIỆN 10 BỘ ĐỀ THI")
    print("="*60)
    
    total_mcqs = 0
    total_essays = 0
    
    for i in range(1, 11):
        idx = f"{i:02d}"
        f_de = os.path.join(folder, f"bo_de_{idx}.json")
        f_da = os.path.join(folder, f"dap_an_bo_de_{idx}.json")
        f_md = os.path.join(folder, f"Huong_dan_Trich_dan_Nguon_Dap_an_De_{idx}.md")
        
        # 1. Kiểm tra tồn tại file
        if not os.path.exists(f_de):
            issues.append(f"Đề {idx}: Không tìm thấy file {f_de}")
            continue
        if not os.path.exists(f_da):
            issues.append(f"Đề {idx}: Không tìm thấy file {f_da}")
            continue
        if not os.path.exists(f_md):
            issues.append(f"Đề {idx}: Không tìm thấy file {f_md}")
            continue
            
        with open(f_de, 'r', encoding='utf-8') as f:
            de = json.load(f)
        with open(f_da, 'r', encoding='utf-8') as f:
            da = json.load(f)
        with open(f_md, 'r', encoding='utf-8') as f:
            md_content = f.read()
            
        # 2. Kiểm tra thông số chung của đề
        if de.get('thoiGianLamBaiPhut') != 30:
            issues.append(f"Đề {idx}: Thời gian làm bài là {de.get('thoiGianLamBaiPhut')}, chuẩn phải là 30 phút")
            
        mcq_list = de.get('tracNghiem', [])
        essay_list = de.get('tuLuan', [])
        
        if len(mcq_list) != 20:
            issues.append(f"Đề {idx}: Có {len(mcq_list)} câu trắc nghiệm (chuẩn phải là 20 câu)")
        if len(essay_list) != 2:
            issues.append(f"Đề {idx}: Có {len(essay_list)} câu tự luận (chuẩn phải là 2 câu)")
            
        da_mcq_list = da.get('dapAnTracNghiem', [])
        da_essay_list = da.get('dapAnTuLuan', [])
        
        if len(da_mcq_list) != 20:
            issues.append(f"Đề {idx}: File đáp án có {len(da_mcq_list)} câu trắc nghiệm (chuẩn 20)")
        if len(da_essay_list) != 2:
            issues.append(f"Đề {idx}: File đáp án có {len(da_essay_list)} câu tự luận (chuẩn 2)")
            
        total_mcqs += len(mcq_list)
        total_essays += len(essay_list)
        
        # 3. Phân bổ đáp án A, B, C, D
        answer_dist = {1: 0, 2: 0, 3: 0, 4: 0}
        
        # 4. Kiểm tra chi tiết từng câu trắc nghiệm
        da_mcq_dict = {item['ID']: item for item in da_mcq_list}
        
        for q_idx, q in enumerate(mcq_list, start=1):
            qid = q.get('ID')
            qtext = q.get('cauHoi', '').strip()
            options = q.get('luaChon', [])
            ans = q.get('dapan')
            
            # Kiểm tra ID
            if not qid:
                issues.append(f"Đề {idx} - Câu {q_idx}: Thiếu ID")
            else:
                if qid in all_question_ids:
                    warnings.append(f"Đề {idx} - Câu {q_idx}: Trùng ID '{qid}' đã xuất hiện ở đề trước")
                all_question_ids.add(qid)
                
            # Kiểm tra trùng nội dung câu hỏi
            clean_q = re.sub(r'\s+', ' ', qtext).lower()
            if clean_q in all_question_texts:
                warnings.append(f"Đề {idx} - Câu {q_idx} ({qid}): Trùng lặp nội dung câu hỏi với đề khác")
            all_question_texts.add(clean_q)
            
            # Kiểm tra số lượng lựa chọn
            if len(options) != 4:
                issues.append(f"Đề {idx} - Câu {q_idx} ({qid}): Có {len(options)} lựa chọn (chuẩn là 4)")
                continue
                
            # Kiểm tra định dạng A, B, C, D
            expected_prefixes = ['A.', 'B.', 'C.', 'D.']
            for opt_idx, opt in enumerate(options):
                if not opt.strip().startswith(expected_prefixes[opt_idx]):
                    issues.append(f"Đề {idx} - Câu {q_idx} ({qid}) Lựa chọn {opt_idx}: Không bắt đầu bằng '{expected_prefixes[opt_idx]}'")
                    
            # Kiểm tra giá trị đáp án
            if ans not in [1, 2, 3, 4]:
                issues.append(f"Đề {idx} - Câu {q_idx} ({qid}): Đáp án không hợp lệ ({ans})")
            else:
                answer_dist[ans] += 1
                
            # Kiểm tra khớp giữa file câu hỏi và file đáp án riêng
            if qid not in da_mcq_dict:
                issues.append(f"Đề {idx}: Không tìm thấy ID '{qid}' trong file đáp án")
            else:
                da_item = da_mcq_dict[qid]
                if da_item.get('dapan') != ans:
                    issues.append(f"Đề {idx} - Câu {q_idx} ({qid}): LỆCH ĐÁP ÁN! Đề: {ans}, File đáp án: {da_item.get('dapan')}")
                if da_item.get('kyHieu') != ky_hieu_map.get(ans):
                    issues.append(f"Đề {idx} - Câu {q_idx} ({qid}): LỆCH KÝ HIỆU! Ký hiệu là '{da_item.get('kyHieu')}', chuẩn là '{ky_hieu_map.get(ans)}'")
                # So khớp nội dung câu trả lời
                expected_opt_text = options[ans - 1].strip()
                da_opt_text = da_item.get('noiDungDapAn', '').strip()
                if da_opt_text != expected_opt_text:
                    warnings.append(f"Đề {idx} - Câu {q_idx} ({qid}): Text nội dung đáp án hơi khác lựa chọn.\n  File đề: {expected_opt_text}\n  File ĐA: {da_opt_text}")
                    
            # Kiểm tra độ dài đáp án (tránh hiện tượng câu đúng dài nhất/ngắn nhất bất thường)
            lens = [len(opt) for opt in options]
            correct_len = lens[ans - 1]
            distractor_lens = [lens[j] for j in range(4) if j != ans - 1]
            avg_distractor_len = sum(distractor_lens) / 3.0
            ratio = correct_len / (avg_distractor_len if avg_distractor_len > 0 else 1)
            if ratio > 2.0 or ratio < 0.5:
                warnings.append(f"Đề {idx} - Câu {q_idx} ({qid}): Độ dài câu đúng chênh lệch lớn so với các phương án nhiễu (tỉ lệ: {ratio:.2f})")
                
            # Kiểm tra xem câu hỏi có nằm trong file hướng dẫn trích dẫn MD không
            if qid not in md_content:
                issues.append(f"Đề {idx}: ID '{qid}' chưa được trích dẫn trong file {f_md}")
                
        # 5. Kiểm tra chi tiết 2 câu tự luận
        da_essay_dict = {item['ID']: item for item in da_essay_list}
        for eq_idx, eq in enumerate(essay_list, start=1):
            eqid = eq.get('ID')
            eqtext = eq.get('cauHoi')
            keywords = eq.get('tuKhoaDapAn', [])
            
            if not eqid or not eqtext:
                issues.append(f"Đề {idx} - Tự luận {eq_idx}: Thiếu ID hoặc câu hỏi")
            if len(keywords) < 5:
                warnings.append(f"Đề {idx} - Tự luận {eq_idx} ({eqid}): Quá ít từ khóa ({len(keywords)} từ khóa)")
                
            if eqid not in da_essay_dict:
                issues.append(f"Đề {idx}: Không tìm thấy câu tự luận '{eqid}' trong file đáp án")
                
            if eqid not in md_content:
                issues.append(f"Đề {idx}: Tự luận '{eqid}' chưa được trích dẫn trong file {f_md}")
                
        print(f"-> Đề {idx} ({de.get('maDe')}): Phân bổ đáp án: A={answer_dist[1]}, B={answer_dist[2]}, C={answer_dist[3]}, D={answer_dist[4]}")
        
    print("="*60)
    print(f"TỔNG HỢP KIỂM TRA: {total_mcqs} CÂU TRẮC NGHIỆM, {total_essays} CÂU TỰ LUẬN")
    print(f"Tổng số lỗi nghiêm trọng (Issues): {len(issues)}")
    print(f"Tổng số cảnh báo (Warnings): {len(warnings)}")
    print("="*60)
    
    if issues:
        print("\n[!] DANH SÁCH LỖI NGHIÊM TRỌNG:")
        for iss in issues:
            print("  - " + iss)
    else:
        print("\n[V] KHÔNG CÓ BẤT KỲ LỖI NGHIÊM TRỌNG NÀO!")
        
    if warnings:
        print("\n[*] CÁC CẢNH BÁO ĐỂ HOÀN THIỆN:")
        for w in warnings[:15]:  # show first 15
            print("  - " + w)
        if len(warnings) > 15:
            print(f"  ... và {len(warnings) - 15} cảnh báo khác.")

if __name__ == '__main__':
    audit_exams()
