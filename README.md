# Hotfix 103: Nhập ảnh ZIP và duyệt toàn Test IC3

## Trải nghiệm quản trị
- Trong một Test đã có câu hỏi, tải Excel mẫu `cau_hoi.xlsx` rồi điền tên ảnh đúng STT ở cột `Tên file ảnh`.
- ZIP có `cau_hoi.xlsx` và thư mục `images/` chứa các ảnh được Excel tham chiếu.
- Nhấn **Nhập ZIP ảnh cho Test** để tự ghép theo STT, nén WebP <=150KB, upload vào `ic3-illustrations`, gắn vào câu. Không phải sửa từng câu.
- Toàn bộ ảnh mới được lưu **chưa duyệt**.
- Nhấn **Xem và duyệt ảnh Test**: lưới toàn bộ ảnh, STT, câu hỏi và trạng thái. Chỉ cần kiểm tra và bấm **Duyệt tất cả ảnh Test** một lần.
- Nếu ảnh sai, nhấn `Sửa hoặc bỏ ảnh câu này`, chỉnh rồi quay lại duyệt toàn Test.
- Có nút **Thu hồi duyệt tất cả** để tắt ảnh khẩn cấp. Phần học sinh chỉ nhận image_path từ RPC khi ảnh đã duyệt (SQL 102).

## Các file
- `src/components/admin/Ic3QuestionBank.tsx` (cumulative: dựa trên hotfix 102 giữ 101).
- `supabase/migrations/103_ic3_bulk_approve_test_images.sql`.
- `package.json` thêm dependency `jszip` để đọc file ZIP phía trình duyệt.
- `README.md`.

## Triển khai
1. Chạy SQL 102 trước (nếu chưa có), sau đó chạy 103.
2. Copy `src/components/admin/Ic3QuestionBank.tsx` vào source đang chạy, đối chiếu diff với mọi hotfix mới hơn.
3. Cài thêm `npm install jszip@^3.10.1` trong **thư mục project**, để tự cập nhật `package-lock.json`. Chỉ nhận thêm dependency jszip, không copy package.json từ ZIP nếu package gốc của bạn đã được cập nhật sau 2026-10-26.
4. Build (`npm run build`), commit file TSX, package.json và package-lock.json hiện tại; deploy.
5. Kiểm thử Test nháp: ZIP chứa cau_hoi.xlsx + images; tải, xem lưới, sửa ảnh sai, duyệt; đăng nhập học sinh thử rồi thu hồi duyệt.

## Lưu ý bảo toàn dữ liệu
- Tính năng ZIP chỉ gắn ảnh vào **các câu đã có**, đối chiếu STT; không thay câu, không mất điểm hoặc lượt làm.
- File Excel phải có sheet `CAU_HOI`, 9 cột ban đầu đúng mẫu quản trị + cột `Tên file ảnh` (không dùng URL).
- Tối đa 100 ảnh/ZIP, 150 tệp/ZIP, 12 MB/ảnh gốc; ảnh được nén WebP <=150KB.
- Nếu upload giữa chừng lỗi, các ảnh trước đó vẫn được gắn, và thông báo số lượng đã làm; không tự chạy lại ZIP mà chưa kiểm tra lưới để tránh ghi chồng.
- `Duyệt tất cả` duyệt TẤT CẢ hình đang có trong Test, vì vậy cần nhìn kỹ toàn bộ lưới trước. Không tự động duyệt qua upload.
- SQL 103 không xóa dữ liệu nào; phần câu hỏi và IC3 Review/IIG không đổi.
- Chưa xác minh build với source hiện đang deploy hoặc kết nối Supabase thực tế.
