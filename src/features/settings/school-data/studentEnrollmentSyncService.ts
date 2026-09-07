import * as XLSX from 'xlsx';
import { supabase } from '../../../services/supabaseClient';

export interface EnrollmentSyncSourceRow {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  className: string;
}

export type EnrollmentSyncStatus =
  | 'CHANGE_CLASS'
  | 'UNCHANGED'
  | 'NEW_ENROLLMENT'
  | 'STUDENT_NOT_FOUND'
  | 'CLASS_NOT_FOUND'
  | 'DUPLICATE_CODE'
  | 'INVALID_ROW';

export interface EnrollmentSyncPreviewRow extends EnrollmentSyncSourceRow {
  studentId?: string;
  systemFullName?: string;
  currentClassId?: string | null;
  currentClassName?: string | null;
  targetClassId?: string;
  targetClassName?: string;
  status: EnrollmentSyncStatus;
  errors: string[];
  warnings: string[];
}

export interface EnrollmentSyncSummary {
  totalRows: number;
  matchedStudents: number;
  changedClass: number;
  unchanged: number;
  newEnrollment: number;
  studentNotFound: number;
  classNotFound: number;
  duplicateCodes: number;
  invalidRows: number;
  warningRows: number;
}

export interface EnrollmentSyncPreview {
  rows: EnrollmentSyncPreviewRow[];
  summary: EnrollmentSyncSummary;
  validRows: EnrollmentSyncPreviewRow[];
  blockingRows: EnrollmentSyncPreviewRow[];
}

export interface EnrollmentSyncProgress {
  completed: number;
  total: number;
  percent: number;
}

const normalizeText = (value: unknown) => String(value ?? '').trim();
const normalizeCode = (value: unknown) => normalizeText(value).toUpperCase();
const normalizeClassName = (value: unknown) =>
  normalizeText(value)
    .replace(/^lớp\s+/i, '')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('vi-VN');

const chunk = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
};

const getHeaderValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return '';
};

