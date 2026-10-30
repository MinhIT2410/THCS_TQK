# Patch 109 — Phong trào / hoạt động con / bài nộp GVCN / album ảnh

## Những file trong patch
- `supabase/migrations/109_movement_event_submissions.sql`: thêm cấu hình nộp ở movement_events, bảng bài nộp + tệp, RLS, bucket riêng tư.
- `src/components/activity/MovementEventSubmission.tsx`: GVCN lưu nháp, tải ảnh/MP3 (tối đa 20MB/tệp), dán link video, nộp.
- `src/components/admin/MovementSubmissionSettings.tsx`: cấu hình nhận bài ngay trên form, chọn hạn nộp, loại tệp và số ảnh.
- `src/components/admin/MovementSubmissionManager.tsx`: quản trị xem bài nộp, tệp bằng signed URL, yêu cầu bổ sung.
- `src/pages/MovementDetailPage.tsx`: hiển thị form nộp dưới hoạt động có bật nhận bài; đổi Minh chứng thành Album ảnh, chỉ lấy evidence_type=image.
- `src/pages/admin/AdminMovementsPage.tsx`: nút Bài nộp, nút Cài nộp bài cho hoạt động con (form cấu hình), đổi tên giao diện quản lý Minh chứng thành Album ảnh.
- `DATABASE_SCHEMA_DESCRIPTION_20261030.md`: bản mô tả cột, FK, RLS và Storage chi tiết từ SQL người dùng cung cấp.
- `DATABASE_SCHEMA_SNAPSHOT_20261030.json`: nguyên mẫu hai kết quả khảo sát database để tái sử dụng các lần sau.

## Cách triển khai
1. Sao lưu/đặt mốc GitHub trước khi thay đổi; kiểm tra SQL 109 với database thử trước.
2. Chạy SQL 109 rồi kiểm tra bucket movement-submissions `public=false`, hai bảng mới và policy.
3. Copy đúng bốn file TSX trong patch vào source **mới nhất**; kiểm tra GitHub Desktop DIFF, KHÔNG copy service/utility cũ.
4. `npm run lint`, `npm run build`, deploy thử và kiểm tra với tài khoản GVCN + tài khoản quản trị + tài khoản khách.
5. Ở quản lý Phong trào nhấp badge `0 HĐ` để tạo hoạt động con (đây là nút đã có); trong danh sách hoạt động con bấm `Cài nộp bài` để bật nhận bài. Quản trị bấm `Bài nộp` ngay trên hàng phong trào để xem nộp.
6. Nút MC giờ dùng cho Album ảnh. Chỉ ảnh evidence_type=image mới hiển thị ở mục công khai; các link chứng cứ cũ vẫn nằm trong DB, không bị xóa.

## CẢNH BÁO / GIỚI HẠN CẦN KIỂM TRA
- Chưa build thực tế trên GitHub mới nhất / chưa kiểm thử RLS Supabase trực tiếp.
- Đã bổ sung popup cấu hình nộp bài; bước tiếp theo có thể gom về tab chi tiết phong trào nếu cần.
- MP3 tối đa 20 MB; các video lớn dùng liên kết HTTPS, chủ tệp phải cấp quyền xem phù hợp.
- Ảnh và MP3 là tệp riêng tư: không sử dụng URL công khai; xem qua signed URL 60 giây.
- Album sử dụng bảng `movement_evidence`, không sử dụng `albums`; phù hợp scope theo phong trào. Các evidence không phải ảnh vẫn giữ nguyên trong DB.
- Trước khi phát hành chính thức phải kiểm tra trường hợp giáo viên không phải GVCN, quá hạn, sửa bài, người ngoài xem tệp, album công khai và Đại hội Chi đội cũ.
- Cơ chế upload giới hạn dung lượng theo bucket; phần ảnh chưa tự nén, nên khuyến khích tệp dưới 2MB. Phần cài nộp bài mặc định cho phép hình ảnh, tắt MP3/video trừ khi admin bật.
- Không có SQL xóa dữ liệu cũ.
