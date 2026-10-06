# PATCH - Nhập lại giáo viên không trùng + gán GVCN + mật khẩu mặc định

## Phạm vi
Patch chỉ sửa luồng nhập tài khoản Giáo viên/Cán bộ từ Excel.

## Hành vi mới

### 1) Lấy lớp của giáo viên từ file
- `roles` có `TEACHER`
- Nếu có `class_name`, hệ thống resolve lớp và hiểu đó là **lớp chủ nhiệm**.
- Nếu `academic_year_name` bỏ trống, hệ thống tự dùng năm học hiện tại khi chỉ có đúng một năm đang active.
- STAFF không có vai trò TEACHER thì không được gán lớp chủ nhiệm.

### 2) Nhập lại file không tạo trùng
Theo email:
- Email chưa có: tạo mới.
- Email đã có: không tạo Auth user mới, không reset mật khẩu.
- Bổ sung role còn thiếu, cập nhật họ tên nếu thay đổi.
- Nếu đúng GVCN đúng lớp: SKIPPED, không tạo assignment trùng.
- Nếu cần gán lớp lần đầu: UPDATED.
- Nếu lớp đang có GVCN khác: CONFLICT, không ghi đè.
- Nếu giáo viên đang chủ nhiệm một lớp khác trong cùng năm: CONFLICT, không tự chuyển lớp.

### 3) Mật khẩu mặc định cho GVCN mới
Chỉ áp dụng khi tạo **tài khoản TEACHER mới có lớp chủ nhiệm**:
- Lớp `6/1` -> `gvcn@61`
- Lớp `6/10` -> `gvcn@610`
- Lớp phân hiệu `6.1` -> `gvcn@6.1`

Dấu chấm được giữ lại để tránh `6/1` và `6.1` dùng cùng mật khẩu.

Tài khoản đã tồn tại khi nhập lại file: **không đổi/reset mật khẩu**.

### 4) Kết quả import rõ trạng thái
- CREATED = Tạo mới
- UPDATED = Cập nhật/gán thêm
- SKIPPED = Đã có, không làm lại
- CONFLICT = Xung đột GVCN, không ghi đè
- FAILED = Lỗi

## Cách triển khai

1. Copy đè đúng các file trong patch vào repo hiện tại.
2. Commit/push để Vercel build frontend.
3. QUAN TRỌNG: deploy lại Supabase Edge Function `admin-create-users`.
   - Dashboard Supabase -> Edge Functions -> `admin-create-users`
   - Deploy source mới, hoặc dùng Supabase CLI nếu repo của bạn đang deploy function bằng CLI.
4. Không có migration SQL mới trong patch này.

## Lưu ý an toàn
- Không xóa account cũ.
- Không reset password khi nhập lại.
- Không tự ghi đè GVCN hiện có.
- Student import giữ logic cũ.
