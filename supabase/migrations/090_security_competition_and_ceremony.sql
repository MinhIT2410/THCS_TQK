-- 090: Five verified authorization fixes. Based on live DB definitions supplied 2026-10-09.
-- Does not modify buckets, MIME limits, passwords, points or scheduled jobs.
BEGIN;

-- Internal predicate shared by the two lookup RPCs; not callable via Data API.
CREATE OR REPLACE FUNCTION public.can_lookup_competition_student(
 p_user_id uuid, p_student_id uuid, p_class_id uuid, p_academic_year_id uuid
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
 IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid()
 OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user_id AND is_active=true) THEN RETURN false; END IF;
 -- Preserve live permissions, including current full-school supervisor access.
 IF COALESCE(public.can_view_student_competition_profile(p_user_id,p_student_id),false) THEN RETURN true; END IF;
 IF EXISTS (SELECT 1 FROM public.homeroom_assignments ha
  WHERE ha.teacher_id=p_user_id AND ha.class_id=p_class_id AND ha.academic_year_id=p_academic_year_id
  AND COALESCE(ha.is_active,true) AND (ha.start_date IS NULL OR ha.start_date<=CURRENT_DATE)
  AND (ha.end_date IS NULL OR ha.end_date>=CURRENT_DATE)) THEN RETURN true; END IF;
 RETURN EXISTS (SELECT 1 FROM public.competition_actor_assignments ca
  JOIN public.classes c ON c.id=p_class_id
  WHERE ca.user_id=p_user_id AND ca.academic_year_id=p_academic_year_id
  AND ca.assignment_type IN ('RED_STAR','LIEN_DOI_COMMAND') AND ca.can_record_incident=true
  AND ca.is_active=true AND ca.start_date<=CURRENT_DATE AND (ca.end_date IS NULL OR ca.end_date>=CURRENT_DATE)
  AND ((ca.assigned_class_id IS NULL AND ca.assigned_grade_level_id IS NULL)
   OR ca.assigned_class_id=p_class_id OR ca.assigned_grade_level_id=c.grade_level_id));
END; $$;
REVOKE ALL ON FUNCTION public.can_lookup_competition_student(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.can_view_competition_incident(p_user_id uuid, p_incident_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_incident record;
  v_rule record;
  v_has_sup_assignment boolean;
BEGIN
  IF p_user_id IS NULL OR p_incident_id IS NULL THEN
    RETURN false;
  END IF;

  -- Callers may only evaluate their own access; inactive accounts are denied.
  IF p_user_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_user_id AND is_active=true) THEN
    RETURN false;
  END IF;

  -- Quyền quản lý toàn cục
  IF public.has_competition_permission(
       p_user_id,
       'COMPETITION_RECORD'
     )
     OR public.has_competition_permission(
       p_user_id,
       'COMPETITION_APPROVE'
     )
     OR public.has_competition_permission(
       p_user_id,
       'COMPETITION_MANAGE'
     )
  THEN
    RETURN true;
  END IF;

  SELECT
    ci.*,
    cp.academic_year_id
  INTO v_incident
  FROM public.competition_incidents ci
  JOIN public.competition_programs cp
    ON cp.id = ci.program_id
  WHERE ci.id = p_incident_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Đội viên hoặc người ghi được xem sự việc của mình
  IF v_incident.student_id = p_user_id
     OR v_incident.recorded_by = p_user_id
  THEN
    RETURN true;
  END IF;

  -- Explicit homeroom access survives removal of the public APPROVED branch.
  IF EXISTS (SELECT 1 FROM public.homeroom_assignments ha
    WHERE ha.teacher_id=p_user_id AND ha.class_id=v_incident.unit_id
      AND ha.academic_year_id=v_incident.academic_year_id AND COALESCE(ha.is_active,true)
      AND (ha.start_date IS NULL OR ha.start_date<=v_incident.occurred_at::date)
      AND (ha.end_date IS NULL OR ha.end_date>=v_incident.occurred_at::date)) THEN
    RETURN true;
  END IF;

  -- Kiểm tra Giám thị đang hoạt động trong năm học của sự việc
  SELECT EXISTS (
    SELECT 1
    FROM public.competition_actor_assignments ca
    WHERE ca.user_id = p_user_id
      AND ca.assignment_type = 'SUPERVISOR'
      AND ca.is_active = true
      AND ca.can_record_incident = true
      AND ca.academic_year_id IS NOT DISTINCT FROM v_incident.academic_year_id
      AND ca.start_date <= CURRENT_DATE
      AND (
        ca.end_date IS NULL
        OR ca.end_date >= CURRENT_DATE
      )
  )
  INTO v_has_sup_assignment;

  -- Giám thị được xem toàn bộ sự việc ĐÃ DUYỆT
  -- để tra cứu hồ sơ thi đua Đội viên toàn trường.
  IF v_has_sup_assignment
     AND v_incident.status = 'APPROVED'
  THEN
    RETURN true;
  END IF;

  -- Với sự việc PENDING:
  -- chỉ cho Giám thị xem nếu rule thực sự cho SUPERVISOR duyệt.
  IF v_incident.status <> 'PENDING' THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_rule
  FROM public.competition_rules
  WHERE id = v_incident.rule_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT (
    'SUPERVISOR' = ANY(
      COALESCE(
        v_rule.allowed_approver_types,
        ARRAY[]::text[]
      )
    )
  ) THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.competition_actor_assignments ca
    WHERE ca.user_id = p_user_id
      AND ca.assignment_type = 'SUPERVISOR'
      AND ca.can_approve_red_star = true
      AND ca.is_active = true
      AND ca.academic_year_id IS NOT DISTINCT FROM v_incident.academic_year_id
      AND ca.start_date <= v_incident.occurred_at::date
      AND (
        ca.end_date IS NULL
        OR ca.end_date >= v_incident.occurred_at::date
      )
  )
  INTO v_has_sup_assignment;

  RETURN COALESCE(v_has_sup_assignment, false);
