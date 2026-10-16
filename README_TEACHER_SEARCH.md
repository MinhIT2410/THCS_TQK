# Ghi nhận giáo viên — tìm kiếm như học sinh

## File thay đổi
- `src/components/competition/TeacherAttendanceForm.tsx`

## Thay đổi
- Thay `<select>` dài bằng ô nhập tên, tìm có dấu/không dấu và danh sách gợi ý cuộn được.
- Hiển thị giáo viên đã chọn, có nút bỏ chọn; đóng gợi ý khi nhấn Escape hoặc click ngoài.
- Không thay đổi API, SQL, RLS, quy tắc, logic lưu hoặc quyền giám thị.

## Cài đặt
Chép đúng đường dẫn file TSX vào repo hiện hành, giữ nguyên các file khác. Không cần chạy SQL.

## Kiểm tra
1. Gõ `minh` và `Minh`, xem gợi ý.
2. Chọn giáo viên, kiểm tra thẻ `Đã chọn`, bỏ chọn rồi chọn lại.
3. Kiểm tra nút lưu chỉ khả dụng khi chọn giáo viên và có quy tắc.
4. Ghi nhận thử và kiểm tra lịch sử theo quy trình hiện có.

Chưa xác nhận build toàn dự án.
