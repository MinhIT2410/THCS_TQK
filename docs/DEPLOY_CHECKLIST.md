# Deploy Checklist – THCS Trần Quang Khải Website

Tài liệu này hướng dẫn chi tiết các bước chuẩn bị, thiết lập cơ sở dữ liệu Supabase, kiểm thử bảo mật và quy trình bàn giao hệ thống sang môi trường Production thực tế.

---

## 1. Environment variables

Local `.env.local` cần có:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ENABLE_CMS_EDITING=false
VITE_ENABLE_DEMO_FALLBACK=false
```

Môi trường Production cũng cần:

```env
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-or-publishable-key>
VITE_ENABLE_CMS_EDITING=false
VITE_ENABLE_DEMO_FALLBACK=false
```

**Lưu ý cực kỳ quan trọng:**
* Tuyệt đối không commit tệp `.env.local` vào kho chứa mã nguồn (Git).
* Tuyệt đối không sử dụng `service_role` key (secret key) ở phía Frontend. Chỉ sử dụng `anon` key (public key).
* Không bật `VITE_ENABLE_DEMO_FALLBACK=true` trên Production để tránh rò rỉ dữ liệu giả hoặc bỏ qua lỗi kết nối thực tế.
* Biến `VITE_ENABLE_CMS_EDITING` chỉ có tác dụng hỗ trợ kiểm thử giao diện trong môi trường Dev, không thay thế cho hệ thống phân quyền thực tế dựa trên vai trò (Role-based Access Control).

---

## 2. Supabase migrations order

Khi thiết lập cơ sở dữ liệu Supabase mới hoặc đồng bộ hóa môi trường Production, các tệp migration SQL phải được chạy đúng theo thứ tự sau:

```txt
030_cms_overrides.sql
031_storage_school_media.sql
032_content_modules.sql
033_auth_profiles_roles.sql
034_role_based_rls.sql
```

Bạn có thể áp dụng bằng một trong hai phương pháp dưới đây:

### Cách 1: Sử dụng SQL Editor (Thủ công)
1. Truy cập vào **Supabase Dashboard** của dự án.
2. Chọn mục **SQL Editor** từ menu bên trái.
3. Tạo một **New Query**.
4. Sao chép và dán lần lượt nội dung của từng tệp SQL trong thư mục migration (theo đúng thứ tự từ trên xuống dưới) và nhấn **Run**.

### Cách 2: Sử dụng Supabase CLI (Tự động)
Nếu máy chủ hoặc máy tính của bạn đã cài đặt Supabase CLI và liên kết thành công với dự án:
```bash
supabase db push
```
*Lưu ý: Chỉ thực hiện lệnh này khi bạn chắc chắn rằng Supabase CLI đã liên kết đúng instance Production để tránh ghi đè dữ liệu.*

---

## 3. Expected database tables

Sau khi chạy toàn bộ các tệp migration thành công, hãy vào mục **Table Editor** trên Supabase Dashboard để đảm bảo các bảng sau đã xuất hiện đầy đủ:

```txt
public.cms_overrides       # Lưu trữ tùy biến giao diện trực quan CMS
public.news                # Lưu trữ bài viết, tin tức, thông báo
public.documents           # Lưu trữ văn bản, quyết định, tài liệu học liệu
public.albums              # Lưu trữ album hình ảnh hoạt động
public.album_images        # Chi tiết các hình ảnh thuộc album
public.profiles            # Thông tin định danh và phân quyền thành viên
```

---

## 4. Expected storage buckets

Hệ thống yêu cầu có hai phân vùng lưu trữ (Storage Buckets) để phục vụ cho các hoạt động đa phương tiện và tài liệu của trường:

```txt
school-media      # Chứa ảnh đại diện tin tức, ảnh album (Public read)
school-document   # Chứa các file tài liệu học tập, quyết định dạng PDF/DOCX (Public read)
```

**Các bước cấu hình Buckets:**
1. Vào **Storage** trên Supabase Dashboard.
2. Nhấn **New Bucket** và tạo hai bucket có tên chính xác như trên.
3. Đảm bảo cấu hình là **Public** để công chúng có thể đọc/tải dữ liệu trực tiếp từ CDN thông qua các policy RLS đã được thiết lập sẵn trong tệp SQL.

---

## 5. Create first admin user

Để vận hành trang quản trị, bạn cần đăng ký một tài khoản đầu tiên thông qua cơ chế Supabase Auth:

1. Trên **Supabase Dashboard**, chọn mục **Authentication** -> **Users**.
2. Nhấn **Add User** -> **Create User**.
3. Nhập Email và Mật khẩu của Quản trị viên, sau đó nhấn tạo.
4. Kiểm tra bảng `public.profiles`, một dòng dữ liệu tương ứng với User ID vừa tạo sẽ tự động xuất hiện nhờ Trigger `on_auth_user_created` và hàm `public.handle_new_user()`.

---

## 6. Grant first admin role

Mặc định, các tài khoản mới đăng ký sẽ nhận vai trò `viewer` để đảm bảo an toàn. Để cấp quyền Quản trị tối cao (Admin) cho tài khoản đầu tiên, bạn phải thực hiện một lệnh SQL thủ công từ **SQL Editor**:

```sql
update public.profiles p
set role = 'admin',
    is_active = true
