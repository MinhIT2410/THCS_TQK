-- IC3 practice log. No IIG-origin submission/score verification is implied.
create table if not exists public.ic3_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null check (test_id ~ '^IC3GS6L[123]-CD[1-7]-T[1-9][0-9]*$'),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer check (score between 0 and 1000),
  status text not null default 'opened' check (status in ('opened','self_reported')),
  constraint ic3_submission_consistency check ((status = 'opened' and submitted_at is null and score is null) or (status = 'self_reported' and submitted_at is not null and score is not null))
);
create index if not exists ic3_attempt_user_started_idx on public.ic3_practice_attempts(user_id,started_at desc);
create index if not exists ic3_attempt_test_started_idx on public.ic3_practice_attempts(test_id,started_at desc);
alter table public.ic3_practice_attempts enable row level security;
revoke all on public.ic3_practice_attempts from anon, authenticated;
grant select on public.ic3_practice_attempts to authenticated;
-- Users see their own events; admins can see all. Writes are only through RPC below.
drop policy if exists ic3_attempt_select on public.ic3_practice_attempts;
create policy ic3_attempt_select on public.ic3_practice_attempts for select to authenticated using (
  user_id = (select auth.uid())
  or exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL'))
);
create or replace function public.ic3_start_attempt(p_test_id text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if p_test_id !~ '^IC3GS6L[123]-CD[1-7]-T[1-9][0-9]*$' then raise exception 'Invalid IC3 test'; end if;
  insert into public.ic3_practice_attempts(user_id,test_id) values (auth.uid(),p_test_id) returning id into new_id;
  return new_id;
end;
$$;
create or replace function public.ic3_submit_score(p_attempt_id uuid,p_score integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if p_score is null or p_score < 0 or p_score > 1000 then raise exception 'Invalid score'; end if;
  update public.ic3_practice_attempts
  set score=p_score,submitted_at=now(),status='self_reported'
  where id=p_attempt_id and user_id=auth.uid() and status='opened';
  if not found then raise exception 'Attempt not found or already submitted'; end if;
end;
$$;
revoke all on function public.ic3_start_attempt(text) from public,anon;
revoke all on function public.ic3_submit_score(uuid,integer) from public,anon;
grant execute on function public.ic3_start_attempt(text) to authenticated;
grant execute on function public.ic3_submit_score(uuid,integer) to authenticated;
