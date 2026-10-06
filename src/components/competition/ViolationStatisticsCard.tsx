/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { supabase } from '../../lib/supabase/client';
import { competitionService } from '../../services/competitionService';
import { CompetitionWeek, CompetitionIncident } from '../../types/competition';
import LoadingState from '../common/LoadingState';
import EmptyState from '../common/EmptyState';

interface ViolationStatisticsCardProps {
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
  academic_year_id?: string | null;
}

interface GradeItem {
  id: string;
  name: string;
  level_number?: number;
}

interface AggregatedRuleViolation {
  ruleId: string;
  ruleName: string;
  currentCount: number;
  milestoneCount: number;
  diff: number;
  topClassesStr: string;
}

export default function ViolationStatisticsCard({ allowedClassIds }: ViolationStatisticsCardProps) {
  const isHomeroomScoped = Boolean(allowedClassIds && allowedClassIds.length > 0);

  // Main Data States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  
  const [periodType, setPeriodType] = useState<'WEEK' | 'MONTH'>('WEEK');
  
  const [weekOptions, setWeekOptions] = useState<PeriodOption[]>([]);
  const [monthOptions, setMonthOptions] = useState<PeriodOption[]>([]);
  
  const [currentPeriodId, setCurrentPeriodId] = useState<string>('');
  const [milestonePeriodId, setMilestonePeriodId] = useState<string>('');
  
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL'); // 'ALL' or grade_level_id or '6'|'7'|'8'|'9'
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL'); // 'ALL' or class_id
  
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeItem[]>([]);
  
  const [currentIncidents, setCurrentIncidents] = useState<CompetitionIncident[]>([]);
  const [milestoneIncidents, setMilestoneIncidents] = useState<CompetitionIncident[]>([]);

  // 1. Initial Load: Academic Year, Weeks, Months, Grades, Classes
  useEffect(() => {
    async function initData() {
      try {
        setLoadingInitial(true);

        // A. Automatically detect current Academic Year
        const academicYears = await competitionService.getAcademicYears();
        const currentYear = academicYears.find(y => y.is_current) || academicYears.find(y => y.is_active) || academicYears[0];
        const currentYearId = currentYear?.id;

        // B. Fetch Weeks, Grades, Classes in parallel
        const [weeksData, gradesRes, classesData] = await Promise.all([
          competitionService.getWeeks(currentYearId ? { academicYearId: currentYearId } : undefined),
          supabase.from('grade_levels').select('id, name, display_order').order('display_order', { ascending: true }),
          competitionService.getClasses(currentYearId)
        ]);

        // C. Process Weeks
        const formattedWeeks: PeriodOption[] = (weeksData || []).map(w => ({
          id: w.id,
          name: `Tuần ${w.week_number}: ${w.name}`,
          starts_on: w.starts_on,
          ends_on: w.ends_on
        }));
        setWeekOptions(formattedWeeks);

        // Default week selection: current week or latest week
        if (formattedWeeks.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const currIdx = formattedWeeks.findIndex(w => w.starts_on <= today && w.ends_on >= today);
          const activeIdx = currIdx >= 0 ? currIdx : 0;
          
          setCurrentPeriodId(formattedWeeks[activeIdx].id);
          // Set milestone period to previous week (or next if index is last)
          const milestoneIdx = activeIdx + 1 < formattedWeeks.length ? activeIdx + 1 : Math.max(0, activeIdx - 1);
          setMilestonePeriodId(formattedWeeks[milestoneIdx].id);
        }

        // D. Generate Month Options based on academic year name (e.g. "2025-2026" or current year)
        let startYearNum = new Date().getFullYear();
        let endYearNum = startYearNum + 1;
        if (currentYear?.name) {
          const yearMatch = currentYear.name.match(/(\d{4})\s*-\s*(\d{4})/);
          if (yearMatch) {
            startYearNum = parseInt(yearMatch[1], 10);
            endYearNum = parseInt(yearMatch[2], 10);
          }
        }

        const febLastDay = new Date(endYearNum, 2, 0).getDate();

        const generatedMonths: PeriodOption[] = [
          { id: `m-${startYearNum}-09`, name: `Tháng 09/${startYearNum}`, starts_on: `${startYearNum}-09-01`, ends_on: `${startYearNum}-09-30` },
          { id: `m-${startYearNum}-10`, name: `Tháng 10/${startYearNum}`, starts_on: `${startYearNum}-10-01`, ends_on: `${startYearNum}-10-31` },
          { id: `m-${startYearNum}-11`, name: `Tháng 11/${startYearNum}`, starts_on: `${startYearNum}-11-01`, ends_on: `${startYearNum}-11-30` },
          { id: `m-${startYearNum}-12`, name: `Tháng 12/${startYearNum}`, starts_on: `${startYearNum}-12-01`, ends_on: `${startYearNum}-12-31` },
          { id: `m-${endYearNum}-01`, name: `Tháng 01/${endYearNum}`, starts_on: `${endYearNum}-01-01`, ends_on: `${endYearNum}-01-31` },
          { id: `m-${endYearNum}-02`, name: `Tháng 02/${endYearNum}`, starts_on: `${endYearNum}-02-01`, ends_on: `${endYearNum}-02-${febLastDay.toString().padStart(2, '0')}` },
          { id: `m-${endYearNum}-03`, name: `Tháng 03/${endYearNum}`, starts_on: `${endYearNum}-03-01`, ends_on: `${endYearNum}-03-31` },
          { id: `m-${endYearNum}-04`, name: `Tháng 04/${endYearNum}`, starts_on: `${endYearNum}-04-01`, ends_on: `${endYearNum}-04-30` },
          { id: `m-${endYearNum}-05`, name: `Tháng 05/${endYearNum}`, starts_on: `${endYearNum}-05-01`, ends_on: `${endYearNum}-05-31` },
        ];
        setMonthOptions(generatedMonths);

        // E. Process Grade Levels
        const dbGrades: GradeItem[] = (gradesRes.data || []).map((g: any) => ({
          id: g.id,
          name: g.name
        }));
        setGradeLevels(dbGrades);

        // F. Process Classes
        let availableClasses: ClassItem[] = classesData || [];
        if (allowedClassIds && allowedClassIds.length > 0) {
          availableClasses = availableClasses.filter(c => allowedClassIds.includes(c.id));
        }
        setAllClasses(availableClasses);

        // GVCN: khóa cứng phạm vi vào đúng lớp chủ nhiệm.
        if (allowedClassIds && allowedClassIds.length > 0 && availableClasses.length > 0) {
          const homeroomClass = availableClasses[0];
          setSelectedClassId(homeroomClass.id);
          if (homeroomClass.grade_level_id) {
            setSelectedGrade(homeroomClass.grade_level_id);
          } else {
            const gradeNum = homeroomClass.name.match(/^(\d+)/)?.[1];
            if (gradeNum) setSelectedGrade(gradeNum);
          }
        }

      } catch (err) {
        console.error('Lỗi khi khởi tạo bộ lọc Thống kê Lỗi Vi phạm:', err);
      } finally {
        setLoadingInitial(false);
      }
    }

    initData();
  }, [allowedClassIds]);

  // Active list of period options based on selected periodType
  const currentOptionsList = useMemo(() => {
    return periodType === 'WEEK' ? weekOptions : monthOptions;
  }, [periodType, weekOptions, monthOptions]);

  // Handle switching Period Type (Tuần <-> Tháng)
  const handlePeriodTypeChange = (newType: 'WEEK' | 'MONTH') => {
    setPeriodType(newType);
    const targetList = newType === 'WEEK' ? weekOptions : monthOptions;
    if (targetList.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let currIdx = targetList.findIndex(p => p.starts_on <= today && p.ends_on >= today);
      if (currIdx < 0) currIdx = 0;

      setCurrentPeriodId(targetList[currIdx].id);
      const milestoneIdx = currIdx + 1 < targetList.length ? currIdx + 1 : Math.max(0, currIdx - 1);
      setMilestonePeriodId(targetList[milestoneIdx].id);
    }
  };

  // Filtered classes matching current Grade filter
  const filteredClasses = useMemo(() => {
    if (selectedGrade === 'ALL') {
      return allClasses;
    }

    return allClasses.filter(c => {
      if (c.grade_level_id === selectedGrade) return true;
      const targetGradeNumber = selectedGrade.replace(/\D/g, '');
      if (targetGradeNumber) {
        const classGradeNumber = c.name.match(/^(\d+)/)?.[1];
        if (classGradeNumber === targetGradeNumber) return true;
      }
      return false;
    });
  }, [allClasses, selectedGrade]);

  // Map of unit_id -> class object for quick lookup
  const classMap = useMemo(() => {
    const map = new Map<string, ClassItem>();
    allClasses.forEach(c => map.set(c.id, c));
    return map;
  }, [allClasses]);

  // Fetch Incident Data for both periods
  useEffect(() => {
    if (loadingInitial || !currentPeriodId || !milestonePeriodId) return;

    async function fetchComparisonData() {
      try {
        setLoadingIncidents(true);

        const currentOpt = currentOptionsList.find(p => p.id === currentPeriodId);
        const milestoneOpt = currentOptionsList.find(p => p.id === milestonePeriodId);

        if (!currentOpt || !milestoneOpt) {
          setCurrentIncidents([]);
          setMilestoneIncidents([]);
          return;
        }

        // Determine unit IDs filter
        let targetUnitIds: string[] | undefined = undefined;
        if (selectedClassId !== 'ALL') {
          targetUnitIds = [selectedClassId];
        } else if (selectedGrade !== 'ALL') {
          targetUnitIds = filteredClasses.map(c => c.id);
        } else if (allowedClassIds && allowedClassIds.length > 0) {
          targetUnitIds = allowedClassIds;
        }

        if (targetUnitIds && targetUnitIds.length === 0) {
          setCurrentIncidents([]);
          setMilestoneIncidents([]);
          setLoadingIncidents(false);
          return;
        }

        // Fetch official APPROVED incidents for both periods in parallel
        const [currentRes, milestoneRes] = await Promise.all([
          competitionService.getWeeklyOfficialIncidents({
            weekStartsOn: currentOpt.starts_on,
            weekEndsOn: currentOpt.ends_on,
            unitIds: targetUnitIds
          }),
          competitionService.getWeeklyOfficialIncidents({
            weekStartsOn: milestoneOpt.starts_on,
            weekEndsOn: milestoneOpt.ends_on,
            unitIds: targetUnitIds
          })
        ]);

        setCurrentIncidents(currentRes || []);
        setMilestoneIncidents(milestoneRes || []);

      } catch (err) {
        console.error('Lỗi khi tải dữ liệu so sánh vi phạm:', err);
        setCurrentIncidents([]);
        setMilestoneIncidents([]);
      } finally {
        setLoadingIncidents(false);
      }
    }

    fetchComparisonData();
  }, [currentPeriodId, milestonePeriodId, selectedGrade, selectedClassId, currentOptionsList, filteredClasses, allowedClassIds, loadingInitial]);

  // Selected period display objects
  const currentPeriodObj = useMemo(() => currentOptionsList.find(p => p.id === currentPeriodId), [currentOptionsList, currentPeriodId]);
  const milestonePeriodObj = useMemo(() => currentOptionsList.find(p => p.id === milestonePeriodId), [currentOptionsList, milestonePeriodId]);

  // Aggregation & Top 3 Logic
  const aggregatedRows = useMemo<AggregatedRuleViolation[]>(() => {
    const rulesMap = new Map<string, {
      ruleId: string;
      ruleName: string;
      currentCount: number;
      milestoneCount: number;
      classCounts: Map<string, number>; // classId -> count
    }>();

    // Helper to get or create rule item
    const getOrCreate = (ruleId: string, ruleName: string) => {
      if (!rulesMap.has(ruleId)) {
        rulesMap.set(ruleId, {
          ruleId,
          ruleName,
          currentCount: 0,
          milestoneCount: 0,
          classCounts: new Map<string, number>()
        });
      }
      return rulesMap.get(ruleId)!;
    };

    // 1. Process Current Incidents
    currentIncidents.forEach(inc => {
      const ruleId = inc.rule_id || inc.rule?.id || inc.title || 'unknown';
      const ruleName = inc.rule_name || inc.rule?.name || inc.title || 'Lỗi không xác định';
      const item = getOrCreate(ruleId, ruleName);
      item.currentCount += 1;

      if (inc.unit_id) {
        const prevCount = item.classCounts.get(inc.unit_id) || 0;
        item.classCounts.set(inc.unit_id, prevCount + 1);
      }
    });

    // 2. Process Milestone Incidents
    milestoneIncidents.forEach(inc => {
      const ruleId = inc.rule_id || inc.rule?.id || inc.title || 'unknown';
      const ruleName = inc.rule_name || inc.rule?.name || inc.title || 'Lỗi không xác định';
      const item = getOrCreate(ruleId, ruleName);
      item.milestoneCount += 1;
    });

    // 3. Format result rows & compute Top 3 Classes
    const rows: AggregatedRuleViolation[] = [];

    rulesMap.forEach((data) => {
      const diff = data.currentCount - data.milestoneCount;

      // Compute Top 3 classes for this rule in current period
      const classEntries: { className: string; count: number }[] = [];
      data.classCounts.forEach((count, unitId) => {
        // Ensure unit belongs to current grade filter if restricted
        if (selectedGrade !== 'ALL') {
          const isMatchGrade = filteredClasses.some(c => c.id === unitId);
          if (!isMatchGrade) return;
        }

        const cls = classMap.get(unitId);
        const name = cls?.name || 'Lớp';
        classEntries.push({ className: name, count });
      });

      // Sort by count desc, className asc
      classEntries.sort((a, b) => b.count - a.count || a.className.localeCompare(b.className));

      // Slice top 3
      const top3 = classEntries.slice(0, 3);
      const topClassesStr = top3.length > 0
        ? top3.map(c => `${c.className} (${c.count} lần)`).join(', ')
        : '—';

      rows.push({
        ruleId: data.ruleId,
        ruleName: data.ruleName,
        currentCount: data.currentCount,
        milestoneCount: data.milestoneCount,
        diff,
        topClassesStr
      });
    });

    // Sort table rows: highest current violations first, then milestone violations, then rule name
    rows.sort((a, b) => b.currentCount - a.currentCount || b.milestoneCount - a.milestoneCount || a.ruleName.localeCompare(b.ruleName));

    return rows;
  }, [currentIncidents, milestoneIncidents, classMap, filteredClasses, selectedGrade, selectedClassId]);

  if (loadingInitial) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <LoadingState message="Đang khởi tạo thống kê lỗi vi phạm..." />
      </div>
    );
  }

  const currentLabel = currentPeriodObj?.name || 'Kỳ đang xem';
  const milestoneLabel = milestonePeriodObj?.name || 'Kỳ mốc';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-900/40">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              THỐNG KÊ LỖI VI PHẠM
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              So sánh số lượng lượt vi phạm giữa các kỳ, theo dõi xu hướng biến động và các lớp vi phạm nhiều nhất
            </p>
          </div>
        </div>

        {/* Period Type Switcher */}
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handlePeriodTypeChange('WEEK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodType === 'WEEK'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Theo Tuần
          </button>
          <button
            type="button"
            onClick={() => handlePeriodTypeChange('MONTH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodType === 'MONTH'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Theo Tháng
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
        {/* 1. Kỳ đang xem */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            1. Kỳ đang xem
          </label>
          <select
            value={currentPeriodId}
            onChange={(e) => setCurrentPeriodId(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
          >
            {currentOptionsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. So sánh với kỳ mốc */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            2. So sánh với kỳ mốc
          </label>
          <select
            value={milestonePeriodId}
            onChange={(e) => setMilestonePeriodId(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
          >
            {currentOptionsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Lọc theo Khối */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            3. Khối lớp
          </label>
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              if (!isHomeroomScoped) setSelectedClassId('ALL');
            }}
            disabled={isHomeroomScoped}
            className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {!isHomeroomScoped && <option value="ALL">Tất cả khối</option>}
            {gradeLevels.length > 0 ? (
              gradeLevels
                .filter((g) => !isHomeroomScoped || allClasses.some(c => c.grade_level_id === g.id))
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name.startsWith('Khối') ? g.name : `Khối ${g.name}`}
                  </option>
                ))
            ) : (
              <>
                {!isHomeroomScoped && <option value="6">Khối 6</option>}
                {!isHomeroomScoped && <option value="7">Khối 7</option>}
                {!isHomeroomScoped && <option value="8">Khối 8</option>}
                {!isHomeroomScoped && <option value="9">Khối 9</option>}
              </>
            )}
          </select>
        </div>

        {/* 4. Lọc theo Lớp */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            4. Lớp
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={isHomeroomScoped}
            className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {!isHomeroomScoped && <option value="ALL">Tất cả lớp</option>}
            {filteredClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          {isHomeroomScoped && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Chỉ xem dữ liệu lớp chủ nhiệm của bạn.
            </p>
          )}
        </div>
      </div>

      {/* DATA CONTENT AREA */}
      {loadingIncidents ? (
        <LoadingState message="Đang tổng hợp dữ liệu so sánh vi phạm..." />
      ) : aggregatedRows.length === 0 ? (
        <EmptyState 
          message="Không có dữ liệu vi phạm" 
          description="Khái niệm không ghi nhận lượt vi phạm nào trong cả 2 kỳ được chọn." 
        />
      ) : (
        <div className="space-y-6">
          {/* COMPARISON SUMMARY TABLE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Thống kê chi tiết <strong>{aggregatedRows.length}</strong> loại lỗi vi phạm</span>
              <span className="text-[11px] italic">* Tăng (+) = vi phạm nhiều hơn; Giảm (-) = vi phạm ít hơn</span>
            </div>

            <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr>
                    <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 w-12 whitespace-nowrap">
                      STT
                    </th>
                    <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 min-w-[220px] whitespace-nowrap">
                      Tên lỗi vi phạm
                    </th>
                    <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      Số lượt ({currentPeriodObj ? currentPeriodObj.name.split(':')[0] : 'Kỳ đang xem'})
                    </th>
                    <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      So với kỳ mốc ({milestonePeriodObj ? milestonePeriodObj.name.split(':')[0] : 'Kỳ mốc'})
                    </th>
                    <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 min-w-[220px] whitespace-nowrap">
                      Lớp vi phạm nhiều
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {aggregatedRows.map((row, idx) => {
                    const isIncrease = row.diff > 0;
                    const isDecrease = row.diff < 0;

                    return (
                      <tr key={row.ruleId || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* STT */}
                        <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Tên lỗi */}
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                          {row.ruleName}
                        </td>

                        {/* Số lượt vi phạm kỳ đang xem */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm">
                            {row.currentCount}
                          </span>
                        </td>

                        {/* So với kỳ mốc */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {isIncrease ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>+{row.diff}</span>
                            </span>
                          ) : isDecrease ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              <span>{row.diff}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Minus className="w-3 h-3" />
                              <span>0</span>
                            </span>
                          )}
                        </td>

                        {/* Lớp vi phạm nhiều */}
                        <td className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {row.topClassesStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* GROUPED BAR CHART */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Biểu đồ so sánh lượt vi phạm giữa 2 kỳ</span>
              </h3>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="w-full h-[320px] sm:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={aggregatedRows}
                    margin={{ top: 20, right: 20, left: -10, bottom: 65 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="ruleName"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tick={{ fontSize: 11, fill: '#64748b' }} 
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} lượt`, name]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px'
                      }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }} 
                    />
                    <Bar 
                      dataKey="currentCount" 
                      name={`${currentLabel} (Kỳ đang xem)`} 
                      fill="#e11d48" 
                      radius={[4, 4, 0, 0]} 
                    />
                    <Bar 
                      dataKey="milestoneCount" 
                      name={`${milestoneLabel} (Kỳ mốc)`} 
                      fill="#64748b" 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