export const studentEnrollmentSyncService = {
  async parseExcel(file: File): Promise<EnrollmentSyncSourceRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error('Không tìm thấy sheet dữ liệu trong file Excel.');

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
    if (!rawRows.length) throw new Error('File Excel không có dữ liệu.');
    if (rawRows.length > 10000) throw new Error('File có quá nhiều dòng. Tối đa 10.000 dòng mỗi lần.');

    return rawRows
      .map((row, index) => ({
        rowNumber: index + 2,
        studentCode: normalizeCode(
          getHeaderValue(row, ['student_code', 'Mã học sinh', 'Mã HS', 'Ma hoc sinh', 'Ma HS'])
        ),
        fullName: normalizeText(
          getHeaderValue(row, ['full_name', 'Họ và tên', 'Họ tên', 'Ho va ten', 'Ho ten'])
        ),
        className: normalizeText(
          getHeaderValue(row, ['class_name', 'Lớp', 'Lớp mới', 'Tên lớp', 'Lop', 'Lop moi'])
        ),
      }))
      .filter(row => row.studentCode || row.fullName || row.className);
  },

  async buildPreview(
    sourceRows: EnrollmentSyncSourceRow[],
    academicYearId: string
  ): Promise<EnrollmentSyncPreview> {
    if (!academicYearId) throw new Error('Vui lòng chọn năm học trước khi đồng bộ.');
    if (!sourceRows.length) throw new Error('Không có dữ liệu học sinh để đối chiếu.');

    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, code, academic_year_id, is_active')
      .eq('academic_year_id', academicYearId)
      .eq('is_active', true);
    if (classesError) throw classesError;

    const classMap = new Map<string, any>();
    (classes || []).forEach(c => {
      classMap.set(normalizeClassName(c.name), c);
      if (c.code) classMap.set(normalizeClassName(c.code), c);
    });

    const codeCounts = new Map<string, number>();
    sourceRows.forEach(row => {
      if (row.studentCode) codeCounts.set(row.studentCode, (codeCounts.get(row.studentCode) || 0) + 1);
    });

    const uniqueCodes = Array.from(new Set(sourceRows.map(r => r.studentCode).filter(Boolean)));
    const profiles: any[] = [];
    for (const codes of chunk(uniqueCodes, 250)) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, student_code')
        .in('student_code', codes);
      if (error) throw error;
      profiles.push(...(data || []));
    }

    const profileByCode = new Map<string, any>();
    profiles.forEach(profile => {
      if (profile.student_code) profileByCode.set(normalizeCode(profile.student_code), profile);
    });

    const enrollments: any[] = [];
    const studentIds = profiles.map(p => p.id);
    for (const ids of chunk(studentIds, 250)) {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('student_id, class_id, classes:class_id(id, name)')
        .eq('academic_year_id', academicYearId)
        .in('student_id', ids);
      if (error) throw error;
      enrollments.push(...(data || []));
    }

    const enrollmentByStudent = new Map<string, any>();
    enrollments.forEach(e => enrollmentByStudent.set(e.student_id, e));

    const rows: EnrollmentSyncPreviewRow[] = sourceRows.map(source => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const profile = source.studentCode ? profileByCode.get(source.studentCode) : undefined;
      const targetClass = source.className ? classMap.get(normalizeClassName(source.className)) : undefined;

      if (!source.studentCode) errors.push('Thiếu mã học sinh.');
      if (!source.className) errors.push('Thiếu lớp mới.');
      if (source.studentCode && (codeCounts.get(source.studentCode) || 0) > 1) {
        errors.push('Mã học sinh bị trùng trong file.');
      }
      if (source.studentCode && !profile) errors.push('Không tìm thấy mã học sinh trên hệ thống.');
      if (source.className && !targetClass) errors.push('Không tìm thấy lớp trong năm học đã chọn.');

      if (profile && source.fullName) {
        const inputName = source.fullName.toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
        const systemName = normalizeText(profile.full_name)
          .toLocaleLowerCase('vi-VN')
          .replace(/\s+/g, ' ')
          .trim();
        if (inputName && systemName && inputName !== systemName) {
          warnings.push(`Tên trong Excel khác hệ thống (${profile.full_name}). Đối chiếu vẫn dùng mã học sinh.`);
        }
      }

      const currentEnrollment = profile ? enrollmentByStudent.get(profile.id) : undefined;
      const currentClass = currentEnrollment?.classes as { id: string; name: string } | null | undefined;

      let status: EnrollmentSyncStatus = 'INVALID_ROW';
      if (errors.some(e => e.includes('trùng'))) status = 'DUPLICATE_CODE';
      else if (errors.some(e => e.includes('mã học sinh'))) status = 'STUDENT_NOT_FOUND';
      else if (errors.some(e => e.includes('lớp'))) status = 'CLASS_NOT_FOUND';
      else if (errors.length > 0) status = 'INVALID_ROW';
      else if (!currentEnrollment) status = 'NEW_ENROLLMENT';
      else if (currentEnrollment.class_id === targetClass.id) status = 'UNCHANGED';
      else status = 'CHANGE_CLASS';

      return {
        ...source,
        studentId: profile?.id,
        systemFullName: profile?.full_name,
        currentClassId: currentEnrollment?.class_id || null,
        currentClassName: currentClass?.name || null,
        targetClassId: targetClass?.id,
        targetClassName: targetClass?.name,
        status,
        errors,
        warnings,
      };
    });

    const blockingStatuses: EnrollmentSyncStatus[] = [
      'STUDENT_NOT_FOUND',
      'CLASS_NOT_FOUND',
      'DUPLICATE_CODE',
      'INVALID_ROW',
    ];
    const blockingRows = rows.filter(r => blockingStatuses.includes(r.status));
    const validRows = rows.filter(r =>
      ['CHANGE_CLASS', 'NEW_ENROLLMENT'].includes(r.status)
    );

    const summary: EnrollmentSyncSummary = {
      totalRows: rows.length,
      matchedStudents: rows.filter(r => Boolean(r.studentId)).length,
      changedClass: rows.filter(r => r.status === 'CHANGE_CLASS').length,
      unchanged: rows.filter(r => r.status === 'UNCHANGED').length,
      newEnrollment: rows.filter(r => r.status === 'NEW_ENROLLMENT').length,
      studentNotFound: rows.filter(r => r.status === 'STUDENT_NOT_FOUND').length,
      classNotFound: rows.filter(r => r.status === 'CLASS_NOT_FOUND').length,
      duplicateCodes: rows.filter(r => r.status === 'DUPLICATE_CODE').length,
      invalidRows: rows.filter(r => r.status === 'INVALID_ROW').length,
      warningRows: rows.filter(r => r.warnings.length > 0).length,
    };

    return { rows, summary, validRows, blockingRows };
  },

  async sync(
    preview: EnrollmentSyncPreview,
    academicYearId: string,
    onProgress?: (progress: EnrollmentSyncProgress) => void
  ) {
    if (preview.blockingRows.length > 0) {
      throw new Error('File còn lỗi nghiêm trọng. Hãy sửa file Excel trước khi đồng bộ.');
    }

    const records = preview.validRows.map(row => ({
      student_id: row.studentId!,
      class_id: row.targetClassId!,
    }));

    if (!records.length) {
      onProgress?.({ completed: 0, total: 0, percent: 100 });
      return { syncedCount: 0 };
    }

    const batches = chunk(records, 250);
    let completed = 0;
    let syncedCount = 0;

    for (const batch of batches) {
      const { data, error } = await supabase.rpc('bulk_sync_student_enrollments', {
        p_academic_year_id: academicYearId,
        p_enrollments: batch,
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      syncedCount += Number(result?.synced_count ?? batch.length);
      completed += batch.length;
      onProgress?.({
        completed,
        total: records.length,
        percent: Math.round((completed / records.length) * 100),
      });
    }

    return { syncedCount };
  },

  downloadTemplate() {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        student_code: '2025-LH65-246',
        full_name: 'Ao Phạm Hoàng My',
        class_name: '6/1',
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Phan_lop');
    XLSX.writeFile(workbook, 'Mau_dong_bo_phan_lop.xlsx');
  },

  exportIssues(preview: EnrollmentSyncPreview) {
    const issueRows = preview.rows
      .filter(row => row.errors.length > 0 || row.warnings.length > 0)
      .map(row => ({
        'Dòng Excel': row.rowNumber,
        'Mã học sinh': row.studentCode,
        'Họ và tên': row.fullName,
        'Lớp mới': row.className,
        'Lớp hiện tại': row.currentClassName || '',
        'Trạng thái': row.status,
        'Lỗi': row.errors.join('; '),
        'Cảnh báo': row.warnings.join('; '),
      }));

    const worksheet = XLSX.utils.json_to_sheet(issueRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Loi_doi_chieu');
    XLSX.writeFile(workbook, 'Bao_cao_loi_dong_bo_phan_lop.xlsx');
  },
};
