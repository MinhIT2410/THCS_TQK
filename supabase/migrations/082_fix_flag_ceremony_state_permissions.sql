-- Fix browser permissions for the shared flag-ceremony state.
-- The schedule table permissions were fixed in migration 080, but
-- flag_ceremony_state itself had no explicit table grants. That causes
-- the controller's manual "BẮT ĐẦU CHÀO CỜ" action to fail with:
--   permission denied for table flag_ceremony_state
--
-- RLS remains the authorization layer: all authenticated users may have
-- table privileges, but only the existing ceremony control roles may write.

alter table public.flag_ceremony_state enable row level security;

-- Classroom clients (including anonymous/public pages) only need to read
-- the shared ceremony state.
grant select on table public.flag_ceremony_state to anon, authenticated;

-- The controller uses upsert(), which requires INSERT + UPDATE.
-- Existing RLS policies continue to restrict writes to the allowed roles.
grant insert, update on table public.flag_ceremony_state to authenticated;

drop policy if exists "flag ceremony public read" on public.flag_ceremony_state;
create policy "flag ceremony public read"
on public.flag_ceremony_state
for select
to anon, authenticated
using (true);

drop policy if exists "flag ceremony authenticated write" on public.flag_ceremony_state;
create policy "flag ceremony authenticated write"
on public.flag_ceremony_state
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL','STAFF')
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL','STAFF')
  )
);