END;
$function$;
REVOKE ALL ON FUNCTION public.can_view_competition_incident(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_view_competition_incident(uuid,uuid) TO authenticated;

-- Separate anon policy: anonymous reads never evaluate the authenticated-only helper.
DROP POLICY IF EXISTS competition_incidents_select ON public.competition_incidents;
DROP POLICY IF EXISTS competition_incidents_public_good_deeds_select ON public.competition_incidents;
CREATE POLICY competition_incidents_public_good_deeds_select ON public.competition_incidents FOR SELECT TO anon
USING (status='APPROVED' AND EXISTS (SELECT 1 FROM public.competition_rules r WHERE r.id=rule_id AND r.category='GOOD_DEED'));
CREATE POLICY competition_incidents_select ON public.competition_incidents FOR SELECT TO authenticated
USING ((status='APPROVED' AND EXISTS (SELECT 1 FROM public.competition_rules r WHERE r.id=rule_id AND r.category='GOOD_DEED'))
 OR public.can_view_competition_incident(auth.uid(),id));

DROP POLICY IF EXISTS competition_incident_evidence_select ON public.competition_incident_evidence;
DROP POLICY IF EXISTS competition_evidence_public_good_deeds_select ON public.competition_incident_evidence;
CREATE POLICY competition_evidence_public_good_deeds_select ON public.competition_incident_evidence FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.competition_incidents ci JOIN public.competition_rules r ON r.id=ci.rule_id
 WHERE ci.id=incident_id AND ci.status='APPROVED' AND r.category='GOOD_DEED'));
CREATE POLICY competition_incident_evidence_select ON public.competition_incident_evidence FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.competition_incidents ci JOIN public.competition_rules r ON r.id=ci.rule_id
 WHERE ci.id=incident_id AND ci.status='APPROVED' AND r.category='GOOD_DEED')
 OR public.can_view_competition_incident(auth.uid(),incident_id));

