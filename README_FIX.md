# Đại hội Chi đội - GVCN gửi biên bản online

## Chức năng
Khi mở hoạt động có tiêu đề chứa "Đại hội Chi đội", hệ thống hiển thị thêm
**Biên bản Đại hội Chi đội trực tuyến**.

GVCN đăng nhập sẽ:
- Tự nhận lớp theo phân công GVCN của đúng năm học.
- Vì dùng `class_id`, lớp `6/1` và `6.1` vẫn là hai lớp độc lập; chưa cần thêm trường cơ sở ở bước này.
- Điền thời gian, địa điểm, sĩ số, số tham dự, chủ tọa, thư ký.
- Điền nội dung/diễn biến, kết quả biểu quyết/bầu cử, BCH Chi đội, ghi chú.
- Đính kèm tối đa 3 ảnh JPG/PNG/WEBP, mỗi ảnh tối đa 8MB.
- Lưu nháp hoặc Nộp biên bản.
- Sau khi nộp vẫn có thể cập nhật/nộp lại khi cần.

Dữ liệu được lưu vào:
`public.chi_doi_congress_submissions`

Ảnh được lưu trong bucket hiện có:
`school-media/dai-hoi-chi-doi/<user_id>/...`

Bước này mới tập trung phần GVCN gửi dữ liệu. Phần quản trị nhận danh sách,
duyệt/tổng hợp/xuất biên bản sẽ làm tiếp dựa trên dữ liệu đã lưu.

## Cài đặt
1. Copy đè các file đúng đường dẫn trong ZIP.
2. Chạy migration:
   `supabase/migrations/085_chi_doi_congress_online_submissions.sql`
3. Commit/deploy Vercel như bình thường.

## Lưu ý kiểm thử
Source ZIP gốc trong môi trường chưa có `node_modules`, nên lệnh TypeScript build/lint
không thể chạy đầy đủ tại đây do thiếu dependencies. Các file được viết theo cấu trúc
Supabase/React hiện tại của project.

## Commit gợi ý
`feat(activities): add online chi doi congress submission for homeroom teachers`
