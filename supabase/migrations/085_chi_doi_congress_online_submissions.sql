-- 085: GVCN gửi biên bản Đại hội Chi đội online + tối đa 3 ảnh minh chứng
begin;

create table if not exists public.chi_doi_congress_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.movement_campaigns(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  meeting_date timestamptz null,
  location text null,
  total_members integer null check (total_members is null or total_members >= 0),
  attendees integer null check (attendees is null or attendees >= 0),
  chairperson text null,
  secretary text null,
  agenda text null,
  election_result text null,
  executive_committee text null,
  notes text null,
  image_urls text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in ('draft','submitted')),
  submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chi_doi_congress_one_per_class_campaign unique (campaign_id, class_id),
  constraint chi_doi_congress_max_3_images check (cardinality(image_urls) <= 3)
);

create index if not exists idx_chi_doi_congress_campaign on public.chi_doi_congress_submissions(campaign_id);
create index if not exists idx_chi_doi_congress_class on public.chi_doi_congress_submissions(class_id);
create index if not exists idx_chi_doi_congress_teacher on public.chi_doi_congress_submissions(teacher_id);

drop trigger if exists trg_chi_doi_congress_updated_at on public.chi_doi_congress_submissions;
create trigger trg_chi_doi_congress_updated_at before update on public.chi_doi_congress_submissions
for each row execute function public.set_updated_at();

alter table public.chi_doi_congress_submissions enable row level security;

drop policy if exists "GVCN can read own congress submission" on public.chi_doi_congress_submissions;
create policy "GVCN can read own congress submission"
on public.chi_doi_congress_submissions for select to authenticated
using (teacher_id = auth.uid() and public.is_homeroom_teacher(auth.uid(), class_id));

drop policy if exists "GVCN can insert own congress submission" on public.chi_doi_congress_submissions;
create policy "GVCN can insert own congress submission"
on public.chi_doi_congress_submissions for insert to authenticated
with check (teacher_id = auth.uid() and public.is_homeroom_teacher(auth.uid(), class_id));

drop policy if exists "GVCN can update own congress submission" on public.chi_doi_congress_submissions;
create policy "GVCN can update own congress submission"
on public.chi_doi_congress_submissions for update to authenticated
using (teacher_id = auth.uid() and public.is_homeroom_teacher(auth.uid(), class_id))
with check (teacher_id = auth.uid() and public.is_homeroom_teacher(auth.uid(), class_id));

-- Ban giám hiệu / quản trị / biên tập có thể đọc dữ liệu để xử lý ở bước sau.
drop policy if exists "Managers can read congress submissions" on public.chi_doi_congress_submissions;
create policy "Managers can read congress submissions"
on public.chi_doi_congress_submissions for select to authenticated
using (public.has_any_app_role(auth.uid(), array['SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL','CONTENT_EDITOR']));

grant select, insert, update on public.chi_doi_congress_submissions to authenticated;

-- GVCN chỉ được upload ảnh vào thư mục của chính tài khoản mình.
drop policy if exists "GVCN upload congress images" on storage.objects;
create policy "GVCN upload congress images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'school-media'
  and (storage.foldername(name))[1] = 'dai-hoi-chi-doi'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_homeroom_teacher(auth.uid())
);

commit;
