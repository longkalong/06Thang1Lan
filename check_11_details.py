import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

unmatched = [
    ('bo_de_01.json', 'CNCHBT011', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_01.md'),
    ('bo_de_01.json', 'CNCHDN013', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_01.md'),
    ('bo_de_02.json', 'CNCHTC016', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_02.md'),
    ('bo_de_02.json', 'CNCHSD013', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_02.md'),
    ('bo_de_03.json', 'CTCCKB006', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_03.md'),
    ('bo_de_03.json', 'CTCCNCT009', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_03.md'),
    ('bo_de_03.json', 'CNCHBT010', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_03.md'),
    ('bo_de_03.json', 'CNCHSD018', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_03.md'),
    ('bo_de_07.json', 'CNCHDS015', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_07.md'),
    ('bo_de_09.json', 'CTCCNCT007', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_09.md'),
    ('bo_de_10.json', 'CTCCTG020', 'Huong_dan_Trich_dan_Nguon_Dap_an_De_10.md'),
]

folder = r'd:\AI\du_an_trac_nghiem_pccc'
with open(folder + r'\Tai_lieu_Chien_thuat_PCCC_va_CNCH_Chuan.md', 'r', encoding='utf-8') as f:
    source_lines = f.readlines()

for bname, qid, guidename in unmatched:
    with open(folder + '\\' + guidename, 'r', encoding='utf-8') as f:
        guide_text = f.read()
    pos = guide_text.find(qid)
    snippet = guide_text[pos:pos+1500] if pos != -1 else ''
    part = snippet.split('---')[0]
    
    # find line references in guide
    line_ref = re.search(r'dòng\s*([0-9\-\,\s]+)', part, re.IGNORECASE)
    print(f"=== {qid} ({guidename}) ===")
    print(part.strip())
    print("-" * 50)
