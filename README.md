# Patch 099 – Quản lý ngân hàng câu hỏi IC3

## Cấu trúc
Quản trị → Mở rộng → Quản lý Tin học quốc tế:
- Ngân hàng câu hỏi IC3 nằm ở đầu trang, có sẵn **7 chủ đề x 3 khối** (21 chủ đề).
- Admin chọn khối / chủ đề → thêm Test → thêm hoặc sửa câu hỏi trực tiếp.
- Nút **Tải Excel mẫu** tạo `MAU_NHAP_CAU_HOI_IC3.xlsx` gồm cột cố định: STT, Câu hỏi, A, B, C, D, Đáp án đúng, Giải thích, Mẹo ghi nhớ. Sheet phải tên `CAU_HOI`.
- Chọn file Excel, dữ liệu được kiểm tra trước khi nhấn Nhập. Trùng STT bị từ chối để tránh ghi đè.
- Test mới mặc định **bản nháp**. Chỉ xuất bản khi đã có ít nhất một câu hỏi.
- Quản lý mã mở bài IIG được giữ nguyên trong mục có thể bung/thu gọn bên dưới.

## File thay đổi
- `src/components/admin/Ic3QuestionBank.tsx` (mới)
- `src/pages/admin/AdminIc3Page.tsx` (thay bản đang dùng; giữ phần quản lý mã IIG)
- `supabase/migrations/099_ic3_school_bank_admin.sql` (mới)

## Triển khai
1. **Yêu cầu:** đã triển khai SQL 098 và giao diện quản trị IC3 + mã IIG trước đó.
2. Chạy **099** một lần trong Supabase SQL Editor.
3. Copy 2 file `src` đúng đường dẫn của project.
4. Kiểm tra GitHub Desktop diff (đặc biệt AdminIc3Page nếu có hotfix mới), commit/push.
5. Vào quản trị IC3 → chọn khối/chủ đề → Tạo Test → nhập câu hỏi → Xuất bản.

## Lưu ý an toàn
- Đáp án đúng chỉ được lấy từ RPC admin có kiểm tra quyền. Không cấp SELECT bảng câu hỏi cho học sinh.
- Các câu hỏi của một Test đã có lượt làm **không nên sửa** vì sẽ làm sai lịch sử chấm điểm. SQL hiện chặn cả sửa/thêm/xóa câu khi Test đã có lượt làm. Hãy tạo Test mới để phát hành bản khác.
- Import Excel hiện lưu từng dòng; nếu lỗi giữa chừng có thể đã nhập một phần. Khi đó tải lại danh sách, sửa Excel rồi tiếp tục.
- Không tự tạo toàn bộ Test 1–N; chỉ 21 chủ đề định sẵn, admin chủ động thêm Test theo nhu cầu.
- Không sửa SQL 095–098; không thay đổi thi đua, tin tức, báo cáo, mã IIG hoặc điểm cũ.
- Chưa chạy build / test Supabase trực tiếp. Kiểm thử với tài khoản admin và học sinh trên môi trường thử nghiệm trước khi áp dụng rộng.
