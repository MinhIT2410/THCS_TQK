# Trang chủ – 4 hoạt động theo mốc thời gian

## Nguồn
Patch tối thiểu từ `THCS_TQK-main(10).zip`, chỉ sửa `src/components/home/Home.tsx`.

## Thay đổi
- Khối phong trào trang chủ đọc `movementService.getPublishedCampaigns()` giống trang `/hoat-dong`.
- Chỉ chọn hoạt động đã công bố, không thuộc loại `thuong_xuyen`, có `start_date`.
- Sắp theo `start_date` giảm dần, lấy tối đa 4 hoạt động.
- Mỗi thẻ dẫn tới `/hoat-dong/:slug`, nút xem tất cả dẫn tới `/hoat-dong`.
- Không còn dùng `activities` demo/nguồn cũ cho khối này. Không đổi nguồn dữ liệu các khối khác.

## Triển khai
1. Sao lưu code đang chạy; xác nhận source hiện tại khớp `THCS_TQK-main(10).zip` trước khi chép.
2. Chép đúng file TSX vào dự án, không xóa file nào.
3. Chạy `npm ci` (nếu cần), `npm run lint`, `npm run build`.
4. Kiểm thử trang chủ có 0/1/4/>4 hoạt động, thứ tự mới nhất, các link, responsive, trạng thái lỗi tải.
5. Commit `fix(home): show four latest published timeline campaigns`.

Không có SQL migration, không thay đổi database, không sửa Markdown cũ.
