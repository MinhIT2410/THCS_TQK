BEGIN;

-- GVCN-safe resolver for names attached to competition incidents.
-- This does NOT broaden SELECT on public.profiles. It only returns people for
-- incidents whose class is actively assigned to the authenticated caller as
-- homeroom teacher in the same academic year as the competition program.
CREATE OR REPLACE FUNCTION public.get_homeroom_competition_incident_people(
  p_incident_ids uuid[]
)
RETURNS TABLE (
  incident_id uuid,
  student_name text,
  student_code text,
  recorder_name text,
  approver_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    ci.id AS incident_id,
    student.full_name AS student_name,
    student.student_code AS student_code,
    recorder.full_name AS recorder_name,
    approver.full_name AS approver_name
  FROM public.competition_incidents ci
  JOIN public.competition_programs cp
    ON cp.id = ci.program_id
  JOIN public.homeroom_assignments ha
    ON ha.class_id = ci.unit_id
   AND ha.academic_year_id = cp.academic_year_id
  LEFT JOIN public.profiles student
    ON student.id = ci.student_id
  LEFT JOIN public.profiles recorder
    ON recorder.id = ci.recorded_by
  LEFT JOIN public.profiles approver
    ON approver.id = ci.approved_by
  WHERE auth.uid() IS NOT NULL
    AND ci.id = ANY(COALESCE(p_incident_ids, ARRAY[]::uuid[]))
    AND ha.teacher_id = auth.uid()
    AND COALESCE(ha.is_active, true) = true
    AND (ha.start_date IS NULL OR ha.start_date <= ci.occurred_at::date)
    AND (ha.end_date IS NULL OR ha.end_date >= ci.occurred_at::date);
$$;

REVOKE ALL ON FUNCTION public.get_homeroom_competition_incident_people(uuid[])
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_homeroom_competition_incident_people(uuid[])
TO authenticated;

COMMIT;
