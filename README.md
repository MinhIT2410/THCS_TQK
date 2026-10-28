# PATCH IC3: thêm ảnh minh họa vào gợi ý + xóa Test thử nghiệm

## Mục tiêu
1. Phần **Giải thích / Gợi ý** của bài luyện tập nội bộ có thể hiện **hình minh họa thực tế**.
2. Quản trị viên có thể nhập **URL ảnh minh họa** khi tạo hoặc sửa câu hỏi.
3. Mẫu Excel thêm cột `Ảnh minh họa (URL)` để nhập hàng loạt.
4. Thêm nút **Xóa Test** trong quản lý ngân hàng câu hỏi.
5. Xóa luôn **bài test thử nghiệm / pilot** cũ khỏi hệ thống bằng migration.

## File thay đổi
- `src/components/admin/Ic3QuestionBank.tsx`
- `src/pages/SchoolIc3Page.tsx`
- `supabase/migrations/100_ic3_school_images_delete_set.sql`
- `README.md`

## Thay đổi chính
### 1) Quản trị câu hỏi
- Thêm trường: `Ảnh minh họa thực tế (URL, không bắt buộc)`
- Danh sách câu hỏi có cột báo `Có ảnh / Không`
- Excel mẫu có thêm cột thứ 10: `Ảnh minh họa (URL)`
- Import Excel sẽ đọc luôn cột ảnh này

### 2) Giao diện học sinh
- Sau khi học sinh chọn đáp án (hoặc nộp bài ở chế độ kiểm tra), phần giải thích bên phải sẽ hiện:
  - đúng / sai
  - đáp án đúng
  - giải thích
  - **hình minh họa thực tế** nếu câu đó có ảnh
  - mẹo ghi nhớ

### 3) Xóa Test thử nghiệm
- Migration sẽ xóa set `GS6-L1-CD1-PILOT`
- Đồng thời xóa mọi lượt làm gắn với set này trước khi xóa set
- Có thêm RPC `ic3_school_admin_delete_set` để sau này xóa các Test nội bộ chưa có lượt làm

## Cách cài
### Bước 1: chép file source
Copy đè các file đúng đường dẫn:
- `src/components/admin/Ic3QuestionBank.tsx`
- `src/pages/SchoolIc3Page.tsx`

### Bước 2: chạy migration SQL
Chạy file:
- `supabase/migrations/100_ic3_school_images_delete_set.sql`

> Quan trọng: chạy SQL trước rồi deploy frontend, để tránh lỗi RPC chưa tồn tại.

## Kiểm tra sau khi cài
1. Vào quản trị IC3
   - Chọn một Test
   - Sửa một câu hỏi
   - Nhập URL ảnh minh họa
   - Lưu thành công
2. Vào trang học sinh
   - Làm câu đó
   - Sau khi trả lời, panel bên phải phải hiện ảnh minh họa
3. Kiểm tra danh sách Test
   - Bài `thử nghiệm / pilot` không còn nữa
4. Thử nút `Xóa Test`
   - Chỉ xóa được Test chưa có attempt

## Lưu ý
- Patch này dùng **URL ảnh** để làm nhanh và nhẹ. Nếu sau này muốn đẹp hơn, có thể nâng cấp sang upload ảnh vào Supabase Storage rồi chọn ảnh từ thư viện.
- Với các ảnh lỗi URL, giao diện chỉ không hiện ảnh; không làm hỏng bài luyện tập.
- Không sửa phần IIG code, không sửa phần log IC3 Review.
