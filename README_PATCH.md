# PATCH - PDF dạng bảng, bám sát bản xem/lưu trên web

## Mục tiêu
Giữ ưu điểm PDF nhẹ, nhưng làm bản PDF nhìn giống modal báo cáo đã lưu nhất có thể:
- bảng có khung rõ,
- header xám nhạt,
- từng ô có đường viền,
- padding/line-height giống bản web,
- các dòng không còn cảm giác thành một danh sách chữ liên tục.

## Thay đổi
### `src/utils/reportPdfExporter.ts`
- Không ép clone về width 794px nữa; giữ width gần với ReportDocument đang xem.
- Materialize style bảng trước khi chụp:
  - `border-collapse`
  - border cho table/th/td
  - nền header
  - padding 10px
  - line-height 1.35–1.45
  - tránh cắt row giữa trang
- Giữ PDF nhẹ: scale 1.5, JPEG quality 0.90, jsPDF compression.

### `src/components/competition/SaveExportReportCard.tsx`
- Container ẩn dùng để xuất snapshot: `800px -> 848px`
- Gần với chiều rộng thực của phần ReportDocument trong modal `max-w-4xl`.

## Không thay đổi
- Dữ liệu báo cáo
- DB / Supabase
- Snapshot
- Logic lưu báo cáo
- UI modal trên web

## Triển khai
Copy đè 2 file, commit/push Vercel.
Không cần SQL hoặc Edge Function.
