-- 101: Admin explicitly clears attempts for one school-internal test before editing questions.
-- Does not affect IC3 Review or any other test. Destructive; UI requires two confirmations.
create or replace function public.ic3_school_admin_attempt_count(p_set_id text)
returns bigint language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 if not exists(select 1 from public.ic3_school_sets where id=p_set_id) then raise exception 'Không tìm thấy Test'; end if;
 return (select count(*) from public.ic3_school_attempts where set_id=p_set_id);
end $$;

create or replace function public.ic3_school_admin_clear_attempts(p_set_id text,p_expected_count bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_count bigint; v_deleted bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 -- Lock the set row to serialize concurrent clears for this set.
 perform 1 from public.ic3_school_sets where id=p_set_id for update;
 if not found then raise exception 'Không tìm thấy Test'; end if;
 select count(*) into v_count from public.ic3_school_attempts where set_id=p_set_id;
 if p_expected_count is null or p_expected_count <> v_count then raise exception 'Số lượt làm đã thay đổi (%); tải lại và xác nhận lần nữa',v_count; end if;
 delete from public.ic3_school_attempts where set_id=p_set_id;
 get diagnostics v_deleted = row_count;
 return v_deleted;
end $$;
revoke all on function public.ic3_school_admin_attempt_count(text), public.ic3_school_admin_clear_attempts(text,bigint) from public,anon;
grant execute on function public.ic3_school_admin_attempt_count(text), public.ic3_school_admin_clear_attempts(text,bigint) to authenticated;
notify pgrst,'reload schema';
