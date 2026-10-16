# Bản vá: ghi nhận giáo viên ngoài danh sách / chưa rõ tên

## Phạm vi
- `src/components/competition/TeacherAttendanceForm.tsx`: tích lũy bản tìm kiếm giáo viên như học sinh; thêm chế độ chưa có hồ sơ/chưa rõ tên; lớp bắt buộc, môn và tên tùy chọn; giám thị ghi nhận chính thức; quản trị/ban giám hiệu có danh sách bản ghi cần xác minh và liên kết với hồ sơ giáo viên hiện có.
- `src/components/competition/TeacherAttendanceReport.tsx`: giữ nguyên mẫu PDF báo cáo giáo viên đã hotfix; ghi nhận chưa xác minh hiển thị riêng, không cộng gộp tất cả thành một giáo viên giả; bổ sung môn học trong chi tiết.
- `supabase/migrations/091_teacher_attendance_unidentified.sql`: thêm các cột trạng thái, cho phép `teacher_id` NULL; 2 RPC có kiểm tra quyền. Không sửa RLS cũ, không xóa bản ghi, không tạo tài khoản giáo viên.

## Thứ tự triển khai
1. Chạy SQL trong Supabase SQL Editor **trước** khi deploy code. Yêu cầu migration `086_teacher_attendance.sql` và GRANT SELECT/INSERT trước đó đã chạy.
2. Chép hai TSX vào đúng đường dẫn trong source đang chạy (đè đúng hai file; các file khác giữ nguyên).
3. Commit, deploy Vercel, hard refresh.

## Kiểm thử
1. Ghi nhận giáo viên có hồ sơ: tìm kiếm không dấu, chọn, lưu, xem báo cáo.
2. Chọn `Giáo viên ngoài danh sách / Chưa rõ tên`, bỏ trống tên, nhập lớp 7/1, quy tắc và thời gian, lưu. Thử bỏ trống lớp -> phải báo lỗi.
3. Lặp lại với giáo viên ngoài trường có tên; không tạo tài khoản.
4. Mở báo cáo giáo viên: cả hai bản ghi có nhãn `(chưa xác minh)`; không gộp 2 giáo viên chưa rõ tên vào một hàng.
5. Tài khoản admin/BGH: xem `Xác minh giáo viên chưa có trong danh sách`, chọn bản ghi và giáo viên có hồ sơ, xác nhận; kiểm tra báo cáo sau khi tải lại.
6. Tài khoản giám thị: vẫn ghi nhận được nhưng không được quyền gọi RPC xác minh.
7. Kiểm tra các hotfix báo cáo học sinh, PDF và ghi nhận học sinh không thay đổi.

## Lưu ý
- Trường hợp giáo viên ngoài trường chưa có hồ sơ sẽ được giữ ở trạng thái EXTERNAL/UNIDENTIFIED; chỉ liên kết khi có hồ sơ phù hợp, không tạo tài khoản tự động.
- Các báo cáo snapshot đã lưu trước đây vẫn giữ nguyên (đúng lịch sử tại thời điểm xuất).
- SQL chưa được thực thi trên Supabase của người dùng; chưa chạy build toàn dự án. Hai file TSX đã được kiểm tra cú pháp bằng TypeScript transpiler.
