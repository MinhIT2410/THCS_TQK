# HOTFIX V2 — GVCN vẫn thấy “Tập thể lớp” sau migration 087

## Kết quả kiểm tra lại

Ảnh sau khi chạy hotfix trước cho thấy:
- GVCN vẫn lấy được đúng incident `Đi học trễ`, lớp `6/8`, thời điểm đúng.
- Nhưng `NGƯỜI VI PHẠM` vẫn là `Tập thể lớp`.
- `NGƯỜI GHI NHẬN` cũng thành `Hệ thống`.

Điều này xác nhận nested relation tới `profiles` vẫn không trả profile cho session GVCN.
Hotfix 087 chỉ sửa policy `profiles`, nhưng query báo cáo hiện tại vẫn phụ thuộc trực tiếp
vào nested PostgREST relation:

```ts
student:profiles!competition_incidents_student_id_fkey(...)
recorder:profiles!competition_incidents_recorded_by_fkey(...)
```

Trong `WeeklyIncidentsReportCard.tsx`, frontend dùng:

```ts
const studentName = item.student_name || item.student?.full_name;
```

và chỉ cần tên bị null là UI fallback thành `Tập thể lớp`.

## Cách sửa V2

Không tiếp tục nới RLS `profiles`.

Thêm RPC:

`get_homeroom_competition_incident_people(uuid[])`

RPC là `SECURITY DEFINER`, nhưng chỉ trả tên/mã người liên quan khi:
- caller đang đăng nhập;
- incident thuộc đúng `class_id` đang được caller làm GVCN;
- `homeroom_assignments.academic_year_id` trùng năm học của chương trình thi đua;
- phân công đang active;
- ngày incident nằm trong thời gian phân công.

Sau query hiện tại, `competitionService.getWeeklyOfficialIncidents()` chỉ gọi RPC này
cho các incident đang thiếu nested student/recorder/approver profile rồi merge kết quả.

### Quan trọng

Frontend **không đoán** cá nhân/tập thể.

- `student_id IS NULL` thật -> vẫn là `Tập thể lớp`.
- `student_id` có nhưng nested profile bị RLS ẩn -> RPC trả lại đúng tên/mã học sinh.
- Admin vốn đã đọc được profile -> không cần fallback và hành vi giữ nguyên.

## File thay đổi

1. `src/services/competitionService.ts`
2. `supabase/migrations/088_fix_gvcn_incident_people_rpc.sql`
3. `README_FIX_GVCN_STUDENT_NAME_V2.md`

## Triển khai

### Bước 1 — Supabase
Chạy toàn bộ:
`supabase/migrations/088_fix_gvcn_incident_people_rpc.sql`

### Bước 2 — Frontend
Copy đè:
`src/services/competitionService.ts`

Commit và deploy Vercel.

**Bản V2 cần cả SQL + deploy Vercel.**

## Kiểm thử

### GVCN 6/8
Cùng incident trong ảnh phải hiện:

```text
Nguyễn Trần Thiên Di
Mã: TQK2627-0225
```

không còn `Tập thể lớp`.

Nếu người ghi nhận có profile, cột Người ghi nhận cũng không còn fallback `Hệ thống`.

### Admin
Admin vẫn phải thấy y hệt trước hotfix.

### Lỗi tập thể thật
Record có `competition_incidents.student_id IS NULL` vẫn phải hiện `Tập thể lớp`.

### Bảo mật
GVCN 6/8 không thể dùng RPC để lấy tên học sinh của incident lớp khác.

## Về migration 087 đã chạy

Không cần rollback 087 trước khi chạy 088. V2 không phụ thuộc vào việc nới policy đó để
lấy tên học sinh; RPC 088 là fallback có scope GVCN riêng.

## Commit gợi ý

`fix(competition): resolve incident student names for homeroom reports`
