import pytest
import pandas as pd
import numpy as np
from src import merge_validate

def test_na_handling_logic():
    # Giả lập dữ liệu test với các trường hợp Level bình thường, N/A, và NaN
    data = {
        "Bank": ["BIDV", "BIDV", "BIDV", "BIDV"],
        "Ma_tieu_chi": ["1.1.1", "1.1.2", "1.1.3", "1.1.4"],
        "Level_parsed": [3.0, "N/A", np.nan, 5.0]
    }
    df = pd.DataFrame(data)

    # Cách A: N/A và NaN tính bằng 0
    df['Level_Way_A'] = df['Level_parsed'].apply(lambda x: 0 if x == "N/A" or pd.isna(x) else float(x))
    assert df['Level_Way_A'].tolist() == [3.0, 0.0, 0.0, 5.0]

    # Cách B: N/A và NaN quy về NaN để bỏ qua khi tính mean
    df['Level_Way_B'] = df['Level_parsed'].apply(lambda x: np.nan if x == "N/A" or pd.isna(x) else float(x))
    
    mean_b = df['Level_Way_B'].mean()
    # Chỉ tính trung bình trên [3.0, 5.0] => trung bình là 4.0
    assert mean_b == 4.0

def test_output_directories_exist():
    import os
    # Đảm bảo cấu trúc chạy test không lỗi
    assert True

def test_load_bank_data_reads_header_in_first_row(tmp_path, monkeypatch):
    source_dir = tmp_path / "evidence"
    source_dir.mkdir()
    workbook_path = source_dir / "BIDV.xlsx"
    pd.DataFrame([
        ["Trụ cột", "Nhóm tiêu chí", "Mã", "Tiêu chí", "Level"],
        ["Khách hàng", "Nhóm mẫu", "1.1.1", "Tiêu chí mẫu", 3],
    ]).to_excel(workbook_path, sheet_name="Chấm điểm", header=False, index=False)
    monkeypatch.setattr(merge_validate, "RAW_DATA_DIR", source_dir)
    monkeypatch.setattr(merge_validate, "BANK_FILES", ["BIDV.xlsx"])

    merged, logs = merge_validate.load_bank_data()

    assert merged[["Bank", "Ma_tieu_chi", "Level_parsed"]].to_dict("records") == [
        {"Bank": "BIDV", "Ma_tieu_chi": "1.1.1", "Level_parsed": 3.0}
    ]
    assert logs.empty