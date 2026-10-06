# PATCH - Hiển thị ghi chú lỗi trong báo cáo thống kê

## Yêu cầu
Nếu một ghi nhận vi phạm có phần ghi chú do giám thị/người ghi nhận nhập, báo cáo sẽ hiển thị thêm ghi chú trong ngoặc ngay sau lỗi.

Ví dụ:
`Đi học trễ: 1 lần — 05/10 07:01 (Đến cổng sau khi trống vào lớp)`

Nếu cùng học sinh + cùng lỗi có nhiều ghi chú khác nhau:
`... (Quên phù hiệu; Không mang khăn quàng)`

## Cách hoạt động
- Lấy trực tiếp `competition_incidents.evidence_note` đã có sẵn.
- Gom theo Học sinh + Quy tắc như báo cáo hiện tại.
- Bỏ ghi chú rỗng.
- Loại bỏ ghi chú trùng.
- Snapshot mới lưu `notes` cùng `class_report_rows`.
- Snapshot cũ không có `notes` vẫn mở bình thường vì field là optional.

## File thay đổi
- `src/components/competition/SaveExportReportCard.tsx`
- `src/components/competition/ReportDocument.tsx`
- `src/types/competition.ts`

## Không cần
- Không SQL migration
- Không Edge Function
- Không thay đổi bảng DB

## Lưu ý
Patch `SaveExportReportCard.tsx` này đã giữ luôn thay đổi width 848px của bản PDF dạng bảng trước đó, nên copy đè không làm mất tối ưu PDF vừa chốt.
