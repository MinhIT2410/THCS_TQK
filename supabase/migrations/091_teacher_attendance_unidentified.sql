-- Additive change. Run after 086_teacher_attendance.sql.
-- Existing records remain IDENTIFIED. No deletion and no change to existing RLS policies.
ALTER TABLE public.teacher_attendance_records
  ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE public.teacher_attendance_records
  ADD COLUMN IF NOT EXISTS identity_status text NOT NULL DEFAULT 'IDENTIFIED',
  ADD COLUMN IF NOT EXISTS subject_name text,
  ADD COLUMN IF NOT EXISTS original_teacher_name text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='teacher_attendance_identity_status_check' AND conrelid='public.teacher_attendance_records'::regclass) THEN
  ALTER TABLE public.teacher_attendance_records
    ADD CONSTRAINT teacher_attendance_identity_status_check
    CHECK ( (identity_status = 'IDENTIFIED' AND teacher_id IS NOT NULL)
         OR (identity_status IN ('EXTERNAL','UNIDENTIFIED') AND teacher_id IS NULL) );
 END IF;
END $$;

-- Require the class to be recorded for unidentified/external teachers.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='teacher_attendance_unknown_class_check' AND conrelid='public.teacher_attendance_records'::regclass) THEN
  ALTER TABLE public.teacher_attendance_records
    ADD CONSTRAINT teacher_attendance_unknown_class_check
    CHECK (identity_status = 'IDENTIFIED' OR nullif(btrim(class_name),'') IS NOT NULL);
 END IF;
END $$;

CREATE INDEX IF NOT EXISTS teacher_attendance_unresolved_idx
 ON public.teacher_attendance_records(occurred_at DESC)
 WHERE teacher_id IS NULL;

-- Leadership can see pending identity verification; supervisors cannot resolve it.
CREATE OR REPLACE FUNCTION public.list_pending_teacher_attendance()
RETURNS TABLE(id uuid, teacher_name text, identity_status text, occurred_at timestamptz,
              class_name text, subject_name text, rule_code text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
 IF NOT public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','PRINCIPAL','VICE_PRINCIPAL']) THEN
  RAISE EXCEPTION 'Không có quyền xem danh sách xác minh' USING ERRCODE = '42501';
 END IF;
 RETURN QUERY
 SELECT r.id, r.teacher_name, r.identity_status, r.occurred_at,
        r.class_name, r.subject_name, r.rule_code
 FROM public.teacher_attendance_records r
 WHERE r.teacher_id IS NULL
 ORDER BY r.occurred_at DESC
 LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.list_pending_teacher_attendance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_teacher_attendance() TO authenticated;

-- Only leadership can link a pending record to an existing teacher profile.
-- Retain the originally entered name for audit purposes.
CREATE OR REPLACE FUNCTION public.resolve_teacher_attendance_identity(p_record_id uuid, p_teacher_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_name text;
BEGIN
 IF NOT public.has_any_app_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','PRINCIPAL','VICE_PRINCIPAL']) THEN
  RAISE EXCEPTION 'Bạn không có quyền xác minh giáo viên' USING ERRCODE = '42501';
 END IF;
 IF p_record_id IS NULL OR p_teacher_id IS NULL THEN
  RAISE EXCEPTION 'Thiếu thông tin ghi nhận hoặc giáo viên';
 END IF;
 SELECT d.full_name INTO v_name
 FROM public.list_teacher_attendance_directory() d
 WHERE d.id = p_teacher_id;
 IF v_name IS NULL THEN
  RAISE EXCEPTION 'Giáo viên chưa có trong danh sách hợp lệ';
 END IF;
 UPDATE public.teacher_attendance_records r
 SET teacher_id = p_teacher_id,
     original_teacher_name = r.teacher_name,
     teacher_name = v_name,
     identity_status = 'IDENTIFIED',
     resolved_by = auth.uid(),
     resolved_at = now()
 WHERE r.id = p_record_id AND r.teacher_id IS NULL;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Không tìm thấy ghi nhận chưa xác minh hoặc đã được xử lý';
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_teacher_attendance_identity(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_teacher_attendance_identity(uuid,uuid) TO authenticated;
