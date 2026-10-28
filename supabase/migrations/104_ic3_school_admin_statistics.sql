-- Aggregate only completed internal school attempts, admin-only. No IIG self-reported scores.
create or replace function public.ic3_school_admin_statistics(p_grade integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
 if p_grade not in (6,7,8) then raise exception 'Khối không hợp lệ'; end if;
 if not exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền quản trị'; end if;
 with sets as (
  select s.id,s.grade,s.topic,s.test_number,s.title,s.published,
  (select count(*) from public.ic3_school_questions q where q.set_id=s.id)::integer as questions
  from public.ic3_school_sets s where s.grade=p_grade
 ), complete as (
  select a.set_id,a.user_id,a.score from public.ic3_school_attempts a
  join sets s on s.id=a.set_id where a.status='finished' and a.score is not null
 ), per_test as (
  select s.id,s.grade,s.topic,s.test_number,s.title,s.published,s.questions,
  count(c.score)::integer attempts,
  count(distinct c.user_id)::integer students,
  round(avg(c.score))::integer average_score,
  count(c.score) filter(where c.score>=900)::integer reached_900
  from sets s left join complete c on c.set_id=s.id
  group by s.id,s.grade,s.topic,s.test_number,s.title,s.published,s.questions
 )
 select jsonb_build_object(
  'summary',jsonb_build_object(
   'grade',p_grade,
   'test_count',(select count(*) from sets),
   'published_count',(select count(*) from sets where published),
   'total_questions',(select coalesce(sum(questions),0) from sets),
   'attempts',(select count(*) from complete),
   'students',(select count(distinct user_id) from complete),
   'average_score',(select round(avg(score)) from complete),
   'reached_900',(select count(*) from complete where score>=900)
  ),
  'tests',(select coalesce(jsonb_agg(to_jsonb(t) order by t.topic nulls last,t.test_number nulls last,t.title),'[]'::jsonb) from per_test t)
 ) into v_result;
 return v_result;
end $$;
revoke all on function public.ic3_school_admin_statistics(integer) from public,anon;
grant execute on function public.ic3_school_admin_statistics(integer) to authenticated;
notify pgrst,'reload schema';
