-- Additive: teacher attendance history edits with server-side permission checks and immutable audit entries.
-- Run AFTER 086_teacher_attendance.sql and 091_teacher_attendance_unidentified.sql.
-- No DELETE/TRUNCATE/DROP; no modification to competition scoring tables.
CREATE TABLE IF NOT EXISTS public.teacher_attendance_edit_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.teacher_attendance_records(id),
  edited_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL,
  old_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS teacher_attendance_edit_audit_record_idx ON public.teacher_attendance_edit_audit(record_id,edited_at DESC);
ALTER TABLE public.teacher_attendance_edit_audit ENABLE ROW LEVEL SECURITY;
-- Managers must be able to read teacher events even if not assigned as supervisors.
DROP POLICY IF EXISTS "Teacher attendance history manager read" ON public.teacher_attendance_records;
CREATE POLICY "Teacher attendance history manager read" ON public.teacher_attendance_records
  FOR SELECT TO authenticated USING (
    public.has_competition_permission(auth.uid(),'COMPETITION_MANAGE') OR public.is_admin()
  );
-- Audit records are read-only to authorized managers; all writes go through the RPC.
DROP POLICY IF EXISTS "Teacher attendance edit audit read" ON public.teacher_attendance_edit_audit;
CREATE POLICY "Teacher attendance edit audit read" ON public.teacher_attendance_edit_audit
  FOR SELECT TO authenticated USING (
    public.has_competition_permission(auth.uid(),'COMPETITION_MANAGE') OR public.is_admin()
  );
GRANT SELECT ON public.teacher_attendance_edit_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.edit_teacher_attendance_record(
  p_record_id uuid, p_rule_code text, p_occurred_at timestamptz,
  p_session text, p_period_number integer, p_class_name text,
  p_minutes integer, p_note text, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_old public.teacher_attendance_records%ROWTYPE;
  v_new public.teacher_attendance_records%ROWTYPE;
  v_old_json jsonb;
  v_new_json jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_competition_permission(auth.uid(),'COMPETITION_MANAGE') OR public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Không có quyền chỉnh sửa ghi nhận giáo viên' USING ERRCODE='42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Phải nhập lý do chỉnh sửa (ít nhất 3 ký tự)';
  END IF;
  IF length(p_reason) > 1000 OR length(coalesce(p_note,'')) > 4000 OR length(coalesce(p_class_name,'')) > 120 THEN
    RAISE EXCEPTION 'Nội dung quá dài';
  END IF;
  IF p_rule_code IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.teacher_attendance_rules WHERE code=p_rule_code
  ) THEN RAISE EXCEPTION 'Quy tắc không hợp lệ'; END IF;
  IF p_occurred_at IS NULL OR p_session NOT IN ('MORNING','AFTERNOON')
     OR p_period_number NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'Thời gian, buổi hoặc tiết không hợp lệ';
  END IF;
  IF (p_rule_code IN ('LATE','EARLY') AND (p_minutes IS NULL OR p_minutes NOT BETWEEN 1 AND 240))
     OR (p_rule_code NOT IN ('LATE','EARLY') AND p_minutes IS NOT NULL) THEN
    RAISE EXCEPTION 'Số phút không phù hợp với quy tắc';
  END IF;
  SELECT * INTO v_old FROM public.teacher_attendance_records WHERE id=p_record_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy ghi nhận giáo viên'; END IF;
  IF v_old.teacher_id IS NULL AND nullif(btrim(coalesce(p_class_name,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Ghi nhận chưa rõ giáo viên bắt buộc có lớp';
  END IF;
  v_old_json := jsonb_build_object('rule_code',v_old.rule_code,'occurred_at',v_old.occurred_at,
    'session',v_old.session,'period_number',v_old.period_number,'class_name',v_old.class_name,
    'minutes',v_old.minutes,'note',v_old.note);
  UPDATE public.teacher_attendance_records SET
    rule_code=p_rule_code,occurred_at=p_occurred_at,session=p_session,
    period_number=p_period_number,class_name=nullif(btrim(coalesce(p_class_name,'')),''),
    minutes=p_minutes,note=nullif(btrim(coalesce(p_note,'')),'')
  WHERE id=p_record_id RETURNING * INTO v_new;
  v_new_json := jsonb_build_object('rule_code',v_new.rule_code,'occurred_at',v_new.occurred_at,
    'session',v_new.session,'period_number',v_new.period_number,'class_name',v_new.class_name,
    'minutes',v_new.minutes,'note',v_new.note);
  IF v_old_json = v_new_json THEN RAISE EXCEPTION 'Không có thay đổi nào để lưu'; END IF;
  INSERT INTO public.teacher_attendance_edit_audit(record_id,edited_by,reason,old_values,new_values)
    VALUES(p_record_id,auth.uid(),btrim(p_reason),v_old_json,v_new_json);
END;
$$;
REVOKE ALL ON FUNCTION public.edit_teacher_attendance_record(uuid,text,timestamptz,text,integer,text,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_teacher_attendance_record(uuid,text,timestamptz,text,integer,text,integer,text,text) TO authenticated;
