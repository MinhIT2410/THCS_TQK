-- 103: Admin preview of all images in one IC3 Test and bulk approve/revoke.
create or replace function public.ic3_school_admin_approve_set_images(
 p_set_id text, p_approved boolean
) returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if not exists(
   select 1 from public.user_roles
   where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')
 ) then raise exception 'Không có quyền quản trị'; end if;
 if not exists(select 1 from public.ic3_school_sets where id=p_set_id)
 then raise exception 'Không tồn tại Test'; end if;
 if p_approved then
   -- All images must exist in school-controlled bucket, never accept internet URLs.
   if exists(
     select 1 from public.ic3_school_questions q
     where q.set_id=p_set_id and q.image_path is not null
       and not exists(select 1 from storage.objects o
         where o.bucket_id='ic3-illustrations' and o.name=q.image_path)
   ) then raise exception 'Có ảnh bị thiếu trên Storage. Kiểm tra trước khi duyệt'; end if;
 end if;
 update public.ic3_school_questions
 set image_approved=coalesce(p_approved,false)
 where set_id=p_set_id and image_path is not null
   and image_approved is distinct from coalesce(p_approved,false);
 get diagnostics v_count=row_count;
 return v_count;
end $$;
revoke all on function public.ic3_school_admin_approve_set_images(text,boolean) from public,anon;
grant execute on function public.ic3_school_admin_approve_set_images(text,boolean) to authenticated;
notify pgrst,'reload schema';
