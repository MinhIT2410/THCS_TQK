/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { userCreationApi } from '../userCreationApi';
import { parseExcelFile, validateImportRows } from './userImportParser';
import { downloadImportTemplate } from './userImportTemplate';
import { RawImportRow, ValidatedImportRow, ImportResult, UserImportMode } from './userImportTypes';
import * as XLSX from 'xlsx';
import { 
  X, Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle, 
  RefreshCw, ChevronRight, Play, FileDown, ArrowLeft, Info, Users, GraduationCap
} from 'lucide-react';

interface UserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserImportModal: React.FC<UserImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps: 'upload' | 'preview' | 'result'
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  
  // Data states
  const [fileName, setFileName] = useState('');
  const [importMode, setImportMode] = useState<UserImportMode>('STUDENT');
  const [validatedRows, setValidatedRows] = useState<ValidatedImportRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [resetExistingTeacherPasswords, setResetExistingTeacherPasswords] = useState(true);
  
  // Configuration states (classes/academic years)
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  
  // Loading & error states
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Load classes and academic years
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFileName('');
      setValidatedRows([]);
      setImportResults([]);
      setResetExistingTeacherPasswords(true);
      setGeneralError(null);
      setConfigError(null);

      const loadConfig = async () => {
        setLoadingConfig(true);
        try {
          const [years, classList] = await Promise.all([
            userCreationApi.getAcademicYears(),
            userCreationApi.getClasses()
          ]);
          setAcademicYears(years);
          setClasses(classList);
          setConfigError(null);
        } catch (err) {
          console.error("Không thể tải danh mục năm học/lớp học:", err);
          setConfigError("Không thể tải danh mục lớp học và năm học. Bạn vẫn có thể tải file mẫu cơ bản, nhưng cần bổ sung đúng ID lớp và ID năm học trước khi nhập.");
        } finally {
          setLoadingConfig(false);
        }
      };
      loadConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      setGeneralError("Vui lòng chọn file định dạng Excel (.xlsx, .xls) hoặc CSV (.csv).");
      return;
    }

    setFileName(file.name);
    setIsProcessingFile(true);
    setGeneralError(null);

    try {
      const rawRows = await parseExcelFile(file);
      
      if (rawRows.length === 0) {
        setGeneralError("File rỗng hoặc không có dữ liệu hợp lệ.");
        setIsProcessingFile(false);
        return;
      }

      if (rawRows.length > 100) {
        setGeneralError("Vui lòng giới hạn tối đa 100 dòng mỗi lần nhập để đảm bảo hiệu năng.");
        setIsProcessingFile(false);
        return;
      }

      const validated = validateImportRows(rawRows, classes, academicYears, importMode);
      setValidatedRows(validated);
      setStep('preview');
    } catch (err: any) {
      console.error("Error reading file:", err);
      setGeneralError("Đã xảy ra lỗi khi đọc và phân tích file.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadImportTemplate(classes, academicYears, importMode);
  };

  const handleConfirmImport = async () => {
    const validRowsToSubmit = validatedRows.filter(r => r.isValid);

    if (validRowsToSubmit.length === 0) {
      setGeneralError("Không có dòng dữ liệu hợp lệ để nhập vào hệ thống.");
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const result = await userCreationApi.createManyUsers(validRowsToSubmit, {
        resetExistingTeacherPasswords: importMode === 'STAFF' && resetExistingTeacherPasswords
      });
      
      if (result && result.success === false) {
        setGeneralError(result.message || "Có lỗi xảy ra trong quá trình xử lý.");
      } else {
        // Safe mapping of results
        const resultsList: ImportResult[] = (result?.data || []).map((r: any) => ({
          row_number: r.row_number,
          full_name: validRowsToSubmit.find(v => v.row_number === r.row_number)?.full_name || 'Không rõ',
          email: r.email || validRowsToSubmit.find(v => v.row_number === r.row_number)?.email || '',
          student_code: r.student_code || validRowsToSubmit.find(v => v.row_number === r.row_number)?.student_code || '',
          success: r.success,
          status: r.status || (r.success ? 'CREATED' : 'FAILED'),
          message: r.message || r.error || (r.success ? 'Tạo thành công' : 'Thất bại'),
          user_id: r.user_id,
          login_identifier: r.login_identifier || '',
          temporary_password: r.temporary_password || ''
        }));

        setImportResults(resultsList);
        setStep('result');
        onSuccess();
      }
    } catch (err: any) {
      console.error("Lỗi khi import danh sách:", err);
      setGeneralError("Lỗi kết nối hoặc lỗi hệ thống khi xử lý yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadResults = () => {
    const exportData = importResults.map(r => ({
      'Dòng trong file': r.row_number,
      'Họ và tên': r.full_name,
      'Email': r.email || '',
      'Mã học sinh': r.student_code || '',
      'Tên đăng nhập': r.login_identifier || '',
      'Mật khẩu tạm': r.temporary_password || '',
      'student_code': r.student_code || '',
      'login_identifier': r.login_identifier || '',
      'temporary_password': r.temporary_password || '',
      'Trạng thái': r.status || (r.success ? 'CREATED' : 'FAILED'),
      'Chi tiết': r.message || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ket_Qua_Import');
    XLSX.writeFile(workbook, 'ket_qua_nhap_tai_khoan.xlsx');
  };

  const totalRows = validatedRows.length;
  const validRowsCount = validatedRows.filter(r => r.isValid).length;
  const invalidRowsCount = totalRows - validRowsCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans" id="user-import-modal">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhập tài khoản từ file Excel
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            id="btn-close-import-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          <span className={step === 'upload' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}>1. Tải lên file</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className={step === 'preview' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}>2. Xem trước và kiểm tra lỗi</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className={step === 'result' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}>3. Kết quả hoàn tất</span>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 flex-1 space-y-4">
          {generalError && (
            <div className="flex gap-2.5 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD FILE */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Import type selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportMode('STUDENT')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    importMode === 'STUDENT'
                      ? 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20 ring-2 ring-blue-100 dark:ring-blue-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/40'
                  }`}
                  id="btn-import-mode-student"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Học sinh</div>
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Mã học sinh + lớp + năm học</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('STAFF')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    importMode === 'STAFF'
                      ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/20 ring-2 ring-emerald-100 dark:ring-emerald-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/40'
                  }`}
                  id="btn-import-mode-staff"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Giáo viên / Cán bộ</div>
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Họ tên + Email + Vai trò</div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Info guidelines */}
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex gap-3 text-xs leading-relaxed">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                  <h4 className="font-bold text-slate-900 dark:text-white">Quy tắc chuẩn bị dữ liệu:</h4>
                  {importMode === 'STAFF' ? (
                    <ul className="list-disc list-inside space-y-1 font-medium">
                      <li>Mỗi dòng bắt buộc có <strong>Họ tên, Email và Vai trò</strong>.</li>
                      <li>Giáo viên dùng vai trò <strong className="text-emerald-700 dark:text-emerald-400">TEACHER</strong>; cán bộ/nhân viên có thể dùng STAFF hoặc vai trò quản lý phù hợp.</li>
                      <li>Không nhập Mã học sinh, Lớp học hoặc Năm học trong chế độ này.</li>
                      <li>Không chấp nhận dòng có vai trò STUDENT để tránh nhập nhầm đối tượng.</li>
                      <li>Mỗi lượt import tối đa 100 tài khoản.</li>
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 font-medium">
                      <li>Họ tên và Vai trò STUDENT là thông tin bắt buộc.</li>
                      <li>Học sinh chưa có Email bắt buộc phải có <strong className="text-blue-600 dark:text-blue-400">Mã học sinh (student_code)</strong>.</li>
                      <li>Tên lớp và Năm học bắt buộc, hệ thống tự đối chiếu với dữ liệu hiện có.</li>
                      <li>Không chấp nhận dòng giáo viên/cán bộ trong chế độ Học sinh.</li>
                      <li>Mỗi lượt import tối đa 100 tài khoản.</li>
                    </ul>
                  )}
                </div>
              </div>

              {configError && (
                <div className="flex gap-2.5 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>{configError}</span>
                </div>
              )}

              {/* Template download action */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Chưa có file dữ liệu mẫu?</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{importMode === 'STAFF' ? 'Tải mẫu riêng cho Giáo viên/Cán bộ' : 'Tải mẫu riêng cho Học sinh, kèm danh sách lớp và năm học'}</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-1.5 px-3.5 py-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-900/35 transition-all cursor-pointer"
                  id="btn-download-import-template"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{importMode === 'STAFF' ? 'Tải mẫu Giáo viên/Cán bộ' : 'Tải mẫu Học sinh'}</span>
                </button>
              </div>

              {/* Upload drag drop zone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                }`}
                id="excel-drag-drop-zone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInputChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden" 
                />
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  {isProcessingFile ? (
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    {isProcessingFile ? "Đang đọc file..." : "Kéo thả file Excel vào đây hoặc bấm để chọn file"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    Hỗ trợ định dạng .xlsx, .xls, .csv tối đa 100 dòng dữ liệu
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW AND VALIDATE */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* File Info & Stats Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shrink-0">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md">
                    File: {fileName}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    {importMode === 'STAFF' ? 'Đang kiểm tra dữ liệu Giáo viên/Cán bộ trước khi tạo tài khoản' : 'Đang kiểm tra dữ liệu Học sinh trước khi tạo tài khoản'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[10px] font-bold text-blue-700 dark:text-blue-400">
                    Tổng: {totalRows}
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Hợp lệ: {validRowsCount}
                  </div>
                  <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-[10px] font-bold text-red-700 dark:text-red-400">
                    Bị lỗi: {invalidRowsCount}
                  </div>
                </div>
              </div>

              {importMode === 'STAFF' && (
                <label className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/15 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetExistingTeacherPasswords}
                    onChange={(e) => setResetExistingTeacherPasswords(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Đặt lại mật khẩu GVCN đã có theo lớp
                    </div>
                    <div className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-400">
                      Khi bật: tài khoản TEACHER đã tồn tại và có lớp chủ nhiệm sẽ được đặt lại mật khẩu theo mẫu
                      <span className="font-mono font-bold"> gvcn@61, gvcn@610, gvcn@6.1...</span>.
                      File kết quả sẽ xuất mật khẩu này. Tắt mục này nếu chỉ muốn cập nhật lớp/thông tin mà giữ mật khẩu hiện tại.
                    </div>
                  </div>
                </label>
              )}

              {/* Data Table */}
              <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 z-10">
                      <tr>
                        <th className="px-4 py-3 text-center">Dòng</th>
                        <th className="px-4 py-3">Họ và tên</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Vai trò</th>
                        <th className="px-4 py-3">Lớp</th>
                        <th className="px-4 py-3">Năm học</th>
                        <th className="px-4 py-3 text-center">Trạng thái</th>
                        <th className="px-4 py-3">Chi tiết lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs text-slate-700 dark:text-slate-300">
                      {validatedRows.map((row) => (
                        <tr 
                          key={row.row_number} 
                          className={row.isValid ? 'hover:bg-slate-50/40 dark:hover:bg-slate-900/10' : 'bg-red-50/15 dark:bg-red-950/5 hover:bg-red-50/20 dark:hover:bg-red-950/10'}
                        >
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400">{row.row_number}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{row.full_name}</td>
                          <td className="px-4 py-3.5 font-medium truncate max-w-[180px]">{row.email || <span className="text-slate-400 italic">Trống</span>}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-500">{row.roles.join(', ')}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            {row.class_name || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            {row.academic_year_name || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                Sẵn sàng
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
                                Bị lỗi
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-red-600 dark:text-red-400 font-bold leading-normal min-w-[200px] max-w-[300px]">
                            {row.errors.length > 0 ? (
                              <div className="max-h-20 overflow-y-auto whitespace-normal break-words pr-1 text-[11px]" title={row.errors.join('\n')}>
                                {row.errors.map((err, i) => (
                                  <div key={i} className="mb-0.5 last:mb-0">• {err}</div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-500 font-bold">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action warnings */}
              {invalidRowsCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/40 rounded-2xl flex gap-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Hệ thống chỉ gửi các dòng Hợp lệ lên server. Các dòng Bị lỗi sẽ tự động bị bỏ qua.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESULTS DISPLAY */}
          {step === 'result' && (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 shrink-0">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-450" />
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Hoàn tất xử lý yêu cầu!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-lg leading-relaxed">
                  Đã hoàn tất xử lý. Tài khoản mới sẽ hiển thị mật khẩu tạm. Với Giáo viên/Cán bộ, nếu bạn bật “Đặt lại mật khẩu GVCN đã có theo lớp”, tài khoản TEACHER hiện có sẽ được đặt lại mật khẩu dạng gvcn@61 và file kết quả sẽ hiển thị mật khẩu mới. Hệ thống vẫn không tạo tài khoản trùng và không tự ghi đè GVCN đang xung đột.
                </p>
              </div>

              {/* Result Summary */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shrink-0">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Kết quả phân tích chi tiết</span>
                <button
                  onClick={handleDownloadResults}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-450 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 rounded-xl transition-all border border-blue-100 dark:border-blue-900/40 cursor-pointer"
                  id="btn-download-import-results"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Xuất file kết quả</span>
                </button>
              </div>

              {/* Results Table */}
              <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                <div className="overflow-x-auto max-h-[250px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 z-10">
                      <tr>
                        <th className="px-4 py-3 text-center">Dòng</th>
                        <th className="px-4 py-3">Họ và tên</th>
                        <th className="px-4 py-3">Định danh / Email</th>
                        <th className="px-4 py-3">Mã học sinh</th>
                        <th className="px-4 py-3">Mật khẩu tạm</th>
                        <th className="px-4 py-3 text-center">Trạng thái</th>
                        <th className="px-4 py-3">Chi tiết / Lý do lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs text-slate-700 dark:text-slate-300">
                      {importResults.map((row) => (
                        <tr key={row.row_number} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">{row.row_number}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{row.full_name}</td>
                          <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                            {row.login_identifier || row.email || <span className="text-slate-400 italic">Trống</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {row.student_code || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {row.temporary_password || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.status === 'CREATED' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Tạo mới</span>
                            ) : row.status === 'UPDATED' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400">Cập nhật</span>
                            ) : row.status === 'SKIPPED' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Đã có</span>
                            ) : row.status === 'CONFLICT' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">Xung đột</span>
                            ) : row.success ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Thành công</span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">Thất bại</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 font-bold ${row.status === 'CONFLICT' ? 'text-amber-700 dark:text-amber-400' : row.success ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-600 dark:text-red-450'}`}>
                            {row.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
              id="btn-cancel-upload"
            >
              Hủy
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
                id="btn-back-to-upload"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Chọn lại file</span>
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isSubmitting || validRowsCount === 0}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-colors min-w-[160px] cursor-pointer"
                id="btn-confirm-import"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Nhập {validRowsCount} tài khoản</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer"
              id="btn-finish-import"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
