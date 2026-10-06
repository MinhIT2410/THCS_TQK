/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  PlusCircle, 
  Lock, 
  Unlock, 
  Send, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Calendar, 
  Award, 
  FileText, 
  CheckCircle, 
  X, 
  Edit3, 
  ChevronRight,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import { 
  CompetitionProgram, 
  CompetitionWeek, 
  CompetitionWeekUnit, 
  WEEK_STATUS_LABELS 
} from '../../../types/competition';

export default function WeeklyUnitsTab() {
  const [programs, setPrograms] = useState<CompetitionProgram[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<CompetitionWeek[]>([]);
  
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  const [currentWeek, setCurrentWeek] = useState<CompetitionWeek | null>(null);
  const [units, setUnits] = useState<CompetitionWeekUnit[]>([]);
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState<number>(0);
  const [totalIncidentsCount, setTotalIncidentsCount] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isOpenWeekModalOpen, setIsOpenWeekModalOpen] = useState(false);
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedUnitForAdj, setSelectedUnitForAdj] = useState<CompetitionWeekUnit | null>(null);

  // Unit details drawer
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState<CompetitionWeekUnit | null>(null);
  const [unitDetails, setUnitDetails] = useState<any[]>([]);
  const [loadingUnitDetails, setLoadingUnitDetails] = useState(false);
  const [unitCommentInput, setUnitCommentInput] = useState('');

  // Form states
  const [openWeekForm, setOpenWeekForm] = useState({
    program_id: '',
    academic_year_id: '',
    week_number: 1,
    name: 'Tuần 1',
    starts_on: new Date().toISOString().split('T')[0],
    ends_on: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    default_starting_points: 100,
  });

  const [adjForm, setAdjForm] = useState({
    points: 5,
    reason: '',
    evidence_url: '',
  });

  // Load initial reference data
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      const [progs, years] = await Promise.all([
        competitionService.getPrograms(),
        competitionService.getAcademicYears(),
      ]);

      setPrograms(progs);
      setAcademicYears(years);

      const activeProg = progs.find(p => p.is_active) || progs[0];
      const currentYear =
        years.find((y: any) => y.is_current === true) ||
        years.find((y: any) => y.is_active === true) ||
        years[0];

      if (activeProg) setSelectedProgramId(activeProg.id);
      if (currentYear) setSelectedYearId(currentYear.id);

      if (activeProg && currentYear) {
        setOpenWeekForm(prev => ({
          ...prev,
          program_id: activeProg.id,
          academic_year_id: currentYear.id,
        }));
      }
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setMessage({ type: 'error', text: err.message || 'Lỗi tải dữ liệu ban đầu.' });
    } finally {
      setLoading(false);
    }
  }

  // Load weeks when program or year selection changes
  useEffect(() => {
    if (selectedProgramId) {
      loadWeeks();
    }
  }, [selectedProgramId, selectedYearId]);

  async function loadWeeks() {
    try {
      const weekList = await competitionService.getWeeks({
        programId: selectedProgramId,
        academicYearId: selectedYearId || undefined,
      });

      setWeeks(weekList);
      if (weekList.length > 0) {
        setSelectedWeekId(weekList[0].id);
      } else {
        setSelectedWeekId('');
        setCurrentWeek(null);
        setUnits([]);
      }
    } catch (err: any) {
      console.error('Error loading weeks:', err);
    }
  }

  // Load week details & units when selectedWeekId changes
  useEffect(() => {
    if (selectedWeekId) {
      loadWeekSummary(selectedWeekId);
    }
  }, [selectedWeekId]);

  async function loadWeekSummary(weekId: string) {
    try {
      setLoading(true);
      const summary = await competitionService.getWeekSummary(weekId);
      setCurrentWeek(summary.week);
      setUnits(summary.units);
      setPendingIncidentsCount(summary.pendingIncidentsCount);
      setTotalIncidentsCount(summary.totalIncidentsCount);
    } catch (err: any) {
      console.error('Error loading week summary:', err);
      setMessage({ type: 'error', text: err.message || 'Lỗi tải thông tin tuần thi đua.' });
    } finally {
      setLoading(false);
    }
  }

  // Action Handlers
  async function handleOpenWeekSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setActionLoading(true);
      setMessage(null);

      const res = await competitionService.openWeek(openWeekForm);
      setMessage({ type: 'success', text: res.message || 'Đã mở tuần thi đua mới thành công!' });
      setIsOpenWeekModalOpen(false);
      await loadWeeks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể mở tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLockWeek() {
    if (!currentWeek) return;
    if (!window.confirm(`Bạn có chắc chắn muốn KHÓA ${currentWeek.name}? Khi bị khóa, các sự việc ghi nhận trong khoảng thời gian này sẽ tạm thời không nhận bổ sung.`)) return;

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await competitionService.lockWeek(currentWeek.id);
      setMessage({ type: 'success', text: res.message });
      await loadWeekSummary(currentWeek.id);
      await loadWeeks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khóa tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnlockWeek() {
    if (!currentWeek) return;
    const reason = window.prompt(`Mở lại ${currentWeek.name}. Nhập lý do mở lại:`);
    if (reason === null) return;

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await competitionService.unlockWeek(currentWeek.id, reason);
      setMessage({ type: 'success', text: res.message });
      await loadWeekSummary(currentWeek.id);
      await loadWeeks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi mở lại tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFinalizeWeek() {
    if (!currentWeek) return;
    if (pendingIncidentsCount > 0) {
      alert(`Không thể chốt tuần! Vẫn còn ${pendingIncidentsCount} sự việc đang CHỜ DUYỆT trong khoảng thời gian của tuần này. Vui lòng duyệt hoặc từ chối tất cả sự việc trước khi chốt tuần.`);
      return;
    }

    if (!window.confirm(`XÁC NHẬN CHỐT VÀ CÔNG BỐ ${currentWeek.name}?\n\n- Hệ thống sẽ tính tổng điểm chính thức cho toàn bộ chi đội.\n- Tạo ảnh chụp thứ hạng (rank_snapshot) cho từng chi đội.\n- Công bố kết quả công khai trên Cổng Thi Đua Chi Đội.`)) return;

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await competitionService.finalizeWeek(currentWeek.id);
      setMessage({ type: 'success', text: res.message });
      await loadWeekSummary(currentWeek.id);
      await loadWeeks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi chốt tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddAdjustmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWeek || !selectedUnitForAdj) return;

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await competitionService.createAdjustment({
        week_id: currentWeek.id,
        unit_id: selectedUnitForAdj.unit_id,
        points: Number(adjForm.points),
        reason: adjForm.reason,
        evidence_url: adjForm.evidence_url,
      });

      setMessage({ type: 'success', text: res.message });
      setIsAdjModalOpen(false);
      setAdjForm({ points: 5, reason: '', evidence_url: '' });
      await loadWeekSummary(currentWeek.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể tạo điều chỉnh điểm.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOpenUnitDetail(unit: CompetitionWeekUnit) {
    if (!currentWeek) return;
    setSelectedUnitForDetail(unit);
    setUnitCommentInput(unit.comment || '');
    setLoadingUnitDetails(true);

    try {
      const details = await competitionService.getUnitWeekDetails(currentWeek.id, unit.unit_id);
      setUnitDetails(details);
    } catch (err: any) {
      console.error('Error fetching unit week details:', err);
    } finally {
      setLoadingUnitDetails(false);
    }
  }

  async function handleSaveComment() {
    if (!selectedUnitForDetail) return;
    try {
      setActionLoading(true);
      await competitionService.updateUnitWeekComment(selectedUnitForDetail.id, unitCommentInput);
      setMessage({ type: 'success', text: 'Đã cập nhật nhận xét cho chi đội.' });
      if (currentWeek) loadWeekSummary(currentWeek.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể lưu nhận xét.' });
    } finally {
      setActionLoading(false);
    }
  }

  const filteredUnits = units.filter(u => {
    if (selectedGrade === 'ALL') return true;
    const gradeStr = selectedGrade;
    if ((u as any).grade_level && String((u as any).grade_level) === gradeStr) return true;
    if ((u as any).grade_level_id && String((u as any).grade_level_id) === gradeStr) return true;
    if ((u as any).grade_name && String((u as any).grade_name).includes(gradeStr)) return true;

    if (u.unit_name) {
      const match = u.unit_name.trim().match(/(?:Lớp\s*|Chi đội\s*|Khối\s*)?([6789])/i);
      if (match && match[1] === gradeStr) return true;
    }
    return false;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Filter Bar & Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* Program selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Chương trình
              </label>
              <select
                value={selectedProgramId}
                onChange={e => setSelectedProgramId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
              >
                {programs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Academic year selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Năm học
              </label>
              <select
                value={selectedYearId}
                onChange={e => setSelectedYearId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_current ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Week selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Chọn tuần thi đua
              </label>
              <select
                value={selectedWeekId}
                onChange={e => setSelectedWeekId(e.target.value)}
                disabled={weeks.length === 0}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white disabled:opacity-50"
              >
                {weeks.length === 0 ? (
                  <option value="">Chưa có tuần nào</option>
                ) : (
                  weeks.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.starts_on} - {w.ends_on}) [{WEEK_STATUS_LABELS[w.status]}]
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={() => {
                const nextNum = weeks.length + 1;
                setOpenWeekForm(prev => ({
                  ...prev,
                  week_number: nextNum,
                  name: `Tuần ${nextNum}`,
                }));
                setIsOpenWeekModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Mở Tuần Mới</span>
            </button>

            <button
              onClick={() => selectedWeekId && loadWeekSummary(selectedWeekId)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition-all"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Overview Stats & Lifecycle Actions */}
      {currentWeek && (
        <div className="space-y-6">
          {/* Status Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900 dark:text-white">
                  {currentWeek.name}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    currentWeek.status === 'OPEN'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : currentWeek.status === 'LOCKED'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                      : currentWeek.status === 'PUBLISHED'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                      : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {WEEK_STATUS_LABELS[currentWeek.status]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Thời gian: <strong className="text-slate-800 dark:text-slate-200">{currentWeek.starts_on}</strong> đến <strong className="text-slate-800 dark:text-slate-200">{currentWeek.ends_on}</strong>
                </span>
                <span>•</span>
                <span>Điểm khởi đầu: <strong className="text-slate-800 dark:text-slate-200">{currentWeek.default_starting_points} điểm</strong></span>
              </div>
            </div>

            {/* Lifecycle Buttons */}
            <div className="flex items-center gap-3">
              {currentWeek.status === 'OPEN' && (
                <button
                  onClick={handleLockWeek}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Khóa Tuần</span>
                </button>
              )}

              {(currentWeek.status === 'LOCKED' || currentWeek.status === 'PUBLISHED') && (
                <button
                  onClick={handleUnlockWeek}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-2xl bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Mở Lại Tuần</span>
                </button>
              )}

              {currentWeek.status !== 'PUBLISHED' && (
                <button
                  onClick={handleFinalizeWeek}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Chốt & Công Bố Tuần</span>
                </button>
              )}
            </div>
          </div>

          {/* Pending Incidents Warning Banner */}
          {pendingIncidentsCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-800 dark:text-amber-300 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold">
                    Cảnh báo: Có {pendingIncidentsCount} sự việc đang CHỜ DUYỆT trong tuần này!
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    Hệ thống yêu cầu duyệt hoặc từ chối toàn bộ sự việc phát sinh trong tuần trước khi thực hiện chốt tuần.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Units Leaderboard Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Bảng Xếp Hạng Thi Đua Chi Đội ({filteredUnits.length} Chi đội)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentWeek.status === 'PUBLISHED' 
                    ? 'Kết quả chính thức đã chốt và công bố' 
                    : 'Điểm số đang tự động tổng hợp theo sổ giao dịch UNIT_COMPETITION'}
                </p>
              </div>

              {/* Grade Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                {['ALL', '6', '7', '8', '9'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrade(g)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedGrade === g
                        ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {g === 'ALL' ? 'Tất cả khối' : `Khối ${g}`}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                Đang tổng hợp điểm số thi đua...
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Chưa có chi đội nào thuộc khối đã chọn trong tuần thi đua này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-16 text-center">Hạng</th>
                      <th className="py-3 px-4">Chi đội</th>
                      <th className="py-3 px-4 text-center">Khởi điểm</th>
                      <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">Vi phạm</th>
                      <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">Điểm thưởng</th>
                      <th className="py-3 px-4 text-center">Điều chỉnh khác</th>
                      <th className="py-3 px-4 text-center font-black">Tổng</th>
                      <th className="py-3 px-4">Nhận xét</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredUnits.map((unit) => {
                      const rank = unit.rank ?? unit.rank_snapshot ?? '-';
                      const isTop3 = typeof rank === 'number' && rank <= 3;

                      return (
                        <tr 
                          key={unit.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-bold">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black ${
                                rank === 1
                                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                                  : rank === 2
                                  ? 'bg-slate-300 text-slate-900 shadow-sm'
                                  : rank === 3
                                  ? 'bg-amber-700 text-amber-50 shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {unit.unit_name}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                            {unit.starting_points ?? 100}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                            {unit.incident_penalty_points ? `-${unit.incident_penalty_points}` : 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {unit.incident_bonus_points ? `+${unit.incident_bonus_points}` : 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {(() => {
                              const adjustment = (unit.manual_bonus_points ?? 0) - (unit.manual_penalty_points ?? 0);
                              return adjustment > 0 ? `+${adjustment}` : adjustment;
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-700">
                              {unit.current_points ?? unit.starting_points ?? 100}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {unit.comment || <span className="italic opacity-50">Chưa có nhận xét</span>}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedUnitForAdj(unit);
                                  setIsAdjModalOpen(true);
                                }}
                                disabled={currentWeek.status !== 'OPEN'}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all disabled:opacity-40"
                                title="Điều chỉnh điểm tập thể"
                              >
                                Điều chỉnh
                              </button>
                              <button
                                onClick={() => handleOpenUnitDetail(unit)}
                                className="p-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 font-bold text-[11px] transition-all flex items-center gap-1"
                                title="Xem lịch sử & sự việc"
                              >
                                <span>Chi tiết</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Open New Week */}
      {isOpenWeekModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg font-display text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-red-600" />
                Mở Tuần Thi Đua Mới
              </h3>
              <button onClick={() => setIsOpenWeekModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenWeekSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số tuần (*)</label>
                  <input
                    type="number"
                    min={1}
                    value={openWeekForm.week_number}
                    onChange={e => setOpenWeekForm(prev => ({ ...prev, week_number: parseInt(e.target.value) || 1 }))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tên hiển thị (*)</label>
                  <input
                    type="text"
                    value={openWeekForm.name}
                    onChange={e => setOpenWeekForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày bắt đầu (*)</label>
                  <input
                    type="date"
                    value={openWeekForm.starts_on}
                    onChange={e => setOpenWeekForm(prev => ({ ...prev, starts_on: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày kết thúc (*)</label>
                  <input
                    type="date"
                    value={openWeekForm.ends_on}
                    onChange={e => setOpenWeekForm(prev => ({ ...prev, ends_on: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm khởi đầu mỗi Chi đội (*)</label>
                <input
                  type="number"
                  value={openWeekForm.default_starting_points}
                  onChange={e => setOpenWeekForm(prev => ({ ...prev, default_starting_points: parseInt(e.target.value) || 100 }))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenWeekModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold shadow-md shadow-red-600/20"
                >
                  {actionLoading ? 'Đang mở tuần...' : 'Xác nhận mở tuần'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Point Adjustment */}
      {isAdjModalOpen && selectedUnitForAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base font-display text-slate-900 dark:text-white">
                Điều chỉnh điểm: <span className="text-red-600">{selectedUnitForAdj.unit_name}</span>
              </h3>
              <button onClick={() => setIsAdjModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdjustmentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số điểm điều chỉnh (Dương = Cộng điểm, Âm = Trừ điểm) (*)
                </label>
                <input
                  type="number"
                  value={adjForm.points}
                  onChange={e => setAdjForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Lý do điều chỉnh (*)</label>
                <textarea
                  rows={3}
                  value={adjForm.reason}
                  onChange={e => setAdjForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Nhập lý do thưởng/phạt tập thể chi đội..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold shadow-md shadow-red-600/20"
                >
                  Lưu giao dịch điều chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal 3: Unit Detail & Incident Log */}
      {selectedUnitForDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-xl font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-red-600" />
                  Sổ Điểm Chi Tiết: {selectedUnitForDetail.unit_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentWeek?.name} ({currentWeek?.starts_on} - {currentWeek?.ends_on})
                </p>
              </div>
              <button 
                onClick={() => setSelectedUnitForDetail(null)}
                className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comment Section */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
              <label className="block font-bold text-slate-800 dark:text-white">
                Nhận xét Tổng phụ trách dành cho Chi đội:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unitCommentInput}
                  onChange={e => setUnitCommentInput(e.target.value)}
                  placeholder="Nhập nhận xét thi đua tuần..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                />
                <button
                  onClick={handleSaveComment}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold hover:opacity-90 transition-all"
                >
                  Lưu nhận xét
                </button>
              </div>
            </div>

            {/* Incident History List */}
            <div className="space-y-4 flex-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                Lịch Sử Sự Việc & Giao Dịch Điểm Tuần Này
              </h4>

              {loadingUnitDetails ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Đang lấy chi tiết sự việc...
                </div>
              ) : unitDetails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  Không có sự việc hay giao dịch trừ điểm nào trong tuần thi đua này.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {unitDetails.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.title}
                        </span>
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg ${
                            item.points > 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {item.points > 0 ? `+${item.points}` : item.points} điểm
                        </span>
                      </div>

                      <div className="text-slate-600 dark:text-slate-300">
                        {item.description || item.rule_name}
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <span>
                          Đội viên: <strong className="text-slate-700 dark:text-slate-200">{item.student_name || 'Chi đội (Tập thể)'}</strong>
                        </span>
                        <span>
                          Thời gian: <strong className="text-slate-700 dark:text-slate-200">{new Date(item.effective_at).toLocaleString('vi-VN')}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
