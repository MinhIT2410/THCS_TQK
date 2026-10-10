# Nâng cấp chuyên cần giáo viên — patch cho THCS_TQK-main(9)

## Phạm vi
- Thêm tab **Giáo viên** cạnh Cá nhân Đội viên / Chi đội trong `/thi-dua/ghi-nhan`.
- Thêm chọn **Học sinh (mặc định) / Giáo viên** bên phải Tuần/Tháng/Học kỳ/Năm học trong **Lưu báo cáo & Xuất file**. GVCN ở chế độ `exportOnly` không có tùy chọn giáo viên.
- Báo cáo giáo viên có lọc giáo viên, tổng hợp và chi tiết, lưu snapshot riêng, xuất PDF riêng.
- Quy tắc chuyên cần giáo viên được lưu trong bảng riêng `teacher_attendance_rules`; mặc định có đi trễ, vắng có phép, vắng không phép, rời tiết sớm. Quản lý quy tắc qua SQL/Admin DB; **chưa thêm giao diện CMS chỉnh quy tắc**.
- Không sửa các tab Ghi nhận trong tuần, Thống kê lỗi vi phạm, báo cáo/PDF học sinh, GVCN, quy trình duyệt, điểm lớp.

## File thay đổi
- `src/components/competition/CompetitionIncidentForm.tsx` (patch nhỏ, thêm lựa chọn)
- `src/components/competition/SaveExportReportCard.tsx` (patch nhỏ, thêm lựa chọn)
- `src/components/competition/TeacherAttendanceForm.tsx` (mới)
- `src/components/competition/TeacherAttendanceReport.tsx` (mới)
- `supabase/migrations/086_teacher_attendance.sql` (mới)

## Thứ tự triển khai an toàn
1. Backup Supabase (database + Storage riêng). Chạy migration trong project thử nghiệm trước.
2. Kiểm tra `profiles`/`user_roles`/`teacher_assignments` có đủ danh sách giáo viên. Danh sách được lấy qua RPC có giới hạn quyền.
3. Chạy migration `086_teacher_attendance.sql` trên database phù hợp. SQL **không xóa dữ liệu**, không ALTER bảng cũ, không DROP policy/function cũ.
4. Copy 4 file TSX đúng đường dẫn. **Không xóa bất cứ file cũ nào**.
5. Chạy `npm ci`, `npm run lint`, `npm run build` trên máy đã cài dependencies.
6. Test tài khoản giám thị: thẻ Giáo viên, chọn tên, loại lỗi, ngày/buổi/tiết, lưu; xem báo cáo tuần/tháng/học kỳ/năm học và PDF. Test BGH xem được. Test học sinh, Chi đội, GVCN và PDF cũ không đổi.
7. Chỉ sau khi test đạt mới commit/push production.

## An toàn dữ liệu và giới hạn
- `teacher_attendance_records` chỉ cho phép INSERT/SELECT qua RLS, không cấp UPDATE/DELETE policy; ghi nhận chính thức không thể tự xóa qua UI. BGH xử lý chỉnh sai qua quy trình kiểm soát riêng (chưa có UI).
- Không cộng/trừ điểm lớp, không ghi vào `competition_incidents`.
- Báo cáo snapshot giáo viên được lưu riêng; không đụng vào `competition_weekly_reports`.
- PDF giáo viên dùng bộ xuất độc lập; không thay `reportPdfExporter` hoặc mẫu PDF học sinh. Cần test phân trang PDF dài trước khi dùng chính thức.
- Quyền RLS cho giám thị dựa vào phân công SUPERVISOR còn hiệu lực hoặc vai trò quản trị/BGH. Nếu hệ thống có vai trò giám thị khác, cần bổ sung sau khi kiểm tra thực tế.
- Không thể xác nhận runtime Supabase, lint/build đầy đủ trong môi trường thiếu node_modules. Đã kiểm tra cú pháp TSX của 4 file bằng TypeScript parser.

Commit gợi ý: `feat(competition): add isolated teacher attendance recording and reports`
