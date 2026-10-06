/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  Filter, 
  User, 
  Users, 
  Image as ImageIcon, 
  ExternalLink, 
  Eye, 
  X, 
  AlertCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { competitionService } from '../../services/competitionService';
import { CompetitionWeek, CompetitionIncident, CompetitionEvidence } from '../../types/competition';
import LoadingState from '../common/LoadingState';
import EmptyState from '../common/EmptyState';

interface WeeklyIncidentsReportCardProps {
  /**
   * Optional prop for restricting classes (e.g. for homeroom teachers GVCN in the future).
   * If provided and non-empty, restricts data and class selection to these class IDs only.
   */
  allowedClassIds?: string[];
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

// Helper to determine if an evidence item is an image
const isImageEvidence = (ev: CompetitionEvidence) => {
  const url = ev.file_url || ev.external_url;
  if (!url) return false;
  if (ev.evidence_type === 'IMAGE') return true;
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)) return true;
  if (url.startsWith('data:image/')) return true;
  if (!/\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv)$/i.test(url)) return true;
  return false;
};

export default function WeeklyIncidentsReportCard({ allowedClassIds }: WeeklyIncidentsReportCardProps) {
  const isHomeroomScoped = Boolean(allowedClassIds && allowedClassIds.length > 0);

  // Main Data States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [weeks, setWeeks] = useState<CompetitionWeek[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeItem[]>([]);
  const [incidents, setIncidents] = useState<CompetitionIncident[]>([]);

  // Filter States
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL'); // 'ALL' or grade_level_id or '6'|'7'|'8'|'9'
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL'); // 'ALL' or class_id

  // Evidence Modal State
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<CompetitionIncident | null>(null);

  // 1. Initialize Academic Year, Weeks, Grade Levels, Classes
  useEffect(() => {
    async function initFilterData() {
      try {
        setLoadingInitial(true);

        // A. Automatically detect current Academic Year (without showing UI selector)
        const academicYears = await competitionService.getAcademicYears();
        const currentYear = academicYears.find(y => y.is_current) || academicYears.find(y => y.is_active) || academicYears[0];
        const currentYearId = currentYear?.id;

        // B. Fetch Weeks, Grade Levels, and Classes in parallel
        const [weeksData, gradesRes, classesData] = await Promise.all([
          competitionService.getWeeks(currentYearId ? { academicYearId: currentYearId } : undefined),
          supabase.from('grade_levels').select('id, name, display_order').order('display_order', { ascending: true }),
          competitionService.getClasses(currentYearId)
        ]);

        // C. Set Weeks and auto-select current or latest week
        setWeeks(weeksData || []);
        if (weeksData && weeksData.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          // Find week where today falls in range [starts_on, ends_on]
          const currentWeek = weeksData.find(w => w.starts_on <= today && w.ends_on >= today)
            || weeksData.find(w => w.status === 'OPEN')
            || weeksData[0];
          setSelectedWeekId(currentWeek.id);
        }

        // D. Set Grade Levels
        const dbGrades: GradeItem[] = (gradesRes.data || []).map((g: any) => ({
          id: g.id,
          name: g.name
        }));
        setGradeLevels(dbGrades);

        // E. Set Classes (filtered by allowedClassIds if provided)
        let availableClasses: ClassItem[] = classesData || [];
        if (allowedClassIds && allowedClassIds.length > 0) {
          availableClasses = availableClasses.filter(c => allowedClassIds.includes(c.id));
        }
        setAllClasses(availableClasses);

        // GVCN: khóa cứng khối + lớp theo homeroom_assignments.
        // Không để trạng thái "Tất cả lớp" dù dữ liệu backend vốn đã bị scope.
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
        console.error('Lỗi khi tải dữ liệu khởi tạo cho Thẻ Ghi nhận trong tuần:', err);
      } finally {
        setLoadingInitial(false);
      }
    }

    initFilterData();
  }, [allowedClassIds]);

  // 2. Computed list of Classes filtered by selected Grade
  const filteredClasses = useMemo(() => {
    if (selectedGrade === 'ALL') {
      return allClasses;
    }

    return allClasses.filter(c => {
      // Direct match on grade_level_id if selectedGrade matches grade ID
      if (c.grade_level_id === selectedGrade) return true;

      // Match grade level by name or level number (e.g., '6', '7', '8', '9' or 'Khối 6')
      const targetGradeNumber = selectedGrade.replace(/\D/g, '');
      if (targetGradeNumber) {
        // Match class name starting with grade number (e.g. 6A1 -> '6')
        const classGradeNumber = c.name.match(/^(\d+)/)?.[1];
        if (classGradeNumber === targetGradeNumber) return true;
      }

      return false;
    });
  }, [allClasses, selectedGrade]);

  // 3. Reset Class filter when Grade filter changes if selectedClassId is no longer in filteredClasses
  const handleGradeChange = (newGrade: string) => {
    setSelectedGrade(newGrade);
    
    // If selectedClassId is not 'ALL', check if it still exists in the newly filtered classes
    if (selectedClassId !== 'ALL') {
      const targetGradeNumber = newGrade.replace(/\D/g, '');
      const isStillValid = allClasses.some(c => {
        if (c.id !== selectedClassId) return false;
        if (newGrade === 'ALL') return true;
        if (c.grade_level_id === newGrade) return true;
        if (targetGradeNumber) {
          const classGradeNumber = c.name.match(/^(\d+)/)?.[1];
          return classGradeNumber === targetGradeNumber;
        }
        return false;
      });

      if (!isStillValid) {
        setSelectedClassId('ALL');
      }
    }
  };

  // 4. Fetch Incidents whenever Week, Grade, or Class filter changes
  useEffect(() => {
    if (loadingInitial || !selectedWeekId) return;

    async function fetchIncidentsData() {
      try {
        setLoadingIncidents(true);

        const currentWeek = weeks.find(w => w.id === selectedWeekId);
        if (!currentWeek) {
          setIncidents([]);
          return;
        }

        // Determine unit filter
        let targetUnitId: string | undefined = undefined;
        let targetUnitIds: string[] | undefined = undefined;

        if (selectedClassId !== 'ALL') {
          targetUnitId = selectedClassId;
        } else if (selectedGrade !== 'ALL') {
          targetUnitIds = filteredClasses.map(c => c.id);
          if (targetUnitIds.length === 0) {
            setIncidents([]);
            setLoadingIncidents(false);
            return;
          }
        } else if (allowedClassIds && allowedClassIds.length > 0) {
          targetUnitIds = allowedClassIds;
        }

        const data = await competitionService.getWeeklyOfficialIncidents({
          weekStartsOn: currentWeek.starts_on,
          weekEndsOn: currentWeek.ends_on,
          unitId: targetUnitId,
          unitIds: targetUnitIds
        });

        setIncidents(data || []);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu vi phạm tuần:', err);
        setIncidents([]);
      } finally {
        setLoadingIncidents(false);
      }
    }

    fetchIncidentsData();
  }, [selectedWeekId, selectedGrade, selectedClassId, weeks, filteredClasses, allowedClassIds, loadingInitial]);

  // Find currently selected week object for info display
  const selectedWeekObj = useMemo(() => {
    return weeks.find(w => w.id === selectedWeekId);
  }, [weeks, selectedWeekId]);

  // Standard formatting helpers
  const formatDateTime = (isoString: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `${dateStr} ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  if (loadingInitial) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <LoadingState message="Đang tải dữ liệu báo cáo tuần..." />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/50 dark:border-red-900/40">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              GHI NHẬN TRONG TUẦN
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tra cứu các vụ việc vi phạm chính thức đã ghi nhận theo tuần, khối và lớp
            </p>
          </div>
        </div>

        {selectedWeekObj && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {new Date(selectedWeekObj.starts_on).toLocaleDateString('vi-VN')} – {new Date(selectedWeekObj.ends_on).toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
        {/* 1. Bộ lọc Tuần */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            1. Chọn Tuần
          </label>
          <select
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
          >
            {weeks.length === 0 ? (
              <option value="">Không có dữ liệu tuần</option>
            ) : (
              weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Tuần {w.week_number}: {w.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 2. Bộ lọc Khối */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            2. Khối lớp
          </label>
          <select
            value={selectedGrade}
            onChange={(e) => handleGradeChange(e.target.value)}
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

        {/* 3. Bộ lọc Lớp (phụ thuộc vào Khối đã chọn) */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            3. Chi đội / Lớp
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

      {/* DATA TABLE AREA */}
      {loadingIncidents ? (
        <LoadingState message="Đang tải danh sách ghi nhận vi phạm..." />
      ) : incidents.length === 0 ? (
        <EmptyState 
          message="Không tìm thấy vi phạm nào" 
          description="Không có ghi nhận vi phạm chính thức nào phù hợp với tuần và bộ lọc hiện tại." 
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Hiển thị <strong>{incidents.length}</strong> vụ việc vi phạm đã được tính điểm chính thức</span>
            <span className="text-[11px] italic">* Sắp xếp mới nhất trước</span>
          </div>

          {/* Table with mobile horizontal scroll wrapper */}
          <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr>
                  <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 w-12 whitespace-nowrap">
                    STT
                  </th>
                  <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 min-w-[200px] whitespace-nowrap">
                    Vi phạm
                  </th>
                  <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 min-w-[150px] whitespace-nowrap">
                    Người vi phạm
                  </th>
                  <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                    Lớp
                  </th>
                  <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                    Minh chứng
                  </th>
                  <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 min-w-[140px] whitespace-nowrap">
                    Người ghi nhận
                  </th>
                  <th className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 min-w-[140px] whitespace-nowrap">
                    Thời điểm
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {incidents.map((item, idx) => {
                  const ruleName = item.rule_name || item.rule?.name || item.title;
                  const studentName = item.student_name || item.student?.full_name;
                  const unitName = item.unit_name || item.unit?.name || 'Chi đội';
                  
                  const hasEvidenceItems = item.evidence_items && item.evidence_items.length > 0;
                  const imageEvidences = (item.evidence_items || []).filter(isImageEvidence);
                  const hasNote = Boolean(item.evidence_note?.trim());

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. STT */}
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-slate-400 align-top">
                        {idx + 1}
                      </td>

                      {/* 2. Vi phạm */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                            {ruleName}
                          </div>
                          {item.title && item.title !== ruleName && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {item.title}
                            </p>
                          )}
                          {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 pt-0.5">
                              "{item.description}"
                            </p>
                          )}
                          {item.rule && item.rule.unit_points !== 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
                              Trừ {Math.abs(item.rule.unit_points)} đ chi đội
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Người vi phạm */}
                      <td className="px-4 py-3.5 align-top">
                        {studentName ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{studentName}</span>
                            </div>
                            {item.student_code && (
                              <div className="text-[11px] font-mono text-slate-400 pl-5">
                                Mã: {item.student_code}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Users className="w-3 h-3" />
                            <span>Tập thể lớp</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Lớp */}
                      <td className="px-4 py-3.5 align-top">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {unitName}
                        </span>
                      </td>

                      {/* 5. Minh chứng */}
                      <td className="px-4 py-3 text-center align-top">
                        {imageEvidences.length > 0 ? (
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setActiveEvidenceModal(item)}
                              className="group relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs hover:ring-2 hover:ring-red-500/50 dark:hover:ring-red-500/50 transition-all shrink-0 cursor-pointer"
                              title="Bấm để xem ảnh minh chứng"
                            >
                              <img
                                src={imageEvidences[0].file_url || imageEvidences[0].external_url || ''}
                                alt="Minh chứng"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              {imageEvidences.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-slate-900/85 dark:bg-black/85 text-white text-[9px] font-extrabold px-1 py-0.5 rounded-tl rounded-br-md leading-none">
                                  +{imageEvidences.length - 1}
                                </span>
                              )}
                            </button>
                          </div>
                        ) : hasEvidenceItems || hasNote ? (
                          <button
                            type="button"
                            onClick={() => setActiveEvidenceModal(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs font-semibold transition-colors cursor-pointer"
                            title="Bấm để xem minh chứng"
                          >
                            {hasNote && !hasEvidenceItems ? (
                              <FileText className="w-3.5 h-3.5" />
                            ) : (
                              <ImageIcon className="w-3.5 h-3.5" />
                            )}
                            <span>Xem</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">—</span>
                        )}
                      </td>

                      {/* 6. Người ghi nhận */}
                      <td className="px-4 py-3.5 align-top">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.recorder_name || 'Hệ thống'}
                        </span>
                      </td>

                      {/* 7. Thời điểm */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(item.occurred_at)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EVIDENCE LIGHTBOX MODAL */}
      {activeEvidenceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Minh chứng vi phạm</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeEvidenceModal.rule_name || activeEvidenceModal.title} — Lớp {activeEvidenceModal.unit_name || 'Chi đội'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveEvidenceModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Note / Text */}
              {activeEvidenceModal.evidence_note && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block">Ghi chú minh chứng:</span>
                  <p className="whitespace-pre-wrap">{activeEvidenceModal.evidence_note}</p>
                </div>
              )}

              {/* Images & Evidence Items */}
              {activeEvidenceModal.evidence_items && activeEvidenceModal.evidence_items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeEvidenceModal.evidence_items.map((ev: CompetitionEvidence, idx: number) => {
                    const imgUrl = ev.file_url || ev.external_url;
                    if (!imgUrl) return null;

                    const isImg = isImageEvidence(ev);

                    if (isImg) {
                      return (
                        <div key={ev.id || idx} className="space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950">
                          <a 
                            href={imgUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block relative rounded-lg overflow-hidden group bg-slate-200 dark:bg-slate-800 aspect-video"
                          >
                            <img 
                              src={imgUrl} 
                              alt={ev.caption || 'Minh chứng'} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-4 h-4" />
                              <span>Mở ảnh lớn</span>
                            </div>
                          </a>
                          {ev.caption && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 italic line-clamp-2">
                              {ev.caption}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={ev.id || idx} className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950">
                        <a 
                          href={imgUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4 shrink-0 text-slate-500" />
                          <span className="truncate flex-1">{ev.caption || 'Tệp đính kèm / Liên kết'}</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !activeEvidenceModal.evidence_note && (
                  <p className="text-xs text-slate-500 text-center py-4">
                    Không có đính kèm hình ảnh minh chứng.
                  </p>
                )
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                Thời điểm: {formatDateTime(activeEvidenceModal.occurred_at)}
              </span>
              <button
                type="button"
                onClick={() => setActiveEvidenceModal(null)}
                className="h-8 px-4 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
