# BẢN ĐỒ CƠ SỞ DỮ LIỆU — THCS TRẦN QUANG KHẢI

> Nguồn: 2 SQL SELECT do người dùng chạy trên Supabase ngày 30/10/2026. Không chứa bản ghi cá nhân.
> Tài liệu mô tả *snapshot*, không phải bằng chứng các bảng vẫn giữ nguyên ở các ngày sau.

## Tổng quan

| Nhóm | Bảng | Vai trò |
|---|---|---|
| Phong trào | public.movement_campaigns | Phong trào chính: tên, slug, trạng thái, năm học, hình bìa |
| Hoạt động | public.movement_events | Các hoạt động con gắn campaign_id |
| Nội dung công khai | public.movement_evidence | Minh chứng/link ảnh của phong trào, có event_id tùy chọn |
| Bài nộp đã tồn tại | public.chi_doi_congress_submissions | Biên bản Đại hội Chi đội theo lớp, không dùng làm bài nộp chung |
| Album chung | public.albums, public.album_images | Thư viện ảnh website, album_images có album_id |
| Lớp | public.classes | lớp, khối, năm học |
| Kiểm tra GVCN | public.is_homeroom_teacher | hàm security-definer dùng kiểm tra phân công |

## Chi tiết bảng (cột / kiểu / mặc định / quan hệ / chính sách RLS)

### `public.album_images`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `album_id` | uuid | Không | `—` |
| `image_url` | text | Không | `—` |
| `caption` | text | Có | `—` |
| `sort_order` | integer | Không | `0` |
| `created_by` | uuid | Có | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `album_images_album_id_fkey` (f): `FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE`
- `album_images_created_by_fkey` (f): `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `album_images_image_url_not_empty` (c): `CHECK ((length(TRIM(BOTH FROM image_url)) > 0))`
- `album_images_pkey` (p): `PRIMARY KEY (id)`

**RLS policies:**
- `Admin and editor can manage album images` · ALL · roles=authenticated · USING: `is_admin_or_editor()` · WITH CHECK: `is_admin_or_editor()`
- `Public can read images from published albums` · SELECT · roles=public · USING: `(EXISTS ( SELECT 1
   FROM albums
  WHERE ((albums.id = album_images.album_id) AND (albums.status = 'published'::text))))` · WITH CHECK: `—`

### `public.albums`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `title` | text | Không | `—` |
| `description` | text | Có | `—` |
| `cover_image_url` | text | Có | `—` |
| `status` | text | Không | `'published'::text` |
| `published_at` | timestamp with time zone | Có | `—` |
| `created_by` | uuid | Có | `—` |
| `updated_by` | uuid | Có | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `albums_created_by_fkey` (f): `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `albums_pkey` (p): `PRIMARY KEY (id)`
- `albums_status_check` (c): `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`
- `albums_title_not_empty` (c): `CHECK ((length(TRIM(BOTH FROM title)) > 0))`
- `albums_updated_by_fkey` (f): `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`

**RLS policies:**
- `Admin and editor can manage albums` · ALL · roles=authenticated · USING: `is_admin_or_editor()` · WITH CHECK: `is_admin_or_editor()`
- `Public can read published albums` · SELECT · roles=public · USING: `(status = 'published'::text)` · WITH CHECK: `—`

### `public.chi_doi_congress_submissions`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `campaign_id` | uuid | Không | `—` |
| `class_id` | uuid | Không | `—` |
| `teacher_id` | uuid | Không | `—` |
| `meeting_date` | timestamp with time zone | Có | `—` |
| `location` | text | Có | `—` |
| `total_members` | integer | Có | `—` |
| `attendees` | integer | Có | `—` |
| `chairperson` | text | Có | `—` |
| `secretary` | text | Có | `—` |
| `agenda` | text | Có | `—` |
| `election_result` | text | Có | `—` |
| `executive_committee` | text | Có | `—` |
| `notes` | text | Có | `—` |
| `image_urls` | text[] | Không | `'{}'::text[]` |
| `status` | text | Không | `'draft'::text` |
| `submitted_at` | timestamp with time zone | Có | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `chi_doi_congress_max_3_images` (c): `CHECK ((cardinality(image_urls) <= 3))`
- `chi_doi_congress_one_per_class_campaign` (u): `UNIQUE (campaign_id, class_id)`
- `chi_doi_congress_submissions_attendees_check` (c): `CHECK (((attendees IS NULL) OR (attendees >= 0)))`
- `chi_doi_congress_submissions_campaign_id_fkey` (f): `FOREIGN KEY (campaign_id) REFERENCES movement_campaigns(id) ON DELETE CASCADE`
- `chi_doi_congress_submissions_class_id_fkey` (f): `FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE`
- `chi_doi_congress_submissions_pkey` (p): `PRIMARY KEY (id)`
- `chi_doi_congress_submissions_status_check` (c): `CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text])))`
- `chi_doi_congress_submissions_teacher_id_fkey` (f): `FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE RESTRICT`
- `chi_doi_congress_submissions_total_members_check` (c): `CHECK (((total_members IS NULL) OR (total_members >= 0)))`

