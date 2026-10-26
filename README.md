# PATCH IC3 - cập nhật đúng danh sách dropdown IIG cho 3 khối

## Mục tiêu
Cập nhật lại trang `Học Tin học quốc tế - IC3` để danh sách **Chọn khối - Chọn bài** bám đúng các mục hiển thị trong ảnh chụp dropdown từ IC3 Review của IIG.

## File thay đổi
- `src/pages/InternationalITPage.tsx`

## Nội dung thay đổi
- Giữ giao diện theo phong cách IIG.
- Danh sách bài của **Khối 6, 7, 8** được sửa lại theo đúng ảnh chụp:
  - Khối 6: 9 bài test + `Chủ đề mở rộng`
  - Khối 7: 11 bài test + `Chủ đề mở rộng`
  - Khối 8: 13 bài test + `Chủ đề mở rộng`
- Bổ sung đầy đủ các mục `Test 3` ở khối 7 và khối 8 theo ảnh.
- Mục `Chủ đề mở rộng` được hiển thị nhưng **chưa gắn URL**, vì ảnh không cho thấy mã bài trực tiếp.
- Khi chọn bài có liên kết, nút **Mở bài làm** sẽ mở trực tiếp bài trên IIG.
- Khi chọn `Chủ đề mở rộng`, nút mở bài bị vô hiệu hóa.

## Ghi chú về URL
Các bài test thường dùng cấu trúc:
`https://ic3review.iigvietnam.edu.vn/newdata/<LEVEL>/<LEVEL>-<CHUDE>-T<SO_TEST> (Published)/index.html`

Patch này áp dụng cấu trúc đó cho toàn bộ các mục Test 1/Test 2/Test 3 đang hiển thị trong dropdown IIG.

## Cách copy đè
1. Giải nén file ZIP patch.
2. Copy file `src/pages/InternationalITPage.tsx` vào project.
3. Ghi đè file cũ.
4. Chạy kiểm tra giao diện trang `/mo-rong/tin-hoc-quoc-te`.

## Cần kiểm tra sau khi cập nhật
- Chuyển khối 6 / 7 / 8 có đổi danh sách bài đúng hay không.
- Chọn từng bài bất kỳ xem nút **Mở bài làm** có mở được tab IIG hay không.
- Chọn `Chủ đề mở rộng` xem nút có bị disable đúng hay không.

## Không thay đổi
- Không sửa route/menu khác.
- Không sửa phần thi đua, báo cáo, phân quyền, Supabase.
- Không thêm SQL.
