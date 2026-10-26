# Patch quản trị Mở rộng – IC3

## Đúng cấu trúc yêu cầu
- Menu bên trái: **Tin tức → Mở rộng** (`/quan-tri/mo-rong`).
- Trang **Mở rộng** là lưới thẻ quản lý; thẻ đầu tiên là **Quản lý Tin học quốc tế**.
- Chọn thẻ sẽ mở `/quan-tri/ic3` để nhập mã mở bài riêng cho 35 bài Test (khối 6: 9, khối 7: 12, khối 8: 14).
- Trên bảng Tổng quan, thẻ **Quản lý Tin tức** được thay bằng **Mở rộng**.
- Route quản trị `/quan-tri/tin-tuc` chỉ chuyển về `/quan-tri/mo-rong`; không còn trang quản lý Tin tức trong menu hoặc bảng Tổng quan.
- **Không xóa dữ liệu tin tức trên Supabase**, vì xóa dữ liệu là thao tác riêng không được yêu cầu.

## Các file code thay đổi
- `src/App.tsx`
- `src/config/adminMenu.ts`
- `src/config/ic3Catalog.ts`
- `src/pages/InternationalITPage.tsx`
- `src/pages/admin/AdminIc3Page.tsx`
- `src/pages/admin/AdminExtensionsPage.tsx` (mới)
- `src/pages/admin/AdminDashboardPage.tsx`

## Database
- `supabase/migrations/095_ic3_test_access_codes.sql`: SQL tạo bảng mã bài và chính sách quyền. Nếu đã chạy SQL của patch trước đó, **không cần chạy lại nếu đã có bảng và chính sách đúng**.

## Cài đặt
1. Giải nén và đối chiếu từng file trước khi copy đè vào project mới nhất.
2. Chạy migration SQL trong Supabase nếu chưa chạy.
3. Build project và thử bằng tài khoản quản trị.
4. Kiểm tra menu **Mở rộng**, thẻ **Quản lý Tin học quốc tế**, lưu mã từng bài, và quyền truy cập của học sinh.

## Lưu ý
Patch được xây dựng trên source ZIP đã cung cấp và patch IC3 ngay trước đó, không thay thế service/logic thi đua. Chưa có kết quả kiểm thử build hoặc chạy SQL trên dự án triển khai. Không sao chép nội dung đề IIG.
