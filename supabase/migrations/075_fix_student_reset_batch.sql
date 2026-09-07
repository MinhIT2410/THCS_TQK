-- 075_fix_student_reset_batch.sql
-- Fix reset flow so STUDENT-only accounts are prepared in bounded batches instead
-- of returning a result set that PostgREST truncates at 1000 rows.

CREATE OR REPLACE FUNCTION public.count_resettable_student_accounts()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR NOT public.has_app_role(auth.uid(), 'SUPER_ADMIN') THEN
      (SELECT 0)::integer
    ELSE
      (
        SELECT COUNT(*)::integer
        FROM public.user_roles ur
        WHERE ur.role_code = 'STUDENT'
          AND NOT EXISTS (
            SELECT 1
            FROM public.user_roles ur2
            WHERE ur2.user_id = ur.user_id
              AND ur2.role_code <> 'STUDENT'
          )
      )
  END;
$$;

REVOKE ALL ON FUNCTION public.count_resettable_student_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_resettable_student_accounts() TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_student_account_reset_batch(
  p_limit integer DEFAULT 500
)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit integer;
  v_added integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_app_role(auth.uid(), 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Chỉ SUPER_ADMIN được phép reset toàn bộ tài khoản học sinh.'
      USING ERRCODE = '42501';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 500);

  CREATE TEMP TABLE tmp_reset_students (
    user_id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  -- Only prepare one bounded batch. Accounts with any non-STUDENT role are protected.
  INSERT INTO tmp_reset_students(user_id)
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role_code = 'STUDENT'
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur2
      WHERE ur2.user_id = ur.user_id
        AND ur2.role_code <> 'STUDENT'
    )
  ORDER BY ur.user_id
  LIMIT v_limit;

  IF NOT EXISTS (SELECT 1 FROM tmp_reset_students) THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_reset_incidents (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_reset_incidents(id)
  SELECT ci.id
  FROM public.competition_incidents ci
  WHERE ci.student_id IN (SELECT s.user_id FROM tmp_reset_students s)
     OR ci.recorded_by IN (SELECT s.user_id FROM tmp_reset_students s)
     OR ci.approved_by IN (SELECT s.user_id FROM tmp_reset_students s)
     OR ci.rejected_by IN (SELECT s.user_id FROM tmp_reset_students s)
  ON CONFLICT DO NOTHING;

  CREATE TEMP TABLE tmp_reset_adjustments (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_reset_adjustments(id)
  SELECT a.id
  FROM public.competition_week_adjustments a
  WHERE a.requested_by IN (SELECT s.user_id FROM tmp_reset_students s)
  ON CONFLICT DO NOTHING;

  CREATE TEMP TABLE tmp_reset_redemptions (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_reset_redemptions(id)
  SELECT r.id
  FROM public.reward_redemptions r
  WHERE r.student_id IN (SELECT s.user_id FROM tmp_reset_students s)
  ON CONFLICT DO NOTHING;

  CREATE TEMP TABLE tmp_reset_transactions (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_reset_transactions(id)
  SELECT t.id
  FROM public.competition_point_transactions t
  WHERE t.student_id IN (SELECT s.user_id FROM tmp_reset_students s)
     OR t.created_by IN (SELECT s.user_id FROM tmp_reset_students s)
     OR t.incident_id IN (SELECT i.id FROM tmp_reset_incidents i)
     OR t.adjustment_id IN (SELECT a.id FROM tmp_reset_adjustments a)
     OR t.redemption_id IN (SELECT r.id FROM tmp_reset_redemptions r)
  ON CONFLICT DO NOTHING;

  -- Include reversal chains that reference transactions in this reset batch.
  LOOP
    INSERT INTO tmp_reset_transactions(id)
    SELECT t.id
    FROM public.competition_point_transactions t
    WHERE t.reversed_transaction_id IN (
      SELECT x.id FROM tmp_reset_transactions x
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_added = ROW_COUNT;
    EXIT WHEN v_added = 0;
  END LOOP;

  DELETE FROM public.competition_review_requests rr
  WHERE rr.student_id IN (SELECT s.user_id FROM tmp_reset_students s)
     OR rr.incident_id IN (SELECT i.id FROM tmp_reset_incidents i)
     OR rr.transaction_id IN (SELECT t.id FROM tmp_reset_transactions t);

  DELETE FROM public.competition_point_transactions t
  WHERE t.id IN (SELECT x.id FROM tmp_reset_transactions x);

  DELETE FROM public.reward_redemptions r
  WHERE r.id IN (SELECT x.id FROM tmp_reset_redemptions x);

  DELETE FROM public.competition_week_adjustments a
  WHERE a.id IN (SELECT x.id FROM tmp_reset_adjustments x);

  DELETE FROM public.competition_incidents ci
  WHERE ci.id IN (SELECT x.id FROM tmp_reset_incidents x);

  RETURN QUERY
  SELECT s.user_id
  FROM tmp_reset_students s
  ORDER BY s.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_student_account_reset_batch(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_student_account_reset_batch(integer) TO authenticated;

COMMENT ON FUNCTION public.prepare_student_account_reset_batch(integer) IS
'Prepares at most 500 STUDENT-only accounts per call for destructive reset. Auth deletion is performed separately by admin-reset-students.';
