# Nhật ký: bổ sung sự việc chuyên cần giáo viên

## Nội dung
- `src/components/admin/competition/IncidentsHistoryTab.tsx`: hiển thị các ghi nhận giáo viên cùng trang Nhật ký; bộ lọc và tìm kiếm; chỉnh sửa quy tắc, ngày giờ, buổi, tiết, lớp, phút, ghi chú; bắt buộc lý do.
- `supabase/migrations/092_teacher_attendance_history_edit.sql`: bổ sung quyền đọc cho quản lý thi đua, RPC chỉnh sửa kiểm tra quyền phía server, bảng audit lưu trước/sau và lý do.

## Triển khai
1. **Điều kiện:** đã chạy migration `086_teacher_attendance.sql` và `091_teacher_attendance_unidentified.sql` (bản vá giáo viên chưa rõ tên) trước đó.
2. Chạy `092_teacher_attendance_history_edit.sql` trên Supabase SQL Editor (chỉ một lần).
3. Chép đúng đường dẫn file TSX vào source hiện đang dùng. Không thay các file TSX khác bằng source cũ.
4. Commit và deploy.

## Kiểm thử
- Đăng nhập quản trị có quyền COMPETITION_MANAGE; Nhật ký hiện ghi nhận giáo viên đã lưu, kể cả ghi nhận của tuần hiện tại.
- Chỉnh sửa một ghi nhận giáo viên (ví dụ 10 phút -> 12 phút), nhập lý do; kiểm tra báo cáo giáo viên phản ánh 12 phút sau khi tải lại.
- Kiểm tra bảng `teacher_attendance_edit_audit` lưu dữ liệu trước/sau và người sửa.
- Giám thị không có quyền quản lý: không thấy nút sửa; RPC trực tiếp bị từ chối.
- Ghi nhận học sinh vẫn có nút Hủy & Đảo Điểm; ghi nhận giáo viên không có nút này.

## Lưu ý
- Giữ hai bảng sự việc riêng biệt để không tác động điểm thi đua lớp.
- Chỉ hiển thị tối đa 500 ghi nhận giáo viên gần nhất trên trang Nhật ký; cần phân trang riêng nếu dữ liệu lớn.
- Bản vá không xóa dữ liệu, không sửa logic ghi nhận hoặc báo cáo.
- Chưa thực thi SQL trên Supabase; chưa build toàn dự án.
