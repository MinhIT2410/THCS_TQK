/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CommentType = 'PRAISE' | 'VIOLATION' | 'NEUTRAL';

export const COMMENT_TYPE_LABELS: Record<CommentType, string> = {
  PRAISE: 'Tuyên dương',
  VIOLATION: 'Vi phạm',
  NEUTRAL: 'Trung tính',
};

export interface CompetitionCommentTemplate {
  id: string;
  code: string;
  title: string;
  content: string;
  comment_type: CommentType;
  display_order: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CompetitionAssignmentType = 'SUPERVISOR' | 'LIEN_DOI_COMMAND' | 'RED_STAR';

export const COMPETITION_ASSIGNMENT_TYPE_LABELS: Record<CompetitionAssignmentType, string> = {
  SUPERVISOR: 'Giám thị',
  LIEN_DOI_COMMAND: 'Ban Chỉ huy Liên đội',
  RED_STAR: 'Sao đỏ',
};

export interface CompetitionActorAssignment {
  id: string;
  user_id: string;
  assignment_type: CompetitionAssignmentType;
  academic_year_id: string;
  assigned_class_id?: string | null;
  assigned_grade_level_id?: string | null;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  can_record_incident?: boolean;
  can_approve_red_star?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    student_code?: string;
  };
  class?: {
    id: string;
    name: string;
  };
  grade_level?: {
    id: string;
    name: string;
  };
}

export type CompetitionCategory =
  | 'GOOD_DEED'
  | 'ACHIEVEMENT'
  | 'PARTICIPATION'
  | 'DISCIPLINE'
  | 'ATTENDANCE'
  | 'UNIFORM'
  | 'HYGIENE'
  | 'OTHER';

export type CompetitionEffectScope =
  | 'STUDENT_ONLY'
  | 'UNIT_ONLY'
  | 'BOTH'
  | 'RECORD_ONLY';

export type IncidentStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type EvidenceType = 'IMAGE' | 'INTERNAL_LINK' | 'EXTERNAL_LINK';

export type LedgerType = 'STUDENT_MERIT' | 'STUDENT_REWARD' | 'UNIT_COMPETITION';

export type TransactionType = 'CREDIT' | 'DEBIT' | 'REVERSAL' | 'ADJUSTMENT';

export type TransactionStatus = 'PENDING' | 'POSTED' | 'REVERSED';

export type WeekStatus = 'DRAFT' | 'OPEN' | 'LOCKED' | 'PUBLISHED' | 'ARCHIVED';

export const WEEK_STATUS_LABELS: Record<WeekStatus, string> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang mở (Ghi nhận)',
  LOCKED: 'Đã khóa (Chờ duyệt)',
  PUBLISHED: 'Đã công bố',
  ARCHIVED: 'Đã lưu trữ',
};

export const COMPETITION_CATEGORY_LABELS: Record<CompetitionCategory, string> = {
  GOOD_DEED: 'Người tốt - Việc tốt',
  ACHIEVEMENT: 'Thành tích học tập & phong trào',
  PARTICIPATION: 'Tham gia hoạt động',
  DISCIPLINE: 'Kỷ luật & nề nếp',
  ATTENDANCE: 'Chuyên cần',
  UNIFORM: 'Đồng phục & Khăn quàng',
  HYGIENE: 'Vệ sinh & Bảo vệ môi trường',
  OTHER: 'Hành vi khác',
};

export const COMPETITION_SCOPE_LABELS: Record<CompetitionEffectScope, string> = {
  BOTH: 'Đội viên & Chi đội',
  STUDENT_ONLY: 'Chỉ áp dụng Đội viên',
  UNIT_ONLY: 'Chỉ áp dụng Chi đội',
  RECORD_ONLY: 'Chỉ ghi nhận sự việc (Không tính điểm)',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy/Đảo',
};

export interface CompetitionProgram {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CompetitionRecorderType =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'RED_STAR';

export type CompetitionApproverType =
  | 'ADMIN'
  | 'SUPERVISOR';

export interface CompetitionRule {
  id: string;
  program_id: string;
  code: string;
  name: string;
  description?: string | null;
  category: CompetitionCategory;
  effect_scope: CompetitionEffectScope;
  student_merit_points: number;
  student_reward_points: number;
  unit_points: number;
  requires_evidence: boolean;
  requires_approval: boolean;
  allowed_recorder_types?: CompetitionRecorderType[];
  allowed_approver_types?: CompetitionApproverType[];
  daily_limit?: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  program?: CompetitionProgram;
}

export interface CompetitionIncident {
  id: string;
  program_id: string;
  rule_id: string;
  student_id?: string | null;
  unit_id?: string | null;
  occurred_at: string;
  title: string;
  description?: string | null;
  evidence_note?: string | null;
  status: IncidentStatus;
  recorded_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relational data
  program_name?: string;
  rule_name?: string;
  rule?: any;
  student_name?: string;
  student_code?: string;
  unit_name?: string;
  recorder_name?: string;
  approver_name?: string;
  evidence_items?: CompetitionEvidence[];
}

export interface CompetitionEvidence {
  id: string;
  incident_id: string;
  evidence_type: EvidenceType;
  file_url?: string | null;
  external_url?: string | null;
  caption?: string | null;
  display_order: number;
  uploaded_by?: string | null;
  created_at: string;
}

export interface CompetitionPointTransaction {
  id: string;
  incident_id?: string | null;
  adjustment_id?: string | null;
  program_id?: string | null;
  student_id?: string | null;
  unit_id?: string | null;
  ledger_type: LedgerType;
  points: number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  effective_at: string;
  created_by?: string | null;
  reversed_transaction_id?: string | null;
  created_at: string;

