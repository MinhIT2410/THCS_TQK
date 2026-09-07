import * as XLSX from 'xlsx';
import { supabase } from '../../../services/supabaseClient';
import { userCreationApi } from '../../users/userCreationApi';

export interface RosterClassOption {
  id: string;
  name: string;
}

export interface ParsedRosterRow {
  row_number: number;
  stt: number;
  grade: string;
  class_name: string;
  full_name: string;
  gender: string;
  birth_date: string;
  student_code: string;
  class_id: string | null;
  is_valid: boolean;
  errors: string[];
}

export interface ResetProgress {
  phase: 'reset' | 'import';
  completed: number;
  total: number;
}

export interface ImportAccountResult {
  row_number: number;
  full_name: string;
  class_name: string;
  student_code: string;
  success: boolean;
  login_identifier: string;
  temporary_password: string;
  message: string;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function makeStudentCodePrefix(academicYearName: string): string {
  const years = academicYearName.match(/(\d{4}).*?(\d{4})/);
  if (years) return `TQK${years[1].slice(-2)}${years[2].slice(-2)}`;
  const digits = academicYearName.replace(/\D/g, '').slice(-4);
  return `TQK${digits || 'HS'}`;
}

function excelValueToDateString(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const dd = String(value.getDate()).padStart(2, '0');
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${value.getFullYear()}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
  }
  return normalizeText(value);
}

