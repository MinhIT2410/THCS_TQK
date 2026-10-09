-- Admin notes-only edits; incident identity and all point transactions stay unchanged.
begin;
create table if not exists public.competition_incident_edits (
 id uuid primary key default gen_random_uuid(),
 incident_id uuid not null references public.competition_incidents(id),
 edited_by uuid not null references public.profiles(id),
 reason text not null check (length(trim(reason)) > 0),
 before_data jsonb not null, after_data jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.competition_incident_edits enable row level security;
drop policy if exists competition_incident_edits_admin_select on public.competition_incident_edits;
create policy competition_incident_edits_admin_select on public.competition_incident_edits for select to authenticated
 using (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE') or public.is_admin());
grant select on public.competition_incident_edits to authenticated;

create or replace function public.edit_competition_incident_notes(
 p_incident_id uuid, p_expected_updated_at timestamptz,
 p_description text, p_evidence_note text, p_reason text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
 v_user uuid := auth.uid(); v_old public.competition_incidents%rowtype;
 v_new public.competition_incidents%rowtype;
begin
 if v_user is null or not (public.has_competition_permission(v_user, 'COMPETITION_MANAGE') or public.is_admin()) then
  raise exception 'Chỉ quản trị thi đua được chỉnh sửa ghi chú.' using errcode = '42501';
 end if;
 if nullif(trim(p_reason), '') is null then raise exception 'Vui lòng nhập lý do chỉnh sửa.'; end if;
 select * into v_old from public.competition_incidents where id=p_incident_id for update;
 if not found then raise exception 'Không tìm thấy sự việc.'; end if;
 if p_expected_updated_at is null or v_old.updated_at is distinct from p_expected_updated_at then
  raise exception 'Sự việc đã thay đổi. Vui lòng đóng cửa sổ, làm mới và thử lại.';
 end if;
 if v_old.status not in ('APPROVED','PENDING','DRAFT') then
  raise exception 'Không chỉnh sửa ghi chú của sự việc đã hủy hoặc từ chối.';
 end if;
 if v_old.description is not distinct from nullif(trim(p_description),'')
  and v_old.evidence_note is not distinct from nullif(trim(p_evidence_note),'') then
  raise exception 'Ghi chú chưa có thay đổi.';
 end if;
 -- Only descriptive fields: never change rule, person, class, date, status or ledger.
 update public.competition_incidents set description=nullif(trim(p_description),''),
  evidence_note=nullif(trim(p_evidence_note),''),updated_at=now()
  where id=p_incident_id returning * into v_new;
 insert into public.competition_incident_edits (incident_id,edited_by,reason,before_data,after_data)
  values (p_incident_id,v_user,trim(p_reason),to_jsonb(v_old),to_jsonb(v_new));
 return jsonb_build_object('success',true,'incident_id',p_incident_id);
end; $$;
revoke all on function public.edit_competition_incident_notes(uuid,timestamptz,text,text,text) from public,anon;
grant execute on function public.edit_competition_incident_notes(uuid,timestamptz,text,text,text) to authenticated;
commit;
