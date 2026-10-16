/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Eye,
  Building2,
  Heading,
  MessageSquare
} from 'lucide-react';
import { 
  competitionReportConfigService, 
  CompetitionReportConfig, 
  DEFAULT_COMPETITION_REPORT_CONFIG 
} from '../../../services/competitionReportConfigService';
import LoadingState from '../../common/LoadingState';

export default function ReportTemplateTab() {
  const [config, setConfig] = useState<CompetitionReportConfig>(DEFAULT_COMPETITION_REPORT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await competitionReportConfigService.fetchReportConfigFromDB();
      setConfig(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleChange = (field: keyof CompetitionReportConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await competitionReportConfigService.saveReportConfig(config);
      if (res.success) {
        setMessage({
          type: 'success',
          text: 'Đã lưu cấu hình mẫu báo cáo thành công! Mẫu mới sẽ áp dụng ngay cho các biên bản tiếp theo.'
        });
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Có lỗi xảy ra khi lưu cấu hình.'
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Lỗi không xác định: ' + (err.message || err)
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục mẫu biên bản báo cáo về giá trị mặc định?')) {
      setConfig({ ...DEFAULT_COMPETITION_REPORT_CONFIG });
      setMessage({
        type: 'success',
        text: 'Đã khôi phục các trường thông tin về mẫu mặc định. Nhấn "Lưu cấu hình" để hoàn tất.'
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-8">
        <LoadingState message="Đang tải cấu hình mẫu báo cáo..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Compact Info Banner */}
      <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-amber-900 dark:text-amber-200 text-sm">
              Mẫu biên bản báo cáo thi đua hệ thống
            </h3>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Cấu hình áp dụng thống nhất khi xuất biên bản thi đua. Các cột dữ liệu động (<code className="px-1.5 py-0.5 bg-amber-100/80 dark:bg-amber-900/60 rounded font-mono font-semibold text-[11px]">STT | LỚP | GVCN | SĨ SỐ | HS VI PHẠM...</code>) được hệ thống tự động tổng hợp chính xác. Mẫu mới chỉ áp dụng cho báo cáo khởi tạo sau thời điểm lưu.
            </p>
          </div>
        </div>
      </div>

      {/* Success / Error Toast Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="font-semibold leading-relaxed">{message.text}</span>
        </div>
      )}

      {/* 2-Column Balanced Grid on Desktop (>=1024px) */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Configuration split into clean Cards */}
        <div className="lg:col-span-6 space-y-5">
          {/* Card 1: Thông tin đầu biên bản */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/50 dark:border-red-900/30">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  1. Thông tin đầu biên bản
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thiết lập tên cơ quan quản lý và đơn vị phụ trách trực tiếp
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Parent Organization */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cơ quan / Cấp quản lý phía trên
                </label>
                <input
                  type="text"
                  value={config.parent_organization}
                  onChange={(e) => handleChange('parent_organization', e.target.value)}
                  placeholder="Ví dụ: PHÒNG GIÁO DỤC VÀ ĐÀO TẠO"
                  className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dòng chữ in hoa góc trái phía trên tiêu đề báo cáo
                </p>
              </div>

              {/* Unit Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tên đơn vị / Ban phụ trách
                </label>
                <input
                  type="text"
                  value={config.unit_name}
                  onChange={(e) => handleChange('unit_name', e.target.value)}
                  placeholder="Ví dụ: BAN THI ĐƯA - ĐỘI GIÁM THỊ"
                  className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tên ban chỉ đạo hoặc liên chi đội trực tiếp quản lý
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Tiêu đề và tên các mục */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/50 dark:border-red-900/30">
                <Heading className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  2. Tiêu đề & Tên các mục
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cấu hình tiêu đề chính và các đề mục phân chia trong biên bản
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Report Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề chính biên bản
                </label>
                <input
                  type="text"
                  value={config.report_title}
                  onChange={(e) => handleChange('report_title', e.target.value)}
                  placeholder="Ví dụ: BIÊN BẢN TỔNG KẾT VI PHẠM THI ĐƯA HÀNG TUẦN"
                  className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase text-red-600 dark:text-red-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tiêu đề lớn in hoa nằm giữa trang văn bản
                </p>
              </div>

              {/* Table Section Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề Phần I (Bảng thống kê)
                </label>
                <input
                  type="text"
                  value={config.table_section_title}
                  onChange={(e) => handleChange('table_section_title', e.target.value)}
                  placeholder="Ví dụ: I. BẢNG THỐNG KÊ CHI TIẾT LỖI VI PHẠM THEO LỚP"
                  className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tiêu đề nhóm cho bảng dữ liệu thống kê vi phạm theo từng lớp
                </p>
              </div>

              {/* Summary Section Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề Phần II (Nhận xét & Tổng kết)
                </label>
                <input
                  type="text"
                  value={config.summary_section_title}
                  onChange={(e) => handleChange('summary_section_title', e.target.value)}
                  placeholder="Ví dụ: II. NHẬN XÉT & TỔNG KẾT CỦA GIÁM THỊ"
                  className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tiêu đề nhóm cho phần đánh giá ghi nhận của người phụ trách
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Nhận xét / Placeholder / Chức danh */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/50 dark:border-red-900/30">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  3. Gợi ý nhận xét & Chức danh
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cấu hình văn bản gợi ý và chức danh người ký biên bản
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Placeholder Ô Nhận xét */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Gợi ý nhập liệu (Placeholder) ô Nhận xét
                </label>
                <textarea
                  value={config.summary_placeholder}
                  onChange={(e) => handleChange('summary_placeholder', e.target.value)}
                  rows={3}
                  placeholder="Nhập gợi ý cho người lập báo cáo..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all min-h-[90px]"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nội dung mờ hướng dẫn người lập báo cáo khi chưa nhập nhận xét
                </p>
              </div>

              {/* Chức danh chữ ký */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chức danh Người lập
                  </label>
                  <input
                    type="text"
                    value={config.reporter_title}
                    onChange={(e) => handleChange('reporter_title', e.target.value)}
                    placeholder="Ví dụ: NGƯỜI LẬP BÁO CÁO"
                    className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bên phải phần chữ ký cuối trang
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chức danh Người duyệt / BGH
                  </label>
                  <input
                    type="text"
                    value={config.approver_title}
                    onChange={(e) => handleChange('approver_title', e.target.value)}
                    placeholder="Ví dụ: BAN GIÁM HIỆU / XÁC NHẬN"
                    className="w-full h-10 px-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bên trái phần chữ ký cuối trang
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Hành động */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto h-10 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto h-10 px-6 text-sm font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình mẫu'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Document Preview Card (Sticky on Desktop) */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/30">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Xem trước mẫu hiển thị
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                Trực quan A4
              </span>
            </div>

            {/* Simulated Clean A4 Paper Sheet Sheet */}
            <div className="bg-white text-slate-900 rounded-xl border border-slate-200/90 shadow-md p-6 sm:p-7 space-y-5 text-xs font-sans leading-relaxed">
              {/* Document Header Line */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
                <div className="space-y-0.5 text-center">
                  <p className="font-bold uppercase text-[10px] tracking-wide text-slate-500">
                    {config.parent_organization || 'TRƯỜNG THCS TRẦN QUANG KHẢI'}
                  </p>
                  <p className="font-bold text-slate-900 text-xs uppercase">
                    {config.unit_name || 'GIÁM THỊ'}
                  </p>
                </div>
                <div className="text-left sm:text-right space-y-0.5 text-[10px] text-slate-500">
                  <p>Năm học: <strong className="text-slate-800">2025 - 2026</strong></p>
                  <p>Ngày lập: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></p>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center space-y-1 py-1">
                <h2 className="font-bold text-sm sm:text-base text-red-600 uppercase tracking-tight">
                  {config.report_title || 'BẢN TỔNG KẾT VI PHẠM HÀNG TUẦN'}
                </h2>
                <p className="text-[11px] font-semibold text-slate-500">
                  Tuần 24 — Khối 8
                </p>
              </div>

              {/* Table Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide border-b border-slate-100 pb-1">
                  {config.table_section_title || 'I. BẢNG THỐNG KÊ CHI TIẾT LỖI VI PHẠM THEO LỚP'}
                </h4>

                <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-2xs">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-2 text-center w-8 border-r border-slate-300">STT</th>
                        <th className="p-2 w-12 border-r border-slate-300">LỚP</th>
                        <th className="p-2 w-28 border-r border-slate-300">GVCN</th>
                        <th className="p-2 text-center w-12 border-r border-slate-300">SĨ SỐ</th>
                        <th className="p-2">HS VI PHẠM / LỖI / SỐ LẦN / THỜI GIAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      <tr className="align-top">
                        <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200">1</td>
                        <td className="p-2 font-bold text-slate-900 border-r border-slate-200">8A1</td>
                        <td className="p-2 text-slate-700 border-r border-slate-200 font-medium">Nguyễn Văn B</td>
                        <td className="p-2 text-center text-slate-700 border-r border-slate-200">42</td>
                        <td className="p-2 space-y-1">
                          <div className="font-bold text-slate-900">Trần Văn C</div>
                          <div className="text-[10px] text-slate-600 pl-2 border-l-2 border-rose-300">
                            • Đi học trễ: <strong className="text-rose-700">2 lần</strong> — <span className="font-mono text-[10px]">12/10 07:15, 14/10 07:10</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="align-top bg-slate-50/50">
                        <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200">2</td>
                        <td className="p-2 font-bold text-slate-900 border-r border-slate-200">8A2</td>
                        <td className="p-2 text-slate-700 border-r border-slate-200 font-medium">Lê Thị D</td>
                        <td className="p-2 text-center text-slate-700 border-r border-slate-200">40</td>
                        <td className="p-2 text-slate-400 italic">Không có vi phạm</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wide border-b border-slate-100 pb-1">
                  {config.summary_section_title || 'II. NHẬN XÉT & TỔNG KẾT CỦA GIÁM THỊ'}
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 italic text-[11px] leading-relaxed">
                  {config.summary_placeholder || 'Nhập đánh giá nề nếp, tuyên dương/nhắc nhở cụ thể cho các lớp trong tuần...'}
                </div>
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-center text-[11px]">
                <div className="space-y-8">
                  <div>
                    <p className="font-bold uppercase text-slate-800">
                      {config.approver_title || 'BAN GIÁM HIỆU / XÁC NHẬN'}
                    </p>
                    <p className="text-[10px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <p className="text-slate-300 font-mono text-[10px]">..................................</p>
                </div>

                <div className="space-y-8">
                  <div>
                    <p className="font-bold uppercase text-slate-800">
                      {config.reporter_title || 'NGƯỜI LẬP BÁO CÁO'}
                    </p>
                    <p className="text-[10px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <p className="font-bold text-slate-900">Thầy Trưởng Giám Thị</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

