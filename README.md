# HOTFIX 102 — Ảnh minh họa IC3 nội bộ, nén WebP và duyệt ảnh

## File thay đổi (giữ cumulative hotfix 101)
- `src/components/admin/Ic3QuestionBank.tsx`: dựa trên file bản hotfix 101, giữ nguyên nút xóa lượt làm, xóa Test, import Excel, cấu trúc thẻ Test; bổ sung nút chọn ảnh máy tính, nén WebP, tải lên, xem trước, duyệt/thu hồi, bỏ ảnh.
- `src/pages/SchoolIc3Page.tsx`: chỉ hiện ảnh nếu Supabase RPC trả về `image_path` đã duyệt; không còn render `image_url` bên ngoài.
- `supabase/migrations/102_ic3_safe_school_illustrations.sql`: thêm cột image_path/image_approved, tạo bucket `ic3-illustrations`, policy upload cho quản trị, RPC gắn/duyệt, trả ảnh an toàn.
- `README.md`: chỉ dẫn.

## THỨ TỰ TRIỂN KHAI
1. Yêu cầu đã chạy SQL 098, 099, 100, 101 trước đó.
2. Chạy `102_ic3_safe_school_illustrations.sql` trước.
3. Chép hai file TSX đúng đường dẫn trên vào project mới nhất. Xem GitHub Desktop DIFF và build trước khi push.
4. Kiểm tra ở Quản trị → Mở rộng → IC3:
   - Chọn Test → chọn câu đã có → Sửa.
   - Chọn ảnh từ máy tính (JPG/PNG/WebP).
   - Ảnh nén tối đa 800×800, mục tiêu dưới hoặc bằng 150 KB, lưu file `.webp`. Nếu không nén đủ, hệ thống báo lỗi, không tải ảnh quá ngưỡng.
   - Ảnh mới mặc định CHƯA DUYỆT: học sinh không thấy.
   - Xem hình, bấm **Xác nhận ảnh đúng và duyệt**.
   - Thử bài học ở trang học sinh và xác nhận chỉ đúng hình đã duyệt hiện ở phần giải thích.
   - Chọn **Thu hồi duyệt** để tắt ảnh tức thời, hoặc **Bỏ ảnh khỏi câu** để xóa liên kết.
5. Kiểm thử bằng câu trước đó có URL không an toàn: sau SQL + deploy, không còn hiển thị ảnh cũ.

## Thận trọng và giới hạn
- Migration 102 **xóa giá trị image_url cũ trên toàn bộ câu hỏi IC3 nội bộ** để vô hiệu hóa ảnh ngoài, nhưng KHÔNG xóa câu hỏi, giải thích, điểm hay lượt làm. Đây là hành động chủ động để xử lý ảnh nguy hiểm.
- Bộ Excel 10 cột cũ vẫn nhận dạng được nhưng nếu có URL ở cột cuối, import sẽ TỪ CHỐI và yêu cầu upload ảnh riêng qua giao diện. Không nhập lại các file chứa URL cũ.
- Ảnh ở bucket public nhưng chỉ quản trị được upload qua policy. `image_path` chứa UUID khó đoán; nội dung được đưa cho học sinh chỉ sau khi duyệt bằng RPC. Điều này **không phải là cơ chế bảo mật cho ảnh bí mật**. Chỉ upload hình giáo dục công khai, không có thông tin riêng tư.
- Giới hạn 150 KB/ảnh, JPG/PNG/WebP đầu vào tối đa 12MB; ảnh GIF hoặc SVG bị chặn. Các ảnh không được upload nếu không thể nén đủ.
- Bỏ liên kết ảnh không tự xóa file khỏi Storage để tránh xóa nhầm tài nguyên đang được dùng. Có thể dọn file không còn tham chiếu sau.
- RPC `ic3_school_admin_save_question_media` cũ vẫn tồn tại để tránh làm hỏng dữ liệu và tương thích source, nhưng URL ảnh ngoài không được xuất ra cho học sinh nữa.
- Hãy dùng ảnh có quyền sử dụng hợp lệ và xem trước từng ảnh. Phần mềm không tự kiểm định nội dung hình ảnh.
- Cần thực hiện kiểm thử thủ công thực tế với Supabase; patch được rà cấu trúc và chưa được build trên phiên bản source mới nhất đang deploy.
