# Website DBI · Hướng dẫn

Website tĩnh xếp hạng chuyển đổi số 5 ngân hàng theo bộ chỉ số DBI (bố cục tham khảo web nhóm 3, theme Terracotta).

## Cấu trúc thêm vào repo

```
config/weights.yaml      Trọng số 4 kịch bản (cơ sở, S1, S2, S3) + cấu hình mô phỏng Dirichlet
src/scoring.py           Đọc 5 file Excel minh chứng → tính Z, nhóm, trụ cột, DBI (Cách A/B), xếp hạng, Spearman, Dirichlet
outputs/ranking.xlsx     Bảng xếp hạng, điểm trụ cột, điểm nhóm, độ vững (do scoring.py tạo)
web/index.html           Trang web
web/styles.css           Giao diện (màu #8B3E33 / #FEF9F5 / #D9795B)
web/app.js               Logic: bộ lọc, biểu đồ, tra cứu, xuất CSV
web/data.js, data.json   Dữ liệu cho web (do scoring.py tạo; KHÔNG chứa cột Ghi chú)
```

## Chạy

```bash
pip install -r requirements.txt
python src/scoring.py          # mỗi lần sửa file Excel minh chứng thì chạy lại
```

## C1: Chạy web trên VSCode
py -m pip install -r requirements.txt
py -m pip install pyyaml
py src/scoring.py
py -m http.server 8000 --directory ".\web"

# Sau đó click
 http://localhost:8000/

## C2: Mở website đã deploy lên vercel
https://dbi-banking-digital-transformation.vercel.app/ 

**Đổi tên nhóm:** sửa dòng `const TEAM_LABEL = "Nhóm 0X";` ở đầu `web/app.js`.

## Các phần trên web

1. Bộ lọc: ngân hàng · thước đo (% hoặc /5) · kịch bản trọng số · Cách A/B · Đặt lại
2. 4 thẻ KPI: điểm trung bình, số bản ghi, độ phủ bằng chứng, phạm vi
3. Thẻ ngân hàng hạng 1 (hoặc ngân hàng đang chọn) + hồ sơ năng lực
4. Bảng xếp hạng (lọc theo từng trụ cột), phân loại theo mức trung bình
5. Radar so sánh 2 ngân hàng · khoảng cách điểm theo trụ cột
6. Bản đồ nhiệt 6 trụ cột / 25 nhóm (nhấn ô → mở minh chứng)
7. Biểu đồ DBI theo 4 kịch bản trọng số
8. Tra cứu 700 bản ghi minh chứng (lọc, tìm, xem mô tả 5 mức, xuất CSV)
9. Phương pháp, bảng trọng số, Spearman, mô phỏng Dirichlet, hạn chế

