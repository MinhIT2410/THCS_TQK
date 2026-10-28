# PATCH 104 — Tab quản trị IC3 giống mục Thi đua

## Giao diện
Trang `/quan-tri/ic3` có ba tab theo mẫu tab ngang Thi đua:
- **Ngân hàng câu hỏi nội bộ**: nhúng nguyên component `Ic3QuestionBank` đang dùng, KHÔNG sửa dữ liệu / import ZIP / duyệt ảnh / hotfix 101–103.
- **IC3 Review (IIG)**: giữ nguyên phần chọn khối, bài, mã, lưu/xóa mã và tình trạng có mã; chuyển từ mục xổ xuống thành tab riêng.
- **Thống kê**: số bài, trạng thái, số học sinh, lượt làm hoàn tất, điểm trung bình và lượt đạt >=900, theo từng khối và từng Test.

Tab lưu trên URL `?tab=bank`, `?tab=review`, `?tab=statistics` để chia sẻ và tải lại vẫn ở đúng mục. Không đổi sidebar hay route.

## File patch
- `src/pages/admin/AdminIc3Page.tsx`: tab layout; mã IIG giữ theo bản 099.
- `src/components/admin/Ic3AdminStatistics.tsx`: mới, trang thống kê.
- `supabase/migrations/104_ic3_school_admin_statistics.sql`: mới, RPC tổng hợp quyền admin, điểm nội bộ đã chấm.

## Triển khai
1. Kiểm tra project đã có `Ic3QuestionBank.tsx` bản mới nhất (đặc biệt hotfix 101-103).
2. Chạy SQL 104 trong Supabase SQL Editor.
3. Copy 2 file TSX trong ZIP đúng đường dẫn; xem GitHub Desktop DIFF, tránh copy bất cứ file IC3 khác.
4. Chạy `npm run build` và test giao diện.
5. Kiểm tra cả ba tab; thử thêm câu, ZIP ảnh và duyệt trong tab Ngân hàng, mã trong tab IC3 Review, thống kê với khối 6 có dữ liệu.

## Dữ liệu thống kê
- Chỉ tính bảng `ic3_school_attempts` với status='finished' và score hợp lệ, không cộng điểm tự khai IC3 Review IIG.
- `>=900` là **số lượt nộp**, có thể một học sinh được tính nhiều lần.
- Lịch sử đã xóa bằng hotfix 101 không thể tự khôi phục và không còn trong thống kê.
- Truy vấn chỉ dành cho SUPER_ADMIN/PRINCIPAL/VICE_PRINCIPAL; không liệt kê thông tin định danh học sinh.

## Giới hạn
Đây là bản tab và thống kê thực, không phải dữ liệu giả. Không thay đổi chức năng backend IIG. Các file tạo dựa trên trang quản trị 099 và contract DB 098–103; nếu đã thay riêng `AdminIc3Page.tsx` sau bản 099, cần merge phần tab thay vì ghi đè các cải tiến khác. Chưa build trên source production hiện tại hoặc kết nối Supabase thật.
