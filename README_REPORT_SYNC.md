# Hotfix đồng bộ mẫu báo cáo GVCN / Quản trị

Nguồn: THCS_TQK-main (1).zip người dùng gửi ngày 16/10/2026.

## Các file thay đổi
- src/components/competition/ReportDocument.tsx: cùng một mẫu live preview cho các vai trò; tiêu đề theo Tuần/Tháng/Học kỳ I-II/Năm học. Giữ nguyên bản snapshot đã lưu.
- src/services/competitionReportConfigService.ts: chuẩn hóa lỗi chính tả THI ĐƯA và mẫu cấu hình mặc định; tương thích với cấu hình CMS cũ khi hiển thị, không cập nhật database.
- src/components/admin/competition/ReportTemplateTab.tsx: sửa văn bản mặc định ở phần xem trước cấu hình.

## Giới hạn
- Không thay đổi phân quyền, phạm vi lớp của GVCN, dữ liệu học sinh, bảng DB, PDF exporter hoặc các file MD có sẵn.
- Không tự thay đổi cấu hình đã lưu trong site_settings; cấu hình CMS tùy biến vẫn được ưu tiên.
- Không có lệnh SQL hoặc xóa dữ liệu.
- Chưa chạy npm run lint/build toàn dự án vì source ZIP không kèm node_modules.

## Triển khai
Chép đè 3 file đúng đường dẫn, xem GitHub Desktop Changes, chạy npm run lint && npm run build, kiểm tra GVCN (Tuần, Tháng, Học kỳ I/II, Năm học), Admin và PDF trước khi push production.

Commit: fix(reports): synchronize homeroom and admin report headings
