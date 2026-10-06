# HOTFIX - Màn hình trắng sau Vercel deploy / lazy chunk lỗi

## Phạm vi
Chỉ sửa `src/App.tsx`.

Không đụng:
- Supabase/Auth logic
- Thi đua/báo cáo
- GVCN
- PDF
- auto-lock
- upload/nén ảnh
- DB / Edge Function

## Nguyên nhân xử lý
Ứng dụng dùng `React.lazy()` cho nhiều route. Sau một lần Vercel deploy, tab đang mở có thể còn giữ HTML/JS cũ và yêu cầu một file chunk hash cũ đã không còn tồn tại. Khi dynamic import lỗi, app trước đây không có ErrorBoundary nên có thể trắng toàn màn hình.

## Cách hotfix
- Thay route-level `React.lazy()` bằng `lazyWithReload()`.
- Khi gặp đúng lỗi dynamic-import/chunk:
  1. tự reload đúng **1 lần**
  2. lấy index + chunks mới từ deployment hiện tại
  3. nếu vẫn lỗi thì **không loop**, hiện màn hình thông báo và nút `Tải lại trang`
- Khi route load thành công, cờ reload được xóa.

## Triển khai
Copy đè:
`src/App.tsx`

Sau đó commit/push Vercel.

Không SQL. Không Edge Function.
