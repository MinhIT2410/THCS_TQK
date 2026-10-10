-- ADDITIVE ONLY: teacher attendance independent of competition scores.
-- Run only after backup. No DELETE/TRUNCATE/DROP and no changes to existing tables.
create table if not exists public.teacher_attendance_rules (
  code text primary key,
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0
);
insert into public.teacher_attendance_rules(code,name,sort_order) values
 ('LATE','Đi trễ',1),('ABSENT_EXCUSED','Vắng tiết có phép',2),
 ('ABSENT_UNEXCUSED','Vắng tiết không phép',3),('EARLY','Rời tiết sớm',4)
on conflict (code) do nothing;

create table if not exists public.teacher_attendance_records (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.profiles(id),
 teacher_name text not null,
 rule_code text not null references public.teacher_attendance_rules(code),
 occurred_at timestamptz not null,
 session text not null check (session in ('MORNING','AFTERNOON')),
 period_number integer not null check (period_number between 1 and 10),
 class_name text,
 minutes integer check (minutes is null or minutes between 1 and 240),
 note text,
 recorded_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now(),
 constraint teacher_attendance_minutes_check check (
   (rule_code in ('LATE','EARLY') and minutes is not null)
   or (rule_code not in ('LATE','EARLY') and minutes is null)
 )
);
create index if not exists teacher_attendance_date_idx on public.teacher_attendance_records(occurred_at desc);
create index if not exists teacher_attendance_teacher_idx on public.teacher_attendance_records(teacher_id,occurred_at desc);

create table if not exists public.teacher_attendance_reports (
 id uuid primary key default gen_random_uuid(),
 period_type text not null check(period_type in ('WEEK','MONTH','SEMESTER','YEAR')),
 period_label text not null,
 period_start date not null,
 period_end date not null,
 report_data jsonb not null,
 created_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now()
);

-- Reusable permission check: leadership/admin or currently assigned supervisor.
create or replace function public.can_manage_teacher_attendance(p_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
 select p_user is not null and (
  public.has_any_app_role(p_user, array['SUPER_ADMIN','ADMIN','PRINCIPAL','VICE_PRINCIPAL','COMPETITION_RECORD'])
  or exists (
   select 1 from public.competition_actor_assignments a
   where a.user_id=p_user and a.assignment_type='SUPERVISOR'
     and a.is_active and a.start_date<=current_date
     and (a.end_date is null or a.end_date>=current_date)
  )
 );
$$;
revoke all on function public.can_manage_teacher_attendance(uuid) from public;
grant execute on function public.can_manage_teacher_attendance(uuid) to authenticated;

-- Directory function avoids widening the existing profiles SELECT policies.
create or replace function public.list_teacher_attendance_directory()
returns table(id uuid, full_name text)
language sql stable security definer set search_path = public
as $$
 select distinct p.id, p.full_name
 from public.profiles p
 where public.can_manage_teacher_attendance(auth.uid())
   and p.is_active = true and nullif(trim(p.full_name),'') is not null
   and (
     upper(coalesce(p.role,'')) in ('TEACHER','GIAO_VIEN')
     or exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role_code='TEACHER')
     or exists(select 1 from public.teacher_assignments ta where ta.teacher_id=p.id and ta.is_active)
     or exists(select 1 from public.homeroom_assignments ha where ha.teacher_id=p.id and ha.is_active)
   )
 order by p.full_name;
$$;
revoke all on function public.list_teacher_attendance_directory() from public;
grant execute on function public.list_teacher_attendance_directory() to authenticated;

alter table public.teacher_attendance_rules enable row level security;
alter table public.teacher_attendance_records enable row level security;
alter table public.teacher_attendance_reports enable row level security;

create policy "Attendance rules read" on public.teacher_attendance_rules
 for select to authenticated using (public.can_manage_teacher_attendance(auth.uid()));
create policy "Attendance rules admin write" on public.teacher_attendance_rules
 for all to authenticated using (public.has_any_app_role(auth.uid(),array['SUPER_ADMIN','PRINCIPAL']))
 with check (public.has_any_app_role(auth.uid(),array['SUPER_ADMIN','PRINCIPAL']));
create policy "Attendance record read" on public.teacher_attendance_records
 for select to authenticated using (public.can_manage_teacher_attendance(auth.uid()));
create policy "Attendance record insert" on public.teacher_attendance_records
 for insert to authenticated with check (
   public.can_manage_teacher_attendance(auth.uid()) and recorded_by=auth.uid()
 );
create policy "Attendance report read" on public.teacher_attendance_reports
 for select to authenticated using (public.can_manage_teacher_attendance(auth.uid()));
create policy "Attendance report insert" on public.teacher_attendance_reports
 for insert to authenticated with check (
   public.can_manage_teacher_attendance(auth.uid()) and created_by=auth.uid()
 );