CREATE OR REPLACE FUNCTION public.search_competition_students(p_search_term text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, full_name text, student_code text, avatar_url text, class_id uuid, class_name text, academic_year_id uuid, academic_year_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_search text := nullif(trim(p_search_term), '');
  v_norm_search text;
  v_limit integer := greatest(least(coalesce(p_limit, 20), 50), 1);
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles caller_profile WHERE caller_profile.id=auth.uid() AND caller_profile.is_active=true) THEN
    RAISE EXCEPTION 'Yêu cầu tài khoản đang hoạt động.' USING ERRCODE='42501';
  END IF;
  IF v_search IS NULL OR length(v_search) < 2 THEN
    RETURN;
  END IF;

  v_norm_search := '%' || unaccent(lower(v_search)) || '%';

  RETURN QUERY
  WITH current_year AS (
    SELECT ay.id, ay.name
    FROM public.academic_years ay
    WHERE ay.is_current = true
    LIMIT 1
  ),
  matching_students AS (
    SELECT DISTINCT ON (p.id)
      p.id,
      coalesce(p.full_name, 'Chưa đặt tên') AS full_name,
      p.student_code,
      p.avatar_url,
      se.class_id,
      c.name AS class_name,
      cy.id AS academic_year_id,
      cy.name AS academic_year_name
    FROM public.profiles p
    JOIN public.user_roles ur
      ON ur.user_id = p.id
     AND ur.role_code = 'STUDENT'
    JOIN current_year cy ON true
    JOIN public.student_enrollments se
      ON se.student_id = p.id
     AND se.academic_year_id = cy.id
    JOIN public.classes c
      ON c.id = se.class_id
    WHERE coalesce(p.is_active, true) = true
      AND public.can_lookup_competition_student(auth.uid(),p.id,se.class_id,cy.id)
      AND (
        unaccent(lower(coalesce(p.full_name, ''))) LIKE v_norm_search
        OR p.student_code ILIKE '%' || v_search || '%'
      )
    ORDER BY p.id
    LIMIT v_limit * 3
  )
  SELECT
    ms.id,
    ms.full_name,
    ms.student_code,
    ms.avatar_url,
    ms.class_id,
    ms.class_name,
    ms.academic_year_id,
    ms.academic_year_name
  FROM matching_students ms
  ORDER BY
    CASE
      WHEN unaccent(lower(ms.full_name)) = unaccent(lower(v_search)) THEN 1
      WHEN unaccent(lower(ms.full_name)) LIKE unaccent(lower(v_search)) || '%' THEN 2
      ELSE 3
    END,
    ms.full_name ASC
  LIMIT v_limit;
