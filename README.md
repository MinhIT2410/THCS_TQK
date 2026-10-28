# IC3 – Nhật ký mở bài & nộp điểm (patch tối thiểu)

## Thay đổi
- `src/pages/InternationalITPage.tsx`: chỉ tài khoản đăng nhập mới mở bài; tạo log trên máy chủ trước khi chuyển sang IIG; khi quay về tab Liên đội, học sinh nhập điểm 0–1000 và gửi.
- `src/pages/admin/AdminIc3Page.tsx`: bảng log 200 lượt gần nhất (mã tài khoản, bài, thời gian, điểm tự khai báo, trạng thái), có nút làm mới.
- `supabase/migrations/097_ic3_practice_attempts.sql`: bảng dữ liệu, RLS, hai RPC có kiểm tra quyền. Không sửa các bảng thi đua.

## Thứ tự triển khai
1. Chạy `097_ic3_practice_attempts.sql` trong Supabase SQL Editor, sau các migration IC3 095, 096.
2. Copy đè hai file `src/pages/...` trong ZIP; **chỉ dùng khi đã cài patch IC3 đồng bộ 38 mã**.
3. Chạy `npm run lint` và `npm run build`, rồi commit/push.
4. Kiểm tra đăng nhập bằng một tài khoản trường, mở bài, quay về tab trường nhập điểm; xác minh trong quản trị IC3.

## Giới hạn quan trọng
- Website trường **không thể tự biết** người dùng nhấn SUBMIT ALL bên IIG, cũng không thể tự đọc điểm khi IIG không hỗ trợ tích hợp. `self_reported` là **điểm học sinh tự khai báo**, không phải điểm được IIG xác thực.
- Nút mở bài ghi log `opened` thành công trước khi tải trang IIG; không chứng minh học sinh bắt đầu làm hoặc nộp bài.
- Danh sách quản trị hiện hiện UUID tài khoản (chưa ghép bảng thông tin học sinh/lớp).
- Nếu học sinh tải lại tab trường trước khi gửi điểm, trạng thái lượt mở vẫn được lưu tại Supabase nhưng form nhập điểm trong tab hiện tại bị mất; cần phiên bản tiếp theo khôi phục lượt chưa nộp.
- Không sao chép đề IIG, không ghi mã truy cập vào log.
- Không có SQL xóa dữ liệu; file này độc lập và không tác động thi đua.
