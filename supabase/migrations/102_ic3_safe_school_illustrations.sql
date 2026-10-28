
-- 102: Internal-only vetted IC3 illustrations. Run after migrations 098-101.
-- Stops serving existing external image URLs, without deleting their records.
alter table public.ic3_school_questions
  add column if not exists image_path text,
  add column if not exists image_approved boolean not null default false;

-- Immediate safety switch: all old, untrusted external images cease to display
-- even if an older client still uses image_url in its feedback.
update public.ic3_school_questions
set image_url = null
where image_url is not null;

-- Public reading of pre-reviewed files only. This bucket is for education assets,
-- not student uploads or private photos. Approval gates URLs in student RPCs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ic3-illustrations','ic3-illustrations',true,153600,ARRAY['image/webp'])
on conflict(id) do update
set public=true,file_size_limit=153600,allowed_mime_types=ARRAY['image/webp'];

drop policy if exists ic3_illustrations_admin_insert on storage.objects;
create policy ic3_illustrations_admin_insert on storage.objects
for insert to authenticated
with check (
 bucket_id='ic3-illustrations'
 and (storage.extension(name))='webp'
 and exists (
   select 1 from public.user_roles r
   where r.user_id=(select auth.uid())
     and r.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')
 )
);

drop policy if exists ic3_illustrations_admin_delete on storage.objects;
create policy ic3_illustrations_admin_delete on storage.objects
for delete to authenticated
using (
 bucket_id='ic3-illustrations'
 and exists (
   select 1 from public.user_roles r
   where r.user_id=(select auth.uid())
     and r.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')
 )
);

create or replace function public.ic3_school_admin_questions(p_set_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
 'id',q.id,'position',q.position,'prompt',q.prompt,'choices',q.choices,
 'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip,
 'image_url',null,'image_path',q.image_path,'image_approved',q.image_approved
 ) order by q.position),'[]'::jsonb)
 from public.ic3_school_questions q where q.set_id=p_set_id);
end $$;

-- Only a stored path whose object actually exists may be attached.
-- Attaching an image always revokes previous approval.
create or replace function public.ic3_school_admin_set_image(
 p_set_id text,p_question_id text,p_image_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles
    where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL'))
 then raise exception 'Không có quyền'; end if;

 if p_image_path is not null then
   if length(p_image_path)>350
     or p_image_path !~ '^[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[a-f0-9-]+[.]webp$'
   then raise exception 'Đường dẫn ảnh không hợp lệ'; end if;

   if p_image_path not like p_set_id||'/'||p_question_id||'/%'
     or not exists(select 1 from storage.objects
       where bucket_id='ic3-illustrations' and name=p_image_path)
   then raise exception 'Ảnh không thuộc câu hỏi hoặc chưa được tải lên'; end if;
 end if;
 update public.ic3_school_questions
 set image_path=p_image_path,image_approved=false,image_url=null
 where id=p_question_id and set_id=p_set_id;
 if not found then raise exception 'Không tìm thấy câu hỏi'; end if;
end $$;

create or replace function public.ic3_school_admin_approve_image(
 p_set_id text,p_question_id text,p_approved boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles
    where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL'))
 then raise exception 'Không có quyền'; end if;

 if p_approved and not exists(
  select 1 from public.ic3_school_questions q
  join storage.objects o on o.bucket_id='ic3-illustrations' and o.name=q.image_path
  where q.id=p_question_id and q.set_id=p_set_id and q.image_path is not null
 ) then raise exception 'Không có ảnh hợp lệ để duyệt'; end if;
 update public.ic3_school_questions
 set image_approved=coalesce(p_approved,false)
 where id=p_question_id and set_id=p_set_id;
 if not found then raise exception 'Không tìm thấy câu hỏi'; end if;
end $$;
create or replace function public.ic3_school_answer(p_attempt_id uuid,p_question_id text,p_choice integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.ic3_school_attempts%rowtype; q public.ic3_school_questions%rowtype;
begin
 select * into a from public.ic3_school_attempts where id=p_attempt_id and user_id=auth.uid() and status='in_progress' for update;
 if not found then raise exception 'Lượt làm không hợp lệ'; end if;
 if a.mode<>'learn' then raise exception 'Không được xem giải thích trước khi nộp'; end if;
 select * into q from public.ic3_school_questions where id=p_question_id and set_id=a.set_id;
 if not found then raise exception 'Câu hỏi không thuộc bài'; end if;
 if p_choice is null or p_choice<0 or p_choice>=jsonb_array_length(q.choices) then raise exception 'Đáp án không hợp lệ'; end if;
 if a.answers ? p_question_id then raise exception 'Câu này đã trả lời'; end if;
 update public.ic3_school_attempts set answers=jsonb_set(answers,array[p_question_id],to_jsonb(p_choice),true) where id=a.id;
 return jsonb_build_object('feedback',jsonb_build_object('correct',p_choice=q.correct_index,'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip,'image_path',case when q.image_approved then q.image_path else null end));
end; $$;

create or replace function public.ic3_school_finish(p_attempt_id uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.ic3_school_attempts%rowtype; q record; v_answers jsonb; v_count integer:=0; v_correct integer:=0; v_choice integer; v_feedback jsonb:='{}'::jsonb; v_score integer;
begin
 select * into a from public.ic3_school_attempts where id=p_attempt_id and user_id=auth.uid() and status='in_progress' for update;
 if not found then raise exception 'Không tìm thấy lượt đang làm'; end if;
 v_answers:=case when a.mode='learn' then a.answers else p_answers end;
 if v_answers is null or jsonb_typeof(v_answers)<>'object' then raise exception 'Đáp án không hợp lệ'; end if;
 for q in select * from public.ic3_school_questions where set_id=a.set_id order by position loop
   v_count:=v_count+1;
   if not (v_answers ? q.id) or (v_answers->>q.id) !~ '^[0-9]+$' then raise exception 'Chưa trả lời đủ'; end if;
   v_choice:=(v_answers->>q.id)::integer;
   if v_choice < 0 or v_choice >= jsonb_array_length(q.choices) then raise exception 'Lựa chọn không hợp lệ'; end if;
   if v_choice=q.correct_index then v_correct:=v_correct+1; end if;
   v_feedback:=v_feedback || jsonb_build_object(q.id,jsonb_build_object('correct',v_choice=q.correct_index,'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip,'image_path',case when q.image_approved then q.image_path else null end));
 end loop;
 if (select count(*) from jsonb_object_keys(v_answers))<>v_count then raise exception 'Số câu trả lời không hợp lệ'; end if;
 v_score:=round(1000.0*v_correct/v_count)::integer;
 update public.ic3_school_attempts set answers=v_answers,status='finished',finished_at=now(),score=v_score,correct_count=v_correct where id=a.id;
 return jsonb_build_object('score',v_score,'correct_count',v_correct,'total',v_count,'feedback',v_feedback);
end; $$;


revoke all on function public.ic3_school_admin_set_image(text,text,text),
 public.ic3_school_admin_approve_image(text,text,boolean) from public,anon;
grant execute on function public.ic3_school_admin_set_image(text,text,text),
 public.ic3_school_admin_approve_image(text,text,boolean) to authenticated;
notify pgrst,'reload schema';