END;
$function$;
REVOKE ALL ON FUNCTION public.search_competition_students(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_competition_students(text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_current_unit(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_class_id uuid;
  v_class_name text;
  v_academic_year_id uuid;
begin
  if auth.uid() is null then raise exception 'Yêu cầu xác thực.' using errcode='42501'; end if;
  select se.class_id, c.name, se.academic_year_id
  into v_class_id, v_class_name, v_academic_year_id
  from public.student_enrollments se
  join public.classes c on c.id = se.class_id
  join public.academic_years ay on ay.id = se.academic_year_id
  where se.student_id = p_student_id
    and (ay.is_current = true or ay.is_active = true)
  order by ay.is_current desc, ay.is_active desc, se.created_at desc
  limit 1;

  if not public.can_lookup_competition_student(auth.uid(),p_student_id,v_class_id,v_academic_year_id) then
    raise exception 'Không có quyền tra cứu lớp của học sinh này.' using errcode='42501';
  end if;

  if v_class_id is null then
    return jsonb_build_object(
      'has_unit', false,
      'message', 'Đội viên chưa được phân vào chi đội.'
    );
  end if;

  return jsonb_build_object(
    'has_unit', true,
    'class_id', v_class_id,
    'class_name', v_class_name,
    'academic_year_id', v_academic_year_id
  );
end;
$function$;
REVOKE ALL ON FUNCTION public.get_student_current_unit(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_student_current_unit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_competition_review_request(p_incident_id uuid DEFAULT NULL::uuid, p_transaction_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text, p_evidence_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_caller_id uuid;
  v_incident record;
  v_tx record;
  v_req_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Yêu cầu xác thực.' using errcode = '42501';
  end if;

  -- Serialize submissions per caller so duplicate checks cannot race.
  perform 1 from public.profiles where id=v_caller_id and is_active=true for update;
  if not found then raise exception 'Tài khoản không hoạt động.' using errcode='42501'; end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Vui lòng cung cấp lý do đề nghị xem lại.' using errcode = '22000';
  end if;

  if p_incident_id is null and p_transaction_id is null then
    raise exception 'Phải chọn vụ việc hoặc giao dịch cần xem lại.' using errcode = '22000';
  end if;

  -- Validate incident ownership if provided
  if p_incident_id is not null then
    select * into v_incident
    from public.competition_incidents
    where id = p_incident_id;

    if not found then
      raise exception 'Không tìm thấy vụ việc vi phạm/khen thưởng.' using errcode = 'P0002';
    end if;

    if v_incident.student_id IS DISTINCT FROM v_caller_id then
      raise exception 'Bạn không có quyền đề nghị xem lại dữ liệu này.' using errcode = '42501';
    end if;
  end if;

  -- Validate transaction ownership if provided
  if p_transaction_id is not null then
    select * into v_tx
    from public.competition_point_transactions
    where id = p_transaction_id;

    if not found then
      raise exception 'Không tìm thấy giao dịch điểm.' using errcode = 'P0002';
    end if;

    if v_tx.student_id IS DISTINCT FROM v_caller_id then
      raise exception 'Bạn không có quyền đề nghị xem lại dữ liệu này.' using errcode = '42501';
    end if;

    if v_tx.ledger_type not in ('STUDENT_MERIT', 'STUDENT_REWARD') then
      raise exception 'Chỉ được gửi yêu cầu xem lại cho sổ điểm cá nhân.' using errcode = '22000';
    end if;

    if p_incident_id is not null then
      if v_tx.incident_id is null or v_tx.incident_id <> p_incident_id then
        raise exception 'Giao dịch không thuộc về vụ việc đã chọn.' using errcode = '22000';
      end if;
    end if;
  end if;

  -- Duplicate check
  if exists (
    select 1 from public.competition_review_requests
    where student_id = v_caller_id
      and (
        (p_incident_id is not null and incident_id = p_incident_id)
        or (p_transaction_id is not null and transaction_id = p_transaction_id)
      )
      and status = 'PENDING'
  ) then
    raise exception 'Dữ liệu này đã có yêu cầu xem lại đang được xử lý.' using errcode = 'P0003';
  end if;

  insert into public.competition_review_requests (
    incident_id, transaction_id, student_id, reason, evidence_url, status, submitted_at
  ) values (
    p_incident_id, p_transaction_id, v_caller_id, trim(p_reason), p_evidence_url, 'PENDING', now()
  ) returning id into v_req_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Đã gửi yêu cầu xem lại điểm thi đua thành công!',
    'review_request_id', v_req_id
  );
end;
$function$;
REVOKE ALL ON FUNCTION public.submit_competition_review_request(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_competition_review_request(uuid,uuid,text,text) TO authenticated;

-- Keep old signature present for compatibility with dependencies, but deny clients.
REVOKE ALL ON FUNCTION public.complete_flag_ceremony() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.complete_flag_ceremony(
 p_expected_starts_at timestamptz, p_expected_updated_at timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid:=auth.uid();
BEGIN
 IF v_user IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_user AND is_active=true)
 OR NOT public.has_any_app_role(v_user,ARRAY['SUPER_ADMIN','PRINCIPAL','VICE_PRINCIPAL','STAFF','TEACHER']) THEN
  RAISE EXCEPTION 'Chỉ giáo viên/cán bộ được hoàn tất phiên chào cờ.' USING ERRCODE='42501';
 END IF;
 IF p_expected_starts_at IS NULL OR p_expected_updated_at IS NULL THEN
  RAISE EXCEPTION 'Thiếu thông tin phiên chào cờ.' USING ERRCODE='22023';
 END IF;
 -- Compare both timestamps atomically. An old browser cannot finish a new signal.
 UPDATE public.flag_ceremony_state SET phase='done',starts_at=null,
  message='Nghi lễ chào cờ đã hoàn tất.',updated_at=now(),updated_by=v_user
 WHERE id='school' AND phase IN ('countdown','salute')
  AND starts_at=p_expected_starts_at AND updated_at=p_expected_updated_at AND starts_at<=now();
END; $$;
REVOKE ALL ON FUNCTION public.complete_flag_ceremony(timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_flag_ceremony(timestamptz,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
