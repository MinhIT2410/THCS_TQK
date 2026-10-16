-- 2026-10-16: Cached actual class enrollment for fast reporting.
-- Run once in Supabase SQL Editor BEFORE deploying the frontend patch.
-- Does not alter student enrollments or expected_capacity.

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS actual_enrollment integer NOT NULL DEFAULT 0;

-- Initial snapshot: count distinct students belonging to the same class AND year.
UPDATE public.classes AS c
SET actual_enrollment = (
  SELECT count(DISTINCT se.student_id)::integer
  FROM public.student_enrollments AS se
  WHERE se.class_id = c.id
    AND se.academic_year_id = c.academic_year_id
);

-- Updates the cached count whenever a student is assigned, transferred or removed.
-- Locks class IDs in deterministic order to avoid inconsistent concurrent transfers.
CREATE OR REPLACE FUNCTION public.refresh_class_actual_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_class_id uuid;
BEGIN
  FOR v_class_id IN
    SELECT DISTINCT id FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.class_id ELSE NULL END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.class_id ELSE NULL END
    ]) AS id
    WHERE id IS NOT NULL
    ORDER BY id
  LOOP
    -- Separate statement ensures a fresh READ COMMITTED snapshot after waiting.
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_class_id::text, 0));
    UPDATE public.classes AS c
    SET actual_enrollment = (
      SELECT count(DISTINCT se.student_id)::integer
      FROM public.student_enrollments AS se
      WHERE se.class_id = c.id
        AND se.academic_year_id = c.academic_year_id
    )
    WHERE c.id = v_class_id;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_class_actual_enrollment ON public.student_enrollments;
CREATE TRIGGER trg_refresh_class_actual_enrollment
AFTER INSERT OR DELETE OR UPDATE OF class_id, student_id, academic_year_id
ON public.student_enrollments
FOR EACH ROW EXECUTE FUNCTION public.refresh_class_actual_enrollment();

-- Also recalculate if a class's academic year is corrected.
CREATE OR REPLACE FUNCTION public.refresh_class_actual_enrollment_on_year_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.classes AS c
  SET actual_enrollment = (
    SELECT count(DISTINCT se.student_id)::integer
    FROM public.student_enrollments AS se
    WHERE se.class_id = c.id
      AND se.academic_year_id = c.academic_year_id
  )
  WHERE c.id = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_class_actual_enrollment_on_year ON public.classes;
CREATE TRIGGER trg_refresh_class_actual_enrollment_on_year
AFTER UPDATE OF academic_year_id ON public.classes
FOR EACH ROW
WHEN (OLD.academic_year_id IS DISTINCT FROM NEW.academic_year_id)
EXECUTE FUNCTION public.refresh_class_actual_enrollment_on_year_change();

-- Verification (read-only):
-- SELECT name, actual_enrollment FROM public.classes
-- WHERE academic_year_id = (SELECT id FROM public.academic_years WHERE name = '2026-2027' LIMIT 1)
-- ORDER BY grade_level, name;