**RLS policies:**
- `GVCN can insert own congress submission` · INSERT · roles=authenticated · USING: `—` · WITH CHECK: `((teacher_id = auth.uid()) AND is_homeroom_teacher(auth.uid(), class_id))`
- `GVCN can read own congress submission` · SELECT · roles=authenticated · USING: `((teacher_id = auth.uid()) AND is_homeroom_teacher(auth.uid(), class_id))` · WITH CHECK: `—`
- `GVCN can update own congress submission` · UPDATE · roles=authenticated · USING: `((teacher_id = auth.uid()) AND is_homeroom_teacher(auth.uid(), class_id))` · WITH CHECK: `((teacher_id = auth.uid()) AND is_homeroom_teacher(auth.uid(), class_id))`
- `Managers can read congress submissions` · SELECT · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'VICE_PRINCIPAL'::text, 'CONTENT_EDITOR'::text])` · WITH CHECK: `—`

### `public.classes`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `name` | text | Không | `—` |
| `grade_level` | integer | Không | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |
| `code` | text | Có | `—` |
| `grade_level_id` | uuid | Có | `—` |
| `academic_year_id` | uuid | Có | `—` |
| `expected_capacity` | integer | Có | `—` |
| `primary_classroom_id` | uuid | Có | `—` |
| `is_active` | boolean | Không | `true` |
| `notes` | text | Có | `—` |
| `actual_enrollment` | integer | Không | `0` |

**Ràng buộc:**
- `classes_academic_year_id_fkey` (f): `FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE`
- `classes_grade_level_id_fkey` (f): `FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL`
- `classes_pkey` (p): `PRIMARY KEY (id)`
- `classes_primary_classroom_id_fkey` (f): `FOREIGN KEY (primary_classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL`

**RLS policies:**
- `Admins and principals can manage classes` · ALL · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text])` · WITH CHECK: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text])`
- `All authenticated users can read classes` · SELECT · roles=authenticated · USING: `true` · WITH CHECK: `—`

### `public.classrooms`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `code` | text | Không | `—` |
| `name` | text | Không | `—` |
| `room_type` | text | Có | `—` |
| `building` | text | Có | `—` |
| `floor` | text | Có | `—` |
| `capacity` | integer | Có | `—` |
| `status` | text | Không | `'ACTIVE'::text` |
| `equipment` | text | Có | `—` |
| `notes` | text | Có | `—` |
| `is_active` | boolean | Không | `true` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `classrooms_code_key` (u): `UNIQUE (code)`
- `classrooms_pkey` (p): `PRIMARY KEY (id)`
- `classrooms_status_check` (c): `CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'LOCKED'::text, 'MAINTENANCE'::text, 'INACTIVE'::text])))`

**RLS policies:**
- `Admins and principals can manage classrooms` · ALL · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text])` · WITH CHECK: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text])`
- `All authenticated users can read classrooms` · SELECT · roles=authenticated · USING: `true` · WITH CHECK: `—`

### `public.competition_incident_evidence`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `incident_id` | uuid | Không | `—` |
| `evidence_type` | text | Không | `—` |
| `file_url` | text | Có | `—` |
| `external_url` | text | Có | `—` |
| `caption` | text | Có | `—` |
| `display_order` | integer | Không | `0` |
| `uploaded_by` | uuid | Có | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `competition_incident_evidence_incident_id_fkey` (f): `FOREIGN KEY (incident_id) REFERENCES competition_incidents(id) ON DELETE CASCADE`
- `competition_incident_evidence_pkey` (p): `PRIMARY KEY (id)`
- `competition_incident_evidence_type_check` (c): `CHECK ((evidence_type = ANY (ARRAY['IMAGE'::text, 'INTERNAL_LINK'::text, 'EXTERNAL_LINK'::text])))`
- `competition_incident_evidence_uploaded_by_fkey` (f): `FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL`

**RLS policies:**
- `competition_evidence_public_good_deeds_select` · SELECT · roles=anon · USING: `(EXISTS ( SELECT 1
   FROM (competition_incidents ci
     JOIN competition_rules r ON ((r.id = ci.rule_id)))
  WHERE ((ci.id = competition_incident_evidence.incident_id) AND (ci.status = 'APPROVED'::text) AND (r.category = 'GOOD_DEED'::text))))` · WITH CHECK: `—`
- `competition_incident_evidence_insert` · INSERT · roles=authenticated · USING: `—` · WITH CHECK: `((EXISTS ( SELECT 1
   FROM competition_incidents ci
  WHERE ((ci.id = competition_incident_evidence.incident_id) AND (ci.recorded_by = auth.uid())))) OR has_competition_permission(auth.uid(), 'COMPETITION_APPROVE'::text) OR has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'::text))`
- `competition_incident_evidence_select` · SELECT · roles=authenticated · USING: `((EXISTS ( SELECT 1
   FROM (competition_incidents ci
     JOIN competition_rules r ON ((r.id = ci.rule_id)))
  WHERE ((ci.id = competition_incident_evidence.incident_id) AND (ci.status = 'APPROVED'::text) AND (r.category = 'GOOD_DEED'::text)))) OR can_view_competition_incident(auth.uid(), incident_id))` · WITH CHECK: `—`

### `public.movement_campaigns`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `title` | text | Không | `—` |
| `slug` | text | Không | `—` |
| `summary` | text | Có | `—` |
| `content` | text | Có | `—` |
| `cover_image_url` | text | Có | `—` |
| `campaign_type` | text | Không | `'theo_dot'::text` |
| `start_date` | timestamp with time zone | Có | `—` |
| `end_date` | timestamp with time zone | Có | `—` |
| `status` | text | Không | `'draft'::text` |
| `is_featured` | boolean | Không | `false` |
| `is_published` | boolean | Không | `false` |
| `display_order` | integer | Không | `0` |
| `academic_year` | text | Không | `'2025-2026'::text` |
| `created_by` | uuid | Có | `—` |
| `updated_by` | uuid | Có | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |
| `national_anthem_video_url` | text | Có | `—` |
| `team_song_video_url` | text | Có | `—` |
| `ceremony_salute_command` | text | Có | `'Chào cờ, chào!'::text` |
| `ceremony_readiness_motto` | text | Có | `'Vì Tổ quốc xã hội chủ nghĩa, vì lý tưởng của Bác Hồ vĩ đại. Sẵn sàng!'::text` |
| `ceremony_salute_audio_url` | text | Có | `—` |
| `ceremony_readiness_audio_url` | text | Có | `—` |

**Ràng buộc:**
- `movement_campaigns_academic_year_check` (c): `CHECK ((academic_year ~ '^\d{4}-\d{4}$'::text))`
- `movement_campaigns_created_by_fkey` (f): `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `movement_campaigns_dates_check` (c): `CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date)))`
- `movement_campaigns_display_order_check` (c): `CHECK ((display_order >= 0))`
- `movement_campaigns_pkey` (p): `PRIMARY KEY (id)`
- `movement_campaigns_slug_key` (u): `UNIQUE (slug)`
- `movement_campaigns_slug_not_empty` (c): `CHECK ((length(TRIM(BOTH FROM slug)) > 0))`
- `movement_campaigns_slug_regex_check` (c): `CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text))`
- `movement_campaigns_status_check` (c): `CHECK ((status = ANY (ARRAY['draft'::text, 'sap_dien_ra'::text, 'dang_dien_ra'::text, 'da_ket_thuc'::text, 'archived'::text])))`
- `movement_campaigns_summary_length_check` (c): `CHECK (((summary IS NULL) OR (length(summary) <= 500)))`
- `movement_campaigns_title_length_check` (c): `CHECK ((length(title) <= 200))`
- `movement_campaigns_title_not_empty` (c): `CHECK ((length(TRIM(BOTH FROM title)) > 0))`
- `movement_campaigns_type_check` (c): `CHECK ((campaign_type = ANY (ARRAY['thuong_xuyen'::text, 'theo_dot'::text, 'cuoc_thi'::text, 'cao_diem'::text, 'ke_hoach_thang'::text])))`
- `movement_campaigns_updated_by_fkey` (f): `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`

**RLS policies:**
- `CMS managers can insert movement campaigns` · INSERT · roles=authenticated · USING: `—` · WITH CHECK: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])`
- `CMS managers can update movement campaigns` · UPDATE · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])` · WITH CHECK: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])`
- `Only super admin can delete movement campaigns` · DELETE · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text])` · WITH CHECK: `—`
- `Public can read published movement campaigns` · SELECT · roles=public · USING: `(((is_published = true) AND (status <> 'draft'::text)) OR ((auth.uid() IS NOT NULL) AND has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])))` · WITH CHECK: `—`

### `public.movement_events`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `campaign_id` | uuid | Không | `—` |
| `title` | text | Không | `—` |
| `description` | text | Có | `—` |
| `event_date` | timestamp with time zone | Có | `—` |
| `location` | text | Có | `—` |
| `status` | text | Không | `'sap_dien_ra'::text` |
| `cover_image_url` | text | Có | `—` |
| `summary_result` | text | Có | `—` |
| `display_order` | integer | Không | `0` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `movement_events_campaign_id_fkey` (f): `FOREIGN KEY (campaign_id) REFERENCES movement_campaigns(id) ON DELETE CASCADE`
- `movement_events_display_order_check` (c): `CHECK ((display_order >= 0))`
- `movement_events_pkey` (p): `PRIMARY KEY (id)`
- `movement_events_status_check` (c): `CHECK ((status = ANY (ARRAY['sap_dien_ra'::text, 'dang_dien_ra'::text, 'da_hoan_thanh'::text, 'huy'::text])))`
- `movement_events_title_not_empty` (c): `CHECK ((length(TRIM(BOTH FROM title)) > 0))`

**RLS policies:**
- `CMS managers can manage movement events` · ALL · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])` · WITH CHECK: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])`
- `Public can read events of published movement campaigns` · SELECT · roles=public · USING: `(EXISTS ( SELECT 1
   FROM movement_campaigns
  WHERE ((movement_campaigns.id = movement_events.campaign_id) AND (((movement_campaigns.is_published = true) AND (movement_campaigns.status <> 'draft'::text)) OR ((auth.uid() IS NOT NULL) AND has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text]))))))` · WITH CHECK: `—`

### `public.movement_evidence`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `campaign_id` | uuid | Không | `—` |
| `event_id` | uuid | Có | `—` |
| `title` | text | Không | `—` |
| `evidence_type` | text | Không | `'image'::text` |
| `url` | text | Không | `—` |
| `notes` | text | Có | `—` |
| `display_order` | integer | Không | `0` |
| `created_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `movement_evidence_campaign_id_fkey` (f): `FOREIGN KEY (campaign_id) REFERENCES movement_campaigns(id) ON DELETE CASCADE`
- `movement_evidence_display_order_check` (c): `CHECK ((display_order >= 0))`
- `movement_evidence_event_id_fkey` (f): `FOREIGN KEY (event_id) REFERENCES movement_events(id) ON DELETE CASCADE`
- `movement_evidence_pkey` (p): `PRIMARY KEY (id)`
- `movement_evidence_title_not_empty` (c): `CHECK ((length(TRIM(BOTH FROM title)) > 0))`
- `movement_evidence_type_check` (c): `CHECK ((evidence_type = ANY (ARRAY['image'::text, 'news_link'::text, 'document_link'::text, 'album_link'::text, 'other_link'::text])))`
- `movement_evidence_url_not_empty` (c): `CHECK ((length(TRIM(BOTH FROM url)) > 0))`

