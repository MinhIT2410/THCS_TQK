-- Nền tảng điều hành chào cờ đồng bộ - THCS Trần Quang Khải
-- Chạy một lần trong Supabase SQL Editor.

create table if not exists public.flag_ceremony_state (
  id text primary key default 'school',
  phase text not null default 'idle' check (phase in ('idle','waiting','countdown','salute','done')),
  session text not null default 'morning' check (session in ('morning','afternoon')),
  cycle_week smallint not null default 1 check (cycle_week between 1 and 3),
  starts_at timestamptz,
  message text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.flag_ceremony_state (id)
values ('school')
on conflict (id) do nothing;

alter table public.flag_ceremony_state enable row level security;

-- Mọi thiết bị lớp có thể đọc trạng thái nghi lễ.
drop policy if exists "flag ceremony public read" on public.flag_ceremony_state;
create policy "flag ceremony public read"
on public.flag_ceremony_state
for select
to anon, authenticated
using (true);

-- Chỉ các vai trò điều hành được phép thay đổi trạng thái.
drop policy if exists "flag ceremony authenticated write" on public.flag_ceremony_state;
create policy "flag ceremony authenticated write"
on public.flag_ceremony_state
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

-- Bật postgres changes realtime cho bảng trạng thái.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'flag_ceremony_state'
  ) then
    alter publication supabase_realtime add table public.flag_ceremony_state;
  end if;
end $$;
