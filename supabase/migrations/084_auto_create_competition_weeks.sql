BEGIN;

-- 084_auto_create_competition_weeks.sql
-- Tự động mở tuần thi đua Thứ Hai -> Chủ Nhật cho năm học hiện hành.

ALTER TABLE public.competition_auto_publish_configs
  ADD COLUMN IF NOT EXISTS auto_create_weeks_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_week_created_at timestamptz NULL;

CREATE OR REPLACE FUNCTION public.get_competition_auto_week_config(p_academic_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_config record;
  v_next_monday date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_config
  FROM public.competition_auto_publish_configs
  WHERE academic_year_id = p_academic_year_id;

  v_next_monday := (timezone('Asia/Ho_Chi_Minh', now())::date
                    + ((8 - extract(isodow from timezone('Asia/Ho_Chi_Minh', now()))::int) % 7))::date;
  IF v_next_monday = timezone('Asia/Ho_Chi_Minh', now())::date THEN
    v_next_monday := v_next_monday + 7;
  END IF;

  RETURN jsonb_build_object(
    'academic_year_id', p_academic_year_id,
    'is_enabled', COALESCE(v_config.auto_create_weeks_enabled, false),
    'last_week_created_at', v_config.last_week_created_at,
    'next_week_starts_on', v_next_monday,
    'next_week_ends_on', v_next_monday + 6
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_auto_create_competition_weeks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cfg record;
  v_program_id uuid;
  v_today date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_monday date;
  v_sunday date;
  v_week_number integer;
  v_week_id uuid;
  v_created integer := 0;
BEGIN
  v_monday := v_today - (extract(isodow from v_today)::int - 1);
  v_sunday := v_monday + 6;

  FOR v_cfg IN
    SELECT c.academic_year_id
    FROM public.competition_auto_publish_configs c
    JOIN public.academic_years ay ON ay.id = c.academic_year_id
    WHERE c.auto_create_weeks_enabled = true
      AND ay.is_current = true
      AND v_monday >= ay.start_date
      AND v_monday <= ay.end_date
  LOOP
    SELECT p.id INTO v_program_id
    FROM public.competition_programs p
    WHERE p.academic_year_id = v_cfg.academic_year_id
      AND p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF v_program_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Nếu admin đã tạo tuần chồng lên khoảng Thứ Hai -> Chủ Nhật này thì bỏ qua,
    -- tuyệt đối không tạo thêm một tuần trùng/chồng ngày.
    IF EXISTS (
      SELECT 1
      FROM public.competition_weeks w
      WHERE w.program_id = v_program_id
        AND w.academic_year_id = v_cfg.academic_year_id
        AND w.status <> 'ARCHIVED'
        AND w.starts_on <= v_sunday
        AND w.ends_on >= v_monday
    ) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(w.week_number), 0) + 1
      INTO v_week_number
    FROM public.competition_weeks w
    WHERE w.program_id = v_program_id
      AND w.academic_year_id = v_cfg.academic_year_id;

    INSERT INTO public.competition_weeks (
      program_id, academic_year_id, week_number, name,
      starts_on, ends_on, status, default_starting_points,
      opened_by, opened_at
    ) VALUES (
      v_program_id, v_cfg.academic_year_id, v_week_number, 'Tuần ' || v_week_number,
      v_monday, v_sunday, 'OPEN', 100,
      NULL, now()
    )
    RETURNING id INTO v_week_id;

    INSERT INTO public.competition_week_units (week_id, unit_id, starting_points, status)
    SELECT v_week_id, c.id, 100, 'ACTIVE'
    FROM public.classes c
    WHERE c.academic_year_id = v_cfg.academic_year_id
      AND c.is_active = true
    ON CONFLICT (week_id, unit_id) DO NOTHING;

    UPDATE public.competition_auto_publish_configs
    SET last_week_created_at = now(), updated_at = now()
    WHERE academic_year_id = v_cfg.academic_year_id;

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_competition_auto_week_config(
  p_academic_year_id uuid,
  p_is_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_created integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_competition_permission(v_user_id, 'COMPETITION_MANAGE') THEN
    RAISE EXCEPTION 'Bạn không có quyền quản lý cấu hình thi đua.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.competition_auto_publish_configs (
    academic_year_id, auto_create_weeks_enabled, updated_by, updated_at
  ) VALUES (
    p_academic_year_id, COALESCE(p_is_enabled, false), v_user_id, now()
  )
  ON CONFLICT (academic_year_id) DO UPDATE SET
    auto_create_weeks_enabled = EXCLUDED.auto_create_weeks_enabled,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  -- Khi vừa bật, tạo ngay tuần hiện tại nếu chưa có; không phải chờ cron.
  IF COALESCE(p_is_enabled, false) THEN
    v_created := public.process_auto_create_competition_weeks();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_is_enabled
      THEN 'Đã bật tự động tạo tuần thi đua.'
      ELSE 'Đã tắt tự động tạo tuần thi đua.' END,
    'created_now', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_auto_create_competition_weeks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_competition_auto_week_config(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_competition_auto_week_config(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_competition_auto_week_config(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_competition_auto_week_config(uuid, boolean) TO authenticated;

-- Chạy mỗi giờ, độc lập với việc có mở website hay không.
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'competition-auto-create-week-hourly' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;
SELECT cron.schedule(
  'competition-auto-create-week-hourly',
  '5 * * * *',
  'select public.process_auto_create_competition_weeks();'
);

COMMIT;
