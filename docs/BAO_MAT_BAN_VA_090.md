# Bản vá bảo mật 090 — Website Liên đội THCS Trần Quang Khải

Ngày: 09/10/2026. Cơ sở: mã nguồn `THCS_TQK-main(6).zip`, kết quả RLS/quyền gọi RPC/policy/bucket và định nghĩa hàm thực tế do người quản trị cung cấp. Chưa chạy bản vá trên cơ sở dữ liệu production; chưa triển khai website.

## Quyết định được thực hiện

**Việc tốt đã duyệt (`APPROVED` + quy tắc `GOOD_DEED`) và minh chứng vẫn công khai cho mọi người.** Không coi việc công khai này là lỗi. Phần cần thu hẹp là quyền đọc các sự việc thuộc loại khác, đặc biệt vi phạm, và minh chứng tương ứng.

Giữ nguyên bucket `school-media`, `school-document`, trạng thái public, dung lượng và MIME; giữ nguyên cấu hình mật khẩu, lịch tự động, cách tính điểm và quyền giám thị đang được phân công tra cứu toàn trường. Không sửa SQL chỉ dựa trên cột `user_select=true`: quyền SELECT cấp ở bảng phải được đánh giá cùng điều kiện RLS và kiểm tra trong RPC.

## Năm phần đã vá

| Phần | Hành vi trước bản vá | Hành vi sau bản vá |
| --- | --- | --- |
| 1. Đọc sự việc thi đua | Policy cho người chưa đăng nhập và người đăng nhập đọc mọi sự việc `APPROVED`, kể cả vi phạm | Công khai riêng việc tốt đã duyệt. Sự việc khác cần quyền thật của người gọi; giữ quyền cá nhân/người ghi/quản lý/giám thị và thêm nhánh GVCN đúng lớp, năm học, thời gian phân công |
| 2. Đọc bản ghi minh chứng | Policy công khai minh chứng của mọi sự việc đã duyệt | Công khai minh chứng của việc tốt đã duyệt; bản ghi minh chứng khác phải qua quyền xem sự việc |
| 3. Tra cứu học sinh và lớp | `search_competition_students` thiếu kiểm tra người gọi/phạm vi; `get_student_current_unit` thiếu kiểm tra quyền với ID học sinh | Cả hai RPC yêu cầu tài khoản đang hoạt động và kiểm tra phạm vi. Không thể dùng ID tùy ý để đọc lớp của học sinh khác |
| 4. Hoàn tất chào cờ | `complete_flag_ceremony()` được gọi bởi anon/authenticated, không kiểm tra vai trò hoặc định danh phiên | Thu hồi quyền gọi chữ ký cũ. RPC mới chỉ cho giáo viên/cán bộ thuộc các vai trò quy định; bắt buộc khớp `starts_at` và `updated_at`, phiên đang chạy và đã đến giờ bắt đầu |
| 5. Gửi đề nghị xem lại | So sánh `student_id <> caller` không chặn `NULL`; kiểm tra trùng chưa có khóa theo người gửi | Dùng `IS DISTINCT FROM` cho cả sự việc và giao dịch. Yêu cầu tài khoản hoạt động; khóa hàng profile người gửi trước kiểm tra/insert để tuần tự hóa các lần gửi cùng tài khoản |

Việc tốt chưa duyệt không trở thành nội dung công khai. Bản vá không cho phép chỉnh lỗi vi phạm hoặc sửa điểm qua nhật ký.

### Quyền đọc sự việc và minh chứng

| Người xem | Phạm vi dữ liệu ngoài việc tốt công khai |
| --- | --- |
| Chưa đăng nhập/người không có quyền liên quan | Không đọc được bản ghi riêng |
| Đội viên | Sự việc của chính mình |
| Người ghi nhận | Sự việc do mình ghi nhận |
| GVCN | Sự việc thuộc lớp và năm học được phân công; phân công còn active, ngày xảy ra trong thời gian phân công |
| Tài khoản có `COMPETITION_RECORD`, `COMPETITION_APPROVE` hoặc `COMPETITION_MANAGE` | Giữ quyền toàn cục hiện có |
| Giám thị | Giữ logic DB thực tế: phân công active có quyền ghi trong năm học tương ứng được xem toàn trường các sự việc đã duyệt; sự việc chờ duyệt cần quy tắc cho SUPERVISOR duyệt và phân công có quyền duyệt phù hợp |

Hàm `can_view_competition_incident` chỉ đánh giá quyền của chính `auth.uid()`. Truyền ID quản trị thay ID người gọi không tạo quyền. Tài khoản không hoạt động mất các nhánh quyền riêng; vẫn có thể đọc nội dung công khai như khách.

### Quyền tra cứu học sinh

Helper nội bộ `can_lookup_competition_student` không được gọi trực tiếp bởi anon/authenticated. Hai RPC tra cứu dùng helper với ID người gọi thật:

