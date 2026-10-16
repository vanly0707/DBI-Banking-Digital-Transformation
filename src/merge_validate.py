import os
from pathlib import Path
import pandas as pd
import numpy as np

# Định nghĩa đường dẫn
PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = PROJECT_DIR / "data" / "raw" / "evidence"
OUTPUT_DIR = PROJECT_DIR / "outputs"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Danh sách 5 ngân hàng ứng với 5 file Excel
BANK_FILES = [
    "BIDV.xlsx",
    "MB.xlsx",
    "TPBank.xlsx",
    "Vietcombank.xlsx",
    "VietinBank.xlsx"
]

def load_bank_data():
    all_data = []
    validation_logs = []

    for file_name in BANK_FILES:
        file_path = os.path.join(RAW_DATA_DIR, file_name)
        if not os.path.exists(file_path):
            print(f"[Cảnh báo] Không tìm thấy file: {file_path}")
            continue
        
        try:
            # Đọc sheet thô để có thể nhận diện tiêu đề kể cả khi nằm ở dòng đầu.
            df = pd.read_excel(file_path, sheet_name='Chấm điểm', header=None)
            
            # Lấy tên ngân hàng từ ô B1 hoặc B2 (tùy file: dòng 1, cột 1 hoặc cột 2)
            # Theo cấu trúc đã quan sát: dòng 1 (index 1) có cột 'Ngân hàng' và giá trị ở cột tiếp theo
            bank_name = "Unknown"
            for r_idx in range(min(5, len(df))):
                row_vals = df.iloc[r_idx].values
                for val in row_vals:
                    if isinstance(val, str) and val.strip() in ["BIDV", "MB Bank", "TPBank", "Vietcombank", "VietinBank"]:
                        bank_name = val.strip()
                        break
                if bank_name != "Unknown":
                    break
            
            if bank_name == "Unknown":
                bank_name = file_name.replace(".xlsx", "")

            # Tìm dòng tiêu đề thực sự của bảng dữ liệu (có chứa 'Trụ cột', 'Mã', 'Level'...)
            header_row_idx = None
            for idx, row in df.iterrows():
                row_str = " ".join([str(x) for x in row.values])
                if "Trụ cột" in row_str and "Mã" in row_str and "Level" in row_str:
                    header_row_idx = idx
                    break
            
            if header_row_idx is not None:
                # Dùng dòng tiêu đề tìm được làm tên cột, các dòng sau là dữ liệu.
                df_clean = df.iloc[header_row_idx + 1:].copy()
                df_clean.columns = df.iloc[header_row_idx].values
            else:
                df_clean = pd.DataFrame()

            # Chuẩn hóa tên cột chính
            # Các cột thông thường: Trụ cột, Nhóm tiêu chí, Mã, Tiêu chí, Level, Minh chứng, Nguồn, Trang, Năm, Ghi chú
            # Tìm cột nào chứa 'Mã', 'Trụ cột', 'Level'
            col_mapping = {}
            for col in df_clean.columns:
                col_str = str(col).strip().lower()
                if 'trụ cột' in col_str:
                    col_mapping[col] = 'Tru_cot'
                elif col_str == 'mã' or 'mã tiêu chí' in col_str:
                    col_mapping[col] = 'Ma_tieu_chi'
                elif 'tiêu chí' in col_str and 'nhóm' not in col_str:
                    col_mapping[col] = 'Ten_tieu_chi'
                elif 'level' in col_str:
                    col_mapping[col] = 'Level_raw'
                elif 'nhóm tiêu chí' in col_str:
                    col_mapping[col] = 'Nhom_tieu_chi'

            df_clean = df_clean.rename(columns=col_mapping)

            if 'Ma_tieu_chi' not in df_clean.columns or 'Level_raw' not in df_clean.columns:
                validation_logs.append({
                    "File": file_name,
                    "Ngân hàng": bank_name,
                    "Lỗi": "Thiếu cột bắt buộc (Mã hoặc Level)",
                    "Mức độ": "Nghiêm trọng"
                })
                continue

            # Lọc bỏ các dòng trống mã tiêu chí
            df_clean = df_clean.dropna(subset=['Ma_tieu_chi'])
            
            for _, row in df_clean.iterrows():
                ma = row.get('Ma_tieu_chi')
                tru_cot = row.get('Tru_cot', 'Chưa phân loại')
                level_val = row.get('Level_raw')

                # Validation kiểm tra Level hợp lệ (1, 2, 3, 4, 5 hoặc N/A hoặc NaN)
                status = "Hợp lệ"
                parsed_level = np.nan

                if pd.isna(level_val) or str(level_val).strip() in ["", "nan", "NaN"]:
                    status = "Thiếu dữ liệu Level"
                else:
                    val_str = str(level_val).strip().upper()
                    if val_str in ["N/A", "NA", "KHÔNG ÁP DỤNG"]:
                        parsed_level = "N/A"
                    else:
                        try:
                            f_val = float(val_str)
                            if 1 <= f_val <= 5:
                                parsed_level = f_val
                            else:
                                status = "Level ngoài khoảng 1-5"
                        except ValueError:
                            status = "Định dạng Level không hợp lệ"

                if status != "Hợp lệ":
                    validation_logs.append({
                        "File": file_name,
                        "Ngân hàng": bank_name,
                        "Mã tiêu chí": ma,
                        "Lỗi": status,
                        "Giá trị gốc": level_val,
                        "Mức độ": "Cảnh báo"
                    })

                all_data.append({
                    "Bank": bank_name,
                    "Tru_cot": tru_cot,
                    "Ma_tieu_chi": str(ma).strip(),
                    "Level_raw": level_val,
                    "Level_parsed": parsed_level,
                    "Status": status
                })

        except Exception as e:
            validation_logs.append({
                "File": file_name,
                "Ngân hàng": file_name,
                "Lỗi": f"Lỗi đọc file: {str(e)}",
                "Mức độ": "Nghiêm trọng"
            })

    return pd.DataFrame(all_data), pd.DataFrame(validation_logs)

