# HOTFIX 087 — GVCN thấy lỗi cá nhân thành “Tập thể lớp”

## 1. Hiện tượng

Cùng một sự việc thi đua của lớp 6/8:

- Admin thấy đúng học sinh: `Nguyễn Trần Thiên Di` + mã học sinh.
- GVCN lớp 6/8 lại thấy `Tập thể lớp`, không có tên học sinh.

Đây không phải lỗi dữ liệu của `competition_incidents`, và cũng không phải lỗi
phân loại cá nhân/tập thể khi ghi nhận.

## 2. Đã kiểm tra code nào

Đã kiểm tra trực tiếp source `THCS_TQK-main(5).zip`, đặc biệt:

- `src/pages/CompetitionReportPage.tsx`
- `src/components/competition/WeeklyIncidentsReportCard.tsx`
- `src/services/competitionService.ts`
- `supabase/migrations/064_supervisor_pending_incidents_rls.sql`
- `supabase/migrations/065_supervisor_profiles_competition_rls.sql`
- `supabase/migrations/056_competition_actor_assignments.sql`
- schema `homeroom_assignments` và `student_enrollments`

## 3. Nguyên nhân gốc

`WeeklyIncidentsReportCard` không tự quyết định cá nhân/tập thể.

Nó lấy:

```ts
const studentName = item.student_name || item.student?.full_name;
```

Nếu có `studentName` thì hiện học sinh; nếu không có thì UI mới fallback thành:

```text
Tập thể lớp
```

`competitionService.getWeeklyOfficialIncidents()` query:

```text
competition_incidents
  -> student:profiles!competition_incidents_student_id_fkey(full_name, student_code)
```

Với Admin, policy `profiles` cho phép đọc toàn bộ profile nên nested relation trả về
đúng học sinh.

Với GVCN, incident của lớp vẫn được xem trong báo cáo đã scope theo lớp chủ nhiệm,
nhưng RLS của `public.profiles` chưa có nhánh cho GVCN. Migration 065 chỉ cho đọc
profile khi `can_view_competition_incident(...)` cho phép theo các quyền thi đua cũ.
Nó chưa xét quan hệ `homeroom_assignments`.

Kết quả là PostgREST trả incident nhưng nested `student:profiles(...)` bị rỗng/null.
Frontend tưởng `studentName` không tồn tại và hiển thị `Tập thể lớp`.

## 4. Cách sửa

Migration 087 mở rộng đúng helper hiện có:

`public.can_view_competition_related_profile(user_id, profile_id)`

Bổ sung trường hợp:

- người đang đăng nhập là GVCN;
- `homeroom_assignments.class_id = competition_incidents.unit_id`;
- cùng `academic_year_id` với chương trình thi đua;
- phân công GVCN đang active;
- ngày xảy ra sự việc nằm trong thời gian phân công (nếu có start/end date);
- profile cần đọc phải chính là học sinh / người ghi nhận / người duyệt của incident đó.

Không cấp quyền đọc toàn bộ `profiles` cho giáo viên.

## 5. Vì sao không sửa frontend

Không vá kiểu:

```text
không có student_name => đi tìm tên ở chỗ khác
```

vì như vậy chỉ che lỗi RLS và dễ tạo sai dữ liệu.

Frontend hiện tại đã đúng: nếu backend trả `student_name`, nó sẽ hiển thị cá nhân.
Do đó hotfix chỉ sửa nguồn quyền đọc profile.

## 6. File thay đổi

Chỉ 1 migration:

`supabase/migrations/087_fix_gvcn_competition_profile_visibility.sql`

Không thay:
- `WeeklyIncidentsReportCard.tsx`
- `CompetitionReportPage.tsx`
- `competitionService.ts`
- logic ghi nhận/duyệt sự việc
- logic khóa lớp GVCN
- điểm thi đua
- dữ liệu incident hiện có

## 7. Cách triển khai

Mở Supabase SQL Editor và chạy toàn bộ:

`087_fix_gvcn_competition_profile_visibility.sql`

Sau đó refresh website. Không cần deploy Vercel vì không có frontend file thay đổi.

## 8. Test bắt buộc

### Test 1 — Admin
Mở:
`Thi đua -> Báo cáo -> Ghi nhận trong tuần -> lớp 6/8`

Kỳ vọng:
- Nguyễn Trần Thiên Di vẫn hiển thị.
- Mã HS vẫn hiển thị.
- Không thay đổi hành vi Admin.

### Test 2 — GVCN Cao Thị Ngát
Đăng nhập tài khoản GVCN lớp 6/8, mở cùng Tuần 5.

Kỳ vọng:
- cùng record `Đi học trễ`;
- cột Người vi phạm hiện `Nguyễn Trần Thiên Di`;
- có mã `TQK2627-0225`;
- KHÔNG còn `Tập thể lớp`.

### Test 3 — Lỗi tập thể thật
Mở một incident có `competition_incidents.student_id IS NULL`.

Kỳ vọng:
- vẫn hiển thị `Tập thể lớp`.

Hotfix không biến lỗi tập thể thật thành lỗi cá nhân.

### Test 4 — Phạm vi GVCN
GVCN 6/8 không được dùng hotfix này để đọc profile học sinh từ incident của lớp khác.

## 9. Rollback

Nếu cần rollback logic mới, chạy lại nội dung function/policy của migration
`065_supervisor_profiles_competition_rls.sql`.

## Commit gợi ý

`fix(competition): allow homeroom teachers to resolve student profiles in reports`
