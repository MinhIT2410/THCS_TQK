-- Apply after 098; independent of IIG passwords/competition.
alter table public.ic3_school_sets add column if not exists topic smallint;
alter table public.ic3_school_sets add column if not exists test_number smallint;
alter table public.ic3_school_sets add column if not exists created_at timestamptz not null default now();
create unique index if not exists ic3_sets_unique_topic_test on public.ic3_school_sets(grade,topic,test_number) where topic is not null and test_number is not null;
create table if not exists public.ic3_school_topics (grade smallint not null check(grade in(6,7,8)), topic smallint not null check(topic between 1 and 7), title text not null, primary key(grade,topic));
alter table public.ic3_school_topics enable row level security;
revoke all on public.ic3_school_topics from anon,authenticated;
insert into public.ic3_school_topics(grade,topic,title) values
(6,1,'Căn bản về công nghệ'),(6,2,'Quản lí thông tin'),(6,3,'Công dân số'),(6,4,'Truyền thông'),(6,5,'An toàn và bảo mật'),(6,6,'Sáng tạo nội dung'),(6,7,'Cộng tác'),
(7,1,'Căn bản về công nghệ'),(7,2,'Giao tiếp kĩ thuật số'),(7,3,'Công dân số'),(7,4,'Quản lí thông tin'),(7,5,'Sáng tạo nội dung'),(7,6,'Cộng tác'),(7,7,'An toàn và bảo mật'),
(8,1,'Căn bản về công nghệ'),(8,2,'Giao tiếp kĩ thuật số'),(8,3,'Công dân số'),(8,4,'Quản lí thông tin'),(8,5,'Sáng tạo nội dung'),(8,6,'Cộng tác'),(8,7,'An toàn và bảo mật')
on conflict(grade,topic) do nothing;
-- Use admin-only RPCs. Never grant direct table access to answers.
create or replace function public.ic3_school_admin_catalog(p_grade integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 return jsonb_build_object('topics',(select coalesce(jsonb_agg(jsonb_build_object('topic',t.topic,'title',t.title) order by t.topic),'[]'::jsonb) from public.ic3_school_topics t where t.grade=p_grade),
 'sets',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'topic',s.topic,'test_number',s.test_number,'title',s.title,'published',s.published,'question_count',(select count(*) from public.ic3_school_questions q where q.set_id=s.id)) order by s.topic,s.test_number,s.title),'[]'::jsonb) from public.ic3_school_sets s where s.grade=p_grade));
