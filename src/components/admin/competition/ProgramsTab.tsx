/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Award, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Calendar 
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import { CompetitionProgram } from '../../../types/competition';

export default function ProgramsTab() {
  const [programs, setPrograms] = useState<CompetitionProgram[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Partial<CompetitionProgram> | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const data = await competitionService.getPrograms();
      setPrograms(data);
    } catch (err: any) {
      console.error('Error fetching programs:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi tải danh sách chương trình thi đua.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const openModalForNew = () => {
    setEditingProgram({
      code: `TD${new Date().getFullYear()}`,
      name: '',
      description: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (prog: CompetitionProgram) => {
    setEditingProgram({ ...prog });
    setIsModalOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram || !editingProgram.code || !editingProgram.name) return;

    try {
      setSaving(true);
      setAlert(null);
      await competitionService.saveProgram(editingProgram);
      setAlert({
        type: 'success',
        text: `Đã lưu chương trình "${editingProgram.name}" thành công!`,
      });
      setIsModalOpen(false);
      setEditingProgram(null);
      await fetchPrograms();
    } catch (err: any) {
      console.error('Save program error:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi lưu chương trình thi đua.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-red-600" />
            Chương Trình Thi Đua ({programs.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quản lý các đợt thi đua trọng tâm trong năm học của Liên đội THCS Trần Quang Khải
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openModalForNew}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Chương Trình Mới</span>
          </button>

          <button
            onClick={fetchPrograms}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="underline opacity-80 hover:opacity-100">
            Đóng
          </button>
        </div>
      )}

      {/* Program Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse">
          Đang tải danh sách chương trình thi đua...
        </div>
      ) : programs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500">
          Chưa có chương trình thi đua nào. Bấm "Tạo Chương Trình Mới" để thiết lập.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(prog => (
            <div
              key={prog.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 hover:border-red-500/50 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-mono font-bold text-xs">
                    {prog.code}
                  </span>
                  {prog.is_active ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Đang kích hoạt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      Đã khóa
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                  {prog.name}
                </h4>

                {prog.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {prog.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(prog.created_at).toLocaleDateString('vi-VN')}
                </span>

                <button
                  onClick={() => openModalForEdit(prog)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Chỉnh sửa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Modal */}
      {isModalOpen && editingProgram && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-red-600" />
                {editingProgram.id ? 'Chỉnh Sửa Chương Trình' : 'Tạo Chương Trình Thi Đua'}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Mã chương trình <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProgram.code || ''}
                  onChange={e => setEditingProgram({ ...editingProgram, code: e.target.value.toUpperCase() })}
                  placeholder="VD: TD2024_HOCKY1"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tên chương trình thi đua <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProgram.name || ''}
                  onChange={e => setEditingProgram({ ...editingProgram, name: e.target.value })}
                  placeholder="VD: Phong trào Măng Non Thi Đua Học Tốt 2024-2025"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Mô tả / Mục tiêu đợt thi đua
                </label>
                <textarea
                  rows={3}
                  value={editingProgram.description || ''}
                  onChange={e => setEditingProgram({ ...editingProgram, description: e.target.value })}
                  placeholder="Mô tả kế hoạch, tiêu chí rèn luyện chính..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProgram.is_active ?? true}
                    onChange={e => setEditingProgram({ ...editingProgram, is_active: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Kích hoạt chương trình này
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Chương Trình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
