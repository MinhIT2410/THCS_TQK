# Patch đồng bộ 38 mã IC3 GS6 – Khối 6, 7, 8

## Nội dung
- Khối 6 / Level 1: **9 bài + 1 Chủ đề mở rộng = 10 mã**.
- Khối 7 / Level 2: **12 bài + 1 Chủ đề mở rộng = 13 mã**.
- Khối 8 / Level 3: **14 bài + 1 Chủ đề mở rộng = 15 mã**.
- Tổng **38 mã** do quản trị cung cấp (không tự tạo mã).
- Chỉnh danh sách **Chủ đề 2–5 của Level 3** theo đúng tên và thứ tự trong bộ mã mới, tránh lấy nhầm mật khẩu.
- Quản trị IC3 quản lý cả Chủ đề mở rộng; học sinh đã đăng nhập có thể lấy và sao chép mã Chủ đề mở rộng.
- Chủ đề mở rộng chưa có link IIG trực tiếp, nên nút Mở bài của mục này vẫn không hoạt động.

## Cách cài chính xác
1. **Điều kiện tiên quyết:** Đã áp dụng `TQK_PATCH_QUAN_TRI_MO_RONG_IC3_DUNG_CAU_TRUC.zip` và migration `095_ic3_test_access_codes.sql`. Nếu chưa, áp dụng patch quản trị này trước.
2. Copy đè đúng 3 file code trong ZIP này vào source mới nhất:
   - `src/config/ic3Catalog.ts`
   - `src/pages/admin/AdminIc3Page.tsx`
   - `src/pages/InternationalITPage.tsx`
3. Chạy `supabase/migrations/096_ic3_allow_extension.sql` trong Supabase SQL Editor để cho phép mã Chủ đề mở rộng.
4. **Chạy RIÊNG** `PRIVATE_RUN_MANUALLY_IC3_38_CODES.sql` trong Supabase SQL Editor để nhập 38 mã.
5. **KHÔNG đưa file PRIVATE...SQL vào GitHub, không commit và không triển khai qua Vercel.** Để ngoài thư mục dự án. Lưu trữ và chia sẻ hạn chế.
6. Kiểm tra admin ở Quản trị → Mở rộng → Quản lý Tin học quốc tế (10/13/15 mục); học sinh đăng nhập thử chọn bài, nhấn xem và sao chép mã. Tài khoản khách không được đọc mã.

## Lưu ý
- Không tự điền mật khẩu vào giao diện IIG; học sinh sao chép và dán vào bài.
- Các URL bài IIG đang theo cấu trúc đoán từ tên; chưa kiểm tra trực tiếp toàn bộ 35 URL.
- Không sửa logic thi đua, quyền khác, danh mục Tin tức hoặc dữ liệu khác.
- Chưa thực hiện build đầy đủ hoặc chạy SQL trên Supabase thật.