from auth.users u
where p.id = u.id
  and u.email = 'email-cua-ban@example.com';
```

*Lưu ý bảo mật: Tuyệt đối không đưa email thật hoặc mật khẩu cứng của Quản trị viên vào các tệp migration tự động để tránh rò rỉ thông tin ra kho mã nguồn.*

---

## 7. Verify login

Truy cập đường dẫn `/dang-nhap` trên trình duyệt và kiểm thử các kịch bản sau:
* Đăng nhập với thông tin chính xác: Hệ thống phải chuyển hướng thành công vào khu vực `/quan-tri`.
* Đăng nhập với thông tin sai: Hệ thống phải hiển thị thông báo lỗi rõ ràng, dễ hiểu ở giao diện đăng nhập (không bị crash).
* Đăng xuất: Nhấn nút Đăng xuất trên thanh điều hướng, phiên làm việc phải được xóa sạch và đưa người dùng về trang chủ hoặc trang đăng nhập.

---

## 8. Verify admin routes

Sử dụng tài khoản có vai trò khác nhau để kiểm thử tính nghiêm ngặt của hệ thống Route Guard bảo vệ:

### Thử nghiệm với tài khoản Admin (`role = 'admin'`)
* Truy cập được tất cả các khu vực quản lý dữ liệu:
  ```txt
  /quan-tri
  /quan-tri/tin-tuc
  /quan-tri/tai-lieu
  /quan-tri/album
  /quan-tri/cms
  /quan-tri/nguoi-dung
  /quan-tri/cai-dat
  ```
* Bảng điều khiển Quản lý người dùng (`/quan-tri/nguoi-dung`) hoạt động bình thường, hiển thị đầy đủ danh sách.

### Thử nghiệm với tài khoản Editor (`role = 'editor'`)
* Truy cập được: `/quan-tri`, `/quan-tri/tin-tuc`, `/quan-tri/tai-lieu`, `/quan-tri/album`, `/quan-tri/cms`.
* **KHÔNG** truy cập được: `/quan-tri/nguoi-dung`. Khi cố ý truy cập, hệ thống phải chặn lại và hiển thị giao diện **Access Denied** từ chối truy cập.

### Thử nghiệm với tài khoản Giáo viên/Người xem (`role = 'teacher' / 'viewer'`)
* Không thể truy cập bất kỳ đường dẫn nào bắt đầu bằng `/quan-tri`.
* Khi truy cập, hệ thống tự động hiển thị trang thông báo **Access Denied** có nút quay lại trang chủ.

---

## 9. Verify CMS Hero edit

Kiểm thử chức năng biên tập trực quan nội dung trang chủ (Visual Edit Mode):

1. Đăng nhập bằng tài khoản **Admin** hoặc **Editor**.
2. Quay lại trang chủ, bạn sẽ thấy nút "Bật Chế Độ Chỉnh Sửa" ở góc màn hình.
3. Nhấp chọn chỉnh sửa tiêu đề/phụ đề hoặc ảnh nền của phần **Hero**.
4. Nhấn **Lưu Thay Đổi**.
5. Làm mới lại trang (Reload), nội dung tùy biến mới phải được hiển thị chính xác.
6. Kiểm tra database: Bảng `public.cms_overrides` phải xuất hiện một bản ghi có khóa là `home.hero`.
7. Nhấn nút **Khôi Phục Mặc Định** trên giao diện, phần Hero phải lập tức quay lại nội dung mặc định của nhà trường.

**Kiểm thử bảo mật:** Đăng xuất hoặc dùng tab ẩn danh, đảm bảo giao diện chỉnh sửa và các nút biên tập hoàn toàn biến mất khỏi trang chủ.

---

## 10. Verify News CRUD

Kiểm thử quy trình xuất bản tin tức:

1. Truy cập `/quan-tri/tin-tuc`.
2. Tạo một bài viết mới ở trạng thái **Nháp (Draft)**.
3. Mở tab ẩn danh (Public), vào trang `/tin-tuc` -> Đảm bảo bài viết nháp này **không xuất hiện**.
4. Quay lại trang admin, chỉnh sửa bài viết sang trạng thái **Đã xuất bản (Published)**.
5. Kiểm tra trang `/tin-tuc` ngoài public -> Bài viết phải xuất hiện ở vị trí đầu tiên.
6. Nhấp vào bài viết để kiểm tra giao diện chi tiết `/tin-tuc/:slug`.
7. Thử chuyển trạng thái bài viết sang **Lưu trữ (Archived)** -> Bài viết phải biến mất khỏi trang public.
8. Thử **Xóa** bài viết -> Bản ghi phải bị xóa sạch khỏi danh sách quản trị.

---

## 11. Verify Documents CRUD

Kiểm thử quy trình xuất bản văn bản tài liệu:

1. Truy cập `/quan-tri/tai-lieu`.
2. Tải lên một tệp tài liệu mẫu (PDF/DOCX). Hệ thống sẽ tải tệp lên bucket `school-document` và trả về URL.
3. Điền các thông tin và tạo tài liệu ở trạng thái **Draft**.
4. Trang `/tai-lieu` ngoài public **không được phép** hiển thị tài liệu này.
5. Đổi trạng thái tài liệu sang **Published**.
6. Trang công bố tài liệu public `/tai-lieu` hiển thị đầy đủ thông tin kèm nút tải xuống trực tiếp thông qua URL lưu trữ của Supabase.
7. Thử nghiệm đổi sang trạng thái **Lưu trữ (Archived)** và **Xóa** để đảm bảo tài liệu được bảo vệ nghiêm ngặt.

---

## 12. Verify Albums CRUD

Kiểm thử thư viện ảnh hoạt động:

1. Truy cập `/quan-tri/album`.
2. Tạo một Album mới ở trạng thái **Draft**.
3. Tải lên nhiều hình ảnh khác nhau cho Album. Các ảnh này phải được lưu vào bucket `school-media`.
4. Trang `/thu-vien` ngoài public **không được phép** hiển thị Album này khi nó còn là Draft.
5. Đổi trạng thái Album sang **Published**.
6. Giao diện `/thu-vien` phải xuất hiện Album vừa tạo.
7. Nhấp vào chi tiết Album `/thu-vien/:id` để kiểm tra khả năng hiển thị lưới ảnh và trình xem ảnh trượt (lightbox).
8. Thử chỉnh sửa ghi chú (Caption) của ảnh và đổi ảnh đại diện (Cover Image) cho Album.
9. Đảm bảo các luồng **Archived** và **Xóa** hoạt động đồng bộ với cơ sở dữ liệu.

---

## 13. Verify User Management

Kiểm thử bảng điều khiển thành viên (Chỉ Admin mới có quyền thực hiện):

1. Truy cập `/quan-tri/nguoi-dung`.
2. Chọn một tài khoản thành viên trong danh sách và nhấn **Sửa (Edit)**.
3. Thử thay đổi vai trò hệ thống của họ (ví dụ từ `viewer` lên `editor`).
4. Nhấn **Lưu lại** và xác nhận vai trò mới hiển thị chính xác.
5. Thử khóa tài khoản bằng cách chọn Trạng thái là **Tạm khóa tài khoản** (`is_active = false`).
6. Dùng tài khoản bị khóa này để đăng nhập -> Hệ thống phải từ chối phiên làm việc hoặc ngăn chặn truy cập các trang quản trị tương ứng nhờ chính sách bảo mật RLS và Route Guard.
7. **Kiểm tra an toàn tự khóa:** Admin đang đăng nhập không được phép tự thay đổi vai trò hay tự khóa tài khoản của chính mình (Nút khóa bị vô hiệu hóa và có cảnh báo an toàn).

---

## 14. Verify public-only access

Sử dụng Tab ẩn danh hoặc trình duyệt không đăng nhập (Anonymous User):
* Duyệt qua toàn bộ các trang: `/`, `/tin-tuc`, `/tai-lieu`, `/thu-vien`.
* Phải đọc được dữ liệu bình thường (không bị màn hình trắng hay lỗi ứng dụng).
* Chỉ nhìn thấy các nội dung có trạng thái `published` và các CMS overrides có thuộc tính `is_enabled = true`.
* Toàn bộ các thanh công cụ quản trị (Admin bar), nút chỉnh sửa (Edit mode), và menu quản trị hoàn toàn ẩn giấu.
* Không thể truy cập trực tiếp vào `/quan-tri` bằng cách gõ URL (bị redirect hoặc chặn hiển thị).

---

## 15. Verify RLS behavior (Row-Level Security)

Xác minh trực tiếp cơ chế bảo mật ở tầng Cơ sở dữ liệu (Database-level protection) để tránh rò rỉ dữ liệu qua các cuộc tấn công Bypass API:

### Quản trị viên (Admin)
* Có toàn quyền Đọc, Thêm, Sửa, Xóa trên tất cả các bảng: `cms_overrides`, `news`, `documents`, `albums`, `album_images`, `profiles`.
* Có quyền cập nhật thông tin vai trò (`role`) và kích hoạt (`is_active`) của tất cả các profiles khác.

### Biên tập viên (Editor)
* Có quyền Đọc, Thêm, Sửa, Xóa trên các nội dung: `cms_overrides`, `news`, `documents`, `albums`, `album_images`.
* Có quyền tải tài nguyên lên Buckets lưu trữ.
* **KHÔNG** có quyền truy cập, đọc hay chỉnh sửa bảng `profiles` của thành viên khác.

### Người dùng chưa đăng nhập / Người xem (Anonymous / Viewer)
* Chỉ có quyền **ĐỌC** các bản ghi có trạng thái xuất bản (`status = 'published'` hoặc `is_enabled = true`).
* **KHÔNG** có bất kỳ quyền Thêm (Insert), Sửa (Update), hay Xóa (Delete) nào trên cơ sở dữ liệu. Mọi yêu cầu ghi dữ liệu giả mạo từ API Client sẽ bị Supabase chặn đứng và trả về lỗi `new row violates row-level security policy`.

---

## 16. Common errors & Troubleshooting

### Lỗi: `permission denied for table profiles` hoặc `missing or insufficient privileges`
* **Nguyên nhân:** Người dùng chưa đăng nhập hoặc chưa được phân quyền đúng vai trò `admin` trên cơ sở dữ liệu.
* **Cách xử lý:** Đảm bảo bạn đã chạy tệp SQL migration phân quyền số `034_role_based_rls.sql`. Kiểm tra xem tài khoản của bạn trong bảng `public.profiles` đã được cập nhật trường `role = 'admin'` chưa.

### Lỗi: `new row violates row-level security policy`
* **Nguyên nhân:** Thao tác tạo hoặc chỉnh sửa dữ liệu bị từ chối do vi phạm quy tắc bảo mật RLS trên Supabase. Thường xảy ra khi Biên tập viên cố tình thao tác khi chưa đăng nhập, hoặc tài khoản đã bị khóa (`is_active = false`).
* **Cách xử lý:** Đăng nhập lại để cập nhật JWT Token mới nhất trong cookie/local storage. Kiểm tra trạng thái hoạt động của tài khoản trong bảng `profiles`.

### Lỗi: Tải lên hình ảnh / tài liệu báo lỗi đỏ
* **Nguyên nhân:** Phân vùng lưu trữ (Storage bucket) chưa được khởi tạo, chưa được cấu hình ở chế độ Public, hoặc chính sách RLS của Storage chưa cho phép tài khoản hiện tại ghi dữ liệu.
* **Cách xử lý:** Truy cập Supabase Dashboard -> Storage, xác nhận sự tồn tại của hai bucket `school-media` và `school-document`. Hãy chắc chắn đã chạy tệp migration `031_storage_school_media.sql` để thiết lập các chính sách cho Storage.

### Lỗi: Trang công cộng (Public) không thấy bài viết mới
* **Nguyên nhân:** Bài viết chưa được chuyển đổi trạng thái sang `published` hoặc trường `published_at` đang để giá trị rỗng/tương lai.
* **Cách xử lý:** Chỉnh sửa bài viết trong giao diện quản trị, đổi trạng thái sang "Đã xuất bản" và lưu lại.

---

## 17. Final Production Checklist

Trước khi đưa website THCS Trần Quang Khải chính thức hoạt động:

* [ ] Kiểm tra lệnh biên dịch dự án: `npm run lint` hoàn thành không lỗi.
* [ ] Kiểm tra lệnh đóng gói sản phẩm: `npm run build` tạo thư mục `dist` thành công.
* [ ] Đảm bảo tệp `.env.local` đã nằm trong danh sách `.gitignore` và không có bất kỳ khóa bảo mật thật nào bị đẩy lên Git.
* [ ] Đảm bảo không sử dụng `service_role` key trên Frontend.
* [ ] Đã nhập đầy đủ các biến cấu hình Production trên máy chủ lưu trữ (Cloud Run, Vercel, Netlify, v.v.).
* [ ] Thiết lập hai biến bảo mật để bảo vệ tuyệt đối:
  * `VITE_ENABLE_DEMO_FALLBACK = false`
  * `VITE_ENABLE_CMS_EDITING = false`
* [ ] Chạy đủ 5 tệp migrations trên Supabase Production.
* [ ] Tạo tài khoản Quản trị viên đầu tiên và cấp quyền `admin` thủ công thông qua SQL Editor.
* [ ] Kiểm chứng các Buckets `school-media` và `school-document` đã ở chế độ Public.
* [ ] Thử nghiệm đăng nhập và thao tác CRUD trên Tin tức, Tài liệu, Album thành công.
* [ ] Thử nghiệm đăng nhập dưới quyền Editor: Đảm bảo không thể vào được trang Quản lý thành viên.
* [ ] Đăng xuất và duyệt toàn bộ trang web: Đảm bảo không thấy nút chỉnh sửa, nội dung nháp được ẩn hoàn toàn và ứng dụng vận hành mượt mà.
