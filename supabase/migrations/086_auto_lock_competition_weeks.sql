BEGIN;

-- 086_auto_lock_competition_weeks.sql
-- Tự động khóa các tuần thi đua đã kết thúc theo thứ + giờ cấu hình.
-- Manual unlock vẫn hoạt động; sau khi mở khóa thủ công, tuần sẽ không bị khóa lại
-- cho tới lịch auto-lock kế tiếp nhờ last_auto_lock_run_at theo từng slot tuần.

ALTER TABLE public.competition_auto_publish_configs
  ADD COLUMN IF NOT EXISTS auto_lock_weeks_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_lock_isodow smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_lock_time text NOT NULL DEFAULT '00:05',
  ADD COLUMN IF NOT EXISTS last_auto_lock_run_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_week_locked_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competition_auto_publish_configs_auto_lock_isodow_check'
  ) THEN
    ALTER TABLE public.competition_auto_publish_configs
      ADD CONSTRAINT competition_auto_publish_configs_auto_lock_isodow_check
      CHECK (auto_lock_isodow BETWEEN 1 AND 7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'competition_auto_publish_configs_auto_lock_time_check'
  ) THEN
    ALTER TABLE public.competition_auto_publish_configs
      ADD CONSTRAINT competition_auto_publish_configs_auto_lock_time_check
      CHECK (auto_lock_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.calculate_next_auto_lock_at(
  p_isodow integer,
  p_lock_time text
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_vn timestamp := timezone('Asia/Ho_Chi_Minh', now());
  v_today date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_current_isodow integer := extract(isodow from timezone('Asia/Ho_Chi_Minh', now()))::integer;
  v_days_ahead integer;
  v_target_local timestamp;
BEGIN
  IF p_isodow IS NULL OR p_isodow < 1 OR p_isodow > 7 THEN
    RETURN NULL;
  END IF;
  IF p_lock_time IS NULL OR p_lock_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RETURN NULL;
  END IF;

  v_days_ahead := (p_isodow - v_current_isodow + 7) % 7;
  v_target_local := ((v_today + v_days_ahead)::text || ' ' || p_lock_time || ':00')::timestamp;

  IF v_target_local <= v_now_vn THEN
    v_target_local := v_target_local + interval '7 days';
  END IF;

  RETURN timezone('Asia/Ho_Chi_Minh', v_target_local);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_competition_auto_lock_config(p_academic_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_config record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_config
  FROM public.competition_auto_publish_configs
  WHERE academic_year_id = p_academic_year_id;

  RETURN jsonb_build_object(
    'academic_year_id', p_academic_year_id,
    'is_enabled', COALESCE(v_config.auto_lock_weeks_enabled, false),
    'lock_isodow', COALESCE(v_config.auto_lock_isodow, 1),
    'lock_time', COALESCE(v_config.auto_lock_time, '00:05'),
    'last_auto_lock_run_at', v_config.last_auto_lock_run_at,
    'last_week_locked_at', v_config.last_week_locked_at,
    'next_lock_at', CASE
      WHEN COALESCE(v_config.auto_lock_weeks_enabled, false)
      THEN public.calculate_next_auto_lock_at(
        COALESCE(v_config.auto_lock_isodow, 1),
        COALESCE(v_config.auto_lock_time, '00:05')
      )
      ELSE NULL
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_auto_lock_competition_weeks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cfg record;
  v_now_vn timestamp := timezone('Asia/Ho_Chi_Minh', now());
  v_today date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_current_isodow integer := extract(isodow from timezone('Asia/Ho_Chi_Minh', now()))::integer;
  v_days_since integer;
  v_slot_date date;
  v_slot_local timestamp;
  v_slot_at timestamptz;
  v_locked_this integer;
  v_locked_total integer := 0;
BEGIN
  FOR v_cfg IN
    SELECT c.*
    FROM public.competition_auto_publish_configs c
    JOIN public.academic_years ay ON ay.id = c.academic_year_id
    WHERE c.auto_lock_weeks_enabled = true
      AND ay.is_current = true
  LOOP
    -- Tìm slot lịch gần nhất đã đến (ví dụ Thứ Hai 00:05 gần nhất).
    -- Nhờ vậy nếu cron bị trễ/offline, lần chạy sau vẫn bắt kịp.
    v_days_since := (v_current_isodow - v_cfg.auto_lock_isodow + 7) % 7;
    v_slot_date := v_today - v_days_since;
    v_slot_local := (v_slot_date::text || ' ' || v_cfg.auto_lock_time || ':00')::timestamp;

    IF v_slot_local > v_now_vn THEN
      v_slot_date := v_slot_date - 7;
      v_slot_local := v_slot_local - interval '7 days';
    END IF;

    v_slot_at := timezone('Asia/Ho_Chi_Minh', v_slot_local);

    -- Mỗi slot chỉ xử lý đúng 1 lần. Vì vậy admin mở khóa thủ công sau slot
    -- sẽ không bị cron khóa lại ngay; lần tự khóa tiếp theo là slot tuần kế tiếp.
    IF v_cfg.last_auto_lock_run_at IS NOT NULL
       AND v_cfg.last_auto_lock_run_at >= v_slot_at THEN
      CONTINUE;
    END IF;

    UPDATE public.competition_weeks w
    SET status = 'LOCKED',
        locked_by = NULL,
        locked_at = now(),
        updated_at = now()
    WHERE w.academic_year_id = v_cfg.academic_year_id
      AND w.status = 'OPEN'
      AND w.ends_on <= v_slot_date;

    GET DIAGNOSTICS v_locked_this = ROW_COUNT;

    -- Đánh dấu slot đã xử lý kể cả khi không có tuần đủ điều kiện.
    UPDATE public.competition_auto_publish_configs
    SET last_auto_lock_run_at = now(),
        last_week_locked_at = CASE WHEN v_locked_this > 0 THEN now() ELSE last_week_locked_at END,
        updated_at = now()
    WHERE academic_year_id = v_cfg.academic_year_id;

    -- Khóa tuần làm thay đổi trạng thái/nhận xét công khai, nên refresh snapshot ngay.
    IF v_locked_this > 0 THEN
      PERFORM public.publish_snapshots_for_academic_year(v_cfg.academic_year_id);
      v_locked_total := v_locked_total + v_locked_this;
    END IF;
  END LOOP;

  RETURN v_locked_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_competition_auto_lock_config(
  p_academic_year_id uuid,
  p_is_enabled boolean,
  p_lock_isodow integer,
  p_lock_time text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_locked integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_competition_permission(v_user_id, 'COMPETITION_MANAGE') THEN
    RAISE EXCEPTION 'Bạn không có quyền quản lý cấu hình thi đua.' USING ERRCODE = '42501';
  END IF;

  IF p_lock_isodow IS NULL OR p_lock_isodow < 1 OR p_lock_isodow > 7 THEN
    RAISE EXCEPTION 'Thứ tự động khóa không hợp lệ.' USING ERRCODE = '22023';
  END IF;

  IF p_lock_time IS NULL OR p_lock_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'Giờ tự động khóa không hợp lệ.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.competition_auto_publish_configs AS existing (
    academic_year_id,
    auto_lock_weeks_enabled,
    auto_lock_isodow,
    auto_lock_time,
    updated_by,
    updated_at
  ) VALUES (
    p_academic_year_id,
    COALESCE(p_is_enabled, false),
    p_lock_isodow,
    p_lock_time,
    v_user_id,
    now()
  )
  ON CONFLICT (academic_year_id) DO UPDATE SET
    auto_lock_weeks_enabled = EXCLUDED.auto_lock_weeks_enabled,
    auto_lock_isodow = EXCLUDED.auto_lock_isodow,
    auto_lock_time = EXCLUDED.auto_lock_time,
    -- Khi đổi lịch, cho phép slot mới gần nhất được đánh giá lại một lần.
    last_auto_lock_run_at = CASE
      WHEN existing.auto_lock_isodow IS DISTINCT FROM EXCLUDED.auto_lock_isodow
        OR existing.auto_lock_time IS DISTINCT FROM EXCLUDED.auto_lock_time
        OR existing.auto_lock_weeks_enabled IS DISTINCT FROM EXCLUDED.auto_lock_weeks_enabled
      THEN NULL
      ELSE existing.last_auto_lock_run_at
    END,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  IF COALESCE(p_is_enabled, false) THEN
    v_locked := public.process_auto_lock_competition_weeks();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_is_enabled
      THEN 'Đã bật tự động khóa tuần thi đua.'
      ELSE 'Đã tắt tự động khóa tuần thi đua.' END,
    'locked_now', v_locked
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_next_auto_lock_at(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_auto_lock_competition_weeks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_competition_auto_lock_config(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_competition_auto_lock_config(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_competition_auto_lock_config(uuid, boolean, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_competition_auto_lock_config(uuid, boolean, integer, text) TO authenticated;

-- Chạy mỗi phút để bám đúng giờ đã chọn. Function có slot guard nên mỗi lịch tuần chỉ xử lý 1 lần.
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'competition-auto-lock-minute' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'competition-auto-lock-minute',
  '* * * * *',
  'select public.process_auto_lock_competition_weeks();'
);

-- Đồng thời đảm bảo tính năng tự động công bố 06:00/12:00/18:00 thực sự có scheduler.
-- Migration 066 tạo function nhưng bản code hiện tại không tạo cron gọi function này.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'competition-auto-publish-minute' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'competition-auto-publish-minute',
  '* * * * *',
  'select public.process_auto_publish_schedules();'
);

COMMIT;
