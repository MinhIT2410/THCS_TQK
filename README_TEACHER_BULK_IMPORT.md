# BỔ SUNG NHẬP GIÁO VIÊN/CÁN BỘ HÀNG LOẠT TỪ EXCEL

## 1. Kết quả kiểm tra source hiện tại

Đã kiểm tra trực tiếp luồng:
- `src/features/users/import/UserImportModal.tsx`
- `src/features/users/import/userImportParser.ts`
- `src/features/users/import/userImportTemplate.ts`
- `src/features/users/userCreationApi.ts`
- `supabase/functions/admin-create-users/index.ts`
- `src/pages/admin/AdminUsersPage.tsx`

### Kết luận quan trọng
Backend hiện tại **đã hỗ trợ tạo hàng loạt tài khoản Giáo viên/Cán bộ**:
- `createManyUsers()` gửi nhiều tài khoản tới Edge Function `admin-create-users`.
- Edge Function cho phép các role:
  `SUPER_ADMIN, PRINCIPAL, VICE_PRINCIPAL, CONTENT_EDITOR, STAFF, TEACHER, STUDENT`.
- Tài khoản không phải STUDENT bắt buộc có Email.
- Phân quyền vẫn được kiểm tra server-side qua `can_manage_account_role`.
- Giáo viên/Cán bộ không cần `class_id` và `academic_year_id`.
- `student_code` chỉ được phép cho STUDENT.

Vì vậy **không cần sửa Edge Function, RPC hay database** chỉ để thêm nhập giáo viên hàng loạt.
Sửa backend lúc này sẽ làm tăng rủi ro không cần thiết.

## 2. Vấn đề giao diện cũ

Luồng Excel cũ technically đã nhận TEACHER, nhưng:
- Không có lựa chọn rõ “Học sinh” hay “Giáo viên/Cán bộ”.
- File mẫu trộn học sinh và giáo viên trong cùng sheet nên dễ hiểu rằng chức năng chỉ dành cho học sinh.
- Quy tắc lớp/năm học/student_code xuất hiện ngay trên giao diện dù đang muốn nhập giáo viên.
- Không có lớp kiểm tra theo “loại import” để ngăn đưa nhầm STUDENT vào file giáo viên hoặc ngược lại.

## 3. Thay đổi trong gói này

### Giao diện
Bước 1 có 2 chế độ rõ ràng:
1. **Học sinh**
2. **Giáo viên / Cán bộ**

### Chế độ Giáo viên/Cán bộ
Mỗi dòng cần:
- `full_name`
- `email`
- `roles`

Ví dụ:
- `Nguyễn Thị A | nguyenthia@truong.edu.vn | TEACHER`
- `Trần Văn B | tranvanb@truong.edu.vn | STAFF`

Không yêu cầu:
- `student_code`
- `class_name`
- `academic_year_name`

Nếu file giáo viên có role `STUDENT`, dòng đó bị đánh lỗi ở bước xem trước và không gửi lên server.

### Chế độ Học sinh
Giữ logic hiện tại:
- STUDENT
- student_code/email
- lớp
- năm học

Nếu đưa TEACHER/STAFF vào chế độ Học sinh, dòng đó bị báo lỗi.

### File mẫu
Nút tải mẫu thay đổi theo chế độ:
- `mau_nhap_giao_vien_can_bo.xlsx`
- `mau_nhap_hoc_sinh.xlsx`

File giáo viên vẫn giữ các sheet tham khảo chung nhưng sheet `Tai_khoan` chỉ chứa mẫu Giáo viên/Cán bộ.

## 4. Các file thay đổi

- `src/features/users/import/UserImportModal.tsx`
- `src/features/users/import/userImportParser.ts`
- `src/features/users/import/userImportTemplate.ts`
- `src/features/users/import/userImportTypes.ts`

## 5. Các file đã kiểm tra nhưng KHÔNG sửa

- `src/features/users/userCreationApi.ts`
- `supabase/functions/admin-create-users/index.ts`
- `src/pages/admin/AdminUsersPage.tsx`

Lý do: luồng tạo nhiều user, role TEACHER/STAFF và kiểm tra quyền server-side đã có sẵn.

## 6. SQL / Supabase

**Không cần chạy SQL.**
**Không cần deploy lại Edge Function** cho thay đổi này.

Chỉ deploy frontend Vercel sau khi copy đè 4 file.

## 7. Kiểm thử đề nghị sau deploy

### Test A — Giáo viên hợp lệ
Chọn `Giáo viên / Cán bộ`, tải mẫu, nhập:
`Nguyễn Thị A | a@truong.edu.vn | TEACHER`

Kỳ vọng: bước preview báo Sẵn sàng và tạo được tài khoản.

### Test B — Cán bộ hợp lệ
`Trần Văn B | b@truong.edu.vn | STAFF`

Kỳ vọng: Sẵn sàng nếu tài khoản Admin hiện tại có quyền tạo role đó.

### Test C — Email trùng trong file
Hai dòng cùng email.

Kỳ vọng: cả email trùng bị cảnh báo trước khi gửi server.

### Test D — Thiếu email giáo viên
TEACHER nhưng email trống.

Kỳ vọng: báo `Các vai trò cán bộ/giáo viên bắt buộc phải có Email.`

### Test E — Nhầm STUDENT trong file giáo viên
Role STUDENT.

Kỳ vọng: báo sai chế độ, không import dòng đó.

### Test F — Email đã tồn tại trên hệ thống
Kỳ vọng: server trả lỗi email đã tồn tại; không tạo bản ghi trùng.

## 8. Phạm vi chưa làm

Bản này chỉ tạo tài khoản Giáo viên/Cán bộ hàng loạt.
Chưa tự động:
- gán GVCN cho lớp;
- gán tổ chuyên môn;
- gán điểm chính/phân hiệu.

Các dữ liệu đó nên xử lý ở bước riêng sau khi xác định schema thực tế để tránh gắn sai quan hệ.

## Commit gợi ý

`feat(users): add explicit teacher and staff bulk Excel import`
