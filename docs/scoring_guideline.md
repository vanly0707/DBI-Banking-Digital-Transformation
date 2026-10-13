# Hướng dẫn chấm điểm Level 1–5

Quy tắc chấm cho Bước 3. Mỗi người chấm trực tiếp trong file Excel của ngân hàng mình (`data/raw/evidence/`), đối chiếu với `data/raw/DBI_criteria.xlsx` (140 tiêu chí, 6 trụ cột, 25 nhóm).

## 1. Nguyên tắc

1. Chấm theo minh chứng đã ghi, không chấm theo ấn tượng chung về ngân hàng.
2. Chọn **mức cao nhất mà toàn bộ mô tả của mức đó có đủ bằng chứng**. Phân vân giữa hai mức thì chọn mức thấp hơn và ghi lý do vào Ghi chú.
3. Mỗi điểm phải truy xuất được: có Minh chứng, Nguồn, Trang, Năm.
4. Không có bằng chứng công khai thì ghi `N/A`, không suy ra là "chưa triển khai".

## 2. Cách đọc 5 mức

Khoảng một nửa số tiêu chí phân biệt các mức theo **phạm vi áp dụng**; phần còn lại theo **giai đoạn hoặc độ trưởng thành** của thực hành (mục 4). Mức 5 gần như luôn thêm "đối tác trong hệ sinh thái".

| Mức | Phạm vi                                       |
| --- | --------------------------------------------- |
| 1   | Chưa có hoặc theo sự vụ                       |
| 2   | Một số bộ phận, đơn vị                        |
| 3   | Hầu hết bộ phận, đơn vị (hoặc một cụm đơn vị) |
| 4   | Toàn ngân hàng                                |
| 5   | Toàn ngân hàng và đối tác trong hệ sinh thái  |

Với mỗi tiêu chí, trả lời ba câu hỏi rồi đối chiếu mô tả trong DBI: (a) có tồn tại không; (b) phạm vi: một phần, một cụm, toàn ngân hàng hay cùng đối tác; (c) có số liệu hoặc cam kết đo lường không.

| Bằng chứng                                                | Mức tương ứng |
| --------------------------------------------------------- | ------------- |
| Một sản phẩm, chi nhánh, dự án thí điểm                   | 2             |
| Một khối hoặc cụm đơn vị                                  | 3             |
| Chính sách, hệ thống "toàn hàng" có minh chứng đi kèm     | 4             |
| Toàn hàng cộng đối tác, hệ sinh thái mở, API/open banking | 5             |
| Chỉ có định hướng, kế hoạch                               | Tối đa 2      |

## 3. Xử lý `N/A`

- Level ghi `N/A`, không để trống. Minh chứng ghi "Không tìm thấy thông tin công khai."; Nguồn, Trang, Năm để trống. Đã tra nguồn nào thì ghi vào Ghi chú.
- `N/A` khác Mức 1: Mức 1 là có cơ sở cho rằng ngân hàng chưa có; `N/A` là chưa biết.
- Python tự xử lý: Cách A bỏ `N/A` khỏi trung bình, Cách B quy `N/A` thành Mức 1.


## 4. Nguồn minh chứng (theo thứ tự ưu tiên)

1. BCTN FY2025, BC phát triển bền vững, báo cáo quản trị, Basel II/Trụ cột 3, ĐHĐCĐ, BCTC.
2. Website chính thức của ngân hàng.
3. Cửa hàng ứng dụng (tính năng, ngày cập nhật).
4. Tin tức, giải thưởng (ghi ngày đăng).

Chỉ dùng dữ liệu công khai. Nhiều nguồn thì cách nhau bằng dấu chấm phẩy ( ; ).

## 5. Cách điền file Excel

Sheet "Chấm điểm" (140 dòng, tiêu đề ở dòng 1). **Chỉ điền cột nền vàng E–J**, không sửa cột xám, không đổi tên cột, mã, thứ tự dòng.

| Cột          | Nội dung                                                |
| ------------ | ------------------------------------------------------- |
| E Level      | Chọn 1–5 hoặc N/A từ danh sách                          |
| F Minh chứng | Tóm tắt ngắn, ưu tiên có số liệu                        |
| G Nguồn      | Tên tài liệu hoặc URL                                   |
| H Trang      | Số trang; website ghi `web`                             |
| I Năm        | Số nguyên, ví dụ 2025                                   |
| J Ghi chú    | Lý do chọn mức, điểm phân vân (không đưa lên dashboard) |

Tên ngân hàng ở ô B3 và người phụ trách ở B4 của sheet "Hướng dẫn" (không sửa B3, code đọc ô này). Mỗi file chỉ một người sửa.

**Trước khi nộp:** bảng tiến độ ở sheet "Hướng dẫn" có "Còn trống" = 0 và ba ô kiểm tra D35:D37 = 0; mọi dòng có Level đều có đủ Minh chứng, Nguồn, **Trang, Năm** (bảng tự động chưa kiểm hai cột này); chạy thử `merge_validate.py` và xử lý hết lỗi.
