-- Fix auto-schedule bị kẹt ở countdown/salute cũ.
--
-- run_flag_ceremony_auto_schedule() trước đây chặn mọi lịch mới nếu state vẫn
-- ở countdown/salute. Client không bắt buộc phải ghi phase hoàn tất về DB,
-- nên một phiên cũ có thể làm toàn bộ lịch tự động về sau bị bỏ qua.
--
-- Quy ước: countdown/salute chỉ được xem là phiên đang hoạt động trong tối đa
-- 15 phút kể từ starts_at. Sau đó cron được phép tạo phiên mới.

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

  -- Chỉ chặn lịch mới khi phiên hiện tại còn trong khoảng hoạt động.
  -- State cũ có thể còn countdown/salute vì client không bắt buộc phải
  -- ghi phase hoàn tất về DB.
  if current_state.phase in ('countdown', 'salute')
     and current_state.starts_at is not null
     and current_state.starts_at > now() - interval '15 minutes' then
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

-- Dọn state cũ đang bị kẹt trước khi tiếp tục dùng lịch tự động.
update public.flag_ceremony_state
set phase = 'idle',
    starts_at = null,
    message = null,
    updated_at = now(),
    updated_by = null
where id = 'school'
  and phase in ('countdown', 'salute')
  and starts_at is not null
  and starts_at <= now() - interval '15 minutes';

-- Đảm bảo cron hiện tại vẫn trỏ đúng function và chỉ có một job cùng tên.
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname = 'flag-ceremony-auto-minute';

select cron.schedule(
  'flag-ceremony-auto-minute',
  '* * * * *',
  $$select public.run_flag_ceremony_auto_schedule();$$
);
