# Hotfix báo cáo giáo viên — đồng bộ mẫu học sinh

Nền đối chiếu: `THCS_TQK-main(9).zip` và bản vá chuyên cần giáo viên đã triển khai `THCS_TQK-teacher-attendance-changed-only.zip`.

## File thay đổi (chỉ 2 file TSX)
- `src/components/competition/TeacherAttendanceReport.tsx`: dùng lại bố cục đầu trang, tiêu đề, thông tin năm học/người lập, bảng viền và màu, mục nhận xét và chữ ký tương tự `ReportDocument.tsx` của báo cáo học sinh. Giữ truy vấn, lưu snapshot, bộ lọc, xuất PDF của nhánh giáo viên.
- `src/components/competition/SaveExportReportCard.tsx`: truyền cấu hình báo cáo CMS, năm học, người lập vào mẫu giáo viên. Không thay logic nhánh học sinh.

## Triển khai
Chỉ chép đè **hai file TSX** theo đường dẫn vào source hiện đang chạy bản chuyên cần giáo viên. Không áp dụng lại migration, không chép đè file báo cáo học sinh `ReportDocument.tsx`, không xóa file Markdown nào.

## Kiểm thử
- Học sinh: Tuần/Tháng/Học kỳ/Năm học, xem trước, lưu và PDF phải giữ nguyên.
- Giáo viên: xem trước, lọc giáo viên, lưu và xem báo cáo đã lưu, xuất PDF, kiểm tra trang dài và phần chữ ký.
- Đảm bảo quyền SELECT bảng `teacher_attendance_records` và `teacher_attendance_reports` đã cấp; RLS vẫn áp dụng.

## Giới hạn
Đã kiểm tra cú pháp TSX bằng TypeScript parser; chưa xác minh build/lint toàn dự án hay xuất PDF trên trình duyệt thật. PDF giáo viên vẫn dùng bộ xuất riêng của phiên bản trước, nên cần thử phân trang với nhiều ghi nhận. Báo cáo giáo viên chưa có phần chỉnh sửa nhận xét; chỉ giữ bố cục nhận xét để in.

Commit: `fix(competition): align teacher attendance report with student report layout`
