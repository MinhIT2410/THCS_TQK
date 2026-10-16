# Bổ sung Hủy ghi nhận giáo viên (bản vá tích lũy)

Dựa trên bản `THCS_TQK-teacher-incidents-in-history-changed-only.zip` (092) và báo cáo giáo viên mới nhất có tính năng giáo viên chưa xác định (091).

## Triển khai
1. Bắt buộc đã chạy migrations 086, 091 và 092.
2. Chạy `supabase/migrations/093_teacher_attendance_cancel.sql` trên Supabase SQL Editor trước.
3. Chép đúng hai file TSX theo đường dẫn, đè lên các file hiện tại tương ứng; không đè các file khác bằng source cũ.
4. Commit và deploy Vercel.

## Hành vi
- Người có COMPETITION_MANAGE hoặc admin được hủy ghi nhận giáo viên với lý do >=3 ký tự.
- Hủy mềm: giữ bản ghi, người hủy, thời gian, lý do và ghi audit. Không đảo điểm.
- Nhật ký hiển thị cả bản ghi đã hủy, có nhãn ĐÃ HỦY; bộ lọc Đã hủy hiển thị các ghi nhận đã hủy.
- Báo cáo chuyên cần loại trừ bản ghi đã hủy. Các snapshot báo cáo đã lưu trước đó không được tự sửa; cần tạo báo cáo mới nếu muốn cập nhật.
- Không thể chỉnh sửa hoặc hủy lần hai ghi nhận đã hủy (kiểm tra server).

## Kiểm thử
- Tạo một ghi nhận giáo viên; kiểm tra xuất hiện ở Nhật ký và báo cáo.
- Hủy với lý do; kiểm tra Nhật ký vẫn còn, có nhãn ĐÃ HỦY; báo cáo mới không còn tính lượt/phút.
- Thử sửa bản ghi đã hủy và gọi RPC hủy lần hai: phải bị từ chối.
- Xác minh ghi nhận học sinh và điểm thi đua không đổi.

Chưa chạy migration trên Supabase và chưa build toàn dự án.