def process_scores_and_export(df_merged):
    dashboard_cols = ["Bank", "Tru_cot", "Ma_tieu_chi", "Level_raw", "Level_Way_A", "Level_Way_B"]
    score_cols = [
        "Bank", "Tru_cot", "Score_Way_A_Mean", "Score_Way_B_Mean",
        "Total_Criteria", "Valid_Criteria_Way_B"
    ]
    if df_merged.empty:
        pd.DataFrame(columns=dashboard_cols).to_csv(
            OUTPUT_DIR / "dashboard_data.csv", index=False, encoding='utf-8-sig'
        )
        pd.DataFrame(columns=score_cols).to_csv(
            OUTPUT_DIR / "scores.csv", index=False, encoding='utf-8-sig'
        )
        print("[Cảnh báo] Không có dữ liệu hợp lệ; đã xuất CSV rỗng và báo cáo kiểm định.")
        return


    # Cách A: N/A không tham gia tính trung bình
    # Cách B: N/A được quy đổi thành mức 1

    def to_numeric_score(value):
        if pd.isna(value) or str(value).strip().upper() == "N/A":
            return np.nan
        return float(value)

    # Chuyển điểm hợp lệ về dạng số; N/A và dữ liệu thiếu thành NaN
    df_merged["Level_numeric"] = df_merged["Level_parsed"].apply(
        to_numeric_score
    )

    # Cách A: giữ NaN để pandas tự bỏ qua khi tính trung bình
    df_merged["Level_Way_A"] = df_merged["Level_numeric"]

    # Cách B: quy đổi N/A thành mức 1
    # Dữ liệu thiếu do chưa chấm KHÔNG tự động đổi thành 1
    is_na = (
        df_merged["Level_parsed"]
        .astype("string")
        .str.strip()
        .str.upper()
        .eq("N/A")
        .fillna(False)
    )

    df_merged["Level_Way_B"] = df_merged["Level_numeric"].copy()
    df_merged.loc[is_na, "Level_Way_B"] = 1

    # 1. Xuất dashboard_data.csv (Dữ liệu chi tiết từng tiêu chí của từng ngân hàng)
    df_merged[dashboard_cols].to_csv(OUTPUT_DIR / "dashboard_data.csv", index=False, encoding='utf-8-sig')

    # 2. Tổng hợp điểm số (scores.csv) theo Ngân hàng và Trụ cột
    # Tính điểm trung bình theo Cách A và Cách B
    score_summary_pillar = df_merged.groupby(['Bank', 'Tru_cot']).agg(
        Score_Way_A_Mean=('Level_Way_A', 'mean'),
        Score_Way_B_Mean=('Level_Way_B', 'mean'),
        Total_Criteria=('Ma_tieu_chi', 'count'),
        Valid_Criteria_Way_B=('Level_Way_B', 'count')
    ).reset_index()

    score_summary_pillar.to_csv(OUTPUT_DIR / "scores.csv", index=False, encoding='utf-8-sig')
    print(f"[Thành công] Đã xuất 'scores.csv' và 'dashboard_data.csv' vào thư mục '{OUTPUT_DIR}/'.")

if __name__ == "__main__":
    print("Đang đọc và kiểm định dữ liệu 5 ngân hàng...")
    df_merged, df_logs = load_bank_data()
    
    process_scores_and_export(df_merged)
    
    # Xuất báo cáo validation ra Excel
    validation_report_path = OUTPUT_DIR / "validation_report.xlsx"
    with pd.ExcelWriter(validation_report_path, engine='openpyxl') as writer:
        df_merged.to_excel(writer, sheet_name='Gộp dữ liệu chi tiết', index=False)
        df_logs.to_excel(writer, sheet_name='Báo cáo lỗi & Kiểm định', index=False)
    
    print(f"[Thành công] Đã xuất báo cáo kiểm định tại '{validation_report_path}'.")