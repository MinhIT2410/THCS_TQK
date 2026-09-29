-- Fix permissions/RLS for the automatic flag-ceremony schedule.
-- The 079 migration created the table but used the wrong role table
-- and did not explicitly grant table privileges for the browser client.

alter table public.flag_ceremony_schedules enable row level security;

-- Browser clients need SELECT to show the configured schedule.
grant select on table public.flag_ceremony_schedules to anon, authenticated;

-- Admin/editor users manage the schedule from the CMS.
grant insert, update, delete on table public.flag_ceremony_schedules to authenticated;

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
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

-- The cron job invokes this function server-side. Do not expose it to browser clients.
revoke execute on function public.run_flag_ceremony_auto_schedule() from public, anon, authenticated;
