/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertOctagon, 
  User, 
  RefreshCw,
  Image as ImageIcon,
  Pencil,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import { useAuth } from '../../../features/auth/AuthContext';
import { competitionService } from '../../../services/competitionService';
import { CompetitionIncident, IncidentStatus, INCIDENT_STATUS_LABELS } from '../../../types/competition';

export default function IncidentsHistoryTab() {
  const { user } = useAuth();
  const [canEditNotes, setCanEditNotes] = useState(false);
  const [editIncident, setEditIncident] = useState<CompetitionIncident | null>(null);
  const [description, setDescription] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState('');
  useEffect(() => {
    let active = true;
    setCanEditNotes(false);
    if (user) {
      Promise.all([
        supabase.rpc('has_competition_permission', { p_user_id: user.id, p_permission_code: 'COMPETITION_MANAGE' }),
        supabase.rpc('is_admin'),
      ]).then(([permission, admin]) => {
        if (active) setCanEditNotes(permission.data === true || admin.data === true);
      }).catch(() => { if (active) setCanEditNotes(false); });
    }
    return () => { active = false; };
  }, [user?.id]);

  const openNotesEditor = (incident: CompetitionIncident) => {
    setEditIncident(incident);
    setDescription(incident.description || '');
    setEvidenceNote(incident.evidence_note || '');
    setEditReason('');
    setEditError('');
  };
  const notesChanged = editIncident && (
    description.trim() !== (editIncident.description || '').trim() ||
    evidenceNote.trim() !== (editIncident.evidence_note || '').trim()
  );
  const saveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIncident || !notesChanged || !editReason.trim() || actionLoading) return;
    setActionLoading(true);
    setEditError('');
    try {
      await competitionService.editIncidentNotes(editIncident, description, evidenceNote, editReason);
      setEditIncident(null);
      setAlert({ type: 'success', text: 'Đã cập nhật ghi chú. Điểm thi đua không thay đổi.' });
      await fetchIncidents();
    } catch (err: any) {
      setEditError(err.message || 'Không thể cập nhật ghi chú.');
    } finally { setActionLoading(false); }
  };

  const [incidents, setIncidents] = useState<CompetitionIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Reversal modal state
  const [reverseModalIncident, setReverseModalIncident] = useState<CompetitionIncident | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Alert message
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const filterObj: any = {};
      if (statusFilter !== 'ALL') {
        filterObj.status = statusFilter as IncidentStatus;
      }
      const list = await competitionService.getIncidents(filterObj);
      setIncidents(list);
    } catch (err: any) {
      console.error('Error fetching incident history:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi tải lịch sử sự việc.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseModalIncident || !reversalReason.trim()) return;

    try {
      setActionLoading(true);
      setAlert(null);
      await competitionService.reverseIncident(reverseModalIncident.id, reversalReason.trim());
      setAlert({
        type: 'success',
        text: `Đã hủy sự việc "${reverseModalIncident.title}" và đảo ngược các giao dịch điểm thành công!`,
      });
      setReverseModalIncident(null);
      setReversalReason('');
      await fetchIncidents();
    } catch (err: any) {
      console.error('Reverse error:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi đảo ngược giao dịch sự việc.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter local search term
  const filteredIncidents = incidents.filter(i => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      i.title.toLowerCase().includes(term) ||
      i.student_name?.toLowerCase().includes(term) ||
      i.unit_name?.toLowerCase().includes(term) ||
      i.rule_name?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> ĐÃ DUYỆT
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3" /> CHỜ DUYỆT
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1">
            <XCircle className="w-3 h-3" /> TỪ CHỐI
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> ĐÃ HỦY / ĐẢO
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Nhật Ký & Lịch Sử Ghi Nhận Thi Đua
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tra cứu thông tin chi tiết sự việc và quản lý giao dịch bất biến
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
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

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Lọc trạng thái:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="APPROVED">Đã duyệt (APPROVED)</option>
            <option value="PENDING">Chờ duyệt (PENDING)</option>
            <option value="REJECTED">Từ chối (REJECTED)</option>
            <option value="CANCELLED">Đã hủy/đảo (CANCELLED)</option>
          </select>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tiêu đề, đội viên, chi đội..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse">
          Đang tải lịch sử ghi nhận sự việc...
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500">
          Không tìm thấy sự việc nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map(item => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                      {item.program_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {new Date(item.occurred_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                {canEditNotes && ['APPROVED', 'PENDING', 'DRAFT'].includes(item.status) && (
                  <button onClick={() => openNotesEditor(item)} disabled={actionLoading}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa ghi chú
                  </button>
                )}
                {/* Reversal action for APPROVED incidents */}
                {item.status === 'APPROVED' && (
                  <button
                    onClick={() => setReverseModalIncident(item)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800 transition-all flex items-center gap-1.5"
                    title="Đảo ngược giao dịch điểm của sự việc này"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Hủy & Đảo Điểm</span>
                  </button>
                )}
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Đối tượng:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {item.student_name || 'Không áp dụng cá nhân'}
                  </strong>
                  {item.unit_name && (
                    <span className="text-slate-500 block text-[11px]">
                      Chi đội: {item.unit_name}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Quy tắc:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {item.rule_name}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Người ghi nhận:</span>{' '}
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    {item.recorder_name || 'Hệ thống'}
                  </span>
                  {item.approver_name && (
                    <span className="text-emerald-600 dark:text-emerald-400 block text-[11px]">
                      Duyệt bởi: {item.approver_name}
                    </span>
                  )}
                </div>
              </div>

              {(item.description || item.evidence_note) && (
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {item.description && <p className="whitespace-pre-wrap break-words"><strong>Ghi chú / mô tả:</strong> {item.description}</p>}
                  {item.evidence_note && <p className="whitespace-pre-wrap break-words"><strong>Ghi chú minh chứng:</strong> {item.evidence_note}</p>}
                </div>
              )}
              {/* Rejection / Cancellation Reason */}
              {item.rejection_reason && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 space-y-0.5">
                  <div className="font-bold flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Lý do hủy / từ chối:
                  </div>
                  <p>{item.rejection_reason}</p>
                </div>
              )}

              {/* Evidence attachments */}
              {item.evidence_items && item.evidence_items.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {item.evidence_items.map(ev => (
                    <div key={ev.id}>
                      {ev.file_url && (
                        <a
                          href={ev.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:underline"
                        >
                          <ImageIcon className="w-3 h-3 text-slate-400" />
                          <span>Xem ảnh minh chứng</span>
                        </a>
                      )}
                      {ev.external_url && (
                        <a
                          href={ev.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Liên kết đính kèm</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveNotes} role="dialog" aria-modal="true" aria-labelledby="edit-notes-title"
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <h4 id="edit-notes-title" className="text-lg font-bold">Chỉnh sửa ghi chú</h4>
            <p className="text-xs text-slate-500">{editIncident.title} • {editIncident.unit_name} • {editIncident.student_name || 'Tập thể lớp'}</p>
            <p className="text-xs p-3 rounded-xl bg-blue-50 text-blue-800">Chỉ sửa ghi chú, không thay đổi điểm. Nếu sai học sinh, lớp, lỗi vi phạm hoặc thời điểm, hãy hủy sự việc và ghi nhận lại.</p>
            <fieldset disabled={actionLoading} className="space-y-4">
              <label className="block text-xs font-semibold">Ghi chú / mô tả
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full border rounded-xl p-3 bg-transparent" />
              </label>
              <label className="block text-xs font-semibold">Ghi chú minh chứng
                <textarea rows={2} value={evidenceNote} onChange={e => setEvidenceNote(e.target.value)} className="mt-1 w-full border rounded-xl p-3 bg-transparent" />
              </label>
              <label className="block text-xs font-semibold">Lý do chỉnh sửa <span className="text-red-500">*</span>
                <textarea rows={2} required value={editReason} onChange={e => setEditReason(e.target.value)} className="mt-1 w-full border rounded-xl p-3 bg-transparent" />
              </label>
            </fieldset>
            {editError && <p role="alert" className="text-xs text-red-600">{editError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={actionLoading} onClick={() => setEditIncident(null)} className="px-4 py-2 text-xs rounded-xl border">Đóng</button>
              <button type="submit" disabled={actionLoading || !notesChanged || !editReason.trim()} className="px-4 py-2 text-xs rounded-xl bg-blue-600 text-white disabled:opacity-50">{actionLoading ? 'Đang lưu...' : 'Lưu ghi chú'}</button>
            </div>
          </form>
        </div>
      )}
      {/* Reversal Modal */}
      {reverseModalIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              Đảo Ngược Giao Dịch Điểm
            </h4>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold">Quy tắc tính sổ điểm bất biến:</p>
              <p>
                Thao tác này sẽ tạo giao dịch <strong>REVERSAL</strong> với số điểm âm tương ứng để triệt tiêu các giao dịch đã cấp cho sự việc "<strong>{reverseModalIncident.title}</strong>".
              </p>
            </div>

            <form onSubmit={handleReverseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Lý do đảo / hủy giao dịch <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reversalReason}
                  onChange={e => setReversalReason(e.target.value)}
                  placeholder="VD: Nhập nhầm đối tượng, bằng chứng bị hủy bỏ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReverseModalIncident(null);
                    setReversalReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !reversalReason.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  Xác Nhận Đảo Điểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
