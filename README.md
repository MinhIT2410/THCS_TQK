# Liên Đội Trường THCS Trần Quang Khải

Trang web Liên đội trường THCS Trần Quang Khải với các tính năng quản lý hoạt động, tin tức và đặc biệt là hệ thống **Visual Edit Mode (CMS)** trực quan.

## CMS Visual Edit Mode

Hệ thống quản lý nội dung trực tiếp trên giao diện áp dụng mô hình:

`Frontend Defaults + Database Overrides + Supabase Storage Assets = Final UI`

- **Frontend Defaults**: Lưu trữ cấu hình mặc định giao diện của ứng dụng trong code nhằm tăng tốc độ tải trang ban đầu và làm phương án dự phòng hoàn hảo.
- **Database Overrides**: Bảng `public.cms_overrides` trong cơ sở dữ liệu Supabase chỉ lưu trữ những phần thay đổi do quản trị viên chỉnh sửa.
- **Supabase Storage Assets**: Các tệp tin đa phương tiện được lưu trữ công khai trong bucket `school-media` và `school-document`.

### Luồng Hoạt Động
- Người dùng thông thường chỉ tải cấu hình mặc định kèm các bản ghi ghi đè có thuộc tính `is_enabled = true`.
- Quản trị viên/Biên tập viên bật **Edit Mode** để sửa trực tiếp văn bản, hình ảnh, liên kết nút của Hero trang chủ.
- Khi lưu thay đổi, dữ liệu sẽ được `upsert` vào bảng `cms_overrides`. Khi "Khôi phục mặc định", bản ghi tương ứng sẽ bị xóa khỏi cơ sở dữ liệu và giao diện quay về cấu hình code ban đầu.

### Phân Quyền
- **Public**: Chỉ có quyền đọc công khai các bản ghi CMS Overrides đã bật (`is_enabled = true`) và đọc file trong storage.
- **Admin / Editor**: Có quyền quản lý hoàn chỉnh các bản ghi CMS Overrides và dữ liệu đa phương tiện trong storage.
- **Viewer / Teacher**: Chỉ có quyền đọc, không thể chỉnh sửa hay thay đổi nội dung CMS.

## Content Modules

Dự án bao gồm cấu trúc bảng cơ sở dữ liệu và lớp API hoàn chỉnh cho các mô-đun nội dung:

- **Tin tức (News)**: Bảng `public.news` dùng để quản lý các bài viết tin tức, hoạt động của liên đội.
- **Tài liệu (Documents)**: Bảng `public.documents` quản lý kế hoạch, công văn, biểu mẫu và quyết định.
- **Thư viện ảnh (Albums & Album Images)**: Bảng `public.albums` và `public.album_images` quản lý các bộ sưu tập ảnh hoạt động của Liên đội trường.

### Phân Quyền Nội Dung
- Người dùng công cộng (Public) chỉ có quyền xem nội dung đã được xuất bản (`status = 'published'`).
- Biên tập viên và Quản trị viên (`admin`/`editor`) được phân quyền quản lý toàn diện nội dung.

## Role-based RLS

Bản di chuyển (migration) `034_role_based_rls.sql` thay thế hoàn toàn các chính sách tạm thời (temporary policy) bằng hệ thống chính sách bảo mật dựa trên vai trò người dùng (Role-based RLS) một cách an toàn và tối ưu:

Các vai trò được cấu hình trong trường `public.profiles.role`:
- `admin`: Quản lý toàn bộ hệ thống (CMS, nội dung, lưu trữ tệp tin), được phép xem và cập nhật thông tin vai trò của người dùng khác.
- `editor`: Biên tập viên, có quyền quản trị CMS, Tin tức, Tài liệu, Thư viện ảnh và tải lên tệp tin media.
- `teacher`: Giáo viên, chỉ có quyền xem thông tin công khai và hồ sơ cá nhân.
- `viewer`: Người xem thông thường, chỉ có quyền xem thông tin công khai và hồ sơ cá nhân.

Chỉ người dùng có vai trò `admin` và `editor` mới được quyền quản lý:
- CMS Overrides
- Tin tức (News)
- Tài liệu (Documents)
- Thư viện ảnh (Albums & Album Images)
- Tệp tin đa phương tiện trong các bucket Storage (`school-media`, `school-document`)

### Cấp quyền Admin thủ công (Grant admin role manually)

Sau khi tạo người dùng qua Supabase Auth, quản trị viên có thể gán quyền Admin thủ công bằng cách chạy lệnh SQL sau trong Supabase SQL Editor:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and u.email = 'your-email@example.com';
```

*Lưu ý*: Không bao giờ đưa địa chỉ email admin thực tế vào tệp di chuyển SQL di động để tránh rò rỉ thông tin bảo mật.

## User Management

Trang quản lý người dùng `/quan-tri/nguoi-dung` được bảo vệ nghiêm ngặt, chỉ cho phép thành viên có vai trò `admin` truy cập (thông qua `RoleGuard` và chính sách bảo mật cơ sở dữ liệu RLS):

- **Tính năng chính**:
  - Xem danh sách thành viên trong hệ thống (từ bảng `public.profiles`).
  - Sửa đổi họ tên (`full_name`) của thành viên.
  - Phân quyền vai trò mới (`role` gồm: `admin`, `editor`, `teacher`, `viewer`).
  - Khóa hoặc kích hoạt lại tài khoản thành viên thông qua trường `is_active`.
- **Nguyên tắc bảo mật**:
  - Ứng dụng tuân thủ nguyên tắc không truy vấn trực tiếp bảng `auth.users` từ phía Client hay lưu trữ `service_role` key trên Frontend. Do đó, các thông tin nhạy cảm như Email thành viên được ẩn danh và bảo mật tuyệt đối ở mức Database.
  - Để bảo vệ an toàn hệ thống, tài khoản của chính Quản trị viên đang đăng nhập sẽ bị hạn chế tự thay đổi vai trò hoặc tự khóa tài khoản của chính mình (chống vô tình lockout).

## Production readiness checklist

Before deploying:

- [ ] Run all Supabase migrations manually or through Supabase CLI.
- [ ] Confirm `034_role_based_rls.sql` has been applied.
- [ ] Create the first Supabase Auth admin user.
- [ ] Grant admin role manually in SQL Editor.
- [ ] Set production environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ENABLE_CMS_EDITING=false`
  - `VITE_ENABLE_DEMO_FALLBACK=false`
- [ ] Verify `.env.local` is not committed.
- [ ] Verify no service role key is used in frontend.
- [ ] Verify public pages only show published content.
- [ ] Verify admin routes require login.
- [ ] Verify `/quan-tri/nguoi-dung` requires admin role.
- [ ] Verify editor cannot manage users.
- [ ] Verify viewer/teacher cannot access admin dashboard.
- [ ] Verify CMS edit mode only appears for admin/editor.
- [ ] Verify storage upload works for admin/editor.

### Grant first admin role

After creating a Supabase Auth user, run:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and u.email = 'your-email@example.com';
```

Do not put real admin emails in migrations.

## Deployment

See [Deploy Checklist](./docs/DEPLOY_CHECKLIST.md).



