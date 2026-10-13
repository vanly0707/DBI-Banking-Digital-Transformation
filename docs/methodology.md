# Phương pháp tính chỉ số Chuyển đổi số ngân hàng (DBI)

## 1. Cơ sở

Nghiên cứu dùng bộ chỉ số **DBI** (theo QĐ 1567/QĐ-BKHCN 2025) làm khung đánh giá chính, thay cho cấu trúc 5 nhóm/22 chỉ số trước đây. Bộ chỉ số gồm **6 trụ cột, 25 nhóm, 140 tiêu chí**, mỗi tiêu chí có mô tả 5 mức trưởng thành nên chuyển được bằng chứng định tính thành điểm so sánh. Phạm vi: MB Bank, BIDV, TPBank, VietinBank, Vietcombank; dữ liệu công khai FY2025.

| Trụ cột       | Nhóm | Tiêu chí |
| ------------- | ---- | -------- |
| 1. Khách hàng | 4    | 25       |
| 2. Chiến lược | 6    | 24       |
| 3. Công nghệ  | 5    | 29       |
| 4. Vận hành   | 4    | 22       |
| 5. Văn hóa    | 3    | 22       |
| 6. Dữ liệu    | 3    | 18       |
| Tổng          | 25   | 140      |

Ý nghĩa từng trụ cột:

- Khách hàng: trải nghiệm, thấu hiểu và niềm tin của khách hàng.
- Chiến lược: marketing, hệ sinh thái, ngân sách, danh mục sản phẩm số, quản lý chiến lược.
- Công nghệ: kiến trúc, an toàn thông tin, AI và dữ liệu lớn, kết nối và tự động hóa.
- Vận hành: quản trị vận hành, đổi mới dịch vụ, triển khai (DevSecOps, CI/CD), vận hành (SRE).
- Văn hóa: giá trị doanh nghiệp, quản lý tài năng, môi trường làm việc.
- Dữ liệu: quản trị, kỹ thuật và khai thác giá trị dữ liệu.

Chi tiết xem `data/raw/DBI_criteria.xlsx`. Quy tắc chấm và cách đọc 5 mức xem `docs/scoring_guideline.md`.

## 2. Công thức

**Chuẩn hóa tiêu chí** (mức 1–5 về thang 0–100):

```
Z = (Mức − 1) / 4 × 100        (Mức 1 → 0, 2 → 25, 3 → 50, 4 → 75, 5 → 100)
```

**Tổng hợp theo tầng:**

- Điểm nhóm = trung bình Z các tiêu chí có điểm trong nhóm.
- Điểm trụ cột = trung bình các nhóm có điểm.
- **DBI = Σ(Wg × điểm trụ cột) / Σ Wg** trên các trụ cột có điểm. Trụ cột không có điểm thì bỏ và chuẩn hóa lại trọng số. DBI nằm trong 0–100.

**Xếp hạng:** DBI giảm dần, ngang điểm cùng hạng, kèm hạng theo từng trụ cột.

## 3. Trọng số

Kết quả chính dùng **6 trụ cột bằng nhau (1/6)**, vì 5 ngân hàng chưa đủ cơ sở thực nghiệm để ưu tiên trụ cột nào. Ba kịch bản để kiểm định độ nhạy (cấu hình trong `config/weights.yaml`):

| Kịch bản | Trụ cột nhấn mạnh | Trọng số trụ cột đó | Các trụ cột còn lại |
| -------- | ----------------- | ------------------- | ------------------- |
| S1       | Khách hàng        | 25%                 | 15%                 |
| S2       | Công nghệ         | 25%                 | 15%                 |
| S3       | Dữ liệu           | 25%                 | 15%                 |

## 4. Dữ liệu thiếu

Tiêu chí không có bằng chứng công khai ghi `N/A`, vì thiếu công bố chưa đồng nghĩa với chưa triển khai.

- **Cách A (chính):** bỏ `N/A` khỏi các phép trung bình. Báo cáo kèm **coverage = số tiêu chí có điểm / 140**.
- **Cách B (độ nhạy):** quy `N/A` thành Mức 1 (Z = 0). Cách này thưởng cho ngân hàng công bố nhiều hơn.

## 5. Kiểm định độ vững

- So thứ hạng giữa kịch bản cơ sở với S1–S3, và giữa Cách A với Cách B, bằng hệ số Spearman. Thứ hạng đổi thì nêu rõ ngân hàng nào đổi.
- Tùy chọn: mô phỏng trọng số ngẫu nhiên (Dirichlet, 1000 lần) để xem xác suất mỗi ngân hàng đứng từng hạng.

## 6. Luồng dữ liệu

5 file Excel (`data/raw/evidence/`) → `src/merge_validate.py` (gộp 700 dòng, kiểm tra mã, Level, minh chứng) → `scores.csv`, `dashboard_data.csv` → `src/scoring.py`, `src/ranking.py` (DBI, xếp hạng, độ vững) → `output/ranking.xlsx` và dashboard Streamlit.

## 7. Hạn chế

- Dựa vào dữ liệu công khai: thiếu công bố không có nghĩa chưa triển khai; đọc DBI cùng coverage.
- Trung bình hai tầng làm tiêu chí ở nhóm ít tiêu chí có ảnh hưởng lớn hơn.
- Trọng số bằng nhau là lựa chọn trung tính, không khẳng định các trụ cột quan trọng như nhau.
- Chấm điểm có tính chủ quan; giảm bằng quy tắc "mức cao nhất đủ bằng chứng" và bắt buộc ghi nguồn, trang, năm.
- Mẫu chỉ 5 ngân hàng nên thứ hạng nhạy với chênh lệch nhỏ.
- Bằng chứng lấy từ báo cáo FY2025 và nguồn công khai tại thời điểm thu thập.
