-- Read-only metadata checks; run after 090. Does not test JWT/RLS as a real client.
SELECT tablename,policyname,roles,cmd,qual
FROM pg_policies WHERE schemaname='public'
AND tablename IN ('competition_incidents','competition_incident_evidence')
ORDER BY tablename,policyname;

SELECT p.oid::regprocedure AS function_signature,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
 ('can_lookup_competition_student','can_view_competition_incident',
 'search_competition_students','get_student_current_unit',
 'submit_competition_review_request','complete_flag_ceremony')
ORDER BY p.oid::regprocedure::text;
-- Expected: internal can_lookup false/false; old complete() false/false;
-- new complete(timestamp,timestamp) false/true; remaining listed RPCs false/true.

SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('competition_incidents','competition_incident_evidence');
-- Expected: both true.

SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets
WHERE id IN ('school-media','school-document') ORDER BY id;
-- Expected: original public/MIME/size configuration unchanged.
