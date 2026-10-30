# HOTFIX 112 — Chỉ nộp sản phẩm thật, không tạo/lưu nháp

## Đúng yêu cầu
- Không còn nút **Lưu nháp** và không tạo bản ghi mới khi mới mở trang.
- GVCN chọn ảnh/MP3 hoặc nhập link video HTTPS, xem danh sách chuẩn bị nộp, bấm **Nộp sản phẩm** một lần.
- Không tệp và không link => nút bị khóa. Supabase RPC cũng từ chối, không thể lách chỉ bằng sửa trình duyệt.
- Các file được upload vào Storage riêng tư trước, sau đó transaction SQL tạo bài nộp `submitted` + metadata tệp. Lỗi thì trình duyệt cố dọn file vừa upload.
- Giữ nguyên bài nộp cũ, không tự xóa bản nháp cũ hoặc file đã nộp trước đó; GVCN có thể nộp bổ sung.

## FILE COPY ĐÈ
- `src/components/activity/MovementEventSubmission.tsx` (dựa trên HOTFIX 111, không thay service/chức năng khác)
- `supabase/migrations/112_movement_submit_without_draft.sql` (chạy SQL trước khi deploy frontend)

## TRIỂN KHAI
1. Đã chạy SQL 109 trước đó; chạy `112_movement_submit_without_draft.sql` trong Supabase SQL Editor. Sao lưu chính sách RLS và dữ liệu hiện hành trước khi chạy.
2. Chép đè một file TSX theo đường dẫn. So diff. `npm run build`, commit và push.
3. Kiểm thử GVCN: không chọn file -> không nộp được; chọn MP3 -> tên hiển thị trước khi bấm Nộp -> sau khi nộp hiển thị ở quản trị.
4. Kiểm thử link-only với hoạt động có `allow_video_link=true`; kiểm thử quyền GVCN khác lớp và hết hạn.
5. Quản trị xem danh sách tệp qua thành phần của HOTFIX 111.

## CẨN TRỌNG
- Nếu Storage upload thành công nhưng tab bị đóng trước RPC, có thể còn tệp staging không được tham chiếu. Trường hợp này cần job cleanup theo tuổi file; nó KHÔNG tạo bài nháp database nhưng vẫn có thể chiếm Storage tạm thời.
- SQL 112 thay policy upload và thu hồi quyền ghi trực tiếp vào bảng submission để không cho client bỏ qua kiểm tra. Các màn hình cũ còn gọi insert/update trực tiếp có thể mất chức năng đó; kiểm tra luồng Đại hội Chi đội độc lập (bảng khác) và nút duyệt của quản trị (chính sách UPDATE được giữ cho manager).
- Bản này không tự động xóa các bản nháp cũ vì tránh xóa dữ liệu thật; có thể rà soát và dọn sau khi kiểm thử.
- Chưa kiểm thử live Supabase và chưa build trên bản GitHub mới nhất.
