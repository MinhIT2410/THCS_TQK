-- HOTFIX 112. Run after 109. Do not execute on an unverified schema.
-- No draft creation: uploader stages object first; one DB transaction records submission + attachments.
-- Existing draft rows remain untouched for manual review, never auto-delete user data.

DROP POLICY IF EXISTS movement_private_upload ON storage.objects;
CREATE POLICY movement_private_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'movement-submissions'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.movement_events e
    JOIN public.classes c ON c.id::text = (storage.foldername(name))[4]
    WHERE e.id::text = (storage.foldername(name))[3]
      AND public.movement_can_submit(e.id, c.id)
  )
);

CREATE OR REPLACE FUNCTION public.movement_submit_product(
  p_event_id uuid, p_class_id uuid, p_notes text, p_video_url text,
  p_files jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_submission uuid;
  v_event public.movement_events%ROWTYPE;
  v_file jsonb;
  v_path text;
  v_name text;
  v_kind text;
  v_bytes bigint;
  v_added_images integer := 0;
  v_old_images integer := 0;
  v_old_files integer := 0;
BEGIN
  IF v_uid IS NULL OR NOT public.movement_can_submit(p_event_id,p_class_id) THEN
    RAISE EXCEPTION 'Không có quyền nộp hoặc đã hết hạn';
  END IF;
  SELECT * INTO v_event FROM public.movement_events WHERE id = p_event_id;
  IF jsonb_typeof(p_files) IS DISTINCT FROM 'array' OR jsonb_array_length(p_files)>20 THEN
    RAISE EXCEPTION 'Danh sách tệp không hợp lệ';
  END IF;
  IF p_video_url IS NOT NULL AND (
      NOT v_event.allow_video_link OR length(p_video_url)>1500
      OR p_video_url !~* '^https://[^[:space:]]+$') THEN
    RAISE EXCEPTION 'Link video không hợp lệ hoặc hoạt động không cho phép';
  END IF;

  SELECT s.id INTO v_submission FROM public.movement_class_submissions s
  WHERE s.event_id=p_event_id AND s.class_id=p_class_id FOR UPDATE;
  IF v_submission IS NOT NULL THEN
    SELECT count(*),count(*) FILTER (WHERE file_type='image')
      INTO v_old_files,v_old_images
    FROM public.movement_submission_files WHERE submission_id=v_submission;
  END IF;
  IF jsonb_array_length(p_files)=0 AND p_video_url IS NULL AND v_old_files=0 THEN
    RAISE EXCEPTION 'Chưa có ảnh, MP3 hoặc liên kết video: không thể nộp bài rỗng';
  END IF;

  FOR v_file IN SELECT value FROM jsonb_array_elements(p_files) LOOP
    v_path := v_file->>'path';
    v_name := v_file->>'name';
    v_kind := v_file->>'kind';
    v_bytes := (v_file->>'bytes')::bigint;
    IF v_kind NOT IN ('image','audio') OR v_bytes IS NULL OR v_bytes<1 OR v_bytes>20971520
      OR coalesce(length(v_name),0)<1 OR length(v_name)>240
      OR v_path IS NULL OR length(v_path)>400
      OR v_path NOT LIKE ('submissions/'||v_uid||'/'||p_event_id||'/'||p_class_id||'/%') THEN
      RAISE EXCEPTION 'Thông tin tệp không hợp lệ';
    END IF;
    IF (v_kind='image' AND NOT v_event.allow_images)
      OR (v_kind='audio' AND NOT v_event.allow_mp3) THEN
      RAISE EXCEPTION 'Loại tệp không được phép';
    END IF;
    IF v_kind='image' THEN v_added_images:=v_added_images+1; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects o WHERE o.bucket_id='movement-submissions'
      AND o.name=v_path
      AND ((v_kind='image' AND storage.extension(o.name) IN ('jpg','jpeg','png','webp'))
        OR (v_kind='audio' AND storage.extension(o.name)='mp3'))
    ) THEN RAISE EXCEPTION 'Không tìm thấy tệp đã tải lên: %',v_name; END IF;
    IF EXISTS (SELECT 1 FROM public.movement_submission_files WHERE storage_path=v_path) THEN
      RAISE EXCEPTION 'Tệp đã được sử dụng';
    END IF;
  END LOOP;
  IF v_old_images + v_added_images > v_event.max_images THEN
    RAISE EXCEPTION 'Số lượng ảnh vượt giới hạn hoạt động';
  END IF;

  IF v_submission IS NULL THEN
    INSERT INTO public.movement_class_submissions
      (event_id,class_id,teacher_id,notes,video_url,status,submitted_at,updated_at)
    VALUES (p_event_id,p_class_id,v_uid,p_notes,p_video_url,'submitted',now(),now())
    RETURNING id INTO v_submission;
  ELSE
    UPDATE public.movement_class_submissions
      SET teacher_id=v_uid,notes=p_notes,video_url=p_video_url,
          status='submitted',submitted_at=now(),updated_at=now()
    WHERE id=v_submission;
  END IF;
  FOR v_file IN SELECT value FROM jsonb_array_elements(p_files) LOOP
    INSERT INTO public.movement_submission_files
      (submission_id,storage_path,file_type,original_name,size_bytes)
    VALUES (v_submission,v_file->>'path',v_file->>'kind',v_file->>'name',(v_file->>'bytes')::bigint);
  END LOOP;
  RETURN v_submission;
END; $$;

-- Prevent bypass via direct table insert/update (the security-definer RPC performs checks).
REVOKE INSERT ON public.movement_class_submissions FROM authenticated;
-- Keep managers' review operation working; prevent teachers from bypassing RPC.
DROP POLICY IF EXISTS movement_submit_update ON public.movement_class_submissions;
CREATE POLICY movement_submit_update ON public.movement_class_submissions
FOR UPDATE TO authenticated USING (public.movement_is_manager())
WITH CHECK (public.movement_is_manager());
REVOKE INSERT ON public.movement_submission_files FROM authenticated;
REVOKE ALL ON FUNCTION public.movement_submit_product(uuid,uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.movement_submit_product(uuid,uuid,text,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
