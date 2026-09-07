-- 074_reset_student_accounts.sql
-- Prepare a destructive reset of STUDENT-only accounts.
-- This removes application data that would block auth-user deletion, but does NOT
-- delete auth.users itself. The admin-reset-students Edge Function performs the
-- actual Auth deletion in small batches after this RPC succeeds.

CREATE OR REPLACE FUNCTION public.prepare_full_student_account_reset()
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_added integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_app_role(auth.uid(), 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Chỉ SUPER_ADMIN được phép reset toàn bộ tài khoản học sinh.'
      USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE tmp_reset_students (
    user_id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  -- Safety rule: only accounts whose global role set is STUDENT-only are reset.
  -- Any account that also owns another global role is deliberately skipped.
  INSERT INTO tmp_reset_students(user_id)
  SELECT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role_code = 'STUDENT'
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur2
      WHERE ur2.user_id = ur.user_id
        AND ur2.role_code <> 'STUDENT'
    );

  CREATE TEMP TABLE tmp_reset_incidents (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_reset_incidents(id)
  SELECT ci.id
  FROM public.competition_incidents ci
  WHERE ci.student_id IN (SELECT s.user_id FROM tmp_reset_students s)
     OR ci.recorded_by IN (SELECT s.user_id FROM tmp_reset_students s)
     OR ci.approved_by IN (SELECT s.user_id FROM tmp_reset_students s)
     OR ci.rejected_by IN (SELECT s.user_id FROM tmp_reset_students s);

  CREATE TEMP TABLE tmp_reset_adjustments (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_reset_adjustments(id)
  SELECT a.id
  FROM public.competition_week_adjustments a
  WHERE a.requested_by IN (SELECT s.user_id FROM tmp_reset_students s);

  CREATE TEMP TABLE tmp_reset_redemptions (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_reset_redemptions(id)
  SELECT r.id
  FROM public.reward_redemptions r
  WHERE r.student_id IN (SELECT s.user_id FROM tmp_reset_students s);

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

  -- Include reversal rows that reference transactions being removed.
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

  -- Delete in FK-safe order.
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

  -- Remaining student-only rows such as enrollments, role rows, actor assignments,
  -- and public student snapshots are removed automatically when auth.users is
  -- deleted because profiles.id uses ON DELETE CASCADE and those tables cascade.

  RETURN QUERY
  SELECT s.user_id
  FROM tmp_reset_students s
  ORDER BY s.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_full_student_account_reset() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_full_student_account_reset() TO authenticated;

COMMENT ON FUNCTION public.prepare_full_student_account_reset() IS
'Prepares a full reset of STUDENT-only accounts by purging student-linked competition/reward data that uses restrictive foreign keys. Auth users are deleted separately by admin-reset-students.';
