-- Bảng quản lý mã IC3 độc lập, không chạm vào các bảng thi đua.
create table if not exists public.ic3_test_access_codes (
  test_id text primary key check (test_id ~ '^IC3GS6L[123]-CD[1-7]-T[1-9][0-9]*$'),
  access_code text not null check (length(trim(access_code)) between 1 and 200),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.ic3_test_access_codes enable row level security;
revoke all on public.ic3_test_access_codes from anon;
grant select, insert, update, delete on public.ic3_test_access_codes to authenticated;

-- Admin only: IMPORTANT cannot expose codes through plain table SELECT to students.
create policy "ic3_admin_select" on public.ic3_test_access_codes for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')));
create policy "ic3_admin_insert" on public.ic3_test_access_codes for insert to authenticated
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')));
create policy "ic3_admin_update" on public.ic3_test_access_codes for update to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')));
create policy "ic3_admin_delete" on public.ic3_test_access_codes for delete to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')));

-- Only authenticated school accounts may request one code through RPC.
create or replace function public.ic3_get_access_code(p_test_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if auth.uid() is null or not exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_code in ('STUDENT','TEACHER','HOMEROOM_TEACHER','SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then
    raise exception 'Access denied';
  end if;
  select access_code into v_code from public.ic3_test_access_codes where test_id = p_test_id;
  return coalesce(v_code, '');
end;
$$;
revoke all on function public.ic3_get_access_code(text) from public, anon;
grant execute on function public.ic3_get_access_code(text) to authenticated;
