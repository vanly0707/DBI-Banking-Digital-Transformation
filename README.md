# DBI-Banking-Digital-Transformation
Xếp hạng mức độ Chuyển đổi số (CĐS) của 5 Ngân hàng Việt Nam theo bộ chỉ số DBI 
## ⚙️ Hướng dẫn cài đặt & Cấu hình trên VS Code

1. **Clone hoặc mở thư mục dự án** trong Visual Studio Code.
2. **Tạo môi trường ảo (Virtual Environment)** (Khuyên dùng):
   ```bash
   python -m venv venv
3. Kích hoạt môi trường ảo:
    Trên Windows (PowerShell/CMD): venv\Scripts\activate
    Trên Mac/Linux: source venv/bin/activate
4. Cài đặt các thư viện phụ thuộc:
    pip install -r requirements.txt

## 🚀 Hướng dẫn chạy Code
1. Từ terminal của VS Code, chạy lệnh: python src/merge_validate.py
    Sau khi chạy xong, kết quả sẽ được sinh ra trong thư mục outputs/:
        scores.csv: Tổng hợp điểm theo ngân hàng và theo từng trụ cột.
        dashboard_data.csv: Dữ liệu chi tiết từng tiêu chí phục vụ vẽ biểu đồ / dashboard.
        validation_report.xlsx: Báo cáo chi tiết kiểm định lỗi (thiếu dữ liệu, định dạng Level sai...).
2. Chạy kiểm thử tự động (Unit Tests): pytest