- Giữ quyền tự xem và quyền toàn cục/giám thị hiện có trong hàm DB `can_view_student_competition_profile`.
- GVCN tra cứu học sinh lớp được phân công trong năm học tương ứng, với thời gian phân công hiện hành.
- Sao đỏ/BCH Liên đội có phân công `RED_STAR`/`LIEN_DOI_COMMAND`, active và `can_record_incident=true`, tra cứu theo lớp/khối/toàn trường đã được giao. Không tự tạo thêm phân công.
- Tài khoản thường khác không có quyền tra cứu học sinh bất kỳ. Phụ huynh không được thêm quyền đọc dữ liệu riêng trong bản vá này; chưa sửa cơ chế liên kết phụ huynh–học sinh.
- Giữ nguyên cấu trúc trả về, tìm kiếm tên/mã học sinh, điều kiện năm học hiện hành và giới hạn tối đa 50 kết quả của RPC tìm kiếm.

### Chào cờ và chống phát lại

Giao diện chỉ gọi RPC hoàn tất khi media chuyển sang `done` và người dùng có vai trò `SUPER_ADMIN`, `PRINCIPAL`, `VICE_PRINCIPAL`, `STAFF` hoặc `TEACHER`. SQL kiểm tra lại tài khoản active và các vai trò này, không tin riêng điều kiện ở giao diện.

Gửi đúng dấu thời gian của tín hiệu đã phát. Nếu một trình duyệt cũ gửi hoàn tất sau khi có phiên mới, UPDATE không khớp và không sửa phiên mới. Gọi lặp một phiên đã hoàn tất cũng không sửa dữ liệu. Giá trị bắt đầu ở tương lai không được hoàn tất.

Học sinh/phụ huynh/khách vẫn xem nghi lễ và ghi nhớ phiên đã phát trong localStorage. Họ không còn tự đánh dấu hoàn tất trạng thái dùng chung trên server. Nếu không có giáo viên/cán bộ đang mở trang để hoàn tất, giữ cơ chế dọn tín hiệu cũ đã có trong hệ thống; bản vá không sửa thời gian cron. Cơ chế localStorage phụ thuộc trình duyệt và không được bảo đảm khi người dùng xóa bộ nhớ hoặc đổi thiết bị.

RPC mới **không chứng minh rằng audio đã phát hết trên thiết bị**: giáo viên/cán bộ có quyền vẫn có thể gọi trực tiếp sau giờ bắt đầu. Phạm vi vá là chặn người không có quyền và chống tác động nhầm phiên.

## Các file trong ZIP

ZIP chỉ chứa 5 file thay đổi của bản vá bảo mật 090, giữ đúng đường dẫn tương đối từ gốc repository. Giải nén rồi chép trực tiếp các thư mục `src`, `supabase`, `docs` vào repository hiện tại, đồng ý ghi đè các file cùng tên; sau đó xem diff trong GitHub Desktop. Không có thư mục bọc `THCS_TQK-main`, node_modules, dist hoặc file không liên quan.

| File | Thay đổi |
| --- | --- |
| `supabase/migrations/090_security_competition_and_ceremony.sql` | Toàn bộ SQL vá năm phần trên trong một transaction |
| `src/services/flagCeremonyService.ts` | RPC hoàn tất nhận tín hiệu và gửi hai timestamp; chế độ local cũng so khớp tín hiệu |
| `src/pages/FlagCeremonyPage.tsx` | Kiểm tra vai trò hoàn tất, truyền tín hiệu cho service, giữ đánh dấu phát xong ở localStorage |
| `docs/BAO_MAT_BAN_VA_090.md` | Tài liệu này |
| `docs/KIEM_TRA_SAU_VA_090.sql` | Các truy vấn metadata chỉ đọc để kiểm tra sau triển khai |

Bản chỉnh ghi chú nhật ký đã làm trước đó không nằm trong ZIP này và không bị ghi đè: `089_admin_edit_competition_incident_notes.sql`, `ADMIN_EDIT_INCIDENT_NOTES.md`, thay đổi trong `IncidentsHistoryTab.tsx` và phương thức `editIncidentNotes` trong `competitionService.ts`. Chỉ sửa ghi chú; muốn đổi lỗi phải hủy và ghi lại. Không cần chạy lại 089 nếu đã chạy thành công.

## Thứ tự triển khai

1. Sao lưu DB hoặc lưu snapshot định nghĩa/policy/quyền hiện tại trước khi chạy; thử 090 trên môi trường staging có schema giống production nếu có.
2. Chép 5 file từ ZIP vào mã nguồn repository hiện tại để chuẩn bị deployment. Giữ biến môi trường thật của Vercel; ZIP chỉ có `.env.example`. Không đưa service-role key vào frontend.
3. Chạy **duy nhất migration mới `supabase/migrations/090_security_competition_and_ceremony.sql`** trong SQL Editor với quyền quản trị DB. Không chạy lại toàn bộ thư mục migrations. File có BEGIN/COMMIT và reload schema PostgREST.
4. Nếu SQL báo lỗi, dừng triển khai, ghi lại thông báo. Khi chạy toàn file trong transaction, các thay đổi trước lỗi không được commit; nếu Editor còn transaction lỗi hãy ROLLBACK trước khi thử lại. Không bỏ từng đoạn kiểm tra quyền để chạy cho qua.
5. Khi SQL thành công, triển khai ngay mã nguồn đã vá. Khoảng thời gian giữa SQL và deployment, frontend cũ vẫn gọi RPC không tham số đã bị thu hồi quyền: trạng thái hoàn tất dùng chung có thể báo lỗi. Xếp triển khai ngoài giờ chào cờ để tránh gián đoạn. Frontend mới gọi RPC có tham số cần SQL 090 tồn tại.
6. Chạy `docs/KIEM_TRA_SAU_VA_090.sql`, sau đó kiểm tra bằng tài khoản thực theo danh sách bên dưới. Không chỉ kiểm tra bằng SQL Editor có quyền owner vì owner bỏ qua RLS.

