# PATCH: Luyện tập IC3 dành cho THCS

## Mục tiêu
- Giữ nguyên trang **Mở rộng** và các tiện ích hiện tại.
- Thẻ **Học Tin học quốc tế – IC3** chỉ giới thiệu nội dung IC3 dành cho học sinh THCS; bỏ nội dung MOS/tiểu học.
- Nút **Bắt đầu luyện tập** mở `https://ic3review.iigvietnam.edu.vn/` trong tab mới (`noopener noreferrer`).
- Không nhúng iframe, không sao chép đề, không tải ảnh/video từ trang bên ngoài về Supabase/Vercel của trường.

## File cập nhật
1. `src/pages/ExtensionsPage.tsx` – cập nhật tên và mô tả thẻ.
2. `src/pages/InternationalITPage.tsx` – thay nội dung Đang cập nhật bằng giao diện điều hướng luyện tập IC3.

## Cách triển khai
1. **Yêu cầu:** đã áp dụng bản ZIP `TQK_PATCH_MO_RONG_TIN_HOC_QUOC_TE.zip` trước đó (có trang `/mo-rong` và `/mo-rong/tin-hoc-quoc-te`).
2. Giải nén ZIP này ngay tại thư mục gốc của project (thư mục chứa `src`), ghi đè **đúng 2 file** nói trên.
3. Kiểm tra GitHub Desktop chỉ thay đổi các file mong muốn, rồi commit/push.
4. Truy cập `/mo-rong`, nhấn thẻ IC3, nhấn **Bắt đầu luyện tập**.

## Kiểm tra / lưu ý
- Trang `/tin-tuc`, hệ thống tin tức, thi đua, phân quyền và quản trị không bị đụng tới.
- Liên kết đi sang **dịch vụ bên ngoài**: hoạt động, môn học hiển thị, mật khẩu và kết quả phụ thuộc IIG Review. Không tự đăng nhập hoặc đồng bộ kết quả về trường.
- Học sinh lựa chọn **chương trình THCS** tại IC3 Review; hiện chưa có deep link được xác nhận tới từng bộ môn/bài.
- Không thêm bảng Supabase, biến môi trường hoặc dependency mới; không cần SQL.
- Bản này chưa chạy build trên môi trường cài đặt dependencies; nên build/kiểm thử trên source thực tế trước khi triển khai rộng.