**RLS policies:**
- `CMS managers can manage movement evidence` · ALL · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])` · WITH CHECK: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text])`
- `Public can read evidence of published movement campaigns` · SELECT · roles=public · USING: `(EXISTS ( SELECT 1
   FROM movement_campaigns
  WHERE ((movement_campaigns.id = movement_evidence.campaign_id) AND (((movement_campaigns.is_published = true) AND (movement_campaigns.status <> 'draft'::text)) OR ((auth.uid() IS NOT NULL) AND has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'CONTENT_EDITOR'::text]))))))` · WITH CHECK: `—`

### `public.student_enrollments`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `student_id` | uuid | Không | `—` |
| `class_id` | uuid | Không | `—` |
| `academic_year_id` | uuid | Không | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `student_enrollments_academic_year_id_fkey` (f): `FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE`
- `student_enrollments_class_id_fkey` (f): `FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE`
- `student_enrollments_pkey` (p): `PRIMARY KEY (id)`
- `student_enrollments_student_id_fkey` (f): `FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE`
- `student_enrollments_student_year_unique` (u): `UNIQUE (student_id, academic_year_id)`

**RLS policies:**
- `Admins and principals can manage student enrollments` · ALL · roles=authenticated · USING: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text])` · WITH CHECK: `has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text])`
- `Select student enrollments based on roles and relations` · SELECT · roles=authenticated · USING: `(has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'VICE_PRINCIPAL'::text, 'STAFF'::text]) OR (has_app_role(auth.uid(), 'TEACHER'::text) AND (is_homeroom_teacher(auth.uid(), class_id) OR is_subject_teacher(auth.uid(), class_id))) OR (student_id = auth.uid()) OR (student_id IN ( SELECT parent_student_relations.student_id
   FROM parent_student_relations
  WHERE (parent_student_relations.parent_id = auth.uid()))))` · WITH CHECK: `—`

### `school.classes`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `school_id` | uuid | Không | `—` |
| `academic_year_id` | uuid | Không | `—` |
| `grade_level_id` | uuid | Không | `—` |
| `code` | character varying(20) | Không | `—` |
| `name` | character varying(50) | Không | `—` |
| `display_order` | smallint | Không | `1` |
| `max_students` | smallint | Không | `45` |
| `is_active` | boolean | Không | `true` |
| `created_at` | timestamp with time zone | Không | `app.utc_now()` |
| `updated_at` | timestamp with time zone | Không | `app.utc_now()` |

**Ràng buộc:**
- `ck_classes_max_students` (c): `CHECK (((max_students >= 1) AND (max_students <= 100)))`
- `fk_classes_academic_year` (f): `FOREIGN KEY (academic_year_id) REFERENCES school.academic_years(id) ON DELETE CASCADE`
- `fk_classes_grade_level` (f): `FOREIGN KEY (grade_level_id) REFERENCES school.grade_levels(id) ON DELETE RESTRICT`
- `fk_classes_school` (f): `FOREIGN KEY (school_id) REFERENCES school.schools(id) ON DELETE CASCADE`
- `pk_classes` (p): `PRIMARY KEY (id)`
- `uq_classes_school_year_code` (u): `UNIQUE (school_id, academic_year_id, code)`

**RLS policies:**

### `school.gallery_albums`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | bigint | Không | `nextval('school.gallery_albums_id_seq'::regclass)` |
| `title` | text | Không | `—` |
| `slug` | text | Không | `—` |
| `description` | text | Có | `—` |
| `cover_image_url` | text | Có | `—` |
| `sort_order` | integer | Không | `0` |
| `is_featured` | boolean | Không | `false` |
| `status` | text | Không | `'DRAFT'::text` |
| `created_by` | uuid | Có | `—` |
| `updated_by` | uuid | Có | `—` |
| `created_at` | timestamp with time zone | Không | `now()` |
| `updated_at` | timestamp with time zone | Không | `now()` |

**Ràng buộc:**
- `gallery_albums_created_by_fkey` (f): `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL`
- `gallery_albums_pkey` (p): `PRIMARY KEY (id)`
- `gallery_albums_slug_key` (u): `UNIQUE (slug)`
- `gallery_albums_status_check` (c): `CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PUBLISHED'::text, 'ARCHIVED'::text])))`
- `gallery_albums_updated_by_fkey` (f): `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL`

