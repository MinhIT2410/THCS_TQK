-- PATCH 109: additive only, does not modify existing movement campaign rows.
ALTER TABLE public.movement_events ADD COLUMN IF NOT EXISTS submission_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.movement_events ADD COLUMN IF NOT EXISTS submission_deadline timestamptz;
ALTER TABLE public.movement_events ADD COLUMN IF NOT EXISTS allow_images boolean NOT NULL DEFAULT true;
ALTER TABLE public.movement_events ADD COLUMN IF NOT EXISTS allow_mp3 boolean NOT NULL DEFAULT false;
ALTER TABLE public.movement_events ADD COLUMN IF NOT EXISTS allow_video_link boolean NOT NULL DEFAULT false;
ALTER TABLE public.movement_events ADD COLUMN IF NOT EXISTS max_images integer NOT NULL DEFAULT 5;
ALTER TABLE public.movement_events ADD COLUMN IF NOT EXISTS instructions text;

CREATE TABLE IF NOT EXISTS public.movement_class_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.movement_events(id) ON DELETE CASCADE,
 class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
 teacher_id uuid NOT NULL REFERENCES auth.users(id),
 notes text,
 video_url text,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','needs_revision')),
 submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_id,class_id),
 CONSTRAINT movement_video_url_safe CHECK (video_url IS NULL OR (length(video_url)<=1500 AND video_url ~* '^https://'))
);
CREATE TABLE IF NOT EXISTS public.movement_submission_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 submission_id uuid NOT NULL REFERENCES public.movement_class_submissions(id) ON DELETE CASCADE,
 storage_path text NOT NULL UNIQUE,
 file_type text NOT NULL CHECK(file_type IN ('image','audio')),
 original_name text NOT NULL,
 size_bytes bigint NOT NULL CHECK(size_bytes>0 AND size_bytes<=20971520),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movement_submissions_event ON public.movement_class_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_movement_files_submission ON public.movement_submission_files(submission_id);

CREATE OR REPLACE FUNCTION public.movement_is_manager() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.has_any_app_role((SELECT auth.uid()),ARRAY['SUPER_ADMIN','PRINCIPAL','CONTENT_EDITOR']::text[]);
$$;
CREATE OR REPLACE FUNCTION public.movement_can_submit(p_event uuid,p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND public.is_homeroom_teacher((SELECT auth.uid()),p_class)
 AND EXISTS(SELECT 1 FROM public.movement_events e JOIN public.movement_campaigns c ON c.id=e.campaign_id

 WHERE e.id=p_event AND e.submission_enabled=true AND (e.submission_deadline IS NULL OR now()<=e.submission_deadline)
 AND c.is_published=true AND c.status NOT IN ('draft','archived')
);
$$;
ALTER TABLE public.movement_class_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_submission_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS movement_submit_read ON public.movement_class_submissions;
CREATE POLICY movement_submit_read ON public.movement_class_submissions FOR SELECT TO authenticated
 USING (public.movement_is_manager() OR (teacher_id=(SELECT auth.uid()) AND public.is_homeroom_teacher((SELECT auth.uid()),class_id)));
DROP POLICY IF EXISTS movement_submit_insert ON public.movement_class_submissions;
CREATE POLICY movement_submit_insert ON public.movement_class_submissions FOR INSERT TO authenticated
 WITH CHECK(teacher_id=(SELECT auth.uid()) AND public.movement_can_submit(event_id,class_id) AND status IN ('draft','submitted'));
DROP POLICY IF EXISTS movement_submit_update ON public.movement_class_submissions;
CREATE POLICY movement_submit_update ON public.movement_class_submissions FOR UPDATE TO authenticated
 USING(public.movement_is_manager() OR (teacher_id=(SELECT auth.uid()) AND public.is_homeroom_teacher((SELECT auth.uid()),class_id)))
 WITH CHECK(public.movement_is_manager() OR (teacher_id=(SELECT auth.uid()) AND public.movement_can_submit(event_id,class_id) AND status IN ('draft','submitted')));
DROP POLICY IF EXISTS movement_files_read ON public.movement_submission_files;
CREATE POLICY movement_files_read ON public.movement_submission_files FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.movement_class_submissions s WHERE s.id=submission_id
 AND (public.movement_is_manager() OR (s.teacher_id=(SELECT auth.uid()) AND public.is_homeroom_teacher((SELECT auth.uid()),s.class_id)))));
DROP POLICY IF EXISTS movement_files_insert ON public.movement_submission_files;
CREATE POLICY movement_files_insert ON public.movement_submission_files FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.movement_class_submissions s WHERE s.id=submission_id
 AND s.teacher_id=(SELECT auth.uid()) AND public.movement_can_submit(s.event_id,s.class_id)
 AND storage_path LIKE 'submissions/'||(SELECT auth.uid())::text||'/'||s.id::text||'/%'));
DROP POLICY IF EXISTS movement_files_delete ON public.movement_submission_files;
CREATE POLICY movement_files_delete ON public.movement_submission_files FOR DELETE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.movement_class_submissions s WHERE s.id=submission_id AND
 (public.movement_is_manager() OR (s.teacher_id=(SELECT auth.uid()) AND public.movement_can_submit(s.event_id,s.class_id)))));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('movement-submissions','movement-submissions',false,20971520,ARRAY['image/jpeg','image/png','image/webp','audio/mpeg'])
ON CONFLICT(id) DO NOTHING;
DROP POLICY IF EXISTS movement_private_upload ON storage.objects;
CREATE POLICY movement_private_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='movement-submissions' AND (storage.foldername(name))[1]='submissions'
 AND (storage.foldername(name))[2]=(SELECT auth.uid())::text AND EXISTS(
 SELECT 1 FROM public.movement_class_submissions s
 WHERE s.id::text=(storage.foldername(name))[3] AND s.teacher_id=(SELECT auth.uid())
 AND public.movement_can_submit(s.event_id,s.class_id)));
DROP POLICY IF EXISTS movement_private_select ON storage.objects;
CREATE POLICY movement_private_select ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='movement-submissions' AND EXISTS(
 SELECT 1 FROM public.movement_submission_files f JOIN public.movement_class_submissions s ON s.id=f.submission_id
 WHERE f.storage_path=name AND (public.movement_is_manager() OR (s.teacher_id=(SELECT auth.uid())
 AND public.is_homeroom_teacher((SELECT auth.uid()),s.class_id)))));
DROP POLICY IF EXISTS movement_private_delete ON storage.objects;
CREATE POLICY movement_private_delete ON storage.objects FOR DELETE TO authenticated USING (
 bucket_id='movement-submissions' AND (storage.foldername(name))[2]=(SELECT auth.uid())::text);

-- Do not open student submissions to anonymous users. Audit/public albums remain separate.
GRANT SELECT,INSERT,UPDATE ON public.movement_class_submissions TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.movement_submission_files TO authenticated;
GRANT EXECUTE ON FUNCTION public.movement_can_submit(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.movement_is_manager() TO authenticated;
NOTIFY pgrst, 'reload schema';
