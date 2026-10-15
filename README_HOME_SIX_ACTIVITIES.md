# Trang chủ: Ẩn Tin tức và hiển thị 6 hoạt động

Nguồn: bản vá trang chủ 4 hoạt động đã gửi trước đó, dựa trên `THCS_TQK-main(10).zip`.

## Thay đổi
- `src/components/home/Home.tsx`: ẩn phần hiển thị khối Tin tức măng non ở trang chủ (không xóa code, route, CMS hay dữ liệu tin tức).
- Đổi giới hạn danh sách hoạt động theo mốc thời gian từ 4 thành 6, giữ nguyên điều kiện lọc, thứ tự theo ngày bắt đầu mới nhất, đường dẫn chi tiết và bố cục thẻ.

## Triển khai
Giải nén ZIP vào thư mục dự án, giữ đúng đường dẫn. Chỉ ghi đè file được liệt kê. Không xóa file khác. Nếu đã có thay đổi mới hơn trong `Home.tsx`, hãy so sánh và áp dụng đúng hai thay đổi trên thay vì ghi đè toàn bộ.

Không có SQL migration. Chạy `npm run build` và kiểm tra trang chủ, trang Tin tức, trang Hoạt động trước khi push production.

Commit: `fix(home): hide news block and show six timeline activities`
