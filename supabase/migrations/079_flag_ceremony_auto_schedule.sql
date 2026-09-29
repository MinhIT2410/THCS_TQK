-- Lịch tự động phát nghi lễ chào cờ.
-- Thời gian được hiểu theo múi giờ Asia/Ho_Chi_Minh.

create table if not exists public.flag_ceremony_schedules (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  session text not null check (session in ('morning','afternoon')),
  run_time time(0) not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_flag_ceremony_schedules_lookup
  on public.flag_ceremony_schedules (day_of_week, run_time)
  where enabled = true;

alter table public.flag_ceremony_schedules enable row level security;

drop policy if exists "flag ceremony schedules public read" on public.flag_ceremony_schedules;
create policy "flag ceremony schedules public read"
on public.flag_ceremony_schedules
for select
to anon, authenticated
using (true);

drop policy if exists "flag ceremony schedules admin write" on public.flag_ceremony_schedules;
create policy "flag ceremony schedules admin write"
on public.flag_ceremony_schedules
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL','STAFF')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL','STAFF')
  )
);

-- Hàm server-side: đúng phút đã cấu hình thì tạo một phiên countdown 10 giây.
-- Điều này giúp máy lớp không cần quyền ghi DB và không phụ thuộc admin phải mở trang.
create or replace function public.run_flag_ceremony_auto_schedule()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  local_now timestamp := timezone('Asia/Ho_Chi_Minh', now());
  schedule_row record;
  current_state public.flag_ceremony_state%rowtype;
begin
  select * into current_state
  from public.flag_ceremony_state
  where id = 'school'
  for update;

  if current_state.phase in ('countdown', 'salute') then
    return;
  end if;

  for schedule_row in
    select *
    from public.flag_ceremony_schedules
    where enabled = true
      and day_of_week = extract(isodow from local_now)::smallint
      and run_time = date_trunc('minute', local_now)::time
    order by run_time
    limit 1
  loop
    -- Không phát lại cùng một mốc trong cùng phút nếu cron bị gọi lặp.
    if current_state.updated_at >= date_trunc('minute', now()) then
      return;
    end if;

    update public.flag_ceremony_state
    set phase = 'countdown',
        session = schedule_row.session,
        starts_at = now() + interval '10 seconds',
        message = 'Tự động phát nghi lễ chào cờ theo lịch.',
        updated_at = now(),
        updated_by = null
    where id = 'school';

    return;
  end loop;
end;
$$;

-- Supabase có pg_cron trên project hỗ trợ extension này.
-- Nếu project chưa bật pg_cron, phần này sẽ báo lỗi và chỉ cần bật extension rồi chạy lại migration.
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname = 'flag-ceremony-auto-minute';

select cron.schedule(
  'flag-ceremony-auto-minute',
  '* * * * *',
  $$select public.run_flag_ceremony_auto_schedule();$$
);
