# Patch 108 – Tóm tắt lý thuyết IC3 GS6 Level 1

## Cài đặt
- Thêm mới `src/components/ic3/Ic3Level1Theory.tsx`.
- Đối chiếu/ghép thay đổi trong `src/pages/SchoolIc3Page.tsx` (bản nền 102); chỉ thêm import, showTheory và nút mở lý thuyết trước khối chọn Test.
- Không cần SQL, không đổi Supabase, không đổi kết quả thi hoặc IIG.
- Chạy `npm run build` trước khi push, đối chiếu với source mới nhất để tránh đè hotfix.

## Nội dung
7 chủ đề theo thứ tự website trường, 26 nhóm kiến thức, từng mục có tóm tắt và điều cần nhớ. Dựa trên danh mục mục tiêu GS6 Level 1 công khai (Certiport) và mô tả của IIG Việt Nam. Nội dung là bài diễn giải mới, không sao chép sách hay ngân hàng câu hỏi IC3 Review. Không tuyên bố đủ 900/1000.

## Kiểm thử
- Mở /mo-rong/tin-hoc-quoc-te/luyen-tap: thấy ô Ôn lý thuyết trên phần chọn bài.
- Mở ô, chọn đủ 7 chủ đề, mở/đóng từng mục; phần chọn Test cũ vẫn hoạt động.
- Kiểm tra dark mode và thiết bị di động.

## Lưu ý
Bản code dựa vào 102 vì đó là SchoolIc3Page mới nhất lưu được từ các patch trong cuộc trò chuyện; nếu dự án đã chỉnh trang này về sau hãy ghép diff thay vì ghi đè nguyên file. Chưa build trên source hiện tại của GitHub hay thử trực tiếp Supabase.
