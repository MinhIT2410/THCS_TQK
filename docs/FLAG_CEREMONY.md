# Nền tảng chào cờ đồng bộ trong thẻ Hoạt động

## Luồng sử dụng

- `/hoat-dong`: trang điều hành / màn hình lớp cho nghi lễ chào cờ.
- `/hoat-dong-phong-trao`: giữ lại trang phong trào cũ.
- Lớp học mở `/hoat-dong`, chọn lớp và giữ trang mở.
- Người điều hành đăng nhập bằng vai trò `SUPER_ADMIN`, `PRINCIPAL`, `VICE_PRINCIPAL` hoặc `STAFF`.
- Chọn tuần chu kỳ 1–3 và buổi sáng/chiều.
- Bấm **Mở phiên** để các lớp ổn định.
- Bấm **Bắt đầu sau 10 giây**. Hệ thống lưu một mốc thời gian tuyệt đối và các màn hình cùng đếm ngược.
- Khi hết đếm ngược, màn hình hiển thị **NGHIÊM – CHÀO CỜ – CHÀO!**.
- Bấm **Kết thúc nghi lễ** để các lớp tiếp tục HĐTN.

## Phân nhóm đã cài theo TKB

### Buổi sáng
- Khối 6: 6/1–6/8, 6/16–6/19
- Khối 7: 7/1–7/9, 7/16
- Khối 8: 8/1–8/8
- Khối 9: 9/1–9/16

### Buổi chiều
- Khối 6: 6/9–6/15
- Khối 7: 7/10–7/15
- Khối 8: 8/9–8/14

### Xuống sân theo chu kỳ
- Tuần 1: khối 6 (sáng/chiều)
- Tuần 2: khối 7 + 8 (sáng/chiều)
- Tuần 3: khối 9 buổi sáng; buổi chiều không có nhóm khối 9 xuống sân

Các lớp HĐTN cùng buổi nhưng không nằm trong nhóm xuống sân vẫn thực hiện nghi lễ tại lớp theo cùng tín hiệu.

## Supabase realtime

Chạy file `supabase/flag_ceremony.sql` một lần trong Supabase SQL Editor.

Bảng `flag_ceremony_state` lưu trạng thái hiện hành để lớp vào muộn vẫn đọc đúng phiên hiện tại. Postgres Changes được bật để các thiết bị nhận trạng thái realtime. Supabase Presence dùng để trang điều hành đếm các lớp đang mở màn hình.

RLS:
- `anon` và `authenticated`: được đọc trạng thái.
- Chỉ các tài khoản có vai trò `SUPER_ADMIN`, `PRINCIPAL`, `VICE_PRINCIPAL`, `STAFF`: được thay đổi trạng thái.

## Lưu ý âm thanh

Phiên bản này đồng bộ **tín hiệu và mốc thời gian nghi lễ**, chưa tự phát Quốc ca. Nếu cần phát Quốc ca ở từng lớp, nên thêm file âm thanh nội bộ được cache trước trên thiết bị và cho giáo viên bấm “Kích hoạt âm thanh” trước phiên để tránh hạn chế autoplay của trình duyệt.
