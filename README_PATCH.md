# PATCH V2 - Nhập lại GVCN + đặt lại mật khẩu mặc định theo lớp

## Vì sao file kết quả trước đó không có `gvcn@61`?
Các dòng trong ảnh của bạn là `UPDATED`: tài khoản đã tồn tại.
Patch trước cố tình **giữ nguyên mật khẩu của tài khoản cũ**, nên cột Mật khẩu tạm để trống.

## Bản V2 này thay đổi gì?
Trong bước Xem trước của import Giáo viên/Cán bộ có checkbox:

**Đặt lại mật khẩu GVCN đã có theo lớp**

Mặc định: **BẬT**.

Khi bật:
- Tài khoản chưa có -> tạo mới như trước.
- Tài khoản đã có -> không tạo trùng.
- Nếu là TEACHER có `class_name`, gán/kiểm tra GVCN như trước.
- Sau đó đặt lại mật khẩu theo lớp:
  - `6/1` -> `gvcn@61`
  - `6/10` -> `gvcn@610`
  - `6.1` -> `gvcn@6.1`
- File kết quả sẽ hiện mật khẩu vừa đặt lại ở cột `Mật khẩu tạm`.
- Nếu lớp đang có GVCN khác hoặc giáo viên đang chủ nhiệm lớp khác -> CONFLICT, không reset mật khẩu.

Khi tắt checkbox:
- Hành vi như patch trước: tài khoản cũ giữ nguyên mật khẩu.

## File thay đổi
- `src/features/users/import/UserImportModal.tsx`
- `src/features/users/userCreationApi.ts`
- `src/features/users/import/userImportParser.ts`
- `src/features/users/import/userImportTemplate.ts`
- `src/features/users/import/userImportTypes.ts`
- `supabase/functions/admin-create-users/index.ts`

## Triển khai
1. Copy đè các file theo đúng đường dẫn.
2. Commit/push để Vercel deploy.
3. Deploy lại **Supabase Edge Function `admin-create-users`**.
4. Không cần chạy migration SQL.

## Lưu ý bảo mật
Mật khẩu theo lớp rất dễ nhớ nhưng cũng dễ đoán. Sau khi phát tài khoản, nên yêu cầu giáo viên đổi mật khẩu cá nhân sau lần đăng nhập đầu tiên nếu hệ thống đã có luồng đổi mật khẩu.