end $$;
create or replace function public.ic3_school_admin_questions(p_set_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'position',q.position,'prompt',q.prompt,'choices',q.choices,'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip) order by q.position),'[]'::jsonb) from public.ic3_school_questions q where q.set_id=p_set_id);
end $$;
create or replace function public.ic3_school_admin_set(p_grade integer,p_topic integer,p_test integer,p_published boolean default false)
returns text language plpgsql security definer set search_path='' as $$
declare v_id text; v_title text; v_topic_title text;
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 if p_test is null or p_test<1 or p_test>99 then raise exception 'Số Test phải từ 1 đến 99'; end if;
 select title into v_topic_title from public.ic3_school_topics where grade=p_grade and topic=p_topic;
 if v_topic_title is null then raise exception 'Chủ đề không hợp lệ'; end if;
 v_id:= 'GS6-L'||(p_grade-5)||'-CD'||p_topic||'-T'||p_test;
 v_title:= 'Chủ đề '||p_topic||': '||v_topic_title||' – Test '||p_test;
 insert into public.ic3_school_sets(id,grade,topic,test_number,title,published) values(v_id,p_grade,p_topic,p_test,v_title,p_published)
 on conflict(id) do update set title=excluded.title;
 return v_id;
end $$;
create or replace function public.ic3_school_admin_publish(p_set_id text,p_published boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 if p_published and not exists(select 1 from public.ic3_school_questions where set_id=p_set_id) then raise exception 'Không thể xuất bản Test chưa có câu hỏi'; end if;
 update public.ic3_school_sets set published=p_published where id=p_set_id;
 if not found then raise exception 'Không tìm thấy Test'; end if;
end $$;
create or replace function public.ic3_school_admin_save_question(p_set_id text,p_id text,p_position integer,p_prompt text,p_choices jsonb,p_correct_index integer,p_explanation text,p_tip text)
returns text language plpgsql security definer set search_path='' as $$
declare v_id text;
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 if not exists(select 1 from public.ic3_school_sets where id=p_set_id) then raise exception 'Test không tồn tại'; end if;
 if p_position is null or p_position<1 or p_position>32767 then raise exception 'Vị trí không hợp lệ'; end if;
 if length(trim(coalesce(p_prompt,'')))<8 or length(trim(coalesce(p_explanation,'')))<5 then raise exception 'Cần nhập câu hỏi và giải thích đầy đủ'; end if;
 if jsonb_typeof(p_choices)<>'array' or jsonb_array_length(p_choices)<>4 or exists(select 1 from jsonb_array_elements_text(p_choices) x where length(trim(x))=0) then raise exception 'Phải có đúng 4 đáp án A-D'; end if;
 if p_correct_index not between 0 and 3 then raise exception 'Đáp án đúng phải là A, B, C hoặc D'; end if;
 v_id:=coalesce(nullif(p_id,''),gen_random_uuid()::text);
 if p_id is not null and p_id<>'' and not exists(select 1 from public.ic3_school_questions where id=p_id and set_id=p_set_id) then raise exception 'Không được sửa câu hỏi thuộc Test khác'; end if;
 if exists(select 1 from public.ic3_school_attempts where set_id=p_set_id) then raise exception 'Test đã có lượt làm; không thể thay đổi câu hỏi. Hãy tạo Test mới'; end if;
 if exists(select 1 from public.ic3_school_questions where set_id=p_set_id and position=p_position and id<>v_id) then raise exception 'STT đã tồn tại trong Test'; end if;
 insert into public.ic3_school_questions(id,set_id,position,prompt,choices,correct_index,explanation,tip) values(v_id,p_set_id,p_position,trim(p_prompt),p_choices,p_correct_index,trim(p_explanation),coalesce(p_tip,''))
 on conflict(id) do update set position=excluded.position,prompt=excluded.prompt,choices=excluded.choices,correct_index=excluded.correct_index,explanation=excluded.explanation,tip=excluded.tip;
 return v_id;
end $$;
create or replace function public.ic3_school_admin_delete_question(p_set_id text,p_question_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 if exists(select 1 from public.ic3_school_attempts where set_id=p_set_id) then raise exception 'Test đã có lượt làm. Không thể xóa câu hỏi; hãy tạo Test mới'; end if;
 delete from public.ic3_school_questions where id=p_question_id and set_id=p_set_id;
end $$;
-- Historical answers must not be invalidated when learners have submitted an attempt.
-- Existing pilot is deliberately not migrated into the new topic/test catalog.
revoke all on function public.ic3_school_admin_catalog(integer),public.ic3_school_admin_questions(text),public.ic3_school_admin_set(integer,integer,integer,boolean),public.ic3_school_admin_publish(text,boolean),public.ic3_school_admin_save_question(text,text,integer,text,jsonb,integer,text,text),public.ic3_school_admin_delete_question(text,text) from public,anon;
grant execute on function public.ic3_school_admin_catalog(integer),public.ic3_school_admin_questions(text),public.ic3_school_admin_set(integer,integer,integer,boolean),public.ic3_school_admin_publish(text,boolean),public.ic3_school_admin_save_question(text,text,integer,text,jsonb,integer,text,text),public.ic3_school_admin_delete_question(text,text) to authenticated;
notify pgrst,'reload schema';
