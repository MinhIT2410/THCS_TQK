import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import {
  ImportAccountResult,
  ParsedRosterRow,
  RosterClassOption,
  studentRosterResetService,
} from './studentRosterResetService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  academicYearId: string;
  academicYearName: string;
  classes: RosterClassOption[];
}

type Step = 'upload' | 'preview' | 'running' | 'result';

export default function StudentRosterResetModal({
  isOpen,
  onClose,
  onSuccess,
  academicYearId,
  academicYearName,
  classes,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRosterRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [results, setResults] = useState<ImportAccountResult[]>([]);

  const validCount = useMemo(() => rows.filter(r => r.is_valid).length, [rows]);
  const invalidRows = useMemo(() => rows.filter(r => !r.is_valid), [rows]);
  const successCount = useMemo(() => results.filter(r => r.success).length, [results]);
  const failureCount = results.length - successCount;

  if (!isOpen) return null;

  const resetStateAndClose = () => {
    if (step === 'running') return;
    setStep('upload');
    setRows([]);
    setFileName('');
    setConfirmText('');
    setError(null);
    setProgressText('');
    setProgressPercent(0);
    setResults([]);
    onClose();
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const parsed = await studentRosterResetService.parseOfficialRoster(file, academicYearName, classes);
      setRows(parsed);
      setFileName(file.name);
      setStep('preview');
    } catch (err: any) {
      setError(err?.message || 'Không thể đọc file Excel.');
    }
  };

  const executeResetAndImport = async () => {
    if (confirmText.trim().toUpperCase() !== 'XOA HOC SINH') {
      setError('Nhập đúng cụm XOA HOC SINH để xác nhận thao tác phá hủy dữ liệu.');
      return;
    }
    if (invalidRows.length > 0 || validCount === 0) {
      setError('File còn lỗi. Hãy sửa file trước khi reset và nhập lại.');
      return;
    }

    setError(null);
    setStep('running');
    try {
      setProgressText('Đang xóa tài khoản học sinh cũ...');
      setProgressPercent(0);
      const resetResult = await studentRosterResetService.resetAllStudentAccounts(p => {
        const percent = p.total > 0 ? Math.round((p.completed / p.total) * 45) : 45;
        setProgressPercent(percent);
        setProgressText(`Đang xóa tài khoản học sinh cũ: ${p.completed}/${p.total}`);
      });

      if (resetResult.failed.length > 0) {
        throw new Error(`Có ${resetResult.failed.length} tài khoản cũ chưa xóa được. Dừng import để tránh trùng dữ liệu.`);
      }

      setProgressText('Đã xóa xong. Đang tạo lại tài khoản và phân lớp...');
      const importResults = await studentRosterResetService.importRoster(rows, academicYearId, p => {
        const percent = p.total > 0 ? 45 + Math.round((p.completed / p.total) * 55) : 100;
        setProgressPercent(Math.min(100, percent));
        setProgressText(`Đang tạo lại học sinh: ${p.completed}/${p.total}`);
      });

      setResults(importResults);
      setProgressPercent(100);
      setStep('result');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Reset và nhập lại học sinh thất bại.');
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reset & nhập lại toàn bộ học sinh</h3>
              <p className="text-[11px] text-slate-500">Năm học {academicYearName}</p>
            </div>
          </div>
          <button onClick={resetStateAndClose} disabled={step === 'running'} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold mb-1">Thao tác này xóa toàn bộ tài khoản chỉ có vai trò STUDENT.</div>
              <div>Hệ thống giữ nguyên giáo viên, giám thị, Ban giám hiệu, quản trị, lớp, năm học, quy tắc và CMS. Dữ liệu thi đua/đổi thưởng gắn với tài khoản học sinh cũ sẽ bị xóa vì ID học sinh sẽ được tạo mới.</div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 font-semibold">
              {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-6">
                Dùng trực tiếp file danh sách chính thức có các cột <strong>STT, Khối, Lớp, Họ và lót, Tên, Giới tính, Ngày sinh</strong>. Hệ thống tự ghép họ tên, đối chiếu lớp và sinh mã mới theo dạng <strong>TQK2627-0001</strong>.
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              <button onClick={() => inputRef.current?.click()} className="w-full min-h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300">
                <Upload className="w-7 h-7 text-blue-600" />
                <span className="font-bold text-sm">Chọn file Excel danh sách học sinh</span>
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="File" value={fileName || '---'} />
                <Stat label="Tổng học sinh" value={String(rows.length)} />
                <Stat label="Hợp lệ" value={String(validCount)} />
                <Stat label="Có lỗi" value={String(invalidRows.length)} />
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/50 overflow-hidden">
                  <div className="px-4 py-3 bg-red-50 dark:bg-red-950/20 font-bold text-xs text-red-700 dark:text-red-300">Các dòng cần sửa trước khi chạy</div>
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0"><tr><th className="p-2 text-left">Dòng</th><th className="p-2 text-left">Họ tên</th><th className="p-2 text-left">Lớp</th><th className="p-2 text-left">Lỗi</th></tr></thead>
                      <tbody>{invalidRows.slice(0, 100).map(r => <tr key={r.row_number} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{r.row_number}</td><td className="p-2">{r.full_name}</td><td className="p-2">{r.class_name}</td><td className="p-2 text-red-600">{r.errors.join('; ')}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {invalidRows.length === 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>File hợp lệ. Có thể reset tài khoản cũ và tạo lại {validCount} học sinh.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Nhập XOA HOC SINH để xác nhận</label>
                <input value={confirmText} onChange={e => setConfirmText(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono" placeholder="XOA HOC SINH" />
              </div>
            </div>
          )}

          {step === 'running' && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <div className="font-bold text-sm text-slate-900 dark:text-white">{progressText}</div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progressPercent}%` }} /></div>
              <div className="text-xs text-slate-500">{progressPercent}%</div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Stat label="Đã xử lý" value={String(results.length)} />
                <Stat label="Tạo thành công" value={String(successCount)} />
                <Stat label="Thất bại" value={String(failureCount)} />
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300">
                Hãy tải file kết quả để lưu <strong>tên đăng nhập và mật khẩu tạm</strong> của học sinh. Đây là dữ liệu cần dùng khi bàn giao tài khoản.
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {step === 'preview' && <button onClick={() => { setStep('upload'); setRows([]); setConfirmText(''); }} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold">Chọn file khác</button>}
          </div>
          <div className="flex gap-2">
            {step !== 'running' && <button onClick={resetStateAndClose} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold">Đóng</button>}
            {step === 'preview' && <button disabled={invalidRows.length > 0 || confirmText.trim().toUpperCase() !== 'XOA HOC SINH'} onClick={executeResetAndImport} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-2"><Trash2 className="w-4 h-4" />Reset & nhập lại</button>}
            {step === 'result' && <button onClick={() => studentRosterResetService.downloadResults(results)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4" />Tải file tài khoản</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div><div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white truncate" title={value}>{value}</div></div>;
}
