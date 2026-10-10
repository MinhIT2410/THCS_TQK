/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherAttendanceForm from './TeacherAttendanceForm';
import { 
  Search, 
  UserCheck, 
  AlertTriangle, 
  Award, 
  Clock, 
  Upload, 
  Link as LinkIcon, 
  X, 
  CheckCircle2, 
  Sparkles,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Building2,
  Plus,
  ArrowRight,
  Check,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { competitionService } from '../../services/competitionService';
import { supabase } from '../../lib/supabase/client';
import { ROUTES } from '../../config/routes';
import { 
  CompetitionProgram, 
  CompetitionRule, 
  CompetitionWeek,
  CompetitionRecorderType,
  COMPETITION_CATEGORY_LABELS, 
  COMPETITION_SCOPE_LABELS 
} from '../../types/competition';
import { 
  removeVietnameseTones, 
  normalizeClassSearch, 
  compareClassNames, 
  sortClassesNaturally 
} from '../../utils/classSortUtils';

interface CompetitionIncidentFormProps {
  onNavigateToPrograms?: () => void;
}

interface StudentOption {
  id: string;
  full_name: string;
  student_code?: string | null;
  avatar_url?: string | null;
  unit?: {
    class_id: string;
    class_name: string;
    academic_year_name?: string;
  } | null;
}

interface ClassOption {
  id: string;
  name: string;
  grade_level_id?: string;
  academic_year_id?: string;
}

interface SelectedStudent {
  id: string;
  full_name: string;
  student_code?: string | null;
  class_id?: string | null;
  class_name?: string | null;
}

export default function CompetitionIncidentForm({ onNavigateToPrograms }: CompetitionIncidentFormProps) {
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();

  // Target Mode state: 'STUDENT' (Cá nhân) vs 'UNIT' (Chi đội / Tập thể)
  const [targetMode, setTargetMode] = useState<'STUDENT' | 'UNIT' | 'TEACHER'>('STUDENT');

  // System auto-detected state
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [activeProgram, setActiveProgram] = useState<CompetitionProgram | null>(null);
  const [openWeek, setOpenWeek] = useState<CompetitionWeek | null>(null);
  const [noProgramOrWeekError, setNoProgramOrWeekError] = useState<string | null>(null);

  // User permission scope state
  const [userScope, setUserScope] = useState<{
    isAdminOrStaff: boolean;
    isSupervisor: boolean;
    isRedStar: boolean;
    isLienDoiCommand: boolean;
  }>({
    isAdminOrStaff: false,
    isSupervisor: false,
    isRedStar: false,
    isLienDoiCommand: false,
  });

  // Master Data: Rules & Classes
  const [allRules, setAllRules] = useState<CompetitionRule[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [gradeLevels, setGradeLevels] = useState<{ id: string; name: string }[]>([]);

  // Selection State - Individual Mode
  const [selectedStudents, setSelectedStudents] = useState<SelectedStudent[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<StudentOption[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const studentSearchInputRef = useRef<HTMLInputElement>(null);

  // Selection State - Collective (Unit) Mode
  const [selectedClasses, setSelectedClasses] = useState<ClassOption[]>([]);
  const [classSearchTerm, setClassSearchTerm] = useState<string>('');
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const classSearchInputRef = useRef<HTMLInputElement>(null);
  const classSearchContainerRef = useRef<HTMLDivElement>(null);

  // Behavior / Rule Selection
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [selectedRule, setSelectedRule] = useState<CompetitionRule | null>(null);
  const [showAllBehaviors, setShowAllBehaviors] = useState(false);
  const [behaviorSearchTerm, setBehaviorSearchTerm] = useState('');

  // Additional Information Collapsible
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [occurredAt, setOccurredAt] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<{ file: File; previewUrl: string }[]>([]);

  // Submission Progress & Messages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [lastSubmittedSuccess, setLastSubmittedSuccess] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 1. INITIAL LOAD & AUTO-DETERMINE PROGRAM, WEEK, PERMISSIONS, AND CLASSES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function initData() {
      try {
        setLoadingInitial(true);

        // A. Determine User Roles & Scopes
        const isAdminStaff = hasAnyRole([
          'SUPER_ADMIN',
          'ADMIN',
          'CONTENT_EDITOR',
          'PRINCIPAL',
          'VICE_PRINCIPAL',
          'COMPETITION_RECORD'
        ]);

        let isSupervisor = false;
        let isRedStar = false;
        let isLienDoiCommand = false;

        if (user) {
          // Check Actor Assignments
          try {
            const actorAssignments = await competitionService.getMyActorAssignments();
            const today = new Date().toISOString().split('T')[0];

            (actorAssignments || []).forEach((a: any) => {
              if (a.is_active !== false) {
                const canRecord = a.can_record_incident !== false;
                const isValidStart = !a.start_date || a.start_date <= today;
                const isValidEnd = !a.end_date || a.end_date >= today;

                if (isValidStart && isValidEnd) {
                  if (a.assignment_type === 'SUPERVISOR' && canRecord) isSupervisor = true;
                  if (a.assignment_type === 'LIEN_DOI_COMMAND') isLienDoiCommand = true;
                  if (a.assignment_type === 'RED_STAR' && canRecord) isRedStar = true;
                }
              }
            });
          } catch (err) {
            console.error('[CompetitionIncidentForm] Lỗi tải danh sách nhiệm vụ thi đua:', err);
          }
        }

        const calculatedScope = {
          isAdminOrStaff: isAdminStaff,
          isSupervisor,
          isRedStar,
          isLienDoiCommand,
        };
        setUserScope(calculatedScope);

        // Default Mode selection:
        // SUPERVISOR defaults to 'UNIT'; others default to 'STUDENT'
        if (isSupervisor && !isAdminStaff && !isRedStar) {
          setTargetMode('UNIT');
        } else {
          setTargetMode('STUDENT');
        }

        // B. Auto-determine Active Program
        const programs = await competitionService.getPrograms(true);
        const activeProgs = programs.filter(p => p.is_active);

        if (activeProgs.length === 0) {
          setActiveProgram(null);
          setOpenWeek(null);
          setNoProgramOrWeekError('Hiện tại chưa có chương trình thi đua nào đang hoạt động.');
          setLoadingInitial(false);
          return;
        }

        const prog = activeProgs[0];
        setActiveProgram(prog);

        // C. Auto-determine Open Week for active program
        const weeks = await competitionService.getWeeks({ programId: prog.id });
        const todayStr = new Date().toISOString().split('T')[0];
        const activeWeek = weeks.find(w => w.status === 'OPEN') ||
                           weeks.find(w => w.starts_on <= todayStr && w.ends_on >= todayStr);

        if (!activeWeek) {
          setOpenWeek(null);
          setNoProgramOrWeekError(`Chương trình "${prog.name}" hiện chưa có tuần thi đua nào đang mở. Vui lòng liên hệ Quản trị viên.`);
        } else {
          setOpenWeek(activeWeek);
          setNoProgramOrWeekError(null);
        }

        // D. Load active rules for this program and filter by user's recorder role
        const rules = await competitionService.getRules(prog.id, true);
        const userActorTypes: CompetitionRecorderType[] = [];
        if (calculatedScope.isAdminOrStaff) userActorTypes.push('ADMIN');
        if (calculatedScope.isSupervisor) userActorTypes.push('SUPERVISOR');
        if (calculatedScope.isRedStar) userActorTypes.push('RED_STAR');

        const activeRules = rules.filter(r => {
          if (!r.is_active) return false;
          const allowedRecorders = (r.allowed_recorder_types && r.allowed_recorder_types.length > 0)
            ? r.allowed_recorder_types
            : ['ADMIN', 'SUPERVISOR', 'RED_STAR'];

          if (userActorTypes.length === 0) return false;
          return userActorTypes.some(actor => allowedRecorders.includes(actor));
        });
        setAllRules(activeRules);

        // E. Load Classes
        const fetchedClasses = await competitionService.getClasses();
        setAllClasses(fetchedClasses);

        // Extract Grade Levels
        const gradesMap = new Map<string, string>();
        fetchedClasses.forEach((c: any) => {
          if (c.grade_levels) {
            gradesMap.set(c.grade_levels.id || c.grade_level_id, c.grade_levels.name);
          }
        });
        const gList = Array.from(gradesMap.entries()).map(([id, name]) => ({ id, name }));
        setGradeLevels(gList);

      } catch (err: any) {
        console.error('Failed to initialize incident form:', err);
        const errCode = err?.code || err?.status;
        const errMsg = err?.message || 'Lỗi không xác định';
        if (errCode === '42501' || errCode === 403 || String(errMsg).toLowerCase().includes('permission') || String(errMsg).toLowerCase().includes('policy')) {
          setNoProgramOrWeekError(`Lỗi phân quyền (${errCode || '403'}): Tài khoản của bạn chưa có đủ quyền đọc dữ liệu thi đua.`);
        } else {
          setNoProgramOrWeekError(`Lỗi khởi tạo thi đua (${errCode || 'ERROR'}): ${errMsg}`);
        }
      } finally {
        setLoadingInitial(false);
      }
    }

    initData();
  }, [user, hasAnyRole]);

  // ---------------------------------------------------------------------------
  // 2. CLASSES & STUDENTS FOR RECORDING (SCHOOL-WIDE FOR ALL AUTHORIZED USERS)
  // ---------------------------------------------------------------------------
  const availableClasses = useMemo(() => {
    return sortClassesNaturally(allClasses);
  }, [allClasses]);

  // Click outside & Escape key listeners for class search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        classSearchContainerRef.current &&
        !classSearchContainerRef.current.contains(event.target as Node)
      ) {
        setShowClassDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowClassDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Matching classes for the single class search box
  const matchingClasses = useMemo(() => {
    const trimmed = classSearchTerm.trim();
    if (!trimmed || trimmed.length < 1) {
      return [];
    }

    const unselected = availableClasses.filter(c => !selectedClasses.some(sc => sc.id === c.id));
    const queryNorm = normalizeClassSearch(trimmed);
    const queryRawNorm = removeVietnameseTones(trimmed);

    const matches: { cls: ClassOption; priority: number }[] = [];

    for (const c of unselected) {
      const classNorm = normalizeClassSearch(c.name);
      const classRawNorm = removeVietnameseTones(c.name);

      let priority = 0;
      if (classNorm === queryNorm) {
        priority = 1; // Exact match (e.g. "62" -> "6/2", "610" -> "6/10")
      } else if (classNorm.startsWith(queryNorm) || classRawNorm.startsWith(queryRawNorm)) {
        priority = 2; // StartsWith (e.g. "7" -> "7/1", "7/2")
      } else if (classNorm.includes(queryNorm) || classRawNorm.includes(queryRawNorm)) {
        priority = 3; // Contains
      }

      if (priority > 0) {
        matches.push({ cls: c, priority });
      }
    }

    matches.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return compareClassNames(a.cls.name, b.cls.name);
    });

    return matches.map(m => m.cls).slice(0, 15);
  }, [availableClasses, selectedClasses, classSearchTerm]);

  const handleSelectClass = (cls: ClassOption) => {
    if (selectedClasses.some(c => c.id === cls.id)) {
      setClassSearchTerm('');
      setShowClassDropdown(false);
      return;
    }
    setSelectedClasses(prev => [...prev, cls]);
    setClassSearchTerm('');
    setShowClassDropdown(false);
  };

  const handleRemoveClass = (classId: string) => {
    setSelectedClasses(prev => prev.filter(c => c.id !== classId));
  };

  // ---------------------------------------------------------------------------
  // 3. STUDENT SEARCH WITH DEBOUNCE (SERVER-SIDE SEARCH)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!studentSearchTerm || studentSearchTerm.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const results = await competitionService.searchStudents(studentSearchTerm);
        setStudentSearchResults(results);
      } catch (err) {
        console.error('Student search error:', err);
      } finally {
        setIsSearchingStudents(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [studentSearchTerm]);

  const handleSelectStudent = (s: StudentOption) => {
    if (selectedStudents.some(item => item.id === s.id)) {
      setStudentSearchTerm('');
      setStudentSearchResults([]);
      return;
    }

    setSelectedStudents(prev => [
      ...prev,
      {
        id: s.id,
        full_name: s.full_name,
        student_code: s.student_code,
        class_id: s.unit?.class_id || null,
        class_name: s.unit?.class_name || null,
      },
    ]);
    setStudentSearchTerm('');
    setStudentSearchResults([]);
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // ---------------------------------------------------------------------------
  // 4. DYNAMIC RULES MATCHING & FEATURED BEHAVIORS
  // ---------------------------------------------------------------------------
  const { featuredRules, scopeFilteredRules } = useMemo(() => {
    const scopeFiltered = allRules.filter(r => 
      targetMode === 'STUDENT'
        ? (r.effect_scope === 'STUDENT_ONLY' || r.effect_scope === 'BOTH')
        : (r.effect_scope === 'UNIT_ONLY' || r.effect_scope === 'BOTH')
    );

    const studentKeywords = [
      ['trễ', 'muộn', 'late', 'đi học trễ'],
      ['đồng phục', 'trang phục'],
      ['khăn quàng', 'khăn'],
      ['xả rác', 'rác', 'vệ sinh cá nhân'],
      ['nói chuyện', 'trật tự', 'mất trật tự'],
      ['người tốt', 'việc tốt', 'khen thưởng', 'tuyên dương'],
      ['nội quy', 'vi phạm'],
    ];

    const unitKeywords = [
      ['vệ sinh chưa sạch', 'vệ sinh', 'sạch'],
      ['trực nhật'],
      ['trực lớp', 'trực'],
      ['mất trật tự tập thể', 'trật tự'],
      ['nền nếp', 'vi phạm nền nếp'],
      ['nhiệm vụ', 'không hoàn thành'],
      ['thực hiện tốt', 'tập thể tốt'],
    ];

    const targetKeywords = targetMode === 'STUDENT' ? studentKeywords : unitKeywords;
    const featured: CompetitionRule[] = [];
    const usedIds = new Set<string>();

    for (const group of targetKeywords) {
      const match = scopeFiltered.find(r => {
        if (usedIds.has(r.id)) return false;
        const combinedText = `${r.name} ${r.code} ${r.description || ''}`.toLowerCase();
        return group.some(kw => combinedText.includes(kw));
      });

      if (match) {
        featured.push(match);
        usedIds.add(match.id);
      }
    }

    // Backfill up to 6 featured rules if keyword matches are fewer
    if (featured.length < 6) {
      for (const r of scopeFiltered) {
        if (!usedIds.has(r.id) && featured.length < 6) {
          featured.push(r);
          usedIds.add(r.id);
        }
      }
    }

    return { featuredRules: featured, scopeFilteredRules: scopeFiltered };
  }, [allRules, targetMode]);

  // Automatically select first rule if none selected when rules load
  useEffect(() => {
    if (featuredRules.length > 0 && !selectedRuleId) {
      handleSelectRule(featuredRules[0]);
    } else if (scopeFilteredRules.length > 0 && !selectedRuleId) {
      handleSelectRule(scopeFilteredRules[0]);
    }
  }, [featuredRules, scopeFilteredRules]);

  const handleSelectRule = (rule: CompetitionRule) => {
    setSelectedRuleId(rule.id);
    setSelectedRule(rule);
    setTitle(rule.name);

    // Auto-expand additional info if rule requires evidence
    if (rule.requires_evidence) {
      setShowAdditionalInfo(true);
    }
  };

  // Search filtered rules for "Xem tất cả"
  const searchedRules = useMemo(() => {
    if (!behaviorSearchTerm.trim()) return scopeFilteredRules;
    const term = behaviorSearchTerm.trim().toLowerCase();
    return scopeFilteredRules.filter(
      r => r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term)
    );
  }, [scopeFilteredRules, behaviorSearchTerm]);

  // ---------------------------------------------------------------------------
  // 5. FILE SELECTION & REMOVAL
  // ---------------------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newItems = files.map((file: File) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setEvidenceFiles(prev => [...prev, ...newItems]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ---------------------------------------------------------------------------
  // 6. VALIDATION & SUBMISSION HANDLER
  // ---------------------------------------------------------------------------
  const isEvidenceRequired = selectedRule?.requires_evidence ?? false;
  const hasEvidenceProvided = evidenceFiles.length > 0 || externalUrl.trim().length > 0;

  const canSubmit = useMemo(() => {
    if (loadingInitial || !activeProgram || !openWeek || noProgramOrWeekError) return false;
    if (!selectedRuleId || !selectedRule) return false;
    if (isEvidenceRequired && !hasEvidenceProvided) return false;

    if (targetMode === 'STUDENT') {
      return selectedStudents.length > 0;
    } else {
      return selectedClasses.length > 0;
    }
  }, [
    loadingInitial,
    activeProgram,
    openWeek,
    noProgramOrWeekError,
    selectedRuleId,
    selectedRule,
    isEvidenceRequired,
    hasEvidenceProvided,
    targetMode,
    selectedStudents,
    selectedClasses,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);
    setLastSubmittedSuccess(false);

    if (!canSubmit || !activeProgram || !selectedRule) return;

    if (isEvidenceRequired && !hasEvidenceProvided) {
      setShowAdditionalInfo(true);
      setToastMessage({
        type: 'error',
        text: 'Quy tắc này bắt buộc phải có minh chứng (hình ảnh hoặc liên kết). Vui lòng tải đính kèm.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload evidence files
      const evidenceItems: any[] = [];
      if (evidenceFiles.length > 0) {
        setIsUploading(true);
        for (let i = 0; i < evidenceFiles.length; i++) {
          const publicUrl = await competitionService.uploadEvidenceImage(evidenceFiles[i].file);
          evidenceItems.push({
            evidence_type: 'IMAGE',
            file_url: publicUrl,
            display_order: i,
          });
        }
        setIsUploading(false);
      }

      if (externalUrl.trim()) {
        evidenceItems.push({
          evidence_type: 'EXTERNAL_LINK',
          external_url: externalUrl.trim(),
          display_order: evidenceItems.length,
        });
      }

      const basePayload = {
        program_id: activeProgram.id,
        rule_id: selectedRule.id,
        occurred_at: new Date(occurredAt).toISOString(),
        title: title.trim() || selectedRule.name,
        description: description.trim() || null,
        evidence_note: evidenceNote.trim() || null,
        evidence_items: evidenceItems,
      };

      if (targetMode === 'UNIT') {
        // Multi-Unit Mode: loop through selected classes sequentially
        const total = selectedClasses.length;
        setSubmitProgress({ current: 0, total });

        let successCount = 0;
        let failCount = 0;
        let approvedCount = 0;
        const failedClasses: ClassOption[] = [];

        for (let i = 0; i < selectedClasses.length; i++) {
          const cls = selectedClasses[i];
          setSubmitProgress({ current: i + 1, total });

          try {
            const res = await competitionService.createIncident({
              ...basePayload,
              unit_id: cls.id,
              student_id: null,
            });
            successCount++;
            if (res?.status === 'APPROVED') {
              approvedCount++;
            }
          } catch (err) {
            console.error(`Failed to create incident for class ${cls.name}:`, err);
            failCount++;
            failedClasses.push(cls);
          }
        }

        setSubmitProgress(null);

        if (failCount === 0) {
          const isAutoApproved = approvedCount > 0;
          setToastMessage({
            type: 'success',
            text: isAutoApproved
              ? (total === 1
                  ? `Đã ghi nhận và duyệt trực tiếp cho Lớp ${selectedClasses[0].name}.`
                  : `Đã ghi nhận và duyệt trực tiếp cho ${successCount} Chi đội.`)
              : (total === 1
                  ? `Đã gửi ghi nhận cho Lớp ${selectedClasses[0].name} và chuyển sang Chờ duyệt.`
                  : `Đã gửi ghi nhận cho ${successCount} Chi đội và chuyển sang Chờ duyệt.`),
          });
          setLastSubmittedSuccess(true);
          setSelectedClasses([]);
          setDescription('');
          setEvidenceNote('');
          setExternalUrl('');
          setEvidenceFiles([]);
        } else if (successCount > 0) {
          setToastMessage({
            type: 'warning',
            text: `Đã gửi thành công ${successCount}/${total} Chi đội. Có ${failCount} Chi đội bị lỗi.`,
          });
          setSelectedClasses(failedClasses); // keep failed classes for retry
        } else {
          setToastMessage({
            type: 'error',
            text: 'Không thể tạo ghi nhận cho các Chi đội đã chọn. Vui lòng kiểm tra lại.',
          });
        }

      } else {
        // Individual Mode: loop through selected students sequentially
        const total = selectedStudents.length;
        setSubmitProgress({ current: 0, total });

        let successCount = 0;
        let failCount = 0;
        let approvedCount = 0;
        const failedStudents: SelectedStudent[] = [];

        for (let i = 0; i < selectedStudents.length; i++) {
          const student = selectedStudents[i];
          setSubmitProgress({ current: i + 1, total });

          try {
            const res = await competitionService.createIncident({
              ...basePayload,
              student_id: student.id,
              unit_id: student.class_id || null,
            });
            successCount++;
            if (res?.status === 'APPROVED') {
              approvedCount++;
            }
          } catch (err) {
            console.error(`Failed to create incident for student ${student.full_name}:`, err);
            failCount++;
            failedStudents.push(student);
          }
        }

        setSubmitProgress(null);

        if (failCount === 0) {
          const isAutoApproved = approvedCount > 0;
          setToastMessage({
            type: 'success',
            text: isAutoApproved
              ? `Đã ghi nhận và duyệt thành công ${successCount} sự việc.`
              : `Đã gửi ${successCount} ghi nhận và chuyển sang Chờ duyệt.`,
          });
          setLastSubmittedSuccess(true);
          setSelectedStudents([]);
          setDescription('');
          setEvidenceNote('');
          setExternalUrl('');
          setEvidenceFiles([]);
        } else if (successCount > 0) {
          setToastMessage({
            type: 'warning',
            text: `Đã gửi thành công ${successCount}/${total} ghi nhận. Có ${failCount} học sinh bị lỗi.`,
          });
          setSelectedStudents(failedStudents); // keep failed students for retry
        } else {
          setToastMessage({
            type: 'error',
            text: 'Không thể tạo ghi nhận cho các học sinh đã chọn. Vui lòng kiểm tra lại.',
          });
        }
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Có lỗi xảy ra khi thực hiện ghi nhận.',
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
      setSubmitProgress(null);
    }
  };

  // Label for submit button
  const submitButtonLabel = useMemo(() => {
    if (targetMode === 'STUDENT') {
      if (selectedStudents.length === 0) return 'Chọn học sinh để ghi nhận';
      if (selectedStudents.length === 1) return `Ghi nhận cho ${selectedStudents[0].full_name}`;
      return `Ghi nhận cho ${selectedStudents.length} học sinh`;
    } else {
      if (selectedClasses.length === 0) return 'Chọn Chi đội để ghi nhận';
      if (selectedClasses.length === 1) return `Ghi nhận cho Lớp ${selectedClasses[0].name}`;
      return `Ghi nhận cho ${selectedClasses.length} Chi đội`;
    }
  }, [targetMode, selectedStudents, selectedClasses]);

  // Loading state
  if (loadingInitial) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Đang tự động xác định chương trình & tuần thi đua...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 font-sans">
      {/* Active Program & Week Error Banner */}
      {noProgramOrWeekError && (
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold">{noProgramOrWeekError}</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Ghi nhận thi đua tạm thời bị khóa cho đến khi chương trình hoặc tuần thi đua mới được kích hoạt.
              </p>
            </div>
          </div>
          {onNavigateToPrograms && (
            <button
              type="button"
              onClick={onNavigateToPrograms}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm shrink-0 cursor-pointer text-center"
            >
              Mở tuần thi đua
            </button>
          )}
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : toastMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* SUCCESS ACTION BANNER FOR QUICK REPEAT */}
      {lastSubmittedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            Đã sẵn sàng để tiếp tục ghi nhận hành vi "{selectedRule?.name}"
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setLastSubmittedSuccess(false);
                if (targetMode === 'STUDENT') {
                  setTimeout(() => studentSearchInputRef.current?.focus(), 100);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              + Ghi nhận tiếp
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.COMPETITION)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Về trang Thi đua
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-6 ${targetMode === 'TEACHER' ? '[&>div:not(:first-child)]:hidden' : ''}`}>
        {/* Step 1: Chọn đối tượng ghi nhận */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-normal text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-sans">
              <Users className="w-4 h-4 text-red-600" />
              1. Chọn Đối Tượng Ghi Nhận
            </span>
            <span className="text-xs text-slate-400 font-normal font-sans">Thao tác nhanh, chọn phương thức bên dưới</span>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setTargetMode('STUDENT');
                setSelectedRuleId('');
                setSelectedRule(null);
              }}
              className={`py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer font-sans tracking-normal ${
                targetMode === 'STUDENT'
                  ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-md scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Cá nhân Đội viên</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetMode('UNIT');
                setSelectedRuleId('');
                setSelectedRule(null);
              }}
              className={`py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer font-sans tracking-normal ${
                targetMode === 'UNIT'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Chi đội / Tập thể</span>
            </button>
            <button type="button" onClick={() => { setTargetMode('TEACHER'); setSelectedRuleId(''); setSelectedRule(null); }}
              className={`py-3 px-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer font-sans ${targetMode === 'TEACHER' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-md' : 'text-slate-600 dark:text-slate-400'}`}>
              <UserCheck className="w-4 h-4"/><span>Giáo viên</span>
            </button>
          </div>

          {targetMode === 'TEACHER' && <TeacherAttendanceForm />}
          {/* Target Selector */}
          {targetMode === 'TEACHER' ? null : targetMode === 'STUDENT' ? (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tìm theo tên hoặc mã học sinh <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  ref={studentSearchInputRef}
                  type="text"
                  value={studentSearchTerm}
                  onChange={e => setStudentSearchTerm(e.target.value)}
                  placeholder="Nhập tên hoặc Mã số (VD: Nguyễn Văn A, 2025...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                />
                {isSearchingStudents && (
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 animate-pulse">
                    Đang tìm...
                  </span>
                )}

                {/* Dropdown Results */}
                {studentSearchResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {studentSearchResults.map(s => {
                      const isAlreadySelected = selectedStudents.some(item => item.id === s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          disabled={isAlreadySelected}
                          className={`w-full text-left p-3 transition-colors flex items-center justify-between cursor-pointer ${
                            isAlreadySelected
                              ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{s.full_name}</span>
                              {isAlreadySelected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                  Đã chọn
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              {s.unit?.class_name ? `Lớp ${s.unit.class_name}` : 'Chưa phân lớp'} • Mã HS: {s.student_code || '---'}
                            </div>
                          </div>
                          <Plus className="w-4 h-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Students Chips */}
              {selectedStudents.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Đã chọn ({selectedStudents.length} học sinh):</span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudents([])}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudents.map(s => (
                      <div
                        key={s.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 text-xs text-red-900 dark:text-red-200 font-semibold"
                      >
                        <User className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>{s.full_name}</span>
                        {s.class_name && (
                          <span className="text-[10px] opacity-75 font-mono">({s.class_name})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(s.id)}
                          className="p-0.5 rounded-md hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Chưa chọn học sinh nào. Có thể tìm và chọn nhiều học sinh cho cùng một hành vi.
                </p>
              )}
            </div>
          ) : (
            /* Collective (Unit) Mode Class Picker */
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tìm Chi đội / Lớp <span className="text-red-500">*</span>
              </label>

              <div ref={classSearchContainerRef} className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  ref={classSearchInputRef}
                  type="text"
                  value={classSearchTerm}
                  onChange={e => {
                    const val = e.target.value;
                    setClassSearchTerm(val);
                    setShowClassDropdown(val.trim().length >= 1);
                  }}
                  onFocus={() => {
                    if (classSearchTerm.trim().length >= 1) {
                      setShowClassDropdown(true);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setShowClassDropdown(false);
                    }
                  }}
                  placeholder="Nhập tên lớp (VD: 62, 6/2, 610, 6/10, lớp 7...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />

                {/* Class Search Dropdown */}
                {showClassDropdown && classSearchTerm.trim().length >= 1 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {matchingClasses.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center italic">
                        Không tìm thấy Chi đội phù hợp.
                      </div>
                    ) : (
                      matchingClasses.map(c => {
                        const isAlreadySelected = selectedClasses.some(sc => sc.id === c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClass(c)}
                            disabled={isAlreadySelected}
                            className={`w-full text-left p-3 transition-colors flex items-center justify-between cursor-pointer ${
                              isAlreadySelected
                                ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>Lớp {c.name}</span>
                              {isAlreadySelected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                                  Đã chọn
                                </span>
                              )}
                            </div>
                            <Plus className="w-4 h-4 text-slate-400" />
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected Classes Chips */}
              {selectedClasses.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Đã chọn ({selectedClasses.length} Chi đội / Lớp):</span>
                    <button
                      type="button"
                      onClick={() => setSelectedClasses([])}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedClasses.map(c => (
                      <div
                        key={c.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 font-semibold"
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Lớp {c.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(c.id)}
                          className="p-0.5 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Chưa chọn Chi đội nào. Nhập tên lớp để tìm và chọn nhiều Chi đội cho cùng một hành vi.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Chọn hành vi / quy tắc thi đua */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-normal text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-sans">
              <Award className="w-4 h-4 text-red-600" />
              2. Chọn Hành Vi Thi Đua
            </span>
            <button
              type="button"
              onClick={() => setShowAllBehaviors(prev => !prev)}
              className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer font-sans"
            >
              <span>{showAllBehaviors ? 'Thu gọn' : 'Xem tất cả hành vi'}</span>
              {showAllBehaviors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Featured Behavior Chips */}
          {!showAllBehaviors ? (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-normal font-sans">
                Hành vi thường dùng:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {featuredRules.map(rule => {
                  const isSelected = selectedRuleId === rule.id;
                  const isNegative = (rule.student_merit_points < 0 || rule.unit_points < 0);
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => handleSelectRule(rule)}
                      className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer font-sans ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20 scale-[1.02]'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white hover:border-red-400'
                      }`}
                    >
                      <div className="font-semibold text-xs line-clamp-2 tracking-normal font-sans">{rule.name}</div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`font-mono font-semibold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isNegative
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {targetMode === 'STUDENT'
                            ? rule.student_merit_points > 0 ? `+${rule.student_merit_points}` : rule.student_merit_points
                            : rule.unit_points > 0 ? `+${rule.unit_points}` : rule.unit_points} đ
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Extended Searchable Behavior Grid */
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={behaviorSearchTerm}
                  onChange={e => setBehaviorSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã quy tắc..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {searchedRules.map(rule => {
                  const isSelected = selectedRuleId === rule.id;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => handleSelectRule(rule)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer font-sans ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-red-400 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs tracking-normal font-sans">{rule.name}</div>
                      <div className="text-[10px] opacity-80 mt-1 font-mono">
                        Mã: {rule.code} • Phù hợp: {COMPETITION_SCOPE_LABELS[rule.effect_scope] || rule.effect_scope}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Behavior Details Pill */}
          {selectedRule && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Đã chọn: <span className="text-red-600 dark:text-red-400">{selectedRule.name}</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                  {COMPETITION_CATEGORY_LABELS[selectedRule.category] || selectedRule.category}
                </span>
                {selectedRule.requires_evidence && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                    ⚠️ Bắt buộc minh chứng
                  </span>
                )}
                {selectedRule.requires_approval ? (
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[10px]">
                    Cần duyệt
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[10px]">
                    Tự động duyệt
                  </span>
                )}
              </div>
              {selectedRule.description && (
                <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                  "{selectedRule.description}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Thông tin bổ sung */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <button
            type="button"
            onClick={() => setShowAdditionalInfo(prev => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Thông tin bổ sung (Thời gian, Mô tả, Minh chứng)</span>
              {isEvidenceRequired && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                  Bắt buộc mở
                </span>
              )}
            </span>
            {showAdditionalInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdditionalInfo && (
            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Thời gian xảy ra
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={e => setOccurredAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Tiêu đề sự việc
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Mặc định lấy theo tên hành vi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Mô tả chi tiết / Diễn biến / Địa điểm
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ghi rõ diễn biến sự việc, địa điểm (nếu có)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              {/* Evidence Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Minh chứng đính kèm {isEvidenceRequired && <span className="text-red-500 font-bold">* (Bắt buộc)</span>}
                  </label>
                </div>

                <input
                  type="text"
                  value={evidenceNote}
                  onChange={e => setEvidenceNote(e.target.value)}
                  placeholder="Ghi chú minh chứng (VD: Biên bản số 02/...)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:border-red-500 cursor-pointer justify-center">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>Chọn ảnh minh chứng</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>

                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={e => setExternalUrl(e.target.value)}
                      placeholder="Dán URL minh chứng..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {/* Uploaded File Previews */}
                {evidenceFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {evidenceFiles.map((item, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img src={item.previewUrl} alt="Minh chứng" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Nút ghi nhận */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full py-3.5 sm:py-4 px-6 rounded-xl sm:rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-sans tracking-normal"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {isUploading
                    ? 'Đang tải minh chứng...'
                    : submitProgress
                    ? `Đang ghi nhận (${submitProgress.current}/${submitProgress.total})...`
                    : 'Đang gửi...'}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{submitButtonLabel}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
