# Hotfix PDF báo cáo thi đua

Nguồn: THCS_TQK-main(7).zip. Chỉ 2 file frontend thay đổi.

## Nguyên nhân
- Trước đây điểm ngắt trang dùng `offsetTop` của hàng bảng, vốn tương đối với offset parent khác nhau, dẫn tới cắt ngang hàng.
- Khoảng trống ký tên dựa vào `space-y-12`, không ổn định trong html2canvas.

## Thay đổi
- Đo vị trí hàng bảng, ghi chú, khối chữ ký bằng `getBoundingClientRect()` trên DOM clone dùng để xuất PDF; chuyển đúng tỷ lệ canvas và tránh ngắt ngang các khối vừa một trang.
- Khối chữ ký giữ chung trang và có khoảng cách 112px (xấp xỉ 25 mm trên bản PDF tùy tỷ lệ) từ chú thích đến tên/dòng ký; cộng khoảng cách tiêu đề phía trên.
- Không đổi API, dữ liệu, Supabase, RLS hoặc nghiệp vụ.

## Cài đặt
Chép đè hai file theo đúng đường dẫn trong ZIP, commit và deploy Vercel. Không cần SQL.

## Kiểm tra
1. Xuất Tuần 5, Khối 9 và kiểm tra không cắt giữa hàng 9/13, 9/14.
2. Kiểm tra chữ ký nằm cùng trang, có khoảng trống ký tay.
3. Kiểm tra báo cáo nhiều dòng và báo cáo không có vi phạm.

Lưu ý: một hàng duy nhất cao hơn toàn bộ vùng in A4 vẫn có thể phải chia trang; chưa có test trình duyệt thực tế trong môi trường này.

Commit đề xuất: `fix(competition): keep report rows and signatures intact in PDF`
