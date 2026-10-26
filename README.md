# Patch Quản trị mã IC3 (cumulative)

## Chức năng
- Thêm **Quản lý IC3** vào sidebar quản trị (`/quan-tri/ic3`).
- Quản trị chọn khối, chọn bài, nhập/sửa/xóa mã riêng từng Test.
- Trang IC3 học sinh vẫn có **Chọn khối – Chọn bài**, bổ sung **Xem mã** và **Sao chép mã** cho tài khoản đăng nhập có quyền.
- Không đưa mật khẩu vào mã nguồn; không thể tự động điền lên trang IIG khi chưa có API.
- Giữ danh mục 9/12/14 bài đúng như ảnh IIG; mục Chủ đề mở rộng chưa có URL.

## Cách cài
1. Backup phiên bản đang hoạt động.
2. Copy đè đúng các file trong `src/`. Bản này tích lũy patch trang Mở rộng trước, nên đối chiếu nếu bạn đã thêm thay đổi khác sau bản source đã gửi.
3. MỞ Supabase SQL Editor và chạy `supabase/migrations/095_ic3_test_access_codes.sql` **một lần**. Nên kiểm tra trùng tên migration nếu nhánh dự án đã có migration 095.
4. Push Vercel, đăng nhập SUPER_ADMIN/PRINCIPAL/VICE_PRINCIPAL, truy cập `/quan-tri/ic3`.
5. Lưu mã thử, mở trang `/mo-rong/tin-hoc-quoc-te` bằng tài khoản học sinh thử, kiểm tra RPC và sao chép mã.

## An toàn, giới hạn
- Chỉ admin đọc trực tiếp bảng mã với RLS. RPC chỉ cấp mã cho tài khoản đăng nhập có role đã cho phép.
- Khi học sinh nhận mã, không thể chống việc học sinh chia sẻ mã ngoài hệ thống.
- Chưa có log SUBMIT ALL hay điểm số từ IIG.
- Các URL IIG theo mẫu trước đây **chưa được kiểm thử thực tế từng bài**.
- Chưa thực hiện build trong môi trường production.
- Không thay đổi quyền thi đua, thống kê hay dữ liệu tin tức.
