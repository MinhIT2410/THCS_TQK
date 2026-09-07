/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Award, 
  Calendar, 
  Trophy, 
  Clock, 
  Sparkles, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Filter
} from 'lucide-react';
import { competitionService } from '../services/competitionService';
import { CompetitionWeek } from '../types/competition';
import { ROUTES } from '../config/routes';

export default function PublicUnitCompetitionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGrade = searchParams.get('grade') || 'ALL';

  const [publishedWeeks, setPublishedWeeks] = useState<CompetitionWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [currentWeekInfo, setCurrentWeekInfo] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPublishedWeeks();
  }, []);

  async function loadPublishedWeeks() {
    try {
      setLoading(true);
      const weeks = await competitionService.getPublicPublishedWeeks();
      setPublishedWeeks(weeks);

      if (weeks.length > 0) {
        setSelectedWeekId(weeks[0].id);
        await loadLeaderboard(weeks[0].id);
      }
    } catch (err) {
      console.error('Error fetching published weeks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard(weekId: string) {
    try {
      setLoading(true);
      const data = await competitionService.getPublicWeekLeaderboard(weekId);
      if (data) {
        setCurrentWeekInfo(data.week);
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Error loading public leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wId = e.target.value;
    setSelectedWeekId(wId);
    if (wId) {
      loadLeaderboard(wId);
    }
  };

  const handleGradeChange = (grade: string) => {
    if (grade === 'ALL') {
      searchParams.delete('grade');
    } else {
      searchParams.set('grade', grade);
    }
    setSearchParams(searchParams);
  };

  const filteredLeaderboard = leaderboard.filter(item => {
    if (selectedGrade === 'ALL') return true;
    if (item.grade_name && item.grade_name.includes(selectedGrade)) return true;
    const cleanUnitName = String(item.unit_name || '').trim();
    if (cleanUnitName.startsWith(selectedGrade) || cleanUnitName.startsWith(`Khối ${selectedGrade}`)) {
      return true;
    }
    return false;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 font-sans pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 text-center">
        <Link to={ROUTES.COMPETITION} className="hover:text-red-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Tổng quan Thi đua</span>
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-800 dark:text-white">Thi đua chi đội theo tuần</span>
      </div>

      {/* Header Banner - Compact Height */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 dark:from-red-950 dark:via-rose-900 dark:to-amber-950 p-5 sm:p-6 text-white shadow-lg text-center">
        <div className="absolute -right-5 -bottom-5 opacity-15 pointer-events-none">
          <Trophy className="w-44 h-44" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-amber-100">
            <Sparkles className="w-3 h-3" />
            Bảng cờ thi đua chi đội
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Kết quả thi đua chi đội hàng tuần
          </h1>
          <p className="text-xs text-red-50 dark:text-red-200 leading-relaxed line-clamp-2">
            Công bố công khai tổng điểm thi đua và thứ hạng các chi đội THCS Trần Quang Khải. Bảng điểm được tổng hợp minh bạch từ sổ ghi nhận và quy tắc thi đua chính thức của Liên đội.
          </p>
        </div>
      </div>

      {/* Filter / Selector Bar - Compact Padding */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lọc theo khối</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Tất cả khối' },
              { id: '6', label: 'Khối 6' },
              { id: '7', label: 'Khối 7' },
              { id: '8', label: 'Khối 8' },
              { id: '9', label: 'Khối 9' },
            ].map(g => (
              <button
                key={g.id}
                onClick={() => handleGradeChange(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedGrade === g.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 md:text-right">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center md:justify-end gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-red-600" />
            Chọn tuần thi đua
          </label>
          <select
            value={selectedWeekId}
            onChange={handleWeekChange}
            disabled={publishedWeeks.length === 0}
            className="w-full md:w-auto min-w-[240px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-white shadow-xs disabled:opacity-50"
          >
            {publishedWeeks.length === 0 ? (
              <option value="">Chưa có kết quả công bố</option>
            ) : (
              publishedWeeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.starts_on} - {w.ends_on})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Leaderboard Section */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 animate-pulse">
          Đang tải bảng xếp hạng cờ thi đua...
        </div>
      ) : publishedWeeks.length === 0 || !currentWeekInfo ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Chưa có kết quả tuần thi đua được công bố
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ban Chỉ huy Liên đội đang tổng hợp điểm và xử lý các sự việc thi đua trong tuần. Kết quả chính thức sẽ được cập nhật công khai ngay sau khi Tổng phụ trách chốt tuần.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Week Info Banner */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                {currentWeekInfo.program_name || 'Chương trình thi đua năm học'}
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {currentWeekInfo.name}
              </h2>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 sm:text-right">
              <div>Thời gian: <strong className="text-slate-800 dark:text-slate-200">{currentWeekInfo.starts_on}</strong> đến <strong className="text-slate-800 dark:text-slate-200">{currentWeekInfo.ends_on}</strong></div>
              <div>Ngày công bố: <strong className="text-slate-800 dark:text-slate-200">{new Date(currentWeekInfo.published_at).toLocaleDateString('vi-VN')}</strong></div>
            </div>
          </div>

          {/* Desktop Leaderboard Table (Hidden on mobile) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">Hạng</th>
                  <th className="py-3 px-4">Chi đội</th>
                  <th className="py-3 px-4 text-center">Khởi điểm</th>
                  <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">Điểm cộng</th>
                  <th className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">Điểm trừ</th>
                  <th className="py-3 px-4 text-center font-black">Điểm tổng kết</th>
                  <th className="py-3 px-4">Nhận xét thi đua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Không tìm thấy chi đội nào thuộc {selectedGrade === 'ALL' ? 'danh sách' : `Khối ${selectedGrade}`} trong tuần này.
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((item, index) => {
                    const rank = item.rank || index + 1;
                    return (
                      <tr 
                        key={item.unit_name}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          rank === 1 ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shadow-xs ${
                              rank === 1
                                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                                : rank === 2
                                ? 'bg-slate-300 text-slate-900'
                                : rank === 3
                                ? 'bg-amber-700 text-amber-50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            {item.unit_name}
                            {rank === 1 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                Dẫn đầu khối
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {item.starting_points}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{item.manual_bonus_points || 0}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                          -{item.manual_penalty_points || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-700">
                            {item.final_points}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {item.comment_text || 'Chưa có nhận xét'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Visible on < md) */}
          <div className="block md:hidden space-y-3">
            {filteredLeaderboard.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                Không tìm thấy chi đội nào thuộc {selectedGrade === 'ALL' ? 'danh sách' : `Khối ${selectedGrade}`} trong tuần này.
              </div>
            ) : (
              filteredLeaderboard.map((item, index) => {
                const rank = item.rank || index + 1;
                return (
                  <div
                    key={item.unit_name}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-3 ${
                      rank === 1
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-500/5'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-2xl text-xs font-black shadow-sm ${
                            rank === 1
                              ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-400/20'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : rank === 3
                              ? 'bg-amber-700 text-amber-50'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {rank}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                          {item.unit_name}
                        </h3>
                      </div>

                      <span className="font-mono font-black text-base px-3 py-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-700">
                        {item.final_points} điểm
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                        <div className="text-[10px] text-slate-400 font-bold">Khởi điểm</div>
                        <div className="font-mono font-bold text-slate-700 dark:text-slate-200">{item.starting_points}</div>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl">
                        <div className="text-[10px] text-emerald-600 font-bold">Điểm cộng</div>
                        <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">+{item.manual_bonus_points || 0}</div>
                      </div>
                      <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">
                        <div className="text-[10px] text-rose-600 font-bold">Điểm trừ</div>
                        <div className="font-mono font-bold text-rose-700 dark:text-rose-300">-{item.manual_penalty_points || 0}</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl font-medium">
                      <span className="font-bold text-slate-500 mr-1">Nhận xét:</span>
                      {item.comment_text || 'Chưa có nhận xét'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
