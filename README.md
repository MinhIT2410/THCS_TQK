# PATCH: IC3 THCS – Chọn khối / Chọn bài

## Điều kiện trước khi áp dụng
Đã cài hai patch trước: trang Mở rộng (`TQK_PATCH_MO_RONG_TIN_HOC_QUOC_TE.zip`) và IC3 THCS (`TQK_PATCH_IC3_THCS_LUYEN_TAP_LINK.zip`). Patch này chỉ cập nhật **một file** trên phiên bản hiện hành.

## File thay đổi
- `src/pages/InternationalITPage.tsx`: thiết kế lại giao diện IC3 dựa trên bố cục trang IC3 Review, với đúng hai ô chọn **Chọn khối** và **Chọn bài**; mở bài trực tiếp từ IIG ở tab khác.

## Bài đã có đường dẫn trực tiếp được đối chiếu
- Khối 6 (GS6 Level 1): Chủ đề 1 – Test 1, Test 2.
- Khối 7 (GS6 Level 2): Chủ đề 1 – Test 1.
- Khối 8 (GS6 Level 3): Chủ đề 1 – Test 1.

Chỉ bổ sung bài khác sau khi xác minh chính xác đường dẫn; **không tự đoán URL**.

## Triển khai
1. Giải nén ZIP vào thư mục làm việc.
2. Copy `src/pages/InternationalITPage.tsx` vào đúng đường dẫn trong repository và ghi đè.
3. Mở GitHub Desktop kiểm tra diff chỉ có 1 file thay đổi, commit và push.
4. Kiểm tra `/mo-rong`, vào thẻ IC3 rồi chọn khối 6/7/8, chọn bài và bấm **Mở bài làm**.
5. Kiểm tra route `/tin-tuc` cũ và các chức năng khác vẫn giữ nguyên.

## Giới hạn
- Không cần SQL, không sửa schema, không chỉnh quyền hoặc dữ liệu thi đua.
- Chưa ghi log học sinh/nộp bài hoặc tự nhận điểm; cần module thống kê riêng và cơ chế xác thực kết quả phù hợp.
- Không điền tự động mật khẩu của bài IIG.
- Các URL IIG có thể thay đổi; không bảo đảm trang đích còn hoạt động mãi.
- Chưa kiểm thử build thực tế với toàn bộ node_modules của dự án.