  student_name?: string;
  unit_name?: string;
  incident_title?: string;
}

export interface CompetitionWeek {
  id: string;
  program_id: string;
  academic_year_id?: string | null;
  week_number: number;
  name: string;
  starts_on: string;
  ends_on: string;
  status: WeekStatus;
  default_starting_points: number;
  opened_by?: string | null;
  opened_at?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relational fields
  program_name?: string;
  academic_year_name?: string;
}

export interface CompetitionWeekUnit {
  id: string;
  week_id: string;
  unit_id: string;
  starting_points: number;
  manual_bonus_points: number;
  manual_penalty_points: number;
  final_points_snapshot?: number | null;
  rank_snapshot?: number | null;
  comment?: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'EXCLUDED';
  created_at: string;
  updated_at: string;

  // Calculated or joined fields
  unit_name?: string;
  grade_level_id?: string | null;
  grade_name?: string | null;
  current_points?: number;
  total_bonus?: number;
  total_penalty?: number;
  bonus_points?: number;
  deduction_points?: number;
  final_score?: number;
  incident_bonus_points?: number;
  incident_penalty_points?: number;
  total_bonus_points?: number;
  total_penalty_points?: number;
  total_points?: number;
  rank?: number | null;
  incident_count?: number;
}

export interface CompetitionWeekAdjustment {
  id: string;
  week_id: string;
  unit_id: string;
  points: number;
  reason: string;
  evidence_url?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requested_by: string;
  approved_by?: string | null;
  created_at: string;
  approved_at?: string | null;

  unit_name?: string;
  requester_name?: string;
  approver_name?: string;
}

export type ReviewRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export const REVIEW_REQUEST_STATUS_LABELS: Record<ReviewRequestStatus, string> = {
  PENDING: 'Chờ xem xét',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

export type RedemptionStatus = 'PENDING' | 'APPROVED' | 'ISSUED' | 'REJECTED' | 'CANCELLED';

export const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  ISSUED: 'Đã nhận quà',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

export interface CompetitionReviewRequest {
  id: string;
  incident_id?: string | null;
  transaction_id?: string | null;
  student_id: string;
  reason: string;
  evidence_url?: string | null;
  status: ReviewRequestStatus;
  submitted_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;

  student_name?: string;
  student_code?: string;
  unit_name?: string;
  reviewer_name?: string;
  incident_title?: string;
}

export interface RewardItem {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  points_required: number;
  quantity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RewardRedemption {
  id: string;
  student_id: string;
  reward_item_id: string;
  quantity: number;
  points_per_item: number;
  total_points: number;
  status: RedemptionStatus;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  issued_by?: string | null;
  issued_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined
  student_name?: string;
  student_code?: string;
  unit_name?: string;
  reward_name?: string;
  reward_image_url?: string;
  approver_name?: string;
  issuer_name?: string;
}

export interface StudentCompetitionProfile {
  student_id: string;
  full_name: string;
  student_code?: string;
  avatar_url?: string;
  unit_info?: {
    has_unit: boolean;
    class_id?: string;
    class_name?: string;
    academic_year_id?: string;
    message?: string;
  };
  accumulated_merit_points: number;
  posted_reward_points: number;
  reserved_reward_points: number;
  available_reward_points: number;
  good_deeds_count: number;
  achievements_count: number;
  violations_count: number;
  unit_contribution_points: number;
}

export interface CompetitionAutoPublishConfig {
  id?: string;
  academic_year_id: string;
  is_enabled: boolean;
  publish_times: string[];
  last_published_at?: string | null;
  next_publish_at?: string | null;
}

export interface CompetitionAutoWeekConfig {
  academic_year_id: string;
  is_enabled: boolean;
  last_week_created_at?: string | null;
  next_week_starts_on?: string | null;
  next_week_ends_on?: string | null;
}

export interface CompetitionAutoLockConfig {
  academic_year_id: string;
  is_enabled: boolean;
  lock_isodow: number;
  lock_time: string;
  last_auto_lock_run_at?: string | null;
  last_week_locked_at?: string | null;
  next_lock_at?: string | null;
}

export interface WeeklyReportRuleStat {
  rule_id: string;
  rule_name: string;
  count: number;
  top_classes_str: string;
}

export interface FormattedStudentViolationGroup {
  studentName: string;
  studentCode?: string | null;
  rules: {
    ruleName: string;
    count: number;
    occurrencesStr: string;
  }[];
}

export interface ClassReportRowSnapshot {
  stt: number;
  class_id: string;
  class_name: string;
  homeroom_teacher_name: string;
  student_count: number;
  student_violations_groups: FormattedStudentViolationGroup[];
}

export type ReportPeriodType = 'YEAR' | 'SEMESTER' | 'MONTH' | 'WEEK';

export interface CompetitionWeeklyReport {
  id?: string;
  period_type?: ReportPeriodType;
  period_label?: string;
  period_start?: string;
  period_end?: string;
  semester?: number | null;
  month?: number | null;
  academic_year_id?: string | null;
  academic_year_name: string;
  week_id?: string | null;
  week_name: string;
  grade_level_id?: string | null;
  grade_name: string;
  total_violations: number;
  violation_stats: WeeklyReportRuleStat[];
  supervisor_notes: string;
  class_report_rows?: ClassReportRowSnapshot[];
  report_config?: any;
  created_by?: string | null;
  creator_name: string;
  created_at?: string;
  updated_at?: string;
}

