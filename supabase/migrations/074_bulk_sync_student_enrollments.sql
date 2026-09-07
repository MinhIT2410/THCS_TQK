-- 074_bulk_sync_student_enrollments.sql
-- Bulk-safe enrollment sync for the selected academic year.
-- Authorization follows the existing School Data model: SUPER_ADMIN / PRINCIPAL via RBAC helpers.

create or replace function public.bulk_sync_student_enrollments(
  p_academic_year_id uuid,
  p_enrollments jsonb
)
returns table (
  synced_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid := auth.uid();
  v_count integer := 0;
begin
  if v_caller_id is null
     or not public.has_any_app_role(v_caller_id, array['SUPER_ADMIN', 'PRINCIPAL']) then
    raise exception 'Quyền truy cập bị từ chối. Chỉ SUPER_ADMIN hoặc PRINCIPAL mới được đồng bộ phân lớp.'
      using errcode = '42501';
  end if;

  if p_academic_year_id is null
     or not exists (
       select 1
       from public.academic_years ay
       where ay.id = p_academic_year_id
     ) then
    raise exception 'Năm học không tồn tại.' using errcode = 'P0002';
  end if;

  if p_enrollments is null or jsonb_typeof(p_enrollments) <> 'array' then
    raise exception 'Dữ liệu đồng bộ không hợp lệ.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_enrollments) = 0 then
    return query select 0;
    return;
  end if;

  if jsonb_array_length(p_enrollments) > 500 then
    raise exception 'Mỗi lô đồng bộ tối đa 500 học sinh.' using errcode = '22023';
  end if;

  -- Validate every supplied student/class before mutating anything in this batch.
  if exists (
    select 1
    from jsonb_array_elements(p_enrollments) elem
    left join public.profiles p
      on p.id = nullif(elem->>'student_id', '')::uuid
    left join public.classes c
      on c.id = nullif(elem->>'class_id', '')::uuid
     and c.academic_year_id = p_academic_year_id
    where p.id is null
       or c.id is null
       or not exists (
         select 1
         from public.user_roles ur
         where ur.user_id = p.id
           and ur.role_code = 'STUDENT'
       )
  ) then
    raise exception 'Lô đồng bộ chứa học sinh hoặc lớp không hợp lệ.' using errcode = '22023';
  end if;

  insert into public.student_enrollments (
    student_id,
    academic_year_id,
    class_id,
    updated_at
  )
  select
    (elem->>'student_id')::uuid,
    p_academic_year_id,
    (elem->>'class_id')::uuid,
    now()
  from jsonb_array_elements(p_enrollments) elem
  on conflict (student_id, academic_year_id)
  do update set
    class_id = excluded.class_id,
    updated_at = now();

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$;

revoke all on function public.bulk_sync_student_enrollments(uuid, jsonb) from public, anon;
grant execute on function public.bulk_sync_student_enrollments(uuid, jsonb) to authenticated;

comment on function public.bulk_sync_student_enrollments(uuid, jsonb)
is 'Bulk upserts student_enrollments for one academic year; authorized for SUPER_ADMIN/PRINCIPAL only.';
