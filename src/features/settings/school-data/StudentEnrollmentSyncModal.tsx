import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import {
  EnrollmentSyncPreview,
  EnrollmentSyncPreviewRow,
  studentEnrollmentSyncService,
} from './studentEnrollmentSyncService';

interface StudentEnrollmentSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId: string;
  academicYearName: string;
  onSuccess: (syncedCount: number) => void;
}

const statusLabel: Record<EnrollmentSyncPreviewRow['status'], string> = {
  CHANGE_CLASS: 'Đổi lớp',
  UNCHANGED: 'Không đổi',
  NEW_ENROLLMENT: 'Phân lớp mới',
  STUDENT_NOT_FOUND: 'Không tìm thấy HS',
  CLASS_NOT_FOUND: 'Lớp không hợp lệ',
  DUPLICATE_CODE: 'Trùng mã HS',
  INVALID_ROW: 'Dòng không hợp lệ',
};

const statusClass: Record<EnrollmentSyncPreviewRow['status'], string> = {
  CHANGE_CLASS: 'bg-blue-50 text-blue-700 border-blue-200',
  UNCHANGED: 'bg-slate-50 text-slate-600 border-slate-200',
  NEW_ENROLLMENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STUDENT_NOT_FOUND: 'bg-red-50 text-red-700 border-red-200',
  CLASS_NOT_FOUND: 'bg-red-50 text-red-700 border-red-200',
  DUPLICATE_CODE: 'bg-red-50 text-red-700 border-red-200',
  INVALID_ROW: 'bg-red-50 text-red-700 border-red-200',
};

export default function StudentEnrollmentSyncModal({
  isOpen,
  onClose,
  academicYearId,
  academicYearName,
  onSuccess,
}: StudentEnrollmentSyncModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<EnrollmentSyncPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  const canSync = Boolean(preview && preview.blockingRows.length === 0 && preview.validRows.length > 0);

  const rowsForTable = useMemo(() => preview?.rows.slice(0, 300) || [], [preview]);

  if (!isOpen) return null;

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setProgress(0);
    setSyncedCount(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    if (syncing) return;
    reset();
    onClose();
  };

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(null);
    setError(null);
    setSyncedCount(null);
    setLoading(true);
    try {
      const rows = await studentEnrollmentSyncService.parseExcel(selectedFile);
      const result = await studentEnrollmentSyncService.buildPreview(rows, academicYearId);
      setPreview(result);
    } catch (err: any) {
      setError(err?.message || 'Không thể đọc hoặc đối chiếu file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!preview || !canSync) return;
    setError(null);
    setSyncing(true);
    setProgress(0);
    try {
      const result = await studentEnrollmentSyncService.sync(
        preview,
        academicYearId,
        p => setProgress(p.percent)
      );
      setSyncedCount(result.syncedCount);
      onSuccess(result.syncedCount);
    } catch (err: any) {
      setError(err?.message || 'Đồng bộ phân lớp thất bại.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/55 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Đồng bộ phân lớp Excel
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Năm học <strong>{academicYearName || 'đang chọn'}</strong> · đối chiếu theo mã học sinh, không xóa tài khoản hay lịch sử.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={syncing}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {syncedCount !== null && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Đồng bộ hoàn tất</div>
                <div className="text-xs mt-0.5">Đã cập nhật/phân lớp {syncedCount} học sinh. Các năm học cũ không bị thay đổi.</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
            <label className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {file?.name || 'Chọn file Excel phân lớp'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Cột: student_code, full_name, class_name. Hỗ trợ hơn 2.000 học sinh.
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={loading || syncing}
                onChange={e => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFile(selected);
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => studentEnrollmentSyncService.downloadTemplate()}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Tải file mẫu
            </button>
          </div>

          {preview && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {[
                  ['Tổng dòng', preview.summary.totalRows],
                  ['Khớp HS', preview.summary.matchedStudents],
                  ['Đổi lớp', preview.summary.changedClass],
                  ['Phân mới', preview.summary.newEnrollment],
                  ['Không đổi', preview.summary.unchanged],
                  ['Không thấy HS', preview.summary.studentNotFound],
                  ['Lớp lỗi', preview.summary.classNotFound],
                  ['Trùng mã', preview.summary.duplicateCodes],
                ].map(([label, value]) => (
                  <div key={String(label)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-500 font-semibold">{label}</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">{value}</div>
                  </div>
                ))}
              </div>

              {preview.blockingRows.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start justify-between gap-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Có <strong>{preview.blockingRows.length}</strong> dòng lỗi nghiêm trọng. Hệ thống chưa cho đồng bộ để tránh cập nhật sai lớp.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => studentEnrollmentSyncService.exportIssues(preview)}
                    className="font-bold underline whitespace-nowrap"
                  >
                    Tải Excel lỗi
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-3 text-left">Dòng</th>
                        <th className="px-3 py-3 text-left">Mã HS</th>
                        <th className="px-3 py-3 text-left">Học sinh</th>
                        <th className="px-3 py-3 text-left">Lớp hiện tại</th>
                        <th className="px-3 py-3 text-left">Lớp mới</th>
                        <th className="px-3 py-3 text-left">Kết quả</th>
                        <th className="px-3 py-3 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rowsForTable.map(row => (
                        <tr key={`${row.rowNumber}-${row.studentCode}`}>
                          <td className="px-3 py-2.5 font-mono text-slate-500">{row.rowNumber}</td>
                          <td className="px-3 py-2.5 font-mono font-bold">{row.studentCode || '—'}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900 dark:text-white">{row.systemFullName || row.fullName || '—'}</div>
                            {row.warnings.length > 0 && <div className="text-[10px] text-amber-600 mt-0.5">{row.warnings[0]}</div>}
                          </td>
                          <td className="px-3 py-2.5">{row.currentClassName ? `Lớp ${row.currentClassName}` : 'Chưa phân lớp'}</td>
                          <td className="px-3 py-2.5 font-bold">{row.targetClassName ? `Lớp ${row.targetClassName}` : row.className || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex px-2 py-1 rounded-lg border text-[10px] font-bold ${statusClass[row.status]}`}>
                              {statusLabel[row.status]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-red-600 max-w-[280px]">{row.errors.join('; ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > rowsForTable.length && (
                  <div className="px-4 py-2 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    Đang hiển thị 300/{preview.rows.length} dòng để giữ giao diện nhẹ. Thống kê và đồng bộ vẫn áp dụng toàn bộ file.
                  </div>
                )}
              </div>
            </>
          )}

          {syncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Đang đồng bộ theo từng lô 250 học sinh...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500">
            Chỉ cập nhật <strong>student_enrollments</strong> của năm học đang chọn. Không xóa hồ sơ, tài khoản hay lịch sử thi đua.
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={syncing}
              className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={!canSync || syncing || syncedCount !== null}
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-40 flex items-center gap-1.5"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Đồng bộ {preview?.validRows.length || 0} học sinh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
