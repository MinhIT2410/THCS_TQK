# Hotfix 101: Xóa lượt làm của Test nội bộ để sửa/xóa câu hỏi

## Nguyên nhân
SQL 099 không cho sửa hoặc xóa câu hỏi nếu Test đã có lượt làm. Đây là bảo vệ lịch sử điểm, không phải lỗi tải trang.

## Thay đổi
- `src/components/admin/Ic3QuestionBank.tsx`: nút **Xóa lượt làm thử để sửa câu** trong chi tiết Test.
- `supabase/migrations/101_ic3_reset_attempts.sql`: thêm 2 RPC có kiểm tra quyền admin, giới hạn **đúng Test đã chọn**, kiểm tra số lượt làm trước khi xóa.

## Cách cài
1. Trong Supabase SQL Editor chạy SQL 101 (sau các migration 098–100).
2. Copy `src/components/admin/Ic3QuestionBank.tsx` theo đúng đường dẫn và kiểm tra diff GitHub Desktop.
3. Commit, push và làm mới trang quản trị.
4. Chọn Test cần sửa. Bấm **Xóa lượt làm thử để sửa câu**, kiểm tra số lượt làm và xác nhận hai lần. Sau đó sửa/xóa câu hỏi bình thường.

## CẢNH BÁO DỮ LIỆU
**Lệnh này XÓA VĨNH VIỄN tất cả lượt làm, bao gồm điểm và lịch sử của học sinh, thuộc Test được chọn; không chỉ xóa dữ liệu “thử” của quản trị.** Không dùng cho Test chính thức đang có điểm cần lưu.
- Nếu muốn giữ điểm học sinh, **không xóa lượt làm**; hãy ẩn Test cũ và tạo Test mới.
- Xóa lượt làm của một Test không ảnh hưởng các Test khác hoặc phần IC3 Review (IIG).
- Không cần tự xóa bảng thủ công, không sửa RPC chấm điểm.

## Kiểm thử
- Test chưa có lượt làm: hiện thông báo, không xóa gì.
- Test có lượt làm: hiển thị số lượng, hai bước xác nhận; hủy giữ nguyên dữ liệu.
- Xác nhận chính xác: xóa lượt làm chỉ cho Test đã chọn; sau đó sửa/xóa câu được.
- Chọn Test khác: điểm và câu hỏi không đổi.

## Lưu ý
Patch dựa trên bản có ảnh minh họa + nút xóa Test (SQL 100). Nếu bạn đã hotfix `Ic3QuestionBank.tsx` sau đó, đối chiếu trước khi ghi đè.
