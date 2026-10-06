/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { 
  CompetitionWeeklyReport, 
  ClassReportRowSnapshot 
} from '../../types/competition';
import { 
  CompetitionReportConfig, 
  DEFAULT_COMPETITION_REPORT_CONFIG 
} from '../../services/competitionReportConfigService';
import { cleanPeriodLabel } from '../../utils/reportPdfExporter';

export interface ReportDocumentProps {
  report: CompetitionWeeklyReport;
  reportConfig?: CompetitionReportConfig | null;
  editableNotes?: boolean;
  notesValue?: string;
  onNotesChange?: (val: string) => void;
  isSnapshot?: boolean;
}

export const ReportDocument = forwardRef<HTMLDivElement, ReportDocumentProps>(({
  report,
  reportConfig: propConfig,
  editableNotes = false,
  notesValue,
  onNotesChange,
  isSnapshot = false,
}, ref) => {
  // Merge CMS Config: Prioritize frozen report_config in snapshot, fallback to propConfig, then DEFAULT
  const config: CompetitionReportConfig = {
    ...DEFAULT_COMPETITION_REPORT_CONFIG,
    ...(propConfig || {}),
    ...(report.report_config || {}),
  };

  const classRows: ClassReportRowSnapshot[] | undefined = report.class_report_rows;
  const legacyStats = report.violation_stats;

  // Determine whether to show class-based table or legacy stats
  const hasClassRows = Array.isArray(classRows) && classRows.length > 0;
  const isLegacyReport = !hasClassRows && Array.isArray(legacyStats) && legacyStats.length > 0;

  const currentNotes = editableNotes ? (notesValue ?? report.supervisor_notes ?? '') : (report.supervisor_notes || '');

  const displayDateStr = isSnapshot && report.created_at
    ? new Date(report.created_at).toLocaleString('vi-VN')
    : `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div 
      ref={ref}
      className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 space-y-6 max-w-4xl mx-auto font-sans"
    >
      {/* DOCUMENT HEADER */}
      <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
        <div className="text-center">
          <p className="font-bold uppercase tracking-wide text-slate-600">
            {config.parent_organization}
          </p>
          <p className="font-bold text-slate-900 text-sm uppercase">
            {config.unit_name}
          </p>
        </div>
        <div className="text-left sm:text-right text-slate-600 space-y-0.5">
          <p>Năm học: <strong className="text-slate-900">{report.academic_year_name || '2025-2026'}</strong></p>
          <p>{isSnapshot ? 'Thời điểm lưu:' : 'Thời điểm lập:'} <strong>{displayDateStr}</strong></p>
        </div>
      </div>

      {/* REPORT TITLE */}
      <div className="text-center space-y-1 py-2">
        <h1 className="font-bold text-lg sm:text-xl text-slate-900 uppercase tracking-tight">
          {config.report_title}
        </h1>
        <p className="text-xs font-semibold text-slate-600">
          {cleanPeriodLabel(report.period_label || report.week_name)} — {report.grade_name}
        </p>
      </div>

      {/* METADATA SUMMARY BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500">Người lập báo cáo:</span>{' '}
          <strong className="text-slate-900">{report.creator_name || 'Giám thị phụ trách'}</strong>
        </div>
        <div>
          <span className="text-slate-500">Phạm vi theo dõi:</span>{' '}
          <strong className="text-slate-900">{report.grade_name}</strong>
        </div>
        <div>
          <span className="text-slate-500">Tổng số lượt vi phạm:</span>{' '}
          <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
            {report.total_violations || 0} lượt
          </span>
        </div>
      </div>

      {/* VIOLATIONS TABLE SECTION */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
          {config.table_section_title}
        </h4>

        {hasClassRows ? (
          /* NEW CLASS-BASED TABLE STRUCTURE */
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2.5 text-center w-10 border-r border-slate-300">STT</th>
                  <th className="p-2.5 w-16 border-r border-slate-300">LỚP</th>
                  <th className="p-2.5 w-40 border-r border-slate-300">GVCN</th>
                  <th className="p-2.5 text-center w-16 border-r border-slate-300">SĨ SỐ</th>
                  <th className="p-2.5">HS VI PHẠM / LỖI / SỐ LẦN / THỜI GIAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {classRows.map((row) => (
                  <tr key={row.class_id} className="hover:bg-slate-50/80 align-top">
                    <td className="p-2.5 text-center font-bold text-slate-500 border-r border-slate-200">
                      {row.stt}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                      {row.class_name}
                    </td>
                    <td className="p-2.5 text-slate-700 font-medium border-r border-slate-200">
                      {row.homeroom_teacher_name}
                    </td>
                    <td className="p-2.5 text-center text-slate-700 border-r border-slate-200 font-medium">
                      {row.student_count}
                    </td>
                    <td className="p-2.5 leading-relaxed">
                      {!row.student_violations_groups || row.student_violations_groups.length === 0 ? (
                        <span className="text-slate-400 italic">Không có vi phạm</span>
                      ) : (
                        <div className="space-y-2">
                          {row.student_violations_groups.map((sGroup, sIdx) => (
                            <div key={sIdx} className="space-y-0.5">
                              <div className="font-bold text-slate-900">
                                {sGroup.studentName}
                                {sGroup.studentCode ? (
                                  <span className="font-normal text-slate-500 ml-1">({sGroup.studentCode})</span>
                                ) : null}
                              </div>
                              <ul className="pl-3 space-y-0.5 list-disc text-slate-700 font-normal">
                                {sGroup.rules.map((r, rIdx) => (
                                  <li key={rIdx}>
                                    <span className="font-semibold text-slate-800">{r.ruleName}:</span>{' '}
                                    <span className="font-bold text-rose-700">{r.count} lần</span> —{' '}
                                    <span className="font-mono text-[11px] text-slate-600">{r.occurrencesStr}</span>
                                    {r.notes && r.notes.length > 0 ? (
                                      <span className="ml-1 text-slate-600 italic">
                                        ({r.notes.length === 1 ? r.notes[0] : r.notes.join('; ')})
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isLegacyReport ? (
          /* FALLBACK FOR OLD SNAPSHOTS (CREATED BEFORE CLASS_REPORT_ROWS) */
          <div className="space-y-2">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs font-semibold">
              Báo cáo phiên bản cũ (Thống kê nhóm vi phạm)
            </div>
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2.5 text-center w-10 border-r border-slate-300">STT</th>
                    <th className="p-2.5 border-r border-slate-300">Tên lỗi vi phạm</th>
                    <th className="p-2.5 text-center w-20 border-r border-slate-300">Số lượt</th>
                    <th className="p-2.5">Lớp vi phạm nhiều</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {legacyStats.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-center text-slate-400 font-semibold border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">{s.rule_name}</td>
                      <td className="p-2.5 text-center font-bold text-rose-600 border-r border-slate-200">{s.count}</td>
                      <td className="p-2.5 text-slate-700">{s.top_classes_str}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="p-4 text-center text-slate-500 italic bg-slate-50 rounded-lg border border-slate-200">
            Không có dữ liệu vi phạm.
          </div>
        )}
      </div>

      {/* SUPERVISOR NOTES / COMMENTS */}
      <div className="space-y-2 pt-2">
        <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
          {config.summary_section_title}
        </h4>

        {editableNotes ? (
          <textarea
            value={notesValue}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder={config.summary_placeholder}
            rows={3}
            className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 font-medium"
          />
        ) : (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap min-h-[60px] leading-relaxed">
            {currentNotes || <span className="text-slate-400 italic">Không có nhận xét bổ sung.</span>}
          </div>
        )}
      </div>

      {/* SIGNATURE SECTION */}
      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs text-center">
        <div className="space-y-12">
          <div>
            <p className="font-bold uppercase text-slate-700">
              {config.approver_title}
            </p>
            <p className="text-[11px] text-slate-400">(Ký và ghi rõ họ tên)</p>
          </div>
          <p className="text-slate-300 italic">................................................</p>
        </div>
        <div className="space-y-12">
          <div>
            <p className="font-bold uppercase text-slate-700">
              {config.reporter_title}
            </p>
            <p className="text-[11px] text-slate-400">(Ký và ghi rõ họ tên)</p>
          </div>
          <p className="font-bold text-slate-900">{report.creator_name || 'Giám thị phụ trách'}</p>
        </div>
      </div>
    </div>
  );
});

ReportDocument.displayName = 'ReportDocument';
