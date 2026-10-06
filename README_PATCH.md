# PATCH - PDF báo cáo nhẹ hơn, vẫn giữ bố cục giao diện

## Nguyên nhân file PDF cũ nặng
Luồng cũ chụp toàn bộ báo cáo bằng `html2canvas` ở `scale: 2`, sau đó mỗi trang được nhúng vào PDF dưới dạng **PNG lossless**.
Với báo cáo 65 lớp, PDF 3 trang có thể lên tới hàng chục MB.

## Thay đổi
Chỉ sửa:
`src/utils/reportPdfExporter.ts`

- `html2canvas scale`: 2 -> **1.5**
- Ảnh từng trang: PNG -> **JPEG quality 0.88**
- Bật `jsPDF compress`
- Giữ A4 portrait, lề, cách chia trang và giao diện báo cáo hiện tại.
- Không thay đổi dữ liệu, DB, snapshot hoặc modal xem báo cáo.

## Kỳ vọng
- PDF nhẹ hơn rất nhiều (thường giảm khoảng 70-90% tùy nội dung).
- Chữ/bảng vẫn rõ để xem và in A4.
- Không còn mỗi trang là PNG lossless rất nặng.

## Triển khai
Copy đè file theo đúng đường dẫn, commit/push Vercel.
Không cần SQL migration, không cần deploy Edge Function.
