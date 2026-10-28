# Hotfix 106: Dọn giao diện học sinh IC3 Review

Chỉ thay `src/pages/Ic3ReviewPage.tsx`.

Đã bỏ:
- Thẻ màu xanh dẫn về Luyện tập tại trường (đã có ở trang chọn 2 hình thức).
- Tiêu đề 'Ghi nhận luyện tập IC3' cùng mô tả dài và lưu ý ở cuối khung.
- Khung giải thích kỹ thuật về menu chọn bài, liên kết IIG và Chủ đề mở rộng.

Đã giữ:
- Chọn khối, bài test, mở IIG.
- Tự ghi nhận lượt mở bằng ic3_start_attempt.
- Sau khi mở bài, hiện ô nhập điểm và nút 'Gửi kết quả' khi có attemptId.
- Trạng thái lưu/ghi lỗi của luồng ghi log.
- Mã mở bài, sao chép mã từ Supabase.
- Ghi chú nguồn IIG cuối trang.

Cài đặt: chép đúng 1 file theo đường dẫn, đối chiếu diff với source đang deploy, build rồi commit/push.
Không có SQL, không sửa dữ liệu, không sửa hệ thống thi đua.

Lưu ý: File dựa trên bản Ic3ReviewPage.tsx có trong patch tách hai thẻ trước đó. Nếu đã có hotfix bổ sung vào file này sau đó, ghép các đoạn xóa/cô đọng thay vì copy đè mù. Chưa xác minh build trên source mới nhất.