**RLS policies:**
- `Admin users can delete albums` · DELETE · roles=authenticated · USING: `(EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true))))` · WITH CHECK: `—`
- `Admin users can insert albums` · INSERT · roles=authenticated · USING: `—` · WITH CHECK: `(EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true))))`
- `Admin users can update albums` · UPDATE · roles=authenticated · USING: `(EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true))))` · WITH CHECK: `(EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true))))`
- `Admin users can view all albums` · SELECT · roles=authenticated · USING: `(EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true))))` · WITH CHECK: `—`
- `Anyone can view published albums` · SELECT · roles=anon,authenticated · USING: `(status = 'PUBLISHED'::text)` · WITH CHECK: `—`

### `school.student_enrollments`

RLS: **bật**

| Cột | Kiểu | NULL | Mặc định |
|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` |
| `school_id` | uuid | Không | `—` |
| `student_id` | uuid | Không | `—` |
| `class_id` | uuid | Không | `—` |
| `academic_year_id` | uuid | Không | `—` |
| `enrollment_date` | date | Không | `CURRENT_DATE` |
| `leave_date` | date | Có | `—` |
| `roll_number` | smallint | Có | `—` |
| `status` | character varying(20) | Không | `'ACTIVE'::character varying` |
| `is_current` | boolean | Không | `true` |
| `created_at` | timestamp with time zone | Không | `app.utc_now()` |
| `updated_at` | timestamp with time zone | Không | `app.utc_now()` |

**Ràng buộc:**
- `ck_student_enrollments_dates` (c): `CHECK (((leave_date IS NULL) OR (leave_date >= enrollment_date)))`
- `ck_student_enrollments_status` (c): `CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'COMPLETED'::character varying, 'TRANSFERRED'::character varying, 'DROPPED'::character varying])::text[])))`
- `fk_student_enrollments_academic_year` (f): `FOREIGN KEY (academic_year_id) REFERENCES school.academic_years(id) ON DELETE RESTRICT`
- `fk_student_enrollments_class` (f): `FOREIGN KEY (class_id) REFERENCES school.classes(id) ON DELETE RESTRICT`
- `fk_student_enrollments_school` (f): `FOREIGN KEY (school_id) REFERENCES school.schools(id) ON DELETE CASCADE`
- `fk_student_enrollments_student` (f): `FOREIGN KEY (student_id) REFERENCES school.students(id) ON DELETE CASCADE`
- `student_enrollments_pkey` (p): `PRIMARY KEY (id)`
- `uq_student_enrollment` (u): `UNIQUE (student_id, academic_year_id)`

**RLS policies:**

## Các hàm Supabase liên quan

- `public.assign_homeroom_teacher(p_class_id uuid, p_teacher_id uuid, p_academic_year_id uuid, p_start_date date, p_end_date date, p_notes text)` → `jsonb`; SECURITY DEFINER=True
- `public.check_movement_evidence_event_campaign()` → `trigger`; SECURITY DEFINER=True
- `public.get_homeroom_competition_incident_people(p_incident_ids uuid[])` → `TABLE(incident_id uuid, student_name text, student_code text, recorder_name text, approver_name text)`; SECURITY DEFINER=True
- `public.get_homeroom_competition_incidents(p_program_id uuid, p_limit integer, p_offset integer)` → `TABLE(id uuid, program_id uuid, rule_id uuid, student_id uuid, unit_id uuid, occurred_at timestamp with time zone, title text, description text, evidence_note text, status text, recorded_by uuid, approved_by uuid, approved_at timestamp with time zone, created_at timestamp with time zone, student_name text, unit_name text, rule_name text)`; SECURITY DEFINER=True
- `public.is_homeroom_teacher(p_user_id uuid, p_class_id uuid, p_academic_year_id uuid)` → `boolean`; SECURITY DEFINER=True
- `public.refresh_class_actual_enrollment()` → `trigger`; SECURITY DEFINER=True
- `public.refresh_class_actual_enrollment_on_year_change()` → `trigger`; SECURITY DEFINER=True
- `public.set_movement_campaign_user_audit()` → `trigger`; SECURITY DEFINER=True

## Supabase Storage

| Bucket | Public | Số tệp | MB | Giới hạn/tệp | Loại MIME |
|---|---|---:|---:|---:|---|
| ic3-illustrations | True | 34 | 0.3 | 153600 | image/webp |
| school-document | True | 3 | 1.2 | 20971520 | application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation |
| school-media | True | 404 | 640.8 | 52428800 | không giới hạn loại |

**Storage policies:**
- `Admin and editor can delete school documents` · DELETE · USING `((bucket_id = 'school-document'::text) AND is_admin_or_editor())` · WITH CHECK `—`
- `Admin and editor can delete school media` · DELETE · USING `((bucket_id = 'school-media'::text) AND is_admin_or_editor())` · WITH CHECK `—`
- `Admin and editor can update school documents` · UPDATE · USING `((bucket_id = 'school-document'::text) AND is_admin_or_editor())` · WITH CHECK `((bucket_id = 'school-document'::text) AND is_admin_or_editor())`
- `Admin and editor can update school media` · UPDATE · USING `((bucket_id = 'school-media'::text) AND is_admin_or_editor())` · WITH CHECK `((bucket_id = 'school-media'::text) AND is_admin_or_editor())`
- `Admin and editor can upload school documents` · INSERT · USING `—` · WITH CHECK `((bucket_id = 'school-document'::text) AND is_admin_or_editor())`
- `Admin and editor can upload school media` · INSERT · USING `—` · WITH CHECK `((bucket_id = 'school-media'::text) AND is_admin_or_editor())`
- `Admin users can delete school documents` · DELETE · USING `((bucket_id = 'school-document'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))` · WITH CHECK `—`
- `Admin users can delete school media` · DELETE · USING `((bucket_id = 'school-media'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))` · WITH CHECK `—`
- `Admin users can update school documents` · UPDATE · USING `((bucket_id = 'school-document'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))` · WITH CHECK `((bucket_id = 'school-document'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))`
- `Admin users can update school media` · UPDATE · USING `((bucket_id = 'school-media'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))` · WITH CHECK `((bucket_id = 'school-media'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))`
- `Admin users can upload school documents` · INSERT · USING `—` · WITH CHECK `((bucket_id = 'school-document'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))`
- `Admin users can upload school media` · INSERT · USING `—` · WITH CHECK `((bucket_id = 'school-media'::text) AND (EXISTS ( SELECT 1
   FROM (school.user_roles ur
     JOIN school.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.is_admin = true)))))`
- `Anyone can view school documents` · SELECT · USING `(bucket_id = 'school-document'::text)` · WITH CHECK `—`
- `Competition actors can upload incident evidence` · INSERT · USING `—` · WITH CHECK `((bucket_id = 'school-media'::text) AND (name ~~ 'competition/incidents/%'::text) AND (has_competition_permission(auth.uid(), 'COMPETITION_RECORD'::text) OR (EXISTS ( SELECT 1
   FROM (competition_actor_assignments ca
     JOIN academic_years ay ON ((ay.id = ca.academic_year_id)))
  WHERE ((ca.user_id = auth.uid()) AND (ca.is_active = true) AND (ay.is_current = true) AND (ca.start_date <= CURRENT_DATE) AND ((ca.end_date IS NULL) OR (ca.end_date >= CURRENT_DATE)) AND (((ca.assignment_type = 'SUPERVISOR'::text) AND (ca.can_record_incident = true)) OR (ca.assignment_type = 'RED_STAR'::text)))))))`
- `GVCN upload congress images` · INSERT · USING `—` · WITH CHECK `((bucket_id = 'school-media'::text) AND ((storage.foldername(name))[1] = 'dai-hoi-chi-doi'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text) AND is_homeroom_teacher(auth.uid()))`
- `Public can read school documents` · SELECT · USING `(bucket_id = 'school-document'::text)` · WITH CHECK `—`
- `ic3_illustrations_admin_delete` · DELETE · USING `((bucket_id = 'ic3-illustrations'::text) AND (EXISTS ( SELECT 1
   FROM user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role_code = ANY (ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'VICE_PRINCIPAL'::text]))))))` · WITH CHECK `—`
- `ic3_illustrations_admin_insert` · INSERT · USING `—` · WITH CHECK `((bucket_id = 'ic3-illustrations'::text) AND (storage.extension(name) = 'webp'::text) AND (EXISTS ( SELECT 1
   FROM user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role_code = ANY (ARRAY['SUPER_ADMIN'::text, 'PRINCIPAL'::text, 'VICE_PRINCIPAL'::text]))))))`

## Sơ đồ quan hệ hiện có

```text
movement_campaigns (1)──(N) movement_events
       │                      │
       ├────(N) movement_evidence (event_id nullable)
       └────(N) chi_doi_congress_submissions ── classes
albums (1)──(N) album_images
```

## Bảng bổ sung dự kiến từ Patch 109

```text
movement_events ──(N) movement_class_submissions
classes ───────────(N) movement_class_submissions
movement_class_submissions ──(N) movement_submission_files
storage bucket: movement-submissions (private)
```

**LƯU Ý**: Bản đồ đầu tài liệu phản ánh database TRƯỚC patch; bảng mới chỉ có sau khi chạy migration 109 thành công.
