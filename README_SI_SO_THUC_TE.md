# Bản vá: Sĩ số thực tế lưu trực tiếp trong bảng lớp học

## Thứ tự triển khai (bắt buộc)
1. Chạy `supabase/migrations/20261016_class_actual_enrollment.sql` trong Supabase SQL Editor **trước** khi đưa code mới lên Vercel. SQL bổ sung `classes.actual_enrollment`, tính sĩ số hiện tại từ `student_enrollments` và gắn trigger tự cập nhật khi học sinh chuyển lớp, thêm hoặc bỏ phân lớp. Không thay đổi bản ghi học sinh hoặc `expected_capacity`.
2. Chép hai file TSX theo đúng đường dẫn vào source hiện tại, không thay thế nguyên dự án.
3. Deploy và mở Cài đặt → Lớp học. Cột **Sĩ số thực tế** nằm ngay sau **Sĩ số dự kiến**.
4. Mở báo cáo tháng 10/2026: 6/1=56, 7/1=56, 7/2=53, 7/4=56, 8/1=50, 8/2=54, 9/1=47.
5. Thử chuyển 1 học sinh giữa hai lớp (qua chức năng sẵn có) và kiểm tra cả hai cột sĩ số thực tế cập nhật sau khi tải lại trang.

## Phạm vi
- `src/features/settings/school-data/ClassesTab.tsx`: chỉ thêm cột hiển thị, không cho sửa thủ công.
- `src/components/competition/SaveExportReportCard.tsx`: dựa trên bản hotfix báo cáo sĩ số mới nhất; bỏ tải hàng nghìn `student_enrollments`, chỉ lấy `classes(id, actual_enrollment)` theo năm học.
- `supabase/migrations/20261016_class_actual_enrollment.sql`: tạo cột, backfill, trigger cập nhật tự động.

## Lưu ý
- Đây là **sĩ số hiện tại** của lớp theo năm học, không phải sĩ số lịch sử tại một ngày bất kỳ. Báo cáo tháng cũ nếu xuất lại sẽ dùng sĩ số hiện tại.
- Nếu có tiến trình thay đổi trực tiếp dữ liệu bằng cách tắt trigger hoặc truncate bảng phân lớp, cần chạy lại lệnh backfill để đồng bộ.
- Nếu SQL chưa chạy, code mới sẽ không đọc được cột và hiện lỗi tải sĩ số. Vì vậy triển khai SQL trước.
- Không sửa RLS, không thay đổi logic ghi nhận vi phạm hay các phần báo cáo khác.
- Chưa chạy build toàn dự án vì source đính kèm không chứa node_modules và lockfile.
