# PATCH 098 - Bộ khung luyện tập IC3 nội bộ

## Phạm vi
- **Giữ nguyên** trang IIG, 38 mã mở bài, RPC `ic3_start_attempt` / `ic3_submit_score`, giao diện quản trị và các tính năng thi đua.
- Thêm trang `/mo-rong/tin-hoc-quoc-te/luyen-tap` cho học sinh đã đăng nhập.
- Chế độ **Học**: chọn đáp án và nhận giải thích ở cột bên phải.
- Chế độ **Kiểm tra**: không thấy đáp án trước khi nộp. Supabase chấm và lưu 0–1000 điểm.
- Bổ sung **3 câu thử nghiệm tự biên soạn** cho khối 6, Chủ đề 1. Đây là bài thử giao diện và quy trình, không phải đề hoàn chỉnh. Khối 7/8 sẽ có danh sách trống đến khi bổ sung nội dung.

## File thay đổi
- `src/App.tsx` (thêm route)
- `src/config/routes.ts` (thêm hằng route)
- `src/pages/InternationalITPage.tsx` (chỉ thêm liên kết tới luyện tập nội bộ)
- `src/pages/SchoolIc3Page.tsx` (file mới)
- `supabase/migrations/098_ic3_school_quiz.sql` (file mới)

## Cài đặt
1. **Sao lưu project** và xác nhận source đang dùng có các patch Mở rộng, IC3 và log mới nhất.
2. Copy các file `src/` trong ZIP vào đúng đường dẫn. Xem `git diff` trước khi commit; đặc biệt so sánh `App.tsx` nếu source đã có cập nhật khác.
3. Chạy **duy nhất** `098_ic3_school_quiz.sql` qua SQL Editor Supabase. Migration chạy tạo bảng/RPC + 3 câu mẫu, không tác động dữ liệu log IIG.
4. Commit/push; thử bằng tài khoản học sinh.

## Kiểm thử
- Khối 6 có một bộ thử 3 câu, khối 7/8 chưa có bài.
- Chế độ Học: chọn đáp án → bên phải hiện giải thích; không cho sửa đáp án đã chọn.
- Chế độ Kiểm tra: giải thích chỉ hiện sau khi trả lời đủ và bấm Nộp bài.
- Kiểm tra SQL: `select user_id,set_id,mode,score,status from public.ic3_school_attempts order by started_at desc limit 10;`
- Xác minh không lộ đáp án trong RPC `ic3_school_start` (chỉ trả id, prompt, choices).
- Thử đóng tab giữa chừng: lượt dang dở vẫn ở Supabase nhưng **chưa có giao diện khôi phục**; không tính điểm.

## Bảo mật và giới hạn
- Không dùng điểm tự khai báo. Trình duyệt chỉ gửi lựa chọn đáp án, Supabase kiểm tra quyền, chấm và lưu điểm.
- Chỉ có tài khoản đăng nhập mới mở lượt làm.
- Dữ liệu câu hỏi/đáp án không cấp quyền SELECT trực tiếp cho anon/authenticated.
- **Chưa có giao diện quản trị nhập đề, lịch sử cá nhân, phục hồi bài dở và quản lý xuất bản**; đó là các giai đoạn tiếp theo.
- Câu hỏi mẫu chỉ có 4 lựa chọn, chưa hỗ trợ nhiều đáp án, kéo thả, hình ảnh.
- Không chạy trực tiếp trên Supabase sản xuất trong lúc học sinh thi; hãy thử trên môi trường dự phòng nếu có.
