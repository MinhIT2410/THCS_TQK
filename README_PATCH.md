# PATCH V2 - PDF nhẹ + sửa chữ/dòng bị dính

## Hiện tượng
PDF đã nhẹ (~500 KB thay vì ~27 MB) nhưng chữ và các khối trong báo cáo sát nhau hơn bản xem trên web.

## Nguyên nhân
Báo cáo dùng nhiều utility Tailwind `space-y-*`.
Khi `html2canvas` clone DOM để chụp PDF, một số khoảng cách dạng logical margin/CSS variable của Tailwind không được dựng giống trình duyệt thật, nên:
- tiêu đề / thanh thông tin / tiêu đề bảng sát nhau,
- tên học sinh và dòng lỗi sát nhau,
- nhiều học sinh trong cùng một lớp nhìn như bị dính chữ.

## Cách sửa
Chỉ trong DOM clone dùng để xuất PDF:
- materialize `space-y-6/5/4/3/2/1/0.5` thành `margin-top` pixel thật;
- tăng `line-height` phần chi tiết vi phạm lên 1.5;
- giữ nguyên bản xem trên website;
- giữ tối ưu PDF nhẹ: scale 1.5 + JPEG 0.88 + jsPDF compression.

## Triển khai
Copy đè:
`src/utils/reportPdfExporter.ts`

Không SQL, không Edge Function.
