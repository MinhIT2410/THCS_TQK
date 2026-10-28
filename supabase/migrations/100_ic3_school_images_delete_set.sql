
-- Add image support for question explanations and allow deleting test sets.
alter table public.ic3_school_questions add column if not exists image_url text;

create or replace function public.ic3_school_admin_questions(p_set_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 return (
   select coalesce(
     jsonb_agg(
       jsonb_build_object(
         'id',q.id,
         'position',q.position,
         'prompt',q.prompt,
         'choices',q.choices,
         'correct_index',q.correct_index,
         'explanation',q.explanation,
         'tip',q.tip,
         'image_url',q.image_url
       ) order by q.position
     ),'[]'::jsonb)
   from public.ic3_school_questions q where q.set_id=p_set_id
 );
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
 return jsonb_build_object('feedback',jsonb_build_object('correct',p_choice=q.correct_index,'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip,'image_url',q.image_url));
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
   v_feedback:=v_feedback || jsonb_build_object(q.id,jsonb_build_object('correct',v_choice=q.correct_index,'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip,'image_url',q.image_url));
 end loop;
 if (select count(*) from jsonb_object_keys(v_answers))<>v_count then raise exception 'Số câu trả lời không hợp lệ'; end if;
 v_score:=round(1000.0*v_correct/v_count)::integer;
 update public.ic3_school_attempts set answers=v_answers,status='finished',finished_at=now(),score=v_score,correct_count=v_correct where id=a.id;
 return jsonb_build_object('score',v_score,'correct_count',v_correct,'total',v_count,'feedback',v_feedback);
end; $$;

create or replace function public.ic3_school_admin_save_question_media(
  p_set_id text,
  p_id text,
  p_position integer,
  p_prompt text,
  p_choices jsonb,
  p_correct_index integer,
  p_explanation text,
  p_tip text,
  p_image_url text default null
)
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
 insert into public.ic3_school_questions(id,set_id,position,prompt,choices,correct_index,explanation,tip,image_url)
 values(v_id,p_set_id,p_position,trim(p_prompt),p_choices,p_correct_index,trim(p_explanation),coalesce(p_tip,''),nullif(trim(coalesce(p_image_url,'')),''))
 on conflict(id) do update set position=excluded.position,prompt=excluded.prompt,choices=excluded.choices,correct_index=excluded.correct_index,explanation=excluded.explanation,tip=excluded.tip,image_url=excluded.image_url;
 return v_id;
end $$;

create or replace function public.ic3_school_admin_delete_set(p_set_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=auth.uid() and role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL')) then raise exception 'Không có quyền'; end if;
 if exists(select 1 from public.ic3_school_attempts where set_id=p_set_id) then raise exception 'Test đã có lượt làm. Không thể xóa; hãy ẩn Test hoặc tạo Test mới'; end if;
 delete from public.ic3_school_sets where id=p_set_id;
 if not found then raise exception 'Không tìm thấy Test'; end if;
end $$;

revoke all on function public.ic3_school_admin_save_question_media(text,text,integer,text,jsonb,integer,text,text,text), public.ic3_school_admin_delete_set(text) from public,anon;
grant execute on function public.ic3_school_admin_save_question_media(text,text,integer,text,jsonb,integer,text,text,text), public.ic3_school_admin_delete_set(text) to authenticated;

-- Remove old pilot / experimental test set.
delete from public.ic3_school_attempts where set_id='GS6-L1-CD1-PILOT';
delete from public.ic3_school_sets where id='GS6-L1-CD1-PILOT' or title ilike '%thử nghiệm%';

notify pgrst,'reload schema';
