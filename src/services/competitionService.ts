/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import { sortClassesNaturally, compareClassNames, removeVietnameseTones, parseClassParts } from '../utils/classSortUtils';
import {
  CompetitionProgram,
  CompetitionRule,
  CompetitionIncident,
  CompetitionEvidence,
  CompetitionPointTransaction,
  CompetitionWeek,
  CompetitionWeekUnit,
  CompetitionWeekAdjustment,
  IncidentStatus,
  WeekStatus,
  StudentCompetitionProfile,
  LedgerType,
  CompetitionReviewRequest,
  RewardItem,
  RewardRedemption,
  CompetitionAutoPublishConfig,
  CompetitionCommentTemplate,
  CompetitionWeeklyReport,
  WeeklyReportRuleStat,
} from '../types/competition';

export const competitionService = {
  // --- COMPETITION PROGRAMS ---
  async getCompetitionPrograms(includeInactive = true): Promise<CompetitionProgram[]> {
    let query = supabase
      .from('competition_programs')
      .select('*, academic_years(name)')
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching competition programs:', error);
      throw error;
    }

    return (data || []).map((p: any) => ({
      ...p,
      academic_year_name: p.academic_years?.name || null,
    })) as CompetitionProgram[];
  },

  async createCompetitionProgram(program: Partial<CompetitionProgram>): Promise<CompetitionProgram> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('competition_programs')
      .insert({
        code: program.code,
        name: program.name,
        description: program.description || null,
        academic_year_id: program.academic_year_id || null,
        starts_at: program.starts_at || null,
        ends_at: program.ends_at || null,
        is_active: program.is_active ?? true,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      })
      .select('*, academic_years(name)')
      .single();

    if (error) {
      console.error('Error creating competition program:', error);
      throw error;
    }

    return {
      ...data,
      academic_year_name: (data as any).academic_years?.name || null,
    } as CompetitionProgram;
  },

  async updateCompetitionProgram(id: string, program: Partial<CompetitionProgram>): Promise<CompetitionProgram> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('competition_programs')
      .update({
        code: program.code,
        name: program.name,
        description: program.description || null,
        academic_year_id: program.academic_year_id || null,
        starts_at: program.starts_at || null,
        ends_at: program.ends_at || null,
        is_active: program.is_active ?? true,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, academic_years(name)')
      .single();

    if (error) {
      console.error('Error updating competition program:', error);
      throw error;
    }

    return {
      ...data,
      academic_year_name: (data as any).academic_years?.name || null,
    } as CompetitionProgram;
  },

  async archiveCompetitionProgram(id: string): Promise<CompetitionProgram> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('competition_programs')
      .update({
        is_active: false,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, academic_years(name)')
      .single();

    if (error) {
      console.error('Error archiving competition program:', error);
      throw error;
    }

    return {
      ...data,
      academic_year_name: (data as any).academic_years?.name || null,
    } as CompetitionProgram;
  },

  // Backward compatibility aliases
  async getPrograms(includeInactive = true): Promise<CompetitionProgram[]> {
    return this.getCompetitionPrograms(includeInactive);
  },

  async saveProgram(program: Partial<CompetitionProgram>): Promise<CompetitionProgram> {
    if (program.id) {
      return this.updateCompetitionProgram(program.id, program);
    }
    return this.createCompetitionProgram(program);
  },

  // --- COMPETITION RULES ---
  async getCompetitionRules(programId?: string, includeInactive = true): Promise<CompetitionRule[]> {
    let query = supabase
      .from('competition_rules')
      .select('*, competition_programs(name, code)')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (programId && programId !== 'ALL') {
      query = query.eq('program_id', programId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching competition rules:', error);
      throw error;
    }

    return (data || []).map((r: any) => ({
      ...r,
      program: r.competition_programs,
    })) as CompetitionRule[];
  },

  async createCompetitionRule(rule: Partial<CompetitionRule>): Promise<CompetitionRule> {
    const approverTypes = rule.allowed_approver_types || [];
    const requiresApproval = approverTypes.length > 0;
    const recorderTypes = rule.allowed_recorder_types && rule.allowed_recorder_types.length > 0
      ? rule.allowed_recorder_types
      : ['ADMIN', 'SUPERVISOR', 'RED_STAR'];

    const { data, error } = await supabase
      .from('competition_rules')
      .insert({
        program_id: rule.program_id,
        code: rule.code,
        name: rule.name,
        description: rule.description || null,
        category: rule.category,
        effect_scope: rule.effect_scope,
        student_merit_points: rule.student_merit_points ?? 0,
        student_reward_points: rule.student_reward_points ?? 0,
        unit_points: rule.unit_points ?? 0,
        requires_evidence: rule.requires_evidence ?? false,
        requires_approval: requiresApproval,
        allowed_recorder_types: recorderTypes,
        allowed_approver_types: approverTypes,
        daily_limit: rule.daily_limit || null,
        is_active: rule.is_active ?? true,
        display_order: rule.display_order ?? 0,
      })
      .select('*, competition_programs(name, code)')
      .single();

    if (error) {
      console.error('Error creating competition rule:', error);
      throw error;
    }

    return {
      ...data,
      program: (data as any).competition_programs,
    } as CompetitionRule;
  },

  async updateCompetitionRule(id: string, rule: Partial<CompetitionRule>): Promise<CompetitionRule> {
    const approverTypes = rule.allowed_approver_types ?? [];
    const requiresApproval = approverTypes.length > 0;
    const recorderTypes = rule.allowed_recorder_types && rule.allowed_recorder_types.length > 0
      ? rule.allowed_recorder_types
      : ['ADMIN', 'SUPERVISOR', 'RED_STAR'];

    const { data, error } = await supabase
      .from('competition_rules')
      .update({
        program_id: rule.program_id,
        code: rule.code,
        name: rule.name,
        description: rule.description || null,
        category: rule.category,
        effect_scope: rule.effect_scope,
        student_merit_points: rule.student_merit_points ?? 0,
        student_reward_points: rule.student_reward_points ?? 0,
        unit_points: rule.unit_points ?? 0,
        requires_evidence: rule.requires_evidence ?? false,
        requires_approval: requiresApproval,
        allowed_recorder_types: recorderTypes,
        allowed_approver_types: approverTypes,
        daily_limit: rule.daily_limit || null,
        is_active: rule.is_active ?? true,
        display_order: rule.display_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, competition_programs(name, code)')
      .single();

    if (error) {
      console.error('Error updating competition rule:', error);
      throw error;
    }

    return {
      ...data,
      program: (data as any).competition_programs,
    } as CompetitionRule;
  },

  async archiveCompetitionRule(id: string): Promise<CompetitionRule> {
    const { data, error } = await supabase
      .from('competition_rules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, competition_programs(name, code)')
      .single();

    if (error) {
      console.error('Error archiving competition rule:', error);
      throw error;
    }

    return {
      ...data,
      program: (data as any).competition_programs,
    } as CompetitionRule;
  },

  async deleteCompetitionRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('competition_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting competition rule:', error);
      if (
        error.code === '23503' ||
        error.message?.includes('foreign key constraint') ||
        error.message?.includes('violates foreign key constraint') ||
        error.details?.includes('competition_incidents')
      ) {
        throw new Error('Quy tắc này đã phát sinh dữ liệu thi đua nên không thể xóa.');
      }
      throw error;
    }
  },

  // Backward compatibility aliases
  async getRules(programId?: string, includeInactive = true): Promise<CompetitionRule[]> {
    return this.getCompetitionRules(programId, includeInactive);
  },

  async saveRule(rule: Partial<CompetitionRule>): Promise<CompetitionRule> {
    if (rule.id) {
      return this.updateCompetitionRule(rule.id, rule);
    }
    return this.createCompetitionRule(rule);
  },

  async canManageCompetition(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // 1. Check user_roles for SUPER_ADMIN or PRINCIPAL
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role_code')
        .eq('user_id', user.id);

      const roles = (userRoles || []).map((r: any) => r.role_code);
      if (roles.includes('SUPER_ADMIN') || roles.includes('PRINCIPAL')) {
        return true;
      }

      // 2. Check user_competition_permissions for COMPETITION_MANAGE
      const { data: compPerms } = await supabase
        .from('user_competition_permissions')
        .select('permission_code')
        .eq('user_id', user.id)
        .eq('permission_code', 'COMPETITION_MANAGE');

      return !!(compPerms && compPerms.length > 0);
    } catch (err) {
      console.error('Error checking competition manage permission:', err);
      return false;
    }
  },

  async getAcademicYears(): Promise<{ id: string; name: string; start_date?: string; end_date?: string; is_active?: boolean; is_current?: boolean }[]> {
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, is_active, is_current')
      .order('name', { ascending: false });

    if (error) {
      console.error('Error fetching academic years:', error);
      return [];
    }
    return data || [];
  },

  async getAcademicTerms(academicYearId?: string): Promise<{ id: string; academic_year_id: string; code: string; name: string; term_order: number; start_date?: string; end_date?: string; is_active?: boolean }[]> {
    let query = supabase
      .from('academic_terms')
      .select('id, academic_year_id, code, name, term_order, start_date, end_date, is_active')
      .order('term_order', { ascending: true });

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching academic terms:', error);
      return [];
    }
    return data || [];
  },

  // --- SEARCH STUDENTS & GET UNIT ---
  async searchStudents(searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const cleanTerm = searchTerm.trim();

    // Call RPC search_competition_students with unaccent support
    const { data, error } = await supabase.rpc('search_competition_students', {
      p_search_term: cleanTerm,
      p_limit: 20,
    });

    if (error) {
      console.error('Error searching students via RPC search_competition_students:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      if (import.meta.env.DEV) {
        console.warn('[DEV ONLY Fallback] Searching students using basic ilike query (unaccent not supported in DEV fallback)');
        const { data: fallbackData } = await supabase
          .from('profiles')
          .select('id, full_name, student_code, avatar_url, user_roles!inner(role_code)')
          .eq('user_roles.role_code', 'STUDENT')
          .or(`full_name.ilike."%${cleanTerm}%",student_code.ilike."%${cleanTerm}%"`)
          .limit(20);

        if (!fallbackData) return [];

        const studentIds = fallbackData.map(s => s.id);
        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id, class_id, classes(id, name), academic_years(id, name, is_current)')
          .in('student_id', studentIds);

        const enrollmentMap: Record<string, { class_id: string; class_name: string; academic_year_name: string }> = {};
        if (enrollments) {
          enrollments.forEach((e: any) => {
            if (e.classes && e.academic_years?.is_current) {
              enrollmentMap[e.student_id] = {
                class_id: e.class_id,
                class_name: e.classes.name,
                academic_year_name: e.academic_years?.name || '',
              };
            }
          });
        }

        return fallbackData.map(s => ({
          id: s.id,
          full_name: s.full_name,
          student_code: s.student_code,
          avatar_url: s.avatar_url,
          unit: enrollmentMap[s.id] || null,
        }));
      }

      throw error;
    }

    if (!data) return [];

    return (data as any[]).map(s => ({
      id: s.id,
      full_name: s.full_name,
      student_code: s.student_code,
      avatar_url: s.avatar_url,
      unit: s.class_id ? {
        class_id: s.class_id,
        class_name: s.class_name,
        academic_year_name: s.academic_year_name || '',
      } : null,
    }));
  },

  async getStudentCurrentUnit(studentId: string) {
    const { data, error } = await supabase.rpc('get_student_current_unit', {
      p_student_id: studentId,
    });

    if (error) {
      console.error('Error getting student unit:', error);
      return { has_unit: false, message: 'Lỗi khi tra cứu chi đội học sinh.' };
    }

    return data;
  },

  // --- UPLOAD EVIDENCE IMAGE ---
  async uploadEvidenceImage(file: File, folderPrefix = 'temp'): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const uuid = crypto.randomUUID();
    const filePath = `competition/incidents/${folderPrefix}/${uuid}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('school-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading evidence image:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('school-media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },

  // --- RECORD INCIDENT (RPC) ---
  async createIncident(payload: {
    program_id: string;
    rule_id: string;
    student_id?: string | null;
    unit_id?: string | null;
    occurred_at?: string;
    title?: string;
    description?: string;
    evidence_note?: string;
    evidence_items?: {
      evidence_type: 'IMAGE' | 'INTERNAL_LINK' | 'EXTERNAL_LINK';
      file_url?: string;
      external_url?: string;
      caption?: string;
      display_order?: number;
    }[];
  }) {
    const { data, error } = await supabase.rpc('create_competition_incident', {
      p_program_id: payload.program_id,
      p_rule_id: payload.rule_id,
      p_student_id: payload.student_id || null,
      p_unit_id: payload.unit_id || null,
      p_occurred_at: payload.occurred_at || new Date().toISOString(),
      p_title: payload.title || null,
      p_description: payload.description || null,
      p_evidence_note: payload.evidence_note || null,
      p_evidence_items: payload.evidence_items || [],
    });

    if (error) {
      console.error('Error creating incident:', error);
      throw error;
    }

    return data;
  },

  // --- APPROVE INCIDENT (RPC) ---
  async approveIncident(incidentId: string) {
    const { data, error } = await supabase.rpc('approve_competition_incident', {
      p_incident_id: incidentId,
    });

    if (error) {
      console.error('Error approving incident:', error);
      throw error;
    }

    return data;
  },

  // --- REJECT INCIDENT (RPC) ---
  async rejectIncident(incidentId: string, reason: string) {
    const { data, error } = await supabase.rpc('reject_competition_incident', {
      p_incident_id: incidentId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error rejecting incident:', error);
      throw error;
    }

    return data;
  },

  // --- REVERSE INCIDENT (RPC) ---
  async reverseIncident(incidentId: string, reason: string) {
    const { data, error } = await supabase.rpc('reverse_competition_incident', {
      p_incident_id: incidentId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error reversing incident:', error);
      throw error;
    }

    return data;
  },

  // --- FETCH INCIDENTS ---
  async getIncidents(filters?: {
    status?: IncidentStatus;
    programId?: string;
    ruleId?: string;
    studentId?: string;
  }): Promise<CompetitionIncident[]> {
    let query = supabase
      .from('competition_incidents')
      .select(`
        *,
        competition_programs(name, code),
        competition_rules(name, code, category, effect_scope, student_merit_points, student_reward_points, unit_points, requires_approval, allowed_recorder_types, allowed_approver_types),
        student:profiles!competition_incidents_student_id_fkey(full_name, student_code),
        unit:classes!competition_incidents_unit_id_fkey(name),
        recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
        approver:profiles!competition_incidents_approved_by_fkey(full_name),
        competition_incident_evidence(*)
      `)
      .order('occurred_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.programId) {
      query = query.eq('program_id', filters.programId);
    }
    if (filters?.ruleId) {
      query = query.eq('rule_id', filters.ruleId);
    }
    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching incidents:', error);
      throw error;
    }

    return (data || []).map((i: any) => ({
      ...i,
      program_name: i.competition_programs?.name,
      rule_name: i.competition_rules?.name,
      rule: i.competition_rules,
      student_name: i.student?.full_name,
      student_code: i.student?.student_code,
      unit_name: i.unit?.name,
      recorder_name: i.recorder?.full_name,
      approver_name: i.approver?.full_name,
      evidence_items: i.competition_incident_evidence || [],
    })) as CompetitionIncident[];
  },

  async getPendingIncidentsForApproval(): Promise<CompetitionIncident[]> {
    const { data: idRows, error: idError } = await supabase.rpc(
      'get_pending_competition_incident_ids_for_approval'
    );

    if (idError) {
      console.error('Error fetching approvable pending incident ids:', idError);
      throw idError;
    }

    const ids = (idRows || [])
      .map((row: any) => row.id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('competition_incidents')
      .select(`
        *,
        competition_programs(name, code),
        competition_rules(name, code, category, effect_scope, student_merit_points, student_reward_points, unit_points, requires_approval, allowed_recorder_types, allowed_approver_types),
        student:profiles!competition_incidents_student_id_fkey(full_name, student_code),
        unit:classes!competition_incidents_unit_id_fkey(name),
        recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
        approver:profiles!competition_incidents_approved_by_fkey(full_name),
        competition_incident_evidence(*)
      `)
      .in('id', ids)
      .order('occurred_at', { ascending: false });

    if (error) {
      console.error('Error fetching approvable pending incidents:', error);
      throw error;
    }

    return (data || []).map((i: any) => ({
      ...i,
      program_name: i.competition_programs?.name,
      rule_name: i.competition_rules?.name,
      rule: i.competition_rules,
      student_name: i.student?.full_name,
      student_code: i.student?.student_code,
      unit_name: i.unit?.name,
      recorder_name: i.recorder?.full_name,
      approver_name: i.approver?.full_name,
      evidence_items: i.competition_incident_evidence || [],
    })) as CompetitionIncident[];
  },

  async getWeeklyOfficialIncidents(filters: {
    weekStartsOn?: string;
    weekEndsOn?: string;
    unitId?: string;
    unitIds?: string[];
  }): Promise<CompetitionIncident[]> {
    let query = supabase
      .from('competition_incidents')
      .select(`
        *,
        competition_programs(name, code),
        competition_rules(id, name, code, category, effect_scope, student_merit_points, student_reward_points, unit_points),
        student:profiles!competition_incidents_student_id_fkey(full_name, student_code),
        unit:classes!competition_incidents_unit_id_fkey(name),
        recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
        approver:profiles!competition_incidents_approved_by_fkey(full_name),
        competition_incident_evidence(*)
      `)
      .eq('status', 'APPROVED')
      .order('occurred_at', { ascending: false });

    if (filters.weekStartsOn && filters.weekEndsOn) {
      const startTs = new Date(`${filters.weekStartsOn}T00:00:00+07:00`).toISOString();
      const endTs = new Date(`${filters.weekEndsOn}T23:59:59.999+07:00`).toISOString();
      query = query.gte('occurred_at', startTs).lte('occurred_at', endTs);
    }

    if (filters.unitId) {
      query = query.eq('unit_id', filters.unitId);
    } else if (filters.unitIds && filters.unitIds.length > 0) {
      query = query.in('unit_id', filters.unitIds);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching weekly official incidents:', error);
      throw error;
    }

    return (data || [])
      .filter((i: any) => {
        const cat = i.competition_rules?.category;
        // Exclude positive categories: GOOD_DEED (Người tốt - Việc tốt) and ACHIEVEMENT (Thành tích)
        return cat !== 'GOOD_DEED' && cat !== 'ACHIEVEMENT';
      })
      .map((i: any) => ({
        ...i,
        program_name: i.competition_programs?.name,
        rule_name: i.competition_rules?.name,
        rule: i.competition_rules,
        student_name: i.student?.full_name,
        student_code: i.student?.student_code,
        unit_name: i.unit?.name,
        recorder_name: i.recorder?.full_name,
        approver_name: i.approver?.full_name,
        evidence_items: i.competition_incident_evidence || [],
      })) as CompetitionIncident[];
  },

  async getPendingIncidentsCount(): Promise<number> {
    const { data, error } = await supabase.rpc(
      'get_pending_competition_incident_ids_for_approval'
    );

    if (error) {
      console.error('Error fetching approvable pending incidents count:', error);
      return 0;
    }

    return (data || []).length;
  },

  // --- CLASSES / UNITS ---
  async getClasses(academicYearId?: string) {
    let query = supabase
      .from('classes')
      .select('*, grade_levels(name)')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
    return sortClassesNaturally(data || []);
  },

  // --- WEEKLY COMPETITION: WEEKS ---
  async getWeeks(filters?: { programId?: string; academicYearId?: string }): Promise<CompetitionWeek[]> {
    let query = supabase
      .from('competition_weeks')
      .select('*, competition_programs(name, code), academic_years(name)')
      .order('week_number', { ascending: false });

    if (filters?.programId) {
      query = query.eq('program_id', filters.programId);
    }
    if (filters?.academicYearId) {
      query = query.eq('academic_year_id', filters.academicYearId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching weeks:', error);
      throw error;
    }

    return (data || []).map((w: any) => ({
      ...w,
      program_name: w.competition_programs?.name,
      academic_year_name: w.academic_years?.name,
    })) as CompetitionWeek[];
  },

  async getWeekById(weekId: string): Promise<CompetitionWeek | null> {
    const { data, error } = await supabase
      .from('competition_weeks')
      .select('*, competition_programs(name, code), academic_years(name)')
      .eq('id', weekId)
      .single();

    if (error) {
      if (error.code === 'P0002') return null;
      console.error('Error fetching week by id:', error);
      throw error;
    }

    return {
      ...data,
      program_name: data.competition_programs?.name,
      academic_year_name: data.academic_years?.name,
    } as CompetitionWeek;
  },

  async openWeek(payload: {
    program_id: string;
    academic_year_id: string;
    week_number: number;
    name: string;
    starts_on: string;
    ends_on: string;
    default_starting_points?: number;
    unit_ids?: string[];
  }) {
    const { data, error } = await supabase.rpc('open_competition_week', {
      p_program_id: payload.program_id,
      p_academic_year_id: payload.academic_year_id,
      p_week_number: payload.week_number,
      p_name: payload.name,
      p_starts_on: payload.starts_on,
      p_ends_on: payload.ends_on,
      p_default_starting_points: payload.default_starting_points || 100,
      p_unit_ids: payload.unit_ids || null,
    });

    if (error) {
      console.error('Error opening week:', error);
      throw error;
    }
    return data;
  },

  async updateWeek(weekId: string, payload: {
    week_number: number;
    name: string;
    starts_on: string;
    ends_on: string;
  }) {
    if (!payload.name.trim()) throw new Error('Tên tuần không được để trống.');
    if (payload.week_number < 1) throw new Error('Số tuần phải lớn hơn 0.');
    if (payload.starts_on > payload.ends_on) throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.');

    const { data, error } = await supabase
      .from('competition_weeks')
      .update({
        week_number: payload.week_number,
        name: payload.name.trim(),
        starts_on: payload.starts_on,
        ends_on: payload.ends_on,
      })
      .eq('id', weekId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating competition week:', error);
      throw error;
    }
    return data as CompetitionWeek;
  },

  async lockWeek(weekId: string) {
    const { data, error } = await supabase.rpc('lock_competition_week', {
      p_week_id: weekId,
    });

    if (error) {
      console.error('Error locking week:', error);
      throw error;
    }
    return data;
  },

  async unlockWeek(weekId: string, reason?: string) {
    const { data, error } = await supabase.rpc('unlock_competition_week', {
      p_week_id: weekId,
      p_reason: reason || null,
    });

    if (error) {
      console.error('Error unlocking week:', error);
      throw error;
    }
    return data;
  },

  async finalizeWeek(weekId: string) {
    const { data, error } = await supabase.rpc('finalize_competition_week', {
      p_week_id: weekId,
    });

    if (error) {
      console.error('Error finalizing week:', error);
      throw error;
    }
    return data;
  },

  // --- WEEKLY COMPETITION: LEADERBOARD & UNITS ---
  async getWeekSummary(weekId: string) {
    const week = await this.getWeekById(weekId);
    if (!week) throw new Error('Không tìm thấy tuần thi đua.');

    // Fetch units
    const { data: unitsData, error: unitsError } = await supabase
      .from('competition_week_units')
      .select('*, class:classes!competition_week_units_unit_id_fkey(name, grade_level_id)')
      .eq('week_id', weekId)
      .order('created_at', { ascending: true });

    if (unitsError) throw unitsError;

    const startTs = new Date(`${week.starts_on}T00:00:00+07:00`).toISOString();
    const endTs = new Date(`${week.ends_on}T23:59:59.999+07:00`).toISOString();

    // Fetch transactions in range with program reference
    const { data: txData, error: txError } = await supabase
      .from('competition_point_transactions')
      .select('unit_id, points, transaction_type, program_id, incident_id, incident:competition_incidents(program_id)')
      .eq('ledger_type', 'UNIT_COMPETITION')
      .eq('status', 'POSTED')
      .gte('effective_at', startTs)
      .lte('effective_at', endTs);

    if (txError) throw txError;

    // Aggregate point transactions per unit, filtering by week program_id
    const txMap = new Map<string, { bonus: number; penalty: number; count: number }>();
    (txData || []).forEach((tx: any) => {
      if (!tx.unit_id) return;

      let txProgId = tx.program_id;
      if (!txProgId && tx.incident) {
        if (Array.isArray(tx.incident)) {
          txProgId = tx.incident[0]?.program_id;
        } else {
          txProgId = tx.incident.program_id;
        }
      }

      if (week.program_id && txProgId && txProgId !== week.program_id) {
        return;
      }

      const current = txMap.get(tx.unit_id) || { bonus: 0, penalty: 0, count: 0 };
      const pts = tx.points || 0;
      if (pts > 0) current.bonus += pts;
      if (pts < 0) current.penalty += Math.abs(pts);
      current.count += 1;
      txMap.set(tx.unit_id, current);
    });

    const processedUnits: CompetitionWeekUnit[] = (unitsData || []).map((u: any) => {
      const stats = txMap.get(u.unit_id) || { bonus: 0, penalty: 0, count: 0 };

      const starting_points = u.starting_points ?? 100;
      const manual_bonus_points = u.manual_bonus_points ?? 0;
      const manual_penalty_points = u.manual_penalty_points ?? 0;
      const incident_bonus_points = stats.bonus;
      const incident_penalty_points = stats.penalty;

      const total_bonus_points = manual_bonus_points + incident_bonus_points;
      const total_penalty_points = manual_penalty_points + incident_penalty_points;
      const total_points = starting_points + total_bonus_points - total_penalty_points;

      const unit_name = u.class?.name || 'Chi đội';

      return {
        ...u,
        unit_name,
        grade_level_id: u.class?.grade_level_id,
        starting_points,
        manual_bonus_points,
        manual_penalty_points,
        incident_bonus_points,
        incident_penalty_points,
        total_bonus_points,
        total_penalty_points,
        total_points,

        // Aliases for various UI components:
        total_bonus: total_bonus_points,
        total_penalty: total_penalty_points,
        bonus_points: total_bonus_points,
        deduction_points: total_penalty_points,
        current_points: total_points,
        final_score: total_points,
        incident_count: stats.count,
      };
    });

    // Compute dynamic real-time rank independently per grade level
    const gradeGroups = new Map<string, CompetitionWeekUnit[]>();
    processedUnits.forEach(u => {
      let gradeKey = u.grade_level_id;
      if (!gradeKey && u.unit_name) {
        const parts = parseClassParts(u.unit_name);
        gradeKey = parts.grade !== 999 ? `GRADE_${parts.grade}` : 'OTHER';
      }
      if (!gradeKey) gradeKey = 'OTHER';
      if (!gradeGroups.has(gradeKey)) {
        gradeGroups.set(gradeKey, []);
      }
      gradeGroups.get(gradeKey)!.push(u);
    });

    gradeGroups.forEach(group => {
      group.sort((a, b) => {
        if ((b.total_points ?? 0) !== (a.total_points ?? 0)) {
          return (b.total_points ?? 0) - (a.total_points ?? 0);
        }
        if ((a.total_penalty_points ?? 0) !== (b.total_penalty_points ?? 0)) {
          return (a.total_penalty_points ?? 0) - (b.total_penalty_points ?? 0);
        }
        return compareClassNames(a.unit_name, b.unit_name);
      });

      group.forEach((u, idx) => {
        if (idx > 0) {
          const prev = group[idx - 1];
          if (
            prev.total_points === u.total_points &&
            prev.total_penalty_points === u.total_penalty_points
          ) {
            u.rank = prev.rank;
            u.rank_snapshot = prev.rank;
          } else {
            u.rank = idx + 1;
            u.rank_snapshot = idx + 1;
          }
        } else {
          u.rank = 1;
          u.rank_snapshot = 1;
        }
      });
    });

    // Default sorting for admin view: Grade ASC, Class number ASC (natural order)
    processedUnits.sort((a, b) => compareClassNames(a.unit_name, b.unit_name));

    // Fetch total incidents stats for the week
    const { count: pendingCount } = await supabase
      .from('competition_incidents')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', week.program_id)
      .eq('status', 'PENDING')
      .gte('occurred_at', startTs)
      .lte('occurred_at', endTs);

    const { count: totalIncidentsCount } = await supabase
      .from('competition_incidents')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', week.program_id)
      .gte('occurred_at', startTs)
      .lte('occurred_at', endTs);

    return {
      week,
      units: processedUnits,
      pendingIncidentsCount: pendingCount || 0,
      totalIncidentsCount: totalIncidentsCount || 0,
    };
  },

  // --- PUBLIC WEEK SUMMARY ---
  async getPublicPublishedWeeks(): Promise<CompetitionWeek[]> {
    try {
      // 1. Determine published weeks by distinct week_ids in competition_public_unit_snapshots
      const { data: snapshotWeeks, error: snapErr } = await supabase
        .from('competition_public_unit_snapshots')
        .select('week_id');

      if (snapErr || !snapshotWeeks || snapshotWeeks.length === 0) {
        return [];
      }

      const publishedWeekIds = Array.from(new Set(snapshotWeeks.map((s: any) => s.week_id).filter(Boolean)));
      if (publishedWeekIds.length === 0) {
        return [];
      }

      // 2. Fetch week details for all weeks with public snapshots
      let { data, error } = await supabase
        .from('competition_weeks')
        .select('*, competition_programs(name), academic_years(name)')
        .in('id', publishedWeekIds)
        .order('starts_on', { ascending: false });

      if (error) {
        // Fallback without joins if join fails
        const fallback = await supabase
          .from('competition_weeks')
          .select('*')
          .in('id', publishedWeekIds)
          .order('starts_on', { ascending: false });
        
        if (fallback.error) {
          return [];
        }
        data = fallback.data;
      }

      return (data || []).map((w: any) => ({
        ...w,
        program_name: w.competition_programs?.name,
        academic_year_name: w.academic_years?.name,
      })) as CompetitionWeek[];
    } catch (err) {
      console.error('Exception fetching public published weeks:', err);
      return [];
    }
  },

  async getPublicWeekLeaderboard(weekId: string) {
    try {
      const { data: weekData, error: weekErr } = await supabase
        .from('competition_weeks')
        .select('*, competition_programs(name), academic_years(name)')
        .eq('id', weekId)
        .single();

      if (weekErr || !weekData) {
        return null;
      }

      // 1. Try reading from published snapshot table first
      const { data: snapshotData, error: snapshotErr } = await supabase
        .from('competition_public_unit_snapshots')
        .select('*')
        .eq('week_id', weekId)
        .order('rank', { ascending: true });

      if (!snapshotErr && snapshotData && snapshotData.length > 0) {
        const publicLeaderboard = snapshotData.map((s: any) => ({
          unit_id: s.unit_id,
          unit_name: s.unit_name,
          grade_level_id: s.grade_level_id,
          grade_name: s.grade_name,
          starting_points: s.starting_points,
          manual_bonus_points: s.manual_bonus_points,
          manual_penalty_points: s.manual_penalty_points,
          final_points: s.final_points,
          rank: s.rank,
          published_at: s.published_at,
          comment_text: s.comment_text || 'Chưa có nhận xét',
        }));

        return {
          week: {
            id: weekData.id,
            name: weekData.name,
            week_number: weekData.week_number,
            starts_on: weekData.starts_on,
            ends_on: weekData.ends_on,
            program_name: weekData.competition_programs?.name,
            academic_year_name: weekData.academic_years?.name,
            published_at: snapshotData[0]?.published_at || weekData.published_at,
          },
          leaderboard: publicLeaderboard,
        };
      }

      // If no published snapshot exists, return empty leaderboard for public view
      return {
        week: {
          id: weekData.id,
          name: weekData.name,
          week_number: weekData.week_number,
          starts_on: weekData.starts_on,
          ends_on: weekData.ends_on,
          program_name: weekData.competition_programs?.name,
          academic_year_name: weekData.academic_years?.name,
          published_at: weekData.published_at,
        },
        leaderboard: [],
      };
    } catch (err) {
      console.error('Exception fetching public week leaderboard:', err);
      return null;
    }
  },

  // --- UNIT WEEK ADJUSTMENTS ---
  async createAdjustment(payload: {
    week_id: string;
    unit_id: string;
    points: number;
    reason: string;
    evidence_url?: string;
  }) {
    const { data, error } = await supabase.rpc('create_competition_week_adjustment', {
      p_week_id: payload.week_id,
      p_unit_id: payload.unit_id,
      p_points: payload.points,
      p_reason: payload.reason,
      p_evidence_url: payload.evidence_url || null,
    });

    if (error) {
      console.error('Error creating adjustment:', error);
      throw error;
    }
    return data;
  },

  async updateUnitWeekComment(weekUnitId: string, comment: string) {
    const { data, error } = await supabase
      .from('competition_week_units')
      .update({ comment, updated_at: new Date().toISOString() })
      .eq('id', weekUnitId)
      .select('*, competition_weeks(status, competition_programs(academic_year_id))')
      .single();

    if (error) throw error;

    if (data && data.competition_weeks) {
      const weekStatus = (data.competition_weeks as any)?.status;
      const academicYearId = (data.competition_weeks as any)?.competition_programs?.academic_year_id;
      if (['LOCKED', 'PUBLISHED', 'ARCHIVED'].includes(weekStatus) && academicYearId) {
        try {
          await this.publishSnapshots(academicYearId);
        } catch (err) {
          console.error('Error auto-syncing snapshot after comment update:', err);
        }
      }
    }

    return data;
  },

  // --- UNIT DETAILED INCIDENTS & TRANSACTIONS FOR A WEEK ---
  async getUnitWeekDetails(weekId: string, unitId: string) {
    const week = await this.getWeekById(weekId);
    if (!week) throw new Error('Không tìm thấy tuần thi đua.');

    const startTs = new Date(`${week.starts_on}T00:00:00.000Z`).toISOString();
    const endTs = new Date(`${week.ends_on}T23:59:59.999Z`).toISOString();

    // Fetch posted point transactions for unit in range
    const { data: txList, error: txError } = await supabase
      .from('competition_point_transactions')
      .select(`
        *,
        incident:competition_incidents(
          title,
          description,
          occurred_at,
          recorded_by,
          rule:competition_rules(name, category),
          student:profiles!competition_incidents_student_id_fkey(full_name, student_code),
          recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
          competition_incident_evidence(*)
        ),
        adjustment:competition_week_adjustments(reason, requested_by)
      `)
      .eq('unit_id', unitId)
      .eq('ledger_type', 'UNIT_COMPETITION')
      .eq('status', 'POSTED')
      .gte('effective_at', startTs)
      .lte('effective_at', endTs)
      .order('effective_at', { ascending: false });

    if (txError) throw txError;

    return (txList || []).map((t: any) => ({
      id: t.id,
      points: t.points,
      transaction_type: t.transaction_type,
      effective_at: t.effective_at,
      title: t.incident?.title || (t.adjustment ? `Điều chỉnh: ${t.adjustment.reason}` : 'Giao dịch điểm'),
      description: t.incident?.description,
      rule_name: t.incident?.rule?.name || 'Điều chỉnh tập thể',
      category: t.incident?.rule?.category || 'OTHER',
      student_name: t.incident?.student?.full_name,
      student_code: t.incident?.student?.student_code,
      recorder_name: t.incident?.recorder?.full_name || 'Tổng phụ trách / HĐĐ',
      evidence_items: t.incident?.competition_incident_evidence || [],
    }));
  },

  // --- PART 3: STUDENT PROFILE & GOOD DEEDS ---
  async getStudentCompetitionProfile(studentId?: string): Promise<StudentCompetitionProfile> {
    const { data, error } = await supabase.rpc('get_student_competition_profile', {
      p_student_id: studentId || null,
    });

    if (error) {
      console.error('Error fetching student competition profile:', error);
      throw error;
    }
    return data as StudentCompetitionProfile;
  },

  async getStudentPointTransactions(studentId?: string, ledgerType?: LedgerType) {
    let query = supabase
      .from('competition_point_transactions')
      .select(`
        *,
        incident:competition_incidents(
          title,
          description,
          occurred_at,
          rule:competition_rules(name, category)
        )
      `)
      .order('effective_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (ledgerType) {
      query = query.eq('ledger_type', ledgerType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((t: any) => ({
      ...t,
      incident_title: t.incident?.title,
      rule_name: t.incident?.rule?.name,
      category: t.incident?.rule?.category,
    }));
  },

  async getStudentIncidents(studentId?: string) {
    let query = supabase
      .from('competition_incidents')
      .select(`
        *,
        program:competition_programs(name),
        rule:competition_rules(name, category, student_merit_points, student_reward_points, unit_points),
        recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
        approver:profiles!competition_incidents_approved_by_fkey(full_name),
        evidence_items:competition_incident_evidence(*)
      `)
      .order('occurred_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((i: any) => ({
      ...i,
      program_name: i.program?.name,
      rule_name: i.rule?.name,
      category: i.rule?.category,
      recorder_name: i.recorder?.full_name,
      approver_name: i.approver?.full_name,
      evidence_items: i.evidence_items || [],
    }));
  },

  async getGoodDeeds(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('competition_incidents')
        .select(`
          *,
          rule:competition_rules!inner(name, category, student_merit_points),
          student:profiles!competition_incidents_student_id_fkey(full_name, student_code, avatar_url),
          unit:classes!competition_incidents_unit_id_fkey(name),
          evidence_items:competition_incident_evidence(*)
        `)
        .eq('status', 'APPROVED')
        .eq('rule.category', 'GOOD_DEED')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching good deeds:', error);
        return [];
      }

      return (data || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        occurred_at: g.occurred_at,
        student_id: g.student_id,
        student_name: g.student?.full_name || 'Đội viên',
        student_code: g.student?.student_code,
        avatar_url: g.student?.avatar_url,
        unit_name: g.unit?.name || 'Chi đội',
        merit_points: g.rule?.student_merit_points || 0,
        evidence_items: g.evidence_items || [],
      }));
    } catch (err) {
      console.error('Exception fetching good deeds:', err);
      return [];
    }
  },

  async getPublicGoodDeeds(limit = 6, offset = 0) {
    try {
      const { data, error } = await supabase.rpc('get_public_good_deeds', {
        p_limit: limit,
        p_offset: offset || 0,
      });

      if (error) {
        console.error('Error fetching public good deeds:', error);
        return [];
      }

      const list = typeof data === 'string' ? JSON.parse(data) : data;
      if (!Array.isArray(list)) return [];

      return list.map((g: any) => ({
        id: g.incident_id || g.id,
        title: g.title,
        description: g.description,
        occurred_at: g.occurred_at,
        student_id: g.student_id,
        student_name: g.student_name || 'Đội viên',
        student_code: g.student_code || undefined,
        avatar_url: g.avatar_url || undefined,
        unit_id: g.unit_id,
        unit_name: g.unit_name || 'Chi đội',
        merit_points: g.reward_points ?? 0,
        evidence_items: g.evidence || g.evidence_items || [],
      }));
    } catch (err) {
      console.error('Exception fetching public good deeds:', err);
      return [];
    }
  },

  // --- REVIEW REQUESTS ---
  async submitReviewRequest(payload: {
    incident_id?: string;
    transaction_id?: string;
    reason: string;
    evidence_url?: string;
  }) {
    const { data, error } = await supabase.rpc('submit_competition_review_request', {
      p_incident_id: payload.incident_id || null,
      p_transaction_id: payload.transaction_id || null,
      p_reason: payload.reason,
      p_evidence_url: payload.evidence_url || null,
    });

    if (error) throw error;
    return data;
  },

  async getReviewRequests(studentId?: string) {
    let query = supabase
      .from('competition_review_requests')
      .select(`
        *,
        student:profiles!competition_review_requests_student_id_fkey(full_name, student_code),
        reviewer:profiles!competition_review_requests_reviewed_by_fkey(full_name),
        incident:competition_incidents(title)
      `)
      .order('submitted_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      student_name: r.student?.full_name,
      student_code: r.student?.student_code,
      reviewer_name: r.reviewer?.full_name,
      incident_title: r.incident?.title,
    })) as CompetitionReviewRequest[];
  },

  async resolveReviewRequest(payload: {
    request_id: string;
    status: 'ACCEPTED' | 'REJECTED';
    resolution_note?: string;
    adjustment_points?: number;
    ledger_type?: LedgerType;
  }) {
    const { data, error } = await supabase.rpc('resolve_competition_review_request', {
      p_request_id: payload.request_id,
      p_status: payload.status,
      p_resolution_note: payload.resolution_note || null,
      p_adjustment_points: payload.adjustment_points || 0,
      p_ledger_type: payload.ledger_type || 'STUDENT_MERIT',
    });

    if (error) throw error;
    return data;
  },

  // --- REWARD SHOP & REDEMPTIONS ---
  async getRewardItems(activeOnly = false): Promise<RewardItem[]> {
    let query = supabase
      .from('reward_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []) as RewardItem[];
  },

  async saveRewardItem(item: Partial<RewardItem>): Promise<RewardItem> {
    const payload = {
      name: item.name,
      description: item.description || null,
      image_url: item.image_url || null,
      points_required: item.points_required ?? 0,
      quantity: item.quantity ?? 0,
      is_active: item.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (item.id) {
      const { data, error } = await supabase
        .from('reward_items')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      return data as RewardItem;
    } else {
      const { data, error } = await supabase
        .from('reward_items')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as RewardItem;
    }
  },

  async deleteRewardItem(id: string) {
    const { error } = await supabase
      .from('reward_items')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async requestRewardRedemption(rewardItemId: string, quantity = 1) {
    const { data, error } = await supabase.rpc('request_reward_redemption', {
      p_reward_item_id: rewardItemId,
      p_quantity: quantity,
    });

    if (error) throw error;
    return data;
  },

  async getRewardRedemptions(studentId?: string): Promise<RewardRedemption[]> {
    let query = supabase
      .from('reward_redemptions')
      .select(`
        *,
        student:profiles!reward_redemptions_student_id_fkey(full_name, student_code),
        reward:reward_items(name, image_url),
        approver:profiles!reward_redemptions_approved_by_fkey(full_name),
        issuer:profiles!reward_redemptions_issued_by_fkey(full_name)
      `)
      .order('requested_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      student_name: r.student?.full_name,
      student_code: r.student?.student_code,
      reward_name: r.reward?.name,
      reward_image_url: r.reward?.image_url,
      approver_name: r.approver?.full_name,
      issuer_name: r.issuer?.full_name,
    })) as RewardRedemption[];
  },

  async approveRewardRedemption(redemptionId: string) {
    const { data, error } = await supabase.rpc('approve_reward_redemption', {
      p_redemption_id: redemptionId,
    });
    if (error) throw error;
    return data;
  },

  async issueRewardRedemption(redemptionId: string) {
    const { data, error } = await supabase.rpc('issue_reward_redemption', {
      p_redemption_id: redemptionId,
    });
    if (error) throw error;
    return data;
  },

  async cancelRewardRedemption(redemptionId: string, reason?: string) {
    const { data, error } = await supabase.rpc('cancel_reward_redemption', {
      p_redemption_id: redemptionId,
      p_reason: reason || null,
    });
    if (error) throw error;
    return data;
  },

  async getTopStudentRewards(limit = 5): Promise<{
    id: string;
    full_name: string;
    unit_name: string;
    total_reward_points: number;
  }[]> {
    try {
      const { data, error } = await supabase.rpc('get_top_student_rewards', { p_limit: limit });
      if (error) {
        console.error('Error calling get_top_student_rewards RPC:', error);
        return [];
      }
      return (data || []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        unit_name: s.unit_name,
        total_reward_points: s.total_reward_points ?? s.available_reward_points ?? 0,
      }));
    } catch (err) {
      console.error('Exception calling get_top_student_rewards:', err);
      return [];
    }
  },

  async getActorAssignments(academicYearId?: string) {
    let query = supabase
      .from('competition_actor_assignments')
      .select(`
        *,
        user:profiles!competition_actor_assignments_user_id_fkey(id, full_name, student_code),
        class:classes(id, name),
        grade_level:grade_levels(id, name)
      `)
      .order('created_at', { ascending: false });

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createActorAssignment(payload: {
    user_id: string;
    assignment_type: 'SUPERVISOR' | 'LIEN_DOI_COMMAND' | 'RED_STAR';
    academic_year_id: string;
    assigned_class_id?: string | null;
    assigned_grade_level_id?: string | null;
    start_date?: string;
    end_date?: string | null;
    can_record_incident?: boolean;
    can_approve_red_star?: boolean;
  }) {
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('competition_actor_assignments')
      .insert({
        user_id: payload.user_id,
        assignment_type: payload.assignment_type,
        academic_year_id: payload.academic_year_id,
        assigned_class_id: payload.assigned_class_id || null,
        assigned_grade_level_id: payload.assigned_grade_level_id || null,
        start_date: payload.start_date || new Date().toISOString().split('T')[0],
        end_date: payload.end_date || null,
        can_record_incident: payload.can_record_incident ?? true,
        can_approve_red_star: payload.can_approve_red_star ?? false,
        created_by: userData.user?.id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateActorAssignment(
    id: string,
    updates: {
      assigned_class_id?: string | null;
      assigned_grade_level_id?: string | null;
      start_date?: string;
      end_date?: string | null;
      is_active?: boolean;
      can_record_incident?: boolean;
      can_approve_red_star?: boolean;
    }
  ) {
    const { data, error } = await supabase
      .from('competition_actor_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteActorAssignment(id: string) {
    const { error } = await supabase
      .from('competition_actor_assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getMyActorAssignments() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_my_competition_actor_assignments');

      if (error) {
        // Attempt fallback direct table query for active assignments
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('competition_actor_assignments')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .lte('start_date', today);

          if (fallbackError) {
            return [];
          }

          const validFallback = (fallbackData || []).filter((item: any) => !item.end_date || item.end_date >= today);
          return validFallback;
        } catch {
          return [];
        }
      }

      return data || [];
    } catch {
      return [];
    }
  },

  async getHomeroomIncidents(programId?: string, limit = 50, offset = 0) {
    const { data, error } = await supabase.rpc('get_homeroom_competition_incidents', {
      p_program_id: programId || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return data || [];
  },

  async searchAssignmentCandidates(params: {
    assignment_type: 'SUPERVISOR' | 'LIEN_DOI_COMMAND' | 'RED_STAR';
    search?: string;
    academic_year_id?: string;
    class_id?: string;
    page?: number;
    page_size?: number;
  }) {
    const { data, error } = await supabase.rpc('search_competition_assignment_candidates', {
      p_assignment_type: params.assignment_type,
      p_search: params.search || null,
      p_academic_year_id: params.academic_year_id || null,
      p_class_id: params.class_id || null,
      p_page: params.page || 1,
      p_page_size: params.page_size || 30,
    });
    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      full_name: string;
      student_code: string | null;
      current_class_id: string | null;
      current_class_name: string | null;
      total_count: number;
    }>;
  },

  // --- AUTO PUBLISH SCHEDULE CONFIG ---
  async getAutoPublishConfig(academicYearId: string) {
    const { data, error } = await supabase.rpc('get_competition_auto_publish_config', {
      p_academic_year_id: academicYearId,
    });
    if (error) {
      console.error('Error getting auto publish config:', error);
      return null;
    }
    return data as CompetitionAutoPublishConfig;
  },

  async saveAutoPublishConfig(academicYearId: string, isEnabled: boolean, publishTimes: string[]) {
    const { data, error } = await supabase.rpc('save_competition_auto_publish_config', {
      p_academic_year_id: academicYearId,
      p_is_enabled: isEnabled,
      p_publish_times: publishTimes,
    });
    if (error) {
      console.error('Error saving auto publish config:', error);
      throw error;
    }
    return data;
  },

  async triggerAutoPublish(academicYearId: string) {
    const { data, error } = await supabase.rpc('trigger_auto_publish_competition', {
      p_academic_year_id: academicYearId,
    });
    if (error) {
      console.error('Error triggering auto publish:', error);
      throw error;
    }
    return data;
  },

  // --- AUTO CREATE COMPETITION WEEKS ---
  async getAutoWeekConfig(academicYearId: string) {
    const { data, error } = await supabase.rpc('get_competition_auto_week_config', {
      p_academic_year_id: academicYearId,
    });
    if (error) {
      console.error('Error getting auto week config:', error);
      throw error;
    }
    return data;
  },

  async saveAutoWeekConfig(academicYearId: string, isEnabled: boolean) {
    const { data, error } = await supabase.rpc('save_competition_auto_week_config', {
      p_academic_year_id: academicYearId,
      p_is_enabled: isEnabled,
    });
    if (error) {
      console.error('Error saving auto week config:', error);
      throw error;
    }
    return data;
  },

  // --- COMPETITION COMMENT TEMPLATES ---
  async getCommentTemplates(commentType?: string, search?: string): Promise<CompetitionCommentTemplate[]> {
    let query = supabase
      .from('competition_comment_templates')
      .select('*')
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });

    if (commentType && commentType !== 'ALL') {
      query = query.eq('comment_type', commentType);
    }

    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%,code.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching comment templates:', error);
      throw error;
    }

    return (data || []) as CompetitionCommentTemplate[];
  },

  async createCommentTemplate(template: Partial<CompetitionCommentTemplate>): Promise<CompetitionCommentTemplate> {
    const codeFormatted = (template.code || '').trim().toUpperCase();
    if (!codeFormatted) {
      throw new Error('Mã nhận xét là bắt buộc.');
    }
    if (!/^[A-Z0-9_]+$/.test(codeFormatted)) {
      throw new Error('Mã nhận xét chỉ được chứa các ký tự IN HOA (A-Z), số (0-9) và dấu gạch dưới (_).');
    }
    if (!template.title?.trim()) {
      throw new Error('Tiêu đề nhận xét là bắt buộc.');
    }
    if (!template.content?.trim()) {
      throw new Error('Nội dung nhận xét là bắt buộc.');
    }
    if (!template.comment_type || !['PRAISE', 'VIOLATION', 'NEUTRAL'].includes(template.comment_type)) {
      throw new Error('Loại nhận xét không hợp lệ.');
    }
    const displayOrder = typeof template.display_order === 'number' && template.display_order >= 0 ? Math.floor(template.display_order) : 0;

    const { data, error } = await supabase
      .from('competition_comment_templates')
      .insert({
        code: codeFormatted,
        title: template.title.trim(),
        content: template.content.trim(),
        comment_type: template.comment_type,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment template:', error);
      if (error.code === '23505') {
        throw new Error(`Mã nhận xét "${codeFormatted}" đã tồn tại. Vui lòng chọn mã khác.`);
      }
      throw new Error(error.message || 'Lỗi khi thêm mẫu nhận xét.');
    }

    return data as CompetitionCommentTemplate;
  },

  async updateCommentTemplate(id: string, template: Partial<CompetitionCommentTemplate>): Promise<CompetitionCommentTemplate> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (template.code !== undefined) {
      const codeFormatted = template.code.trim().toUpperCase();
      if (!codeFormatted) {
        throw new Error('Mã nhận xét là bắt buộc.');
      }
      if (!/^[A-Z0-9_]+$/.test(codeFormatted)) {
        throw new Error('Mã nhận xét chỉ được chứa các ký tự IN HOA (A-Z), số (0-9) và dấu gạch dưới (_).');
      }
      payload.code = codeFormatted;
    }

    if (template.title !== undefined) {
      if (!template.title.trim()) {
        throw new Error('Tiêu đề nhận xét là bắt buộc.');
      }
      payload.title = template.title.trim();
    }

    if (template.content !== undefined) {
      if (!template.content.trim()) {
        throw new Error('Nội dung nhận xét là bắt buộc.');
      }
      payload.content = template.content.trim();
    }

    if (template.comment_type !== undefined) {
      if (!['PRAISE', 'VIOLATION', 'NEUTRAL'].includes(template.comment_type)) {
        throw new Error('Loại nhận xét không hợp lệ.');
      }
      payload.comment_type = template.comment_type;
    }

    if (template.display_order !== undefined) {
      if (typeof template.display_order !== 'number' || template.display_order < 0) {
        throw new Error('Thứ tự hiển thị phải là số nguyên không âm.');
      }
      payload.display_order = Math.floor(template.display_order);
    }

    const { data, error } = await supabase
      .from('competition_comment_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating comment template:', error);
      if (error.code === '23505') {
        throw new Error('Mã nhận xét đã tồn tại. Vui lòng chọn mã khác.');
      }
      throw new Error(error.message || 'Lỗi khi cập nhật mẫu nhận xét.');
    }

    return data as CompetitionCommentTemplate;
  },

  async deleteCommentTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('competition_comment_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting comment template:', error);
      throw new Error(error.message || 'Lỗi khi xóa mẫu nhận xét.');
    }
  },

  async saveWeeklyReport(report: CompetitionWeeklyReport): Promise<CompetitionWeeklyReport> {
    const user = (await supabase.auth.getUser()).data.user;
    
    let creatorName = report.creator_name;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.full_name) {
        creatorName = profile.full_name;
      }
    }

    const payload = {
      period_type: report.period_type || 'WEEK',
      period_label: report.period_label || report.week_name,
      period_start: report.period_start || null,
      period_end: report.period_end || null,
      semester: report.semester ?? null,
      month: report.month ?? null,
      academic_year_id: report.academic_year_id || null,
      academic_year_name: report.academic_year_name,
      week_id: report.week_id || null,
      week_name: report.week_name,
      grade_level_id: report.grade_level_id || null,
      grade_name: report.grade_name,
      total_violations: report.total_violations,
      violation_stats: report.violation_stats || [],
      class_report_rows: report.class_report_rows || [],
      report_config: report.report_config || {},
      supervisor_notes: report.supervisor_notes || '',
      created_by: user?.id || report.created_by || null,
      creator_name: creatorName || 'Giám thị phụ trách',
    };

    let resultReport: CompetitionWeeklyReport | null = null;

    try {
      const { data, error } = await supabase
        .from('competition_weekly_reports')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Database error saving weekly report:', error);
      } else if (data) {
        resultReport = data as CompetitionWeeklyReport;
      }
    } catch (dbErr) {
      console.warn('DB table competition_weekly_reports fallback to local storage:', dbErr);
    }

    const localId = resultReport?.id || `rep-${Date.now()}`;
    const fullReport: CompetitionWeeklyReport = resultReport || {
      ...payload,
      id: localId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const existingStr = localStorage.getItem('competition_weekly_reports_cache') || '[]';
      const existingList: CompetitionWeeklyReport[] = JSON.parse(existingStr);
      const updatedList = [fullReport, ...existingList.filter(r => r.id !== localId)];
      localStorage.setItem('competition_weekly_reports_cache', JSON.stringify(updatedList));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }

    return fullReport;
  },

  async getWeeklyReports(filters?: { academicYearId?: string; weekId?: string; gradeLevelId?: string }): Promise<CompetitionWeeklyReport[]> {
    let dbReports: CompetitionWeeklyReport[] = [];

    try {
      let query = supabase
        .from('competition_weekly_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.academicYearId) {
        query = query.eq('academic_year_id', filters.academicYearId);
      }
      if (filters?.weekId) {
        query = query.eq('week_id', filters.weekId);
      }
      if (filters?.gradeLevelId && filters.gradeLevelId !== 'ALL') {
        query = query.eq('grade_level_id', filters.gradeLevelId);
      }

      const { data, error } = await query;
      if (!error && data) {
        dbReports = data as CompetitionWeeklyReport[];
      }
    } catch (err) {
      console.warn('DB fetch error for weekly reports, using local storage fallback', err);
    }

    let localReports: CompetitionWeeklyReport[] = [];
    try {
      const existingStr = localStorage.getItem('competition_weekly_reports_cache') || '[]';
      localReports = JSON.parse(existingStr);
    } catch (e) {
      localReports = [];
    }

    const map = new Map<string, CompetitionWeeklyReport>();
    dbReports.forEach(r => { if (r.id) map.set(r.id, r); });
    localReports.forEach(r => { if (r.id && !map.has(r.id)) map.set(r.id, r); });

    let result = Array.from(map.values());

    if (filters?.weekId) {
      result = result.filter(r => r.week_id === filters.weekId || !r.week_id);
    }
    if (filters?.gradeLevelId && filters.gradeLevelId !== 'ALL') {
      result = result.filter(r => r.grade_level_id === filters.gradeLevelId || !r.grade_level_id);
    }

    result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return result;
  },

  async deleteWeeklyReport(reportId: string): Promise<void> {
    try {
      await supabase
        .from('competition_weekly_reports')
        .delete()
        .eq('id', reportId);
    } catch (e) {
      console.warn('DB delete error for report:', e);
    }

    try {
      const existingStr = localStorage.getItem('competition_weekly_reports_cache') || '[]';
      const existingList: CompetitionWeeklyReport[] = JSON.parse(existingStr);
      const updatedList = existingList.filter(r => r.id !== reportId);
      localStorage.setItem('competition_weekly_reports_cache', JSON.stringify(updatedList));
    } catch (e) {
      console.error('LocalStorage delete error:', e);
    }
  },
};