Nếu cần phục hồi khẩn cấp, phục hồi cả DB từ snapshot trước 090 và deployment trước bản vá, hoặc chuẩn bị SQL phục hồi có kiểm chứng từ chính snapshot. Không chỉ rollback frontend khi DB đã thu hồi RPC cũ. Khôi phục DB cũ cũng khôi phục các lỗ hổng đã mô tả.

### Kiểm tra thực tế sau triển khai

- Mở cửa sổ ẩn danh: xem được việc tốt đã duyệt và minh chứng; không xem được sự việc vi phạm riêng bằng Data API.
- Đội viên: đọc dữ liệu của mình; thử ID học sinh khác với RPC tra cứu và đề nghị xem lại phải bị chặn ngoài phạm vi.
- GVCN: xem báo cáo/sự việc và tra cứu học sinh lớp mình; thử lớp khác phải bị chặn nếu không có quyền bổ sung.
- Giám thị/quản trị: kiểm tra quyền toàn trường vẫn đúng phân công; giám thị không mặc nhiên xem mọi sự việc chờ duyệt.
- Thử gửi đề nghị cho sự việc tập thể `student_id=NULL`: phải bị từ chối; đề nghị của chính mình thành công, gửi trùng PENDING bị từ chối.
- Chào cờ: khách/học sinh vẫn nghe và xem được; giáo viên/cán bộ hoàn tất đúng phiên; tab giữ tín hiệu cũ không kết thúc phiên mới.
- Kiểm tra chức năng ghi nhận vi phạm, tra cứu hồ sơ, báo cáo GVCN, công khai việc tốt và chỉnh ghi chú sau deploy.

## Kết quả kiểm thử đã thực hiện

- SQL chạy trên PostgreSQL nhúng PGlite với fixture schema tương ứng và định nghĩa hàm thực tế được cung cấp; áp dụng migration 090 hai lần thành công.
- **48 assertion qua**: RLS của cả sự việc và minh chứng với anon, phụ huynh thường, hai đội viên, GVCN, giám thị, quản trị; phạm vi tra cứu GVCN/sao đỏ/giám thị; giả ID người gọi; tài khoản inactive; ownership NULL; đề nghị đúng chủ/trùng; RPC chào cờ cũ, vai trò mới, timestamp cũ, phiên tương lai.
- `npm run build` thành công. Vite còn cảnh báo chunk lớn của source.
- So sánh TypeScript trước/sau: **không phát sinh diagnostic mới**, nhưng source gốc vẫn có **14 diagnostic** với bộ dependency dùng kiểm thử. Đây không phải xác nhận toàn bộ dự án đã sạch lỗi TypeScript.

Giới hạn: kiểm thử local không nối production; helper quyền toàn cục/vai trò dùng fixture, `unaccent` dùng stub để kiểm tra phân quyền, không kiểm tra chất lượng tìm kiếm tiếng Việt. Chưa kiểm thử gửi đề nghị đồng thời trên nhiều kết nối, auth JWT thật, Realtime production hoặc toàn bộ luồng UI qua trình duyệt. Cần kiểm tra tài khoản thực sau triển khai.

## Những gì vẫn giữ nguyên và giới hạn bảo mật

- `school-document`: public, giới hạn 20 MiB, MIME tài liệu như cấu hình đã cung cấp.
- `school-media`: public, giới hạn 50 MiB, `allowed_mime_types=NULL` như cấu hình đã cung cấp.
- **RLS bản ghi minh chứng không bảo vệ URL file trong bucket public.** Người đã biết URL file vi phạm vẫn tải file trực tiếp được. Bản vá chặn đọc bản ghi/tra cứu đường dẫn ngoài quyền, không biến file thành private và không thu hồi URL cũ. Đây là giới hạn có chủ đích do yêu cầu giữ cấu hình.
- Không đổi mật khẩu dễ đoán, giới hạn upload, thư viện Excel, cấu hình Vercel/WAF/rate limiting, số kết nối hay kênh Realtime.
- Bản vá xử lý lỗi phân quyền SQL/RPC đã xác nhận, không phải bằng chứng toàn hệ thống không có SQL injection; không thêm cơ chế chống DDoS.
- **Chưa kiểm thử tải 5.000–10.000 người đồng thời** và không cam kết khả năng chịu tải đó. Tổng người dùng khác với số truy cập đồng thời; cần số liệu thực tế của hạ tầng để đánh giá.
