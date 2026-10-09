# Chỉnh sửa ghi chú trong Nhật ký thi đua

Patch dựa trực tiếp trên THCS_TQK-main(6).zip, chỉ bổ sung vào source hiện tại.

## Phạm vi
- Nút **Chỉnh sửa ghi chú** trong Quản trị → Thi đua → Nhật ký.
- Chỉ tài khoản SUPER_ADMIN hoặc có quyền COMPETITION_MANAGE được sửa.
- Sửa Ghi chú / mô tả và Ghi chú minh chứng, bắt buộc nhập lý do.
- Hiển thị hai nội dung này ngay trong thẻ sự việc.
- Giữ nguyên tiêu đề, quy tắc, học sinh, lớp, thời điểm, người ghi nhận, người duyệt, trạng thái và toàn bộ giao dịch điểm.
- Nếu sai lỗi vi phạm, học sinh, lớp hoặc thời điểm: dùng Hủy & Đảo Điểm rồi ghi nhận lại như hiện tại.
- Cho sửa ghi chú của sự việc APPROVED/PENDING/DRAFT; không sửa sự việc CANCELLED/REJECTED.
- Cho sửa ghi chú ngay cả khi tuần đã khóa vì không tác động điểm hay xếp hạng.
- Lưu dữ liệu trước/sau, người sửa, thời điểm, lý do trong competition_incident_edits. Bảng này dành cho kiểm tra quản trị; chưa có màn hình riêng xem lịch sử chỉnh sửa.
- Chặn ghi đè khi bản ghi thay đổi kể từ lúc mở cửa sổ.

## Cài đặt
1. Chép 2 file src trong ZIP vào đúng đường dẫn repository đang dùng.
2. Chạy toàn bộ `supabase/migrations/089_admin_edit_competition_incident_notes.sql` trong Supabase SQL Editor trước khi triển khai frontend. Migration tạo bảng lịch sử và RPC; không thay đổi dữ liệu tính điểm hiện có.
3. Commit và deploy frontend như bình thường.

Commit gợi ý: `feat: allow admins to edit incident notes without changing points`

## Kiểm tra đã thực hiện
- Production build: PASS (có cảnh báo kích thước chunk hiện hữu).
- PostgreSQL cục bộ bằng PGlite: PASS cho cập nhật ghi chú, giữ nguyên danh tính/trạng thái/điểm, lưu audit, chặn bản ghi cũ, lý do trống, không có thay đổi, không đủ quyền và sự việc đã hủy.
- TypeScript: so sánh source gốc và patch với cùng môi trường; không phát sinh lỗi mới. Source gốc vẫn có lỗi kiểu ở các phần khác; không sửa lan sang chúng.
- competitionService.ts: phần code có sẵn giữ nguyên; chỉ thêm method gọi RPC.
- Chưa chạy migration hoặc thử tài khoản trên Supabase production của trường.

## Thử sau triển khai
- Mở một sự việc đã duyệt, sửa ghi chú và nhập lý do; lưu rồi làm mới để kiểm tra.
- Kiểm tra điểm lớp/học sinh và trạng thái duyệt không đổi.
- Sửa hai cửa sổ cùng một sự việc: cửa sổ lưu sau phải báo bản ghi đã thay đổi.
- Tài khoản chỉ có quyền ghi nhận/duyệt không có nút sửa ghi chú và bị RPC từ chối.

## File trong patch
- src/components/admin/competition/IncidentsHistoryTab.tsx
- src/services/competitionService.ts
- supabase/migrations/089_admin_edit_competition_incident_notes.sql
- docs/ADMIN_EDIT_INCIDENT_NOTES.md
