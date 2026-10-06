/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Save, 
  Download, 
  History, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Calendar,
  Layers,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { exportReportToPdf, cleanPeriodLabel } from '../../utils/reportPdfExporter';
import { competitionService } from '../../services/competitionService';
import { 
  competitionReportConfigService, 
  CompetitionReportConfig, 
  DEFAULT_COMPETITION_REPORT_CONFIG 
} from '../../services/competitionReportConfigService';
import { 
  CompetitionIncident, 
  CompetitionWeeklyReport, 
  WeeklyReportRuleStat,
  ClassReportRowSnapshot,
  FormattedStudentViolationGroup,
  ReportPeriodType
} from '../../types/competition';
import LoadingState from '../common/LoadingState';
import EmptyState from '../common/EmptyState';
import { ReportDocument } from './ReportDocument';

interface SaveExportReportCardProps {
  allowedClassIds?: string[];
}

interface PeriodOption {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
}

interface ClassItem {
  id: string;
  name: string;
  grade_level_id?: string | null;
}

interface GradeItem {
  id: string;
  name: string;
}

interface AcademicTermItem {
  id: string;
  academic_year_id: string;
  code: string;
  name: string;
  term_order: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// Group incidents by student and rule for the class report table
export function groupIncidentsByStudentAndRule(classIncidents: CompetitionIncident[]): FormattedStudentViolationGroup[] {
  if (!classIncidents || classIncidents.length === 0) return [];

  const studentMap = new Map<string, {
    studentName: string;
    studentCode?: string | null;
    incidents: CompetitionIncident[];
  }>();

  classIncidents.forEach(inc => {
    const sKey = inc.student_id || inc.student_name || 'COLLECTIVE_CLASS';
    const sName = inc.student_name || (inc.student_id ? 'Học sinh' : 'Tập thể lớp');
    const sCode = inc.student_code || null;

    if (!studentMap.has(sKey)) {
      studentMap.set(sKey, {
        studentName: sName,
        studentCode: sCode,
        incidents: []
      });
    }
    studentMap.get(sKey)!.incidents.push(inc);
  });

  const result: FormattedStudentViolationGroup[] = [];

  studentMap.forEach(sGroup => {
    const ruleMap = new Map<string, {
      ruleName: string;
      times: Date[];
      notes: string[];
    }>();

    sGroup.incidents.forEach(inc => {
      const rKey = inc.rule_id || inc.rule_name || 'Lỗi vi phạm';
      const rName = inc.rule_name || inc.rule?.name || inc.title || 'Lỗi vi phạm';

      if (!ruleMap.has(rKey)) {
        ruleMap.set(rKey, { ruleName: rName, times: [], notes: [] });
      }

      const currentRule = ruleMap.get(rKey)!;

      if (inc.occurred_at) {
        currentRule.times.push(new Date(inc.occurred_at));
      }

      // Ghi chú lỗi do giám thị/người ghi nhận nhập khi tạo sự việc.
      // Chỉ giữ ghi chú có nội dung và loại bỏ bản trùng để báo cáo gọn.
      const note = inc.evidence_note?.trim();
      if (note && !currentRule.notes.includes(note)) {
        currentRule.notes.push(note);
      }
    });

    const rulesList: FormattedStudentViolationGroup['rules'] = [];

    ruleMap.forEach(rGroup => {
      rGroup.times.sort((a, b) => a.getTime() - b.getTime());

      const formattedTimes = rGroup.times.map(d => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month} ${hours}:${mins}`;
      }).join(', ');

      rulesList.push({
        ruleName: rGroup.ruleName,
        count: rGroup.times.length || 1,
        occurrencesStr: formattedTimes || '---',
        notes: rGroup.notes
      });
    });

    result.push({
      studentName: sGroup.studentName,
      studentCode: sGroup.studentCode,
      rules: rulesList
    });
  });

  return result;
}

/**
 * Helper to get current date string (YYYY-MM-DD) in Asia/Ho_Chi_Minh timezone
 */
export function getTodayInVietnam(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Helper to get current month string (YYYY-MM) in Asia/Ho_Chi_Minh timezone
 */
export function getCurrentMonthInVietnam(): string {
  const today = getTodayInVietnam();
  return today.substring(0, 7);
}

/**
 * Helper to find default week ID according to rules:
 * 1. Week containing today (starts_on <= today && ends_on >= today)
 * 2. If none, most recent week that has started (starts_on <= today)
 * 3. Fallback to first week if all weeks are in future
 */
export function findDefaultWeekId(weeks: PeriodOption[], todayStr: string): string {
  if (!weeks || weeks.length === 0) return '';
  
  // 1. Exact week containing today
  const currentWeek = weeks.find(w => w.starts_on <= todayStr && w.ends_on >= todayStr);
  if (currentWeek) return currentWeek.id;

  // 2. Most recent started week
  const startedWeeks = weeks.filter(w => w.starts_on <= todayStr);
  if (startedWeeks.length > 0) {
    startedWeeks.sort((a, b) => b.starts_on.localeCompare(a.starts_on));
    return startedWeeks[0].id;
  }

  // 3. Fallback to first week
  return weeks[0].id;
}

/**
 * Helper to find default month string (YYYY-MM) according to rules:
 * 1. Matches current month if within range
 * 2. Closest month within range if outside
 */
export function findDefaultMonth(monthOptions: { value: string }[], currentMonthStr: string): string {
  if (!monthOptions || monthOptions.length === 0) return '';
  
  const found = monthOptions.find(m => m.value === currentMonthStr);
  if (found) return found.value;

  // If current month is earlier than range, pick first month
  if (currentMonthStr < monthOptions[0].value) {
    return monthOptions[0].value;
  }

  // If current month is later than range, pick last month
  if (currentMonthStr > monthOptions[monthOptions.length - 1].value) {
    return monthOptions[monthOptions.length - 1].value;
  }

  return monthOptions[0].value;
}

/**
 * Helper to find default semester (1 or 2) if DB has configured term dates
 */
export function findDefaultSemester(terms: AcademicTermItem[], todayStr: string): number | null {
  if (!terms || terms.length === 0) return null;

  const currentTerm = terms.find(t => t.start_date && t.end_date && t.start_date <= todayStr && t.end_date >= todayStr);
  if (currentTerm) {
    return currentTerm.term_order || (currentTerm.code.includes('2') ? 2 : 1);
  }

  return null;
}

export default function SaveExportReportCard({ allowedClassIds }: SaveExportReportCardProps) {
  const { user } = useAuth();

  // CMS Template Config
  const [reportConfig, setReportConfig] = useState<CompetitionReportConfig>(
    competitionReportConfigService.getReportConfig()
  );

  // State management
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [currentYearInfo, setCurrentYearInfo] = useState<{ id: string; name: string; start_date?: string; end_date?: string } | null>(null);
  
  // Period Filters State
  const [periodType, setPeriodType] = useState<ReportPeriodType>('WEEK');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [academicTerms, setAcademicTerms] = useState<AcademicTermItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const [weekOptions, setWeekOptions] = useState<PeriodOption[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  
  const [gradeLevels, setGradeLevels] = useState<GradeItem[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL'); // 'ALL' or grade_level_id

  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [incidents, setIncidents] = useState<CompetitionIncident[]>([]);
  
  // GVCN Map and Enrollment Map
  const [homeroomTeacherMap, setHomeroomTeacherMap] = useState<Map<string, string>>(new Map());
  const [classEnrollmentMap, setClassEnrollmentMap] = useState<Map<string, number>>(new Map());

  const [supervisorNotes, setSupervisorNotes] = useState<string>('');
  const [currentUserFullName, setCurrentUserFullName] = useState<string>('Giám thị phụ trách');

  // History & Detail Modal
  const [savedReports, setSavedReports] = useState<CompetitionWeeklyReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDetailReport, setSelectedDetailReport] = useState<CompetitionWeeklyReport | null>(null);
  
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Hidden print element refs for PDF generation
  const printRef = useRef<HTMLDivElement>(null);
  const detailPrintRef = useRef<HTMLDivElement>(null);

  // Dedicated off-screen container ref for stable history PDF export
  const [historyReportToExport, setHistoryReportToExport] = useState<CompetitionWeeklyReport | null>(null);
  const hiddenPrintRef = useRef<HTMLDivElement>(null);

  // Listen for CMS config changes
  useEffect(() => {
    async function syncConfig() {
      const dbCfg = await competitionReportConfigService.fetchReportConfigFromDB();
      setReportConfig(dbCfg);
    }
    syncConfig();

    const handleConfigEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CompetitionReportConfig>;
      if (customEvent.detail) {
        setReportConfig(customEvent.detail);
      }
    };

    window.addEventListener('competition_report_config_updated', handleConfigEvent);
    return () => {
      window.removeEventListener('competition_report_config_updated', handleConfigEvent);
    };
  }, []);

  // 1. Initial Setup
  useEffect(() => {
    async function init() {
      try {
        setLoadingInitial(true);

        // Fetch User Profile Name
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.full_name) {
            setCurrentUserFullName(profile.full_name);
          }
        }

        // Academic Year
        const academicYears = await competitionService.getAcademicYears();
        const currentYear = academicYears.find(y => y.is_current) || academicYears.find(y => y.is_active) || academicYears[0];
        if (currentYear) {
          setCurrentYearInfo({
            id: currentYear.id,
            name: currentYear.name,
            start_date: currentYear.start_date,
            end_date: currentYear.end_date
          });
        }

        // Weeks, Terms, Grades, Classes in parallel
        const [weeksData, termsData, gradesRes, classesData, homeroomRes] = await Promise.all([
          competitionService.getWeeks(currentYear?.id ? { academicYearId: currentYear.id } : undefined),
          competitionService.getAcademicTerms(currentYear?.id),
          supabase.from('grade_levels').select('id, name, display_order').order('display_order', { ascending: true }),
          competitionService.getClasses(currentYear?.id),
          supabase.from('homeroom_assignments').select('class_id, profiles:teacher_id(full_name)').eq('is_active', true)
        ]);

        // Process Academic Terms
        setAcademicTerms(termsData || []);

        // Process Homeroom Teachers Map
        const hMap = new Map<string, string>();
        (homeroomRes.data || []).forEach((item: any) => {
          if (item.class_id && item.profiles?.full_name) {
            hMap.set(item.class_id, item.profiles.full_name);
          }
        });
        setHomeroomTeacherMap(hMap);

        // Fetch Class Student Enrollments
        if (currentYear?.id) {
          const { data: enrollData } = await supabase
            .from('student_enrollments')
            .select('class_id')
            .eq('academic_year_id', currentYear.id);

          const eMap = new Map<string, number>();
          (enrollData || []).forEach((item: any) => {
            if (item.class_id) {
              eMap.set(item.class_id, (eMap.get(item.class_id) || 0) + 1);
            }
          });
          setClassEnrollmentMap(eMap);
        }

        // Process Weeks
        const formattedWeeks: PeriodOption[] = (weeksData || []).map(w => {
          const weekLabel = w.name
            ? (w.name.toLowerCase().includes('tuần') ? w.name : `Tuần ${w.week_number || ''}: ${w.name}`.trim())
            : `Tuần ${w.week_number || ''}`;
          return {
            id: w.id,
            name: weekLabel,
            starts_on: w.starts_on,
            ends_on: w.ends_on
          };
        });
        setWeekOptions(formattedWeeks);

        if (formattedWeeks.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const currIdx = formattedWeeks.findIndex(w => w.starts_on <= today && w.ends_on >= today);
          setSelectedWeekId(formattedWeeks[currIdx >= 0 ? currIdx : 0].id);
        }

        // Process Grades
        setGradeLevels((gradesRes.data || []).map((g: any) => ({ id: g.id, name: g.name })));

        // Process Classes
        let availClasses = classesData || [];
        if (allowedClassIds && allowedClassIds.length > 0) {
          availClasses = availClasses.filter(c => allowedClassIds.includes(c.id));
        }
        setAllClasses(availClasses);

        // Load Saved Reports
        await loadSavedReports(currentYear?.id);

      } catch (err) {
        console.error('Lỗi khởi tạo Thẻ Báo cáo:', err);
      } finally {
        setLoadingInitial(false);
      }
    }

    init();
  }, [allowedClassIds, user]);

  // Load Month Options based on Current Academic Year
  const monthOptions = useMemo(() => {
    if (!currentYearInfo) return [];

    let startY = 2025;
    let startM = 8; // August default start
    let endY = 2026;
    let endM = 6; // June default end

    if (currentYearInfo.start_date && currentYearInfo.end_date) {
      const sParts = currentYearInfo.start_date.split('-');
      const eParts = currentYearInfo.end_date.split('-');
      if (sParts.length === 3 && eParts.length === 3) {
        startY = parseInt(sParts[0], 10);
        startM = parseInt(sParts[1], 10);
        endY = parseInt(eParts[0], 10);
        endM = parseInt(eParts[1], 10);
      }
    } else {
      const match = currentYearInfo.name.match(/(\d{4})[^\d]+(\d{4})/);
      if (match) {
        startY = parseInt(match[1], 10) || 2025;
        endY = parseInt(match[2], 10) || (startY + 1);
        startM = 8;
        endM = 6;
      }
    }

    const list: { value: string; label: string; year: number; month: number; start_date: string; end_date: string }[] = [];
    let currY = startY;
    let currM = startM;

    while (currY < endY || (currY === endY && currM <= endM)) {
      const mStr = String(currM).padStart(2, '0');
      const value = `${currY}-${mStr}`;
      
      const lastDayNum = new Date(currY, currM, 0).getDate();
      const lastDayStr = String(lastDayNum).padStart(2, '0');

      list.push({
        value,
        label: `Tháng ${currM}/${currY}`,
        year: currY,
        month: currM,
        start_date: `${currY}-${mStr}-01`,
        end_date: `${currY}-${mStr}-${lastDayStr}`
      });

      currM++;
      if (currM > 12) {
        currM = 1;
        currY++;
      }
    }

    return list;
  }, [currentYearInfo]);

  // Set default month when monthOptions changes
  useEffect(() => {
    if (monthOptions.length > 0 && !selectedMonth) {
      const today = new Date();
      const todayVal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const foundCurrent = monthOptions.find(m => m.value === todayVal);
      if (foundCurrent) {
        setSelectedMonth(foundCurrent.value);
      } else {
        setSelectedMonth(monthOptions[0].value);
      }
    }
  }, [monthOptions, selectedMonth]);

  // Function to load saved report history
  const loadSavedReports = async (yearId?: string) => {
    try {
      setLoadingHistory(true);
      const reports = await competitionService.getWeeklyReports({
        academicYearId: yearId || currentYearInfo?.id
      });
      setSavedReports(reports || []);
    } catch (e) {
      console.error('Lỗi khi tải lịch sử báo cáo:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Selected Week Object
  const selectedWeekObj = useMemo(() => weekOptions.find(w => w.id === selectedWeekId), [weekOptions, selectedWeekId]);

  // Compute Current Period Info dynamically
  const currentPeriodInfo = useMemo(() => {
    const yearName = currentYearInfo?.name || '2025-2026';

    const formatDateVN = (dStr: string) => {
      if (!dStr) return '';
      const parts = dStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dStr;
    };

    if (periodType === 'YEAR') {
      let start_date = currentYearInfo?.start_date || '';
      let end_date = currentYearInfo?.end_date || '';

      if (!start_date && weekOptions.length > 0) {
        const sortedStarts = [...weekOptions].map(w => w.starts_on).filter(Boolean).sort();
        if (sortedStarts.length > 0) start_date = sortedStarts[0];
      }
      if (!end_date && weekOptions.length > 0) {
        const sortedEnds = [...weekOptions].map(w => w.ends_on).filter(Boolean).sort();
        if (sortedEnds.length > 0) end_date = sortedEnds[sortedEnds.length - 1];
      }

      return {
        period_type: 'YEAR' as ReportPeriodType,
        period_label: `Năm học ${yearName}`,
        period_start: start_date,
        period_end: end_date,
        hasValidDates: Boolean(start_date && end_date),
        missingReason: (!start_date || !end_date) ? 'Chưa có cấu hình ngày bắt đầu/kết thúc năm học trong cơ sở dữ liệu.' : null
      };
    }

    if (periodType === 'SEMESTER') {
      const semesterName = selectedSemester === 1 ? 'Học kỳ I' : 'Học kỳ II';
      const term = academicTerms.find(t => t.term_order === selectedSemester || t.code === `HK${selectedSemester}`);
      const start_date = term?.start_date || '';
      const end_date = term?.end_date || '';

      return {
        period_type: 'SEMESTER' as ReportPeriodType,
        period_label: `${semesterName} - Năm học ${yearName}`,
        period_start: start_date,
        period_end: end_date,
        hasValidDates: Boolean(start_date && end_date),
        missingReason: (!start_date || !end_date) ? `Chưa có cấu hình ngày cho ${semesterName} trong cơ sở dữ liệu.` : null,
        semester: selectedSemester
      };
    }

    if (periodType === 'MONTH') {
      const foundMonth = monthOptions.find(m => m.value === selectedMonth);
      if (!foundMonth) {
        return {
          period_type: 'MONTH' as ReportPeriodType,
          period_label: 'Tháng chưa chọn',
          period_start: '',
          period_end: '',
          hasValidDates: false,
          missingReason: 'Chưa chọn tháng báo cáo.',
          month: null
        };
      }
      return {
        period_type: 'MONTH' as ReportPeriodType,
        period_label: `Tháng ${foundMonth.month}/${foundMonth.year}`,
        period_start: foundMonth.start_date,
        period_end: foundMonth.end_date,
        hasValidDates: true,
        missingReason: null,
        month: foundMonth.month
      };
    }

    // Default: WEEK
    if (!selectedWeekObj) {
      return {
        period_type: 'WEEK' as ReportPeriodType,
        period_label: 'Chưa chọn tuần',
        period_start: '',
        period_end: '',
        hasValidDates: false,
        missingReason: 'Chưa chọn tuần thi đua.',
        week_id: null
      };
    }

    return {
      period_type: 'WEEK' as ReportPeriodType,
      period_label: `${selectedWeekObj.name}: ${formatDateVN(selectedWeekObj.starts_on)} - ${formatDateVN(selectedWeekObj.ends_on)}`,
      period_start: selectedWeekObj.starts_on,
      period_end: selectedWeekObj.ends_on,
      hasValidDates: true,
      missingReason: null,
      week_id: selectedWeekObj.id
    };
  }, [periodType, selectedSemester, selectedMonth, selectedWeekObj, currentYearInfo, academicTerms, monthOptions, weekOptions]);

  // Selected Grade Object
  const selectedGradeObj = useMemo(() => {
    if (selectedGradeId === 'ALL') return { id: 'ALL', name: 'Tất cả khối' };
    const found = gradeLevels.find(g => g.id === selectedGradeId);
    if (found) return found;
    return { id: selectedGradeId, name: `Khối ${selectedGradeId}` };
  }, [gradeLevels, selectedGradeId]);

  // Filtered Classes for selected Grade
  const filteredClasses = useMemo(() => {
    let list = allClasses;
    if (selectedGradeId !== 'ALL') {
      list = allClasses.filter(c => {
        if (c.grade_level_id === selectedGradeId) return true;
        const gradeNum = selectedGradeId.replace(/\D/g, '');
        if (gradeNum && c.name.match(/^(\d+)/)?.[1] === gradeNum) return true;
        return false;
      });
    }

    // Sort naturally by class name
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [allClasses, selectedGradeId]);

  const classMap = useMemo(() => {
    const map = new Map<string, ClassItem>();
    allClasses.forEach(c => map.set(c.id, c));
    return map;
  }, [allClasses]);

  // 2. Fetch Live Incidents when period range or grade changes
  useEffect(() => {
    if (loadingInitial || !currentPeriodInfo.hasValidDates) {
      if (!currentPeriodInfo.hasValidDates) {
        setIncidents([]);
      }
      return;
    }

    async function fetchLiveIncidents() {
      try {
        setLoadingData(true);

        let targetUnitIds: string[] | undefined = undefined;
        if (selectedGradeId !== 'ALL') {
          targetUnitIds = filteredClasses.map(c => c.id);
          if (targetUnitIds.length === 0) {
            setIncidents([]);
            setLoadingData(false);
            return;
          }
        } else if (allowedClassIds && allowedClassIds.length > 0) {
          targetUnitIds = allowedClassIds;
        }

        const res = await competitionService.getWeeklyOfficialIncidents({
          weekStartsOn: currentPeriodInfo.period_start,
          weekEndsOn: currentPeriodInfo.period_end,
          unitIds: targetUnitIds
        });

        setIncidents(res || []);
      } catch (e) {
        console.error('Lỗi khi tải danh sách vi phạm:', e);
        setIncidents([]);
      } finally {
        setLoadingData(false);
      }
    }

    fetchLiveIncidents();
  }, [currentPeriodInfo, selectedGradeId, filteredClasses, allowedClassIds, loadingInitial]);

  // Live Class Report Rows
  const classReportRows = useMemo<ClassReportRowSnapshot[]>(() => {
    return filteredClasses.map((classItem, idx) => {
      const classIncidents = incidents.filter(i => i.unit_id === classItem.id);
      const studentViolationGroups = groupIncidentsByStudentAndRule(classIncidents);
      const homeroomTeacher = homeroomTeacherMap.get(classItem.id) || '---';
      const studentCount = classEnrollmentMap.get(classItem.id) || 0;

      return {
        stt: idx + 1,
        class_id: classItem.id,
        class_name: classItem.name,
        homeroom_teacher_name: homeroomTeacher,
        student_count: studentCount,
        student_violations_groups: studentViolationGroups
      };
    });
  }, [filteredClasses, incidents, homeroomTeacherMap, classEnrollmentMap]);

  // Aggregation of Live Rule Statistics
  const liveStats = useMemo<WeeklyReportRuleStat[]>(() => {
    const rulesMap = new Map<string, {
      ruleId: string;
      ruleName: string;
      count: number;
      classCounts: Map<string, number>;
    }>();

    incidents.forEach(inc => {
      const ruleId = inc.rule_id || inc.rule?.id || inc.title || 'unknown';
      const ruleName = inc.rule_name || inc.rule?.name || inc.title || 'Lỗi không xác định';

      if (!rulesMap.has(ruleId)) {
        rulesMap.set(ruleId, {
          ruleId,
          ruleName,
          count: 0,
          classCounts: new Map()
        });
      }

      const item = rulesMap.get(ruleId)!;
      item.count += 1;

      if (inc.unit_id) {
        item.classCounts.set(inc.unit_id, (item.classCounts.get(inc.unit_id) || 0) + 1);
      }
    });

    const result: WeeklyReportRuleStat[] = [];
    rulesMap.forEach(item => {
      const classEntries: { className: string; count: number }[] = [];
      item.classCounts.forEach((cnt, unitId) => {
        if (selectedGradeId !== 'ALL') {
          if (!filteredClasses.some(c => c.id === unitId)) return;
        }
        const cls = classMap.get(unitId);
        classEntries.push({ className: cls?.name || 'Lớp', count: cnt });
      });

      classEntries.sort((a, b) => b.count - a.count || a.className.localeCompare(b.className));
      const top3 = classEntries.slice(0, 3);
      const topClassesStr = top3.length > 0
        ? top3.map(c => `${c.className} (${c.count} lần)`).join(', ')
        : '—';

      result.push({
        rule_id: item.ruleId,
        rule_name: item.ruleName,
        count: item.count,
        top_classes_str: topClassesStr
      });
    });

    result.sort((a, b) => b.count - a.count || a.rule_name.localeCompare(b.rule_name));
    return result;
  }, [incidents, classMap, filteredClasses, selectedGradeId]);

  const totalViolationsCount = useMemo(() => {
    return incidents.length;
  }, [incidents]);

  // Construct current Live Snapshot Object
  const currentSnapshotObject = useMemo<CompetitionWeeklyReport>(() => {
    return {
      period_type: currentPeriodInfo.period_type,
      period_label: currentPeriodInfo.period_label,
      period_start: currentPeriodInfo.period_start,
      period_end: currentPeriodInfo.period_end,
      semester: currentPeriodInfo.semester || null,
      month: currentPeriodInfo.month || null,
      academic_year_id: currentYearInfo?.id,
      academic_year_name: currentYearInfo?.name || '2025-2026',
      week_id: currentPeriodInfo.week_id || null,
      week_name: currentPeriodInfo.period_label,
      grade_level_id: selectedGradeId === 'ALL' ? null : selectedGradeId,
      grade_name: selectedGradeObj.name,
      total_violations: totalViolationsCount,
      violation_stats: liveStats,
      class_report_rows: classReportRows,
      report_config: reportConfig,
      supervisor_notes: supervisorNotes,
      created_by: user?.id,
      creator_name: currentUserFullName,
      created_at: new Date().toISOString()
    };
  }, [
    currentPeriodInfo,
    currentYearInfo, 
    selectedGradeId, 
    selectedGradeObj, 
    totalViolationsCount, 
    liveStats, 
    classReportRows, 
    reportConfig, 
    supervisorNotes, 
    user, 
    currentUserFullName
  ]);

  // SAVE REPORT ACTION
  const handleSaveReport = async () => {
    if (!currentPeriodInfo.hasValidDates) {
      setErrorToast(currentPeriodInfo.missingReason || 'Không thể lưu báo cáo do thiếu thông tin ngày của kỳ.');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    try {
      setSavingReport(true);
      setErrorToast(null);

      await competitionService.saveWeeklyReport(currentSnapshotObject);
      
      setSuccessToast(`Đã lưu biên bản báo cáo cho ${currentSnapshotObject.period_label} - ${currentSnapshotObject.grade_name}!`);
      setTimeout(() => setSuccessToast(null), 4000);

      // Refresh History
      await loadSavedReports();
    } catch (err: any) {
      console.error('Lỗi khi lưu báo cáo:', err);
      setErrorToast(err.message || 'Lỗi khi lưu báo cáo.');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setSavingReport(false);
    }
  };

  // EXPORT LIVE REPORT PDF
  const handleExportLivePdf = async () => {
    if (!currentPeriodInfo.hasValidDates) {
      setErrorToast(currentPeriodInfo.missingReason || 'Không thể xuất PDF do thiếu thời gian kỳ.');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    if (!printRef.current) {
      console.error('[Export Live PDF Error] printRef.current is null');
      setErrorToast('Không tìm thấy vùng dữ liệu báo cáo xem trước.');
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    try {
      setExportingPdf(true);
      await exportReportToPdf(printRef.current, currentSnapshotObject, false);
      setSuccessToast('Đã xuất file PDF báo cáo thành công!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error('[Export Live PDF Error]', err);
      setErrorToast(err.message || 'Không thể tạo file PDF. Vui lòng thử lại.');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setExportingPdf(false);
    }
  };

  // EXPORT HISTORY / SNAPSHOT PDF
  const handleExportHistoryPdf = (rep: CompetitionWeeklyReport) => {
    setHistoryReportToExport(rep);
  };

  useEffect(() => {
    if (!historyReportToExport) return;

    let isMounted = true;

    const runExport = async () => {
      // Small delay to allow off-screen element to render completely
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!isMounted) return;

      if (!hiddenPrintRef.current) {
        console.error('[Export History PDF Error] hiddenPrintRef.current is null');
        setErrorToast('Không tìm thấy vùng dữ liệu mẫu báo cáo đã lưu.');
        setTimeout(() => setErrorToast(null), 4000);
        setHistoryReportToExport(null);
        return;
      }

      try {
        setExportingPdf(true);
        await exportReportToPdf(hiddenPrintRef.current, historyReportToExport, true);
        if (isMounted) {
          setSuccessToast('Đã xuất file PDF báo cáo lưu trữ thành công!');
          setTimeout(() => setSuccessToast(null), 3000);
        }
      } catch (err: any) {
        console.error('[Export History PDF Error]', err);
        if (isMounted) {
          setErrorToast(err.message || 'Không thể tạo file PDF từ lịch sử. Vui lòng thử lại.');
          setTimeout(() => setErrorToast(null), 4000);
        }
      } finally {
        if (isMounted) {
          setExportingPdf(false);
          setHistoryReportToExport(null);
        }
      }
    };

    runExport();

    return () => {
      isMounted = false;
    };
  }, [historyReportToExport]);

  // DELETE REPORT ACTION
  const handleDeleteReport = async (repId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi báo cáo đã lưu này?')) return;

    try {
      await competitionService.deleteWeeklyReport(repId);
      setSavedReports(prev => prev.filter(r => r.id !== repId));
      if (selectedDetailReport?.id === repId) {
        setSelectedDetailReport(null);
      }
      setSuccessToast('Đã xóa báo cáo khỏi lịch sử.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (e) {
      console.error('Lỗi xóa báo cáo:', e);
      setErrorToast('Không thể xóa báo cáo.');
      setTimeout(() => setErrorToast(null), 3000);
    }
  };

  // Helper badge for period types in history list
  const getPeriodTypeBadge = (type?: ReportPeriodType) => {
    switch (type) {
      case 'YEAR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Năm học</span>;
      case 'SEMESTER':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Học kỳ</span>;
      case 'MONTH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Tháng</span>;
      case 'WEEK':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Tuần</span>;
    }
  };

  if (loadingInitial) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <LoadingState message="Đang khởi tạo module Báo cáo & Xuất file..." />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 font-sans">
      {/* CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-900/40">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              LƯU BÁO CÁO & XUẤT FILE
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lập biên bản tổng kết vi phạm thi đua theo Tuần, Tháng, Học kỳ hoặc Năm học, lưu snapshot cố định và xuất PDF
            </p>
          </div>
        </div>
      </div>

      {/* NOTIFICATION TOASTS */}
      {successToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* FILTER BAR SECTION */}
      <div className="space-y-4 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
        
        {/* ROW 1: LOẠI KỲ SELECTOR (SEGMENTED CONTROL) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>1. Chọn loại kỳ báo cáo</span>
          </label>

          <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-900 rounded-xl gap-1 w-full sm:w-auto max-w-md">
            <button
              type="button"
              onClick={() => setPeriodType('WEEK')}
              className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                periodType === 'WEEK'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tuần
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('MONTH')}
              className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                periodType === 'MONTH'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tháng
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('SEMESTER')}
              className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                periodType === 'SEMESTER'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Học kỳ
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('YEAR')}
              className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                periodType === 'YEAR'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Năm học
            </button>
          </div>
        </div>

        {/* ROW 2: SUB-PICKER & GRADE SELECTOR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* DYNAMIC SUB-PICKER BASED ON PERIOD TYPE */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              2. Chi tiết kỳ ({periodType === 'WEEK' ? 'Tuần' : periodType === 'MONTH' ? 'Tháng' : periodType === 'SEMESTER' ? 'Học kỳ' : 'Năm học'})
            </label>

            {/* CASE 1: TUẦN */}
            {periodType === 'WEEK' && (
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              >
                {weekOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}

            {/* CASE 2: THÁNG */}
            {periodType === 'MONTH' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.start_date.split('-').reverse().join('/')} - {m.end_date.split('-').reverse().join('/')})
                  </option>
                ))}
              </select>
            )}

            {/* CASE 3: HỌC KỲ */}
            {periodType === 'SEMESTER' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSemester(1)}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      selectedSemester === 1
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Học kỳ I
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSemester(2)}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      selectedSemester === 2
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Học kỳ II
                  </button>
                </div>
              </div>
            )}

            {/* CASE 4: NĂM HỌC */}
            {periodType === 'YEAR' && (
              <div className="h-10 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Năm học {currentYearInfo?.name || '2025-2026'}</span>
                <span className="text-xs font-normal text-slate-500">
                  Toàn bộ năm học
                </span>
              </div>
            )}
          </div>

          {/* GRADE SELECTOR */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Chọn Khối
            </label>
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            >
              <option value="ALL">Tất cả khối</option>
              {gradeLevels.length > 0 ? (
                gradeLevels.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name.startsWith('Khối') ? g.name : `Khối ${g.name}`}
                  </option>
                ))
              ) : (
                <>
                  <option value="6">Khối 6</option>
                  <option value="7">Khối 7</option>
                  <option value="8">Khối 8</option>
                  <option value="9">Khối 9</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* WARNING IF DATES ARE MISSING IN DB */}
        {!currentPeriodInfo.hasValidDates && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{currentPeriodInfo.missingReason || 'Chưa có cấu hình ngày cho kỳ đã chọn.'}</span>
          </div>
        )}
      </div>

      {/* REPORT PREVIEW SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Xem trước Biên bản Báo cáo (Live Preview)</span>
          </h3>
          <div className="flex items-center gap-2">
            {/* ACTION 1: LƯU BÁO CÁO */}
            <button
              type="button"
              onClick={handleSaveReport}
              disabled={savingReport || loadingData || !currentPeriodInfo.hasValidDates}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingReport ? 'Đang lưu...' : 'Lưu báo cáo'}</span>
            </button>

            {/* ACTION 2: XUẤT PDF */}
            <button
              type="button"
              onClick={handleExportLivePdf}
              disabled={exportingPdf || loadingData || !currentPeriodInfo.hasValidDates}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exportingPdf ? 'Đang xuất PDF...' : 'Xuất PDF'}</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE PREVIEW CONTAINER */}
        <div className="p-4 sm:p-6 bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {loadingData ? (
            <LoadingState message="Đang tổng hợp dữ liệu biên bản..." />
          ) : !currentPeriodInfo.hasValidDates ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Chưa thể hiển thị xem trước</p>
              <p className="text-xs">{currentPeriodInfo.missingReason}</p>
            </div>
          ) : (
            <ReportDocument 
              ref={printRef}
              report={currentSnapshotObject}
              reportConfig={reportConfig}
              editableNotes={true}
              notesValue={supervisorNotes}
              onNotesChange={setSupervisorNotes}
            />
          )}
        </div>
      </div>

      {/* SAVED REPORT HISTORY SECTION */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Lịch sử Báo cáo đã lưu (Snapshot)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {savedReports.length} bản ghi
          </span>
        </div>

        {loadingHistory ? (
          <LoadingState message="Đang tải lịch sử báo cáo..." />
        ) : savedReports.length === 0 ? (
          <EmptyState 
            message="Chưa có báo cáo nào được lưu" 
            description="Hãy chọn loại kỳ, phạm vi và bấm 'Lưu báo cáo' ở trên để lưu snapshot cố định." 
          />
        ) : (
          <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 w-12 text-center">STT</th>
                  <th className="px-4 py-3">Loại kỳ</th>
                  <th className="px-4 py-3">Tên kỳ báo cáo</th>
                  <th className="px-4 py-3">Khối</th>
                  <th className="px-4 py-3 text-center">Tổng vi phạm</th>
                  <th className="px-4 py-3">Người lập</th>
                  <th className="px-4 py-3">Thời điểm tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {savedReports.map((rep, idx) => (
                  <tr key={rep.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      {getPeriodTypeBadge(rep.period_type)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {cleanPeriodLabel(rep.period_label || rep.week_name)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{rep.grade_name}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">{rep.total_violations} lượt</td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{rep.creator_name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {rep.created_at ? new Date(rep.created_at).toLocaleString('vi-VN') : '---'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailReport(rep)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Xem chi tiết snapshot"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          <span>Xem</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportHistoryPdf(rep)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Xuất lại PDF từ snapshot đã lưu"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Xuất PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => rep.id && handleDeleteReport(rep.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Xóa báo cáo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL SNAPSHOT MODAL */}
      {selectedDetailReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Báo cáo {selectedDetailReport.grade_name} ({cleanPeriodLabel(selectedDetailReport.period_label || selectedDetailReport.week_name)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <ReportDocument 
                ref={detailPrintRef}
                report={selectedDetailReport}
                isSnapshot={true}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDetailReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleExportHistoryPdf(selectedDetailReport)}
                disabled={exportingPdf}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Xuất PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFF-SCREEN CONTAINER FOR STABLE HISTORY PDF EXPORT */}
      <div 
        aria-hidden="true"
        className="fixed -left-[9999px] top-0 w-[848px] bg-white pointer-events-none opacity-0"
      >
        {historyReportToExport && (
          <ReportDocument 
            ref={hiddenPrintRef}
            report={historyReportToExport}
            isSnapshot={true}
          />
        )}
      </div>
    </div>
  );
}
