-- IC3 internal school gradebook + submission log; admin only; year-specific enrollment.
create or replace function public.ic3_school_admin_gradebook(p_grade integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_year uuid; v_value jsonb;
begin
 if p_grade not in (6,7,8) then raise exception 'Khối không hợp lệ'; end if;
 if not exists (select 1 from public.user_roles r where r.user_id=auth.uid()
  and r.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then
  raise exception 'Không có quyền xem bảng điểm học sinh'; end if;
 select id into v_year from public.academic_years where is_current=true limit 1;
 if v_year is null then raise exception 'Chưa cấu hình năm học hiện hành'; end if;
 with roster as (
   select distinct on (p.id) p.id as user_id, p.full_name, p.student_code,
          c.id as class_id, c.name as class_name
   from public.student_enrollments e
   join public.profiles p on p.id=e.student_id
   join public.classes c on c.id=e.class_id
   join public.user_roles r on r.user_id=p.id and r.role_code='STUDENT'
   where e.academic_year_id=v_year and coalesce(p.is_active,true)
     and (c.name ~ ('^'||p_grade::text||'([/. -]|$)'))
   order by p.id,c.name
 ), tests as (
   select s.id,s.grade,s.topic,s.test_number,s.title,s.published
   from public.ic3_school_sets s where s.grade=p_grade
     and s.topic is not null and s.test_number is not null
 ), finished as (
   select a.id,a.user_id,a.set_id,a.score,a.correct_count,a.finished_at,a.mode,
          row_number() over(partition by a.user_id,a.set_id order by a.finished_at desc,a.id desc) as recent_rank
   from public.ic3_school_attempts a
   join roster r on r.user_id=a.user_id
   join tests t on t.id=a.set_id
   where a.status='finished' and a.finished_at is not null and a.score is not null
 ), best as (
   select user_id,set_id,max(score)::integer as best_score,
     count(*)::integer as attempts,
     max(finished_at) as last_submitted
   from finished group by user_id,set_id
 ), recent as (
   select f.id,f.user_id,f.set_id,f.score,f.correct_count,f.finished_at,f.mode,
          r.full_name,r.student_code,r.class_id,r.class_name,t.topic,t.test_number,t.title
   from finished f join roster r on r.user_id=f.user_id
   join tests t on t.id=f.set_id
   where f.recent_rank=1
 )
 select jsonb_build_object(
   'year',(select name from public.academic_years where id=v_year),
   'grade',p_grade,
   'classes',(select coalesce(jsonb_agg(x order by x->>'class_name'),'[]'::jsonb) from
      (select distinct jsonb_build_object('id',class_id,'class_name',class_name) as x from roster) q),
   'tests',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'topic',topic,'test_number',test_number,'title',title,'published',published) order by topic,test_number),'[]'::jsonb) from tests),
   'students',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',full_name,'code',student_code,'class_id',class_id,'class_name',class_name) order by class_name,full_name),'[]'::jsonb) from roster),
   'scores',(select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'set_id',set_id,'best_score',best_score,'attempts',attempts,'last_submitted',last_submitted)),'[]'::jsonb) from best),
   'latest_log',(select coalesce(jsonb_agg(to_jsonb(z) order by z.finished_at desc),'[]'::jsonb) from (select * from recent order by finished_at desc limit 300) z)
 ) into v_value;
 return v_value;
end $$;
revoke all on function public.ic3_school_admin_gradebook(integer) from public,anon;
grant execute on function public.ic3_school_admin_gradebook(integer) to authenticated;
notify pgrst,'reload schema';
