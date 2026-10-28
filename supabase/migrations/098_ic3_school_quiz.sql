-- Independent school-authored quiz; does not modify IC3 IIG log, codes, or competition.
create table if not exists public.ic3_school_sets (
 id text primary key, grade smallint not null check (grade in (6,7,8)),
 title text not null, published boolean not null default false
);
create table if not exists public.ic3_school_questions (
 id text primary key, set_id text not null references public.ic3_school_sets(id) on delete cascade,
 position smallint not null, prompt text not null, choices jsonb not null,
 correct_index smallint not null check (correct_index between 0 and 9),
 explanation text not null, tip text not null default '',
 unique(set_id,position), check(jsonb_typeof(choices)='array' and jsonb_array_length(choices) between 2 and 10)
);
create table if not exists public.ic3_school_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 set_id text not null references public.ic3_school_sets(id), mode text not null check(mode in ('learn','exam')),
 started_at timestamptz not null default now(), finished_at timestamptz,
 score integer check(score between 0 and 1000), correct_count integer,
 answers jsonb not null default '{}'::jsonb,
 status text not null default 'in_progress' check(status in ('in_progress','finished'))
);
create index if not exists ic3_school_attempt_user on public.ic3_school_attempts(user_id,started_at desc);
create index if not exists ic3_school_attempt_set on public.ic3_school_attempts(set_id,started_at desc);
alter table public.ic3_school_sets enable row level security;
alter table public.ic3_school_questions enable row level security;
alter table public.ic3_school_attempts enable row level security;
revoke all on public.ic3_school_sets,public.ic3_school_questions,public.ic3_school_attempts from anon,authenticated;
grant select on public.ic3_school_attempts to authenticated;
drop policy if exists ic3_school_own_history on public.ic3_school_attempts;
create policy ic3_school_own_history on public.ic3_school_attempts for select to authenticated using (
 user_id=(select auth.uid()) or exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role_code in ('SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL'))
);
-- No table SELECT for questions: correct answers stay server-side.
create or replace function public.ic3_school_list_sets(p_grade integer)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'question_count',
 (select count(*) from public.ic3_school_questions q where q.set_id=s.id)) order by s.title),'[]'::jsonb)
 from public.ic3_school_sets s where s.grade=p_grade and s.published=true
 and exists(select 1 from public.ic3_school_questions q where q.set_id=s.id);
$$;
create or replace function public.ic3_school_start(p_set_id text,p_mode text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_questions jsonb;
begin
 if auth.uid() is null then raise exception 'Cần đăng nhập'; end if;
 if p_mode not in ('learn','exam') then raise exception 'Chế độ không hợp lệ'; end if;
 if not exists(select 1 from public.ic3_school_sets where id=p_set_id and published) then raise exception 'Bài chưa được xuất bản'; end if;
 select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'choices',q.choices) order by q.position)
 into v_questions from public.ic3_school_questions q where q.set_id=p_set_id;
 if jsonb_array_length(coalesce(v_questions,'[]'::jsonb))=0 then raise exception 'Bài chưa có câu hỏi'; end if;
 insert into public.ic3_school_attempts(user_id,set_id,mode) values(auth.uid(),p_set_id,p_mode) returning id into v_id;
 return jsonb_build_object('attempt_id',v_id,'questions',v_questions);
end; $$;
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
 return jsonb_build_object('feedback',jsonb_build_object('correct',p_choice=q.correct_index,'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip));
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
   v_feedback:=v_feedback || jsonb_build_object(q.id,jsonb_build_object('correct',v_choice=q.correct_index,'correct_index',q.correct_index,'explanation',q.explanation,'tip',q.tip));
 end loop;
 if (select count(*) from jsonb_object_keys(v_answers))<>v_count then raise exception 'Số câu trả lời không hợp lệ'; end if;
 v_score:=round(1000.0*v_correct/v_count)::integer;
 update public.ic3_school_attempts set answers=v_answers,status='finished',finished_at=now(),score=v_score,correct_count=v_correct where id=a.id;
 return jsonb_build_object('score',v_score,'correct_count',v_correct,'total',v_count,'feedback',v_feedback);
end; $$;
revoke all on function public.ic3_school_list_sets(integer),public.ic3_school_start(text,text),public.ic3_school_answer(uuid,text,integer),public.ic3_school_finish(uuid,jsonb) from public,anon;
grant execute on function public.ic3_school_list_sets(integer),public.ic3_school_start(text,text),public.ic3_school_answer(uuid,text,integer),public.ic3_school_finish(uuid,jsonb) to authenticated;
-- Three original pilot questions. More questions will be added after content review.
insert into public.ic3_school_sets(id,grade,title,published) values('GS6-L1-CD1-PILOT',6,'Chủ đề 1 – Căn bản về công nghệ (bản thử nghiệm)',true) on conflict (id) do update set title=excluded.title,published=excluded.published;
insert into public.ic3_school_questions(id,set_id,position,prompt,choices,correct_index,explanation,tip) values
('PILOT-001','GS6-L1-CD1-PILOT',1,'Em thường xuyên truy cập thư viện học liệu trực tuyến. Cách nào giúp mở nhanh trang này vào lần sau?', '["Xóa dữ liệu duyệt web","Đánh dấu trang yêu thích","Đổi hình nền máy tính","Tắt trình duyệt"]',1,'Dấu trang lưu lại địa chỉ website để truy cập nhanh vào lần khác.','Dấu trang khác với lịch sử duyệt web.'),
('PILOT-002','GS6-L1-CD1-PILOT',2,'Trong buổi thuyết trình, thiết bị nào giúp cả lớp xem nội dung từ máy tính trên màn lớn?', '["Máy quét","Bàn phím","Máy chiếu","Micro"]',2,'Máy chiếu nhận tín hiệu hình ảnh từ máy tính và hiển thị cho nhiều người cùng xem.','Thiết bị nhập đưa dữ liệu vào; thiết bị xuất thể hiện kết quả.'),
('PILOT-003','GS6-L1-CD1-PILOT',3,'Một ứng dụng bị treo nhưng các ứng dụng khác vẫn hoạt động. Việc đầu tiên hợp lý nhất là gì?', '["Rút điện máy tính ngay","Thử đóng ứng dụng không phản hồi bằng công cụ quản lý tác vụ","Xóa toàn bộ thư mục cá nhân","Tắt mạng Wi-Fi"]',1,'Khi ứng dụng không phản hồi, có thể dùng công cụ quản lý tác vụ để kết thúc riêng ứng dụng đó trước khi thử mở lại.','Không tắt nguồn đột ngột nếu vẫn có thể xử lý an toàn.')
on conflict(id) do update set prompt=excluded.prompt,choices=excluded.choices,correct_index=excluded.correct_index,explanation=excluded.explanation,tip=excluded.tip;
notify pgrst, 'reload schema';