export const studentRosterResetService = {
  async parseOfficialRoster(
    file: File,
    academicYearName: string,
    classes: RosterClassOption[]
  ): Promise<ParsedRosterRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('File Excel không có sheet dữ liệu.');

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
    if (rows.length < 3) throw new Error('File Excel không có đủ dữ liệu học sinh.');

    let headerIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const keys = rows[i].map(normalizeKey);
      if (keys.includes('stt') && keys.includes('lop') && keys.some((k: string) => k.includes('ho va lot'))) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex < 0) {
      throw new Error('Không tìm thấy dòng tiêu đề gồm STT, Lớp, Họ và lót, Tên.');
    }

    const headers = rows[headerIndex].map(normalizeKey);
    const idx = {
      stt: headers.indexOf('stt'),
      grade: headers.findIndex((h: string) => h === 'khoi'),
      className: headers.findIndex((h: string) => h === 'lop'),
      lastName: headers.findIndex((h: string) => h.includes('ho va lot')),
      firstName: headers.findIndex((h: string) => h === 'ten'),
      gender: headers.findIndex((h: string) => h.includes('gioi tinh')),
      birthDate: headers.findIndex((h: string) => h.includes('ngay sinh')),
    };

    if ([idx.stt, idx.className, idx.lastName, idx.firstName].some(v => v < 0)) {
      throw new Error('File thiếu cột bắt buộc: STT, Lớp, Họ và lót hoặc Tên.');
    }

    const classMap = new Map(classes.map(c => [normalizeKey(c.name), c.id]));
    const prefix = makeStudentCodePrefix(academicYearName);
    const parsed: ParsedRosterRow[] = [];

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const raw = rows[i];
      const rawStt = raw[idx.stt];
      const stt = Number(rawStt);
      const className = normalizeText(raw[idx.className]);
      const lastName = normalizeText(raw[idx.lastName]);
      const firstName = normalizeText(raw[idx.firstName]);
      const fullName = normalizeText(`${lastName} ${firstName}`);

      if (!rawStt && !className && !fullName) continue;

      const errors: string[] = [];
      if (!Number.isInteger(stt) || stt <= 0) errors.push('STT không hợp lệ');
      if (!fullName) errors.push('Thiếu họ tên');
      if (!className) errors.push('Thiếu lớp');

      const classId = classMap.get(normalizeKey(className)) || null;
      if (className && !classId) errors.push(`Không tìm thấy lớp ${className} trong năm học đã chọn`);

      const studentCode = Number.isInteger(stt) && stt > 0
        ? `${prefix}-${String(stt).padStart(4, '0')}`
        : '';

      parsed.push({
        row_number: i + 1,
        stt,
        grade: idx.grade >= 0 ? normalizeText(raw[idx.grade]) : '',
        class_name: className,
        full_name: fullName,
        gender: idx.gender >= 0 ? normalizeText(raw[idx.gender]) : '',
        birth_date: idx.birthDate >= 0 ? excelValueToDateString(raw[idx.birthDate]) : '',
        student_code: studentCode,
        class_id: classId,
        is_valid: errors.length === 0,
        errors,
      });
    }

    const counts = new Map<string, number>();
    parsed.forEach(r => {
      if (r.student_code) counts.set(r.student_code, (counts.get(r.student_code) || 0) + 1);
    });
    parsed.forEach(r => {
      if (r.student_code && (counts.get(r.student_code) || 0) > 1) {
        r.errors.push(`Trùng mã sinh tự động ${r.student_code}`);
        r.is_valid = false;
      }
    });

    return parsed;
  },

  async resetAllStudentAccounts(onProgress?: (progress: ResetProgress) => void) {
    const failed: Array<{ user_id: string; message: string }> = [];

    const countRemaining = async (): Promise<number> => {
      const { data, error } = await supabase.functions.invoke('admin-reset-students', {
        body: { action: 'count_remaining' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Không thể đếm tài khoản học sinh còn lại.');
      return Number(data.remaining || 0);
    };

    const initialTotal = await countRemaining();
    let completed = 0;

    if (initialTotal === 0) {
      onProgress?.({ phase: 'reset', completed: 0, total: 0 });
      return { total: 0, failed };
    }

    // Prepare and delete repeatedly. Each prepared batch is capped at 500 rows,
    // avoiding the PostgREST 1000-row response limit that previously left students behind.
    while (true) {
      const remainingBefore = await countRemaining();
      if (remainingBefore <= 0) break;

      const { data: prepareData, error: prepareError } = await supabase.functions.invoke('admin-reset-students', {
        body: { action: 'prepare_batch', limit: 500 },
      });
      if (prepareError) throw prepareError;
      if (!prepareData?.success) throw new Error(prepareData?.message || 'Không thể chuẩn bị batch reset học sinh.');

      const userIds: string[] = Array.isArray(prepareData.user_ids) ? prepareData.user_ids : [];
      if (userIds.length === 0) {
        throw new Error(`Hệ thống vẫn còn ${remainingBefore} học sinh nhưng không lấy được batch để xóa. Đã dừng để bảo vệ dữ liệu.`);
      }

      for (let i = 0; i < userIds.length; i += 50) {
        const batch = userIds.slice(i, i + 50);
        const { data, error } = await supabase.functions.invoke('admin-reset-students', {
          body: { action: 'delete_batch', user_ids: batch },
        });
        if (error) throw error;

        const batchFailed: Array<{ user_id: string; message: string }> = [];
        if (Array.isArray(data?.failed)) batchFailed.push(...data.failed);
        if (Array.isArray(data?.protected_ids) && data.protected_ids.length > 0) {
          batchFailed.push(...data.protected_ids.map((id: string) => ({
            user_id: id,
            message: 'Tài khoản có thêm vai trò khác nên được bảo vệ.',
          })));
        }

        if (batchFailed.length > 0) {
          failed.push(...batchFailed);
          return { total: initialTotal, failed };
        }

        completed += batch.length;
        onProgress?.({ phase: 'reset', completed: Math.min(completed, initialTotal), total: initialTotal });
      }
    }

    const finalRemaining = await countRemaining();
    if (finalRemaining > 0) {
      failed.push({
        user_id: '',
        message: `Còn ${finalRemaining} tài khoản STUDENT chưa xóa được.`,
      });
    }

    return { total: initialTotal, failed };
  },

  async importRoster(
    rows: ParsedRosterRow[],
    academicYearId: string,
    onProgress?: (progress: ResetProgress) => void
  ): Promise<ImportAccountResult[]> {
    const validRows = rows.filter(r => r.is_valid && r.class_id);
    const results: ImportAccountResult[] = [];
    const batchSize = 10;
    let completed = 0;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      const payload = batch.map(r => ({
        row_number: r.row_number,
        full_name: r.full_name,
        student_code: r.student_code,
        roles: ['STUDENT'],
        class_id: r.class_id,
        academic_year_id: academicYearId,
      }));

      try {
        const response = await userCreationApi.createManyUsers(payload);
        const returned = Array.isArray(response?.data) ? response.data : [];
        for (const row of batch) {
          const r = returned.find((item: any) => item.row_number === row.row_number);
          results.push({
            row_number: row.row_number,
            full_name: row.full_name,
            class_name: row.class_name,
            student_code: row.student_code,
            success: !!r?.success,
            login_identifier: r?.login_identifier || '',
            temporary_password: r?.temporary_password || '',
            message: r?.error || (r?.success ? 'Tạo thành công' : 'Không nhận được kết quả từ máy chủ'),
          });
        }
      } catch (error: any) {
        for (const row of batch) {
          results.push({
            row_number: row.row_number,
            full_name: row.full_name,
            class_name: row.class_name,
            student_code: row.student_code,
            success: false,
            login_identifier: '',
            temporary_password: '',
            message: error?.message || 'Lỗi khi tạo batch tài khoản.',
          });
        }
      }

      completed += batch.length;
      onProgress?.({ phase: 'import', completed, total: validRows.length });
    }

    return results;
  },

  downloadResults(results: ImportAccountResult[]) {
    const data = results.map(r => ({
      'Dòng Excel': r.row_number,
      'Họ và tên': r.full_name,
      'Lớp': r.class_name,
      'Mã học sinh': r.student_code,
      'Tên đăng nhập': r.login_identifier,
      'Mật khẩu tạm': r.temporary_password,
      'Trạng thái': r.success ? 'Thành công' : 'Thất bại',
      'Chi tiết': r.message,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ket_qua');
    XLSX.writeFile(wb, 'ket_qua_reset_va_nhap_lai_hoc_sinh.xlsx');
  },
};
