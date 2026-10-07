BEGIN;

-- ============================================================================
-- Migration 087
-- Fix: GVCN can see the incident row for their homeroom class, but the nested
-- profiles relation can still be hidden by profiles RLS. The frontend then
-- receives student = null and incorrectly renders "Tập thể lớp".
--
-- Keep the existing competition access model. Only extend profile visibility
-- for profiles that are actually related to an incident in the caller's active
-- homeroom class for the same academic year.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_competition_related_profile(
  p_user_id uuid,
  p_profile_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL OR p_profile_id IS NULL THEN
    RETURN false;
  END IF;

  -- SECURITY DEFINER guard: callers may only ask about their own access.
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  -- Preserve the existing competition visibility rule (admin/competition
  -- actors/student/recorder/etc.).
  IF EXISTS (
    SELECT 1
    FROM public.competition_incidents ci
    WHERE (ci.student_id = p_profile_id OR ci.recorded_by = p_profile_id OR ci.approved_by = p_profile_id)
      AND public.can_view_competition_incident(p_user_id, ci.id) = true
  ) THEN
    RETURN true;
  END IF;

  -- GVCN report scope:
  -- A homeroom teacher may resolve the student/recorder/approver profile only
  -- when that profile belongs to an incident of the teacher's own class and
  -- the assignment is for the incident program's academic year.
  RETURN EXISTS (
    SELECT 1
    FROM public.competition_incidents ci
    JOIN public.competition_programs cp
      ON cp.id = ci.program_id
    JOIN public.homeroom_assignments ha
      ON ha.class_id = ci.unit_id
     AND ha.academic_year_id = cp.academic_year_id
    WHERE ha.teacher_id = p_user_id
      AND COALESCE(ha.is_active, true) = true
      AND (ha.start_date IS NULL OR ha.start_date <= ci.occurred_at::date)
      AND (ha.end_date IS NULL OR ha.end_date >= ci.occurred_at::date)
      AND (
        ci.student_id = p_profile_id
        OR ci.recorded_by = p_profile_id
        OR ci.approved_by = p_profile_id
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_view_competition_related_profile(uuid, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_view_competition_related_profile(uuid, uuid)
TO authenticated;

-- Recreate only the targeted SELECT policy. Other profile policies remain intact.
DROP POLICY IF EXISTS
"Users can read profiles of accessible competition incidents"
ON public.profiles;

CREATE POLICY
"Users can read profiles of accessible competition incidents"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_competition_related_profile(auth.uid(), id)
  );

COMMIT;
