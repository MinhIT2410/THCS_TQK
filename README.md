# PATCH: giao diện quản lý Test IC3 theo danh sách hiển thị sẵn

## Mục tiêu
- Phần quản lý Ngân hàng câu hỏi IC3 hiển thị **toàn bộ Test đã có** của chủ đề đang chọn.
- Sau khi tạo Test mới, Test phải **xuất hiện ngay** trong danh sách để quản trị viên thấy và tiếp tục quản lý.
- Giữ nguyên logic tạo Test, soạn câu hỏi, import Excel, xuất bản cho học sinh.

## File thay đổi
- `src/components/admin/Ic3QuestionBank.tsx`
- `README.md`

## Không thay đổi
- Không có SQL migration mới.
- Không sửa route quản trị.
- Không đụng dữ liệu mã IIG, thi đua, báo cáo hay trang học sinh.

## Giao diện mới
1. Khối thẻ tóm tắt phía trên: khối đang quản lý, số Test của chủ đề, số Test đã xuất bản/nháp, tổng số câu hỏi.
2. Khối chọn Khối / Chủ đề / Test đang mở quản lý.
3. Khối tạo Test: tạo xong sẽ tự chọn Test đó.
4. Khối **"Test hiện có của chủ đề"** hiển thị toàn bộ Test đã có dưới dạng card, mỗi card có:
   - Tên Test
   - Trạng thái: Đã xuất bản / Bản nháp
   - Số câu hỏi
   - Nút `Quản lý Test`
   - Nếu đang chọn, có nút `Xuất bản` hoặc `Ẩn Test`
5. Khối quản lý nội dung của Test đang chọn vẫn giữ: thêm câu, nhập Excel, sửa/xóa câu.

## Cách cài
1. Giải nén ZIP patch.
2. Copy đúng file `src/components/admin/Ic3QuestionBank.tsx` vào project hiện tại.
3. Mở GitHub Desktop kiểm tra DIFF; chỉ nên có thay đổi ở file trên (và README nếu bạn muốn giữ riêng).
4. Build/test lại giao diện quản trị IC3.

## Checklist kiểm thử
- Chọn Khối 6 → Chủ đề 1: nhìn thấy các Test đã tạo.
- Tạo Test mới: card mới xuất hiện ngay.
- Bấm `Quản lý Test`: phần soạn câu hỏi mở đúng Test.
- Xuất bản / Ẩn Test hoạt động bình thường.
- Nhập Excel và thêm câu hỏi không bị ảnh hưởng.

## Lưu ý
Patch này được làm theo đúng yêu cầu "Test nào đã có hiện ra, tạo xong hiện ra để mình biết còn quản lý". Nếu bạn đã hotfix thêm `Ic3QuestionBank.tsx` sau bản 099, cần đối chiếu trước khi copy đè.
