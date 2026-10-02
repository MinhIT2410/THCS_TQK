/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User, 
  Users, 
  ExternalLink,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import { CompetitionIncident } from '../../../types/competition';

export default function PendingIncidentsTab() {
  const [incidents, setIncidents] = useState<CompetitionIncident[]>([]);
  const [loading, setLoading] = useState(true);

  // Reject modal state
  const [rejectModalIncident, setRejectModalIncident] = useState<CompetitionIncident | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Image lightbox preview state
  const [previewImages, setPreviewImages] = useState<string[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Message alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPendingIncidents = async () => {
    try {
      setLoading(true);
      const list = await competitionService.getPendingIncidentsForApproval();
      setIncidents(list);
    } catch (err: any) {
      console.error('Error fetching pending incidents:', err);
      setAlert({ type: 'error', text: err.message || 'Không thể tải danh sách chờ duyệt.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingIncidents();
  }, []);

  const handleApprove = async (incident: CompetitionIncident) => {
    try {
      setActionLoading(true);
      setAlert(null);
      await competitionService.approveIncident(incident.id);
      // Cập nhật cục bộ thay vì tải lại toàn bộ danh sách.
      // RPC đã xử lý DB; chỉ loại sự việc vừa duyệt khỏi danh sách chờ.
      setIncidents(current => current.filter(item => item.id !== incident.id));
      setAlert({ type: 'success', text: `Đã duyệt sự việc "${incident.title}" thành công!` });
    } catch (err: any) {
      console.error('Approve error:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi duyệt sự việc.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalIncident || !rejectionReason.trim()) return;

    try {
      setActionLoading(true);
      setAlert(null);
      await competitionService.rejectIncident(rejectModalIncident.id, rejectionReason.trim());
      setAlert({ type: 'success', text: `Đã từ chối ghi nhận sự việc "${rejectModalIncident.title}".` });
      // Từ chối thành công thì sự việc không còn thuộc danh sách PENDING.
      // Không gọi fetchPendingIncidents() để tránh bật loading và nháy/reload toàn bảng.
      setIncidents(current => current.filter(item => item.id !== rejectModalIncident.id));
      setRejectModalIncident(null);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Reject error:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi từ chối sự việc.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Danh sách chờ quyệt</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-xs font-extrabold">
              {incidents.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Xem và xét duyệt các sự việc vi phạm/khen thưởng trước khi ghi nhận điểm chính thức.
          </p>
        </div>

        <button
          onClick={fetchPendingIncidents}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="underline opacity-80 hover:opacity-100 font-bold ml-3">
            Đóng
          </button>
        </div>
      )}

      {/* Main Table Area */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse">
          Đang tải danh sách sự việc chờ duyệt...
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Không có sự việc nào chờ duyệt
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Tất cả sự việc thi đua đã được ghi nhận và xử lý đầy đủ.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-[120px]">Thời gian</th>
                  <th className="py-3 px-3.5 w-[190px]">Đối tượng</th>
                  <th className="py-3 px-3.5 min-w-[220px]">Vi phạm</th>
                  <th className="py-3 px-3.5 w-[170px]">Người ghi nhận</th>
                  <th className="py-3 px-3.5 w-[90px] text-center">Hình ảnh</th>
                  <th className="py-3 px-3.5 w-[95px] text-center">Duyệt</th>
                  <th className="py-3 px-3.5 w-[100px] text-center">Từ chối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {incidents.map(item => {
                  const occurredDate = new Date(item.occurred_at);
                  const timeStr = occurredDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const dateStr = occurredDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

                  const imageEvidences = (item.evidence_items || []).filter(e => e.file_url);
                  const externalEvidences = (item.evidence_items || []).filter(e => e.external_url);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Thời gian */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {timeStr}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {dateStr}
                          </div>
                          {item.program_name && (
                            <div className="text-[10px] text-slate-400 line-clamp-1 pt-0.5">
                              {item.program_name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Đối tượng */}
                      <td className="py-3 px-3.5 align-top">
                        {item.student_name ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{item.student_name}</span>
                            </div>
                            {item.student_code && (
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                Mã: {item.student_code}
                              </div>
                            )}
                            {item.unit_name && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Lớp: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.unit_name}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{item.unit_name || 'Chi đội / Tập thể'}</span>
                            </div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                              Tập thể
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. Vi phạm */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 dark:text-white leading-snug">
                            {item.title}
                          </div>
                          {item.rule_name && item.rule_name !== item.title && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Quy tắc: {item.rule_name}
                            </div>
                          )}
                          {item.description && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                              "{item.description}"
                            </p>
                          )}
                          {item.rule && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {item.rule.student_merit_points !== undefined && item.rule.student_merit_points !== 0 && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  item.rule.student_merit_points > 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}>
                                  Đội viên: {item.rule.student_merit_points > 0 ? `+${item.rule.student_merit_points}` : item.rule.student_merit_points}
                                </span>
                              )}
                              {item.rule.unit_points !== undefined && item.rule.unit_points !== 0 && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  item.rule.unit_points > 0
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                }`}>
                                  Chi đội: {item.rule.unit_points > 0 ? `+${item.rule.unit_points}` : item.rule.unit_points}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Người ghi nhận */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.recorder_name || 'Hệ thống'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Khởi tạo: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </td>

                      {/* 5. Hình ảnh */}
                      <td className="py-3 px-3.5 align-top text-center">
                        {imageEvidences.length > 0 ? (
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => {
                                setPreviewImages(imageEvidences.map(e => e.file_url!));
                                setPreviewIndex(0);
                              }}
                              className="group relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs hover:ring-2 hover:ring-amber-500/50 transition-all shrink-0 cursor-pointer"
                              title="Bấm để xem ảnh minh chứng"
                            >
                              <img
                                src={imageEvidences[0].file_url!}
                                alt="Minh chứng"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              {imageEvidences.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] font-extrabold px-1 py-0.5 rounded-tl">
                                  +{imageEvidences.length - 1}
                                </span>
                              )}
                            </button>
                          </div>
                        ) : externalEvidences.length > 0 ? (
                          <div className="flex items-center justify-center">
                            <a
                              href={externalEvidences[0].external_url!}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                              title="Mở liên kết minh chứng"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Link</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-center block">—</span>
                        )}
                      </td>

                      {/* 6. Duyệt */}
                      <td className="py-3 px-3.5 align-top text-center">
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={actionLoading}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs shadow-emerald-600/20 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Duyệt</span>
                        </button>
                      </td>

                      {/* 7. Từ chối */}
                      <td className="py-3 px-3.5 align-top text-center">
                        <button
                          onClick={() => setRejectModalIncident(item)}
                          disabled={actionLoading}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Từ chối</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Từ Chối Ghi Nhận Sự Việc
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Vui lòng nhập lý do từ chối sự việc "<strong>{rejectModalIncident.title}</strong>". Lý do này sẽ được lưu vào nhật ký hệ thống.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="VD: Minh chứng không rõ ràng, thông tin vi phạm chưa chính xác..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalIncident(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  Xác Nhận Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImages && previewImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setPreviewImages(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Đóng xem ảnh"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative max-w-4xl max-h-[80vh] flex items-center justify-center">
            <img
              src={previewImages[previewIndex]}
              alt="Minh chứng chi tiết"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />

            {previewImages.length > 1 && (
              <>
                <button
                  onClick={() => setPreviewIndex(prev => (prev > 0 ? prev - 1 : previewImages.length - 1))}
                  className="absolute left-2 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white transition-colors"
                  title="Ảnh trước"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setPreviewIndex(prev => (prev < previewImages.length - 1 ? prev + 1 : 0))}
                  className="absolute right-2 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white transition-colors"
                  title="Ảnh tiếp"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {previewImages.length > 1 && (
            <div className="mt-4 text-xs font-semibold text-white/80 bg-black/40 px-3 py-1 rounded-full">
              {previewIndex + 1} / {previewImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
