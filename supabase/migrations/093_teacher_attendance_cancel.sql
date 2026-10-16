-- 093: Soft-cancel teacher attendance records, preserving audit and report correctness.
-- Prerequisites: migrations 086, 091, 092. Run before deploying the updated UI.
ALTER TABLE public.teacher_attendance_records
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE OR REPLACE FUNCTION public.cancel_teacher_attendance_record(
  p_record_id uuid, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_old public.teacher_attendance_records%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_competition_permission(auth.uid(),'COMPETITION_MANAGE') OR public.is_admin()
  ) THEN RAISE EXCEPTION 'Không có quyền hủy ghi nhận giáo viên' USING ERRCODE='42501'; END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 OR length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Lý do hủy phải từ 3 đến 1000 ký tự';
  END IF;
  SELECT * INTO v_old FROM public.teacher_attendance_records WHERE id=p_record_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy ghi nhận giáo viên'; END IF;
  IF v_old.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Ghi nhận đã được hủy trước đó'; END IF;
  UPDATE public.teacher_attendance_records
    SET cancelled_at=now(), cancelled_by=auth.uid(), cancel_reason=btrim(p_reason)
    WHERE id=p_record_id;
  INSERT INTO public.teacher_attendance_edit_audit(record_id,edited_by,reason,old_values,new_values)
    VALUES (p_record_id,auth.uid(),'HỦY: '||btrim(p_reason),
      jsonb_build_object('cancelled_at',v_old.cancelled_at,'cancelled_by',v_old.cancelled_by,'cancel_reason',v_old.cancel_reason),
      jsonb_build_object('cancelled_at',(SELECT cancelled_at FROM public.teacher_attendance_records WHERE id=p_record_id),
        'cancelled_by',auth.uid(),'cancel_reason',btrim(p_reason)));
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_teacher_attendance_record(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_teacher_attendance_record(uuid,text) TO authenticated;

-- Keep existing 092 edit behavior, additionally prevent editing a cancelled record.
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
  IF v_old.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Ghi nhận đã hủy, không thể chỉnh sửa'; END IF;
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
