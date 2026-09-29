-- Prevent a completed ceremony from replaying when a classroom client is reopened.
-- A classroom device may call the completion RPC after the ceremony reaches its local done state.
-- The RPC only completes the currently active signal and never starts a new ceremony.

create or replace function public.complete_flag_ceremony()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.flag_ceremony_state
  set phase = 'done',
      starts_at = null,
      message = 'Nghi lễ chào cờ đã hoàn tất.',
      updated_at = now(),
      updated_by = null
  where id = 'school'
    and phase in ('countdown', 'salute')
    and starts_at is not null
    and starts_at <= now();
end;
$$;

revoke execute on function public.complete_flag_ceremony() from public;
grant execute on function public.complete_flag_ceremony() to anon, authenticated;

-- If a browser was closed before it could report completion, an old countdown
-- must not remain active forever and replay on a later page load.
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
  stale_reset boolean := false;
begin
  select * into current_state
  from public.flag_ceremony_state
  where id = 'school'
  for update;

  if current_state.phase in ('countdown', 'salute') then
    if current_state.starts_at is not null
       and current_state.starts_at < now() - interval '1 minute' then
      update public.flag_ceremony_state
      set phase = 'done',
          starts_at = null,
          message = 'Phiên chào cờ cũ đã tự kết thúc.',
          updated_at = now(),
          updated_by = null
      where id = 'school';
      stale_reset := true;
    else
      return;
    end if;
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
    -- Prevent duplicate execution if pg_cron is invoked more than once in the same minute.
    if not stale_reset
       and current_state.phase = 'countdown'
       and current_state.updated_at >= date_trunc('minute', now()) then
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

revoke execute on function public.run_flag_ceremony_auto_schedule() from public, anon, authenticated;
