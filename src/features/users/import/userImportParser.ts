/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { RawImportRow, UserImportMode, ValidatedImportRow } from './userImportTypes';

const ALLOWED_ROLES = [
  'SUPER_ADMIN',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'CONTENT_EDITOR',
  'STAFF',
  'TEACHER',
  'STUDENT'
];

/**
 * Maps Excel row to normalized keys.
 */
const mapRowKeys = (row: any, rowNumber: number): RawImportRow => {
  const normalized: Record<string, any> = {};

  Object.entries(row).forEach(([key, value]) => {
    const k = key.toLowerCase().trim();
    const val = value !== undefined && value !== null ? String(value).trim() : '';

    if (k.includes('họ và tên') || k.includes('họ tên') || k.includes('full_name') || k.includes('full name') || k === 'name') {
      normalized.full_name = val;
    } else if (k.includes('mã học sinh') || k.includes('student_code') || k.includes('student code') || k.includes('mã số học sinh')) {
      normalized.student_code = val;
    } else if (k.includes('email') || k === 'mail') {
      normalized.email = val;
    } else if (k.includes('vai trò') || k.includes('roles') || k.includes('role') || k.includes('chức vụ')) {
      normalized.roles = val;
    } else if (k.includes('mã lớp') || k.includes('class_id') || k.includes('class id') || k === 'class_id') {
      normalized.class_id = val;
    } else if (k.includes('tên lớp') || k.includes('class_name') || k.includes('class name') || k === 'lớp' || k === 'lop') {
      normalized.class_name = val;
    } else if (k.includes('mã năm') || k.includes('academic_year_id') || k.includes('academic year id') || k === 'academic_year_id') {
      normalized.academic_year_id = val;
    } else if (k.includes('tên năm') || k.includes('academic_year_name') || k.includes('academic year name') || k === 'năm học' || k === 'nam hoc') {
      normalized.academic_year_name = val;
    }
  });

  return {
    full_name: normalized.full_name || '',
    student_code: normalized.student_code || '',
    email: normalized.email || '',
    roles: normalized.roles || '',
    class_id: normalized.class_id || '',
    class_name: normalized.class_name || '',
    academic_year_id: normalized.academic_year_id || '',
    academic_year_name: normalized.academic_year_name || '',
    row_number: rowNumber
  };
};

export const parseExcelFile = (file: File): Promise<RawImportRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Không thể đọc dữ liệu file.'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        const parsedRows = rawJson.map((row, index) => mapRowKeys(row, index + 2)); // rows in excel start at 1, header is 1, so data starts at row 2
        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc file.'));
    };

    reader.readAsBinaryString(file);
  });
};

export const validateImportRows = (
  rows: RawImportRow[],
  classes: any[],
  academicYears: any[],
  importMode: UserImportMode = 'MIXED'
): ValidatedImportRow[] => {
  const emailsInFile = new Set<string>();
  const studentCodesInFile = new Set<string>();

  // Collect duplicates in file
  const duplicateEmails = new Set<string>();
  const duplicateStudentCodes = new Set<string>();

  rows.forEach((r) => {
    const email = r.email?.toLowerCase().trim();
    if (email) {
      if (emailsInFile.has(email)) {
        duplicateEmails.add(email);
      }
      emailsInFile.add(email);
    }

    const code = r.student_code?.toUpperCase().trim();
    if (code) {
      if (studentCodesInFile.has(code)) {
        duplicateStudentCodes.add(code);
      }
      studentCodesInFile.add(code);
    }
  });

  return rows.map((r) => {
    const errors: string[] = [];
    const fullName = r.full_name.trim();
    const email = r.email?.toLowerCase().trim() || undefined;
    const rawCode = r.student_code?.trim() || '';
    const studentCode = rawCode ? rawCode.toUpperCase().trim() : undefined;

    // 1. Full name is required
    if (!fullName) {
      errors.push('Họ và tên không được để trống.');
    }

    // 2. Roles parsing and validation
    const rawRoles = r.roles
      ? r.roles.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)
      : [];
    const uniqueRoles = Array.from(new Set(rawRoles));
    const validRoles: string[] = [];

    if (uniqueRoles.length === 0) {
      errors.push('Vai trò không được để trống.');
    } else {
      uniqueRoles.forEach((role) => {
        if (ALLOWED_ROLES.includes(role)) {
          validRoles.push(role);
        } else {
          errors.push(`Vai trò '${role}' không hợp lệ. Các vai trò được phép: ${ALLOWED_ROLES.join(', ')}`);
        }
      });
    }

    const isStudent = validRoles.includes('STUDENT');

    // Enforce the import mode selected in the UI. MIXED preserves the legacy behavior.
    if (importMode === 'STUDENT' && !isStudent) {
      errors.push('Chế độ hiện tại chỉ nhập Học sinh. Vai trò bắt buộc phải có STUDENT.');
    }
    if (importMode === 'STAFF' && isStudent) {
      errors.push('Chế độ hiện tại chỉ nhập Giáo viên/Cán bộ, không nhận vai trò STUDENT.');
    }

    // 3. Email-less check & Email checks
    if (!email) {
      if (isStudent) {
        if (!studentCode) {
          errors.push('Học sinh bắt buộc phải có Email hoặc Mã học sinh.');
        }
      } else {
        errors.push('Các vai trò cán bộ/giáo viên bắt buộc phải có Email.');
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Định dạng email không hợp lệ: ${email}`);
      } else if (duplicateEmails.has(email)) {
        errors.push(`Email bị trùng lặp trong file: ${email}`);
      }
    }

    // 4. Student code checks
    if (studentCode) {
      if (!isStudent) {
        errors.push('Chỉ vai trò STUDENT mới được khai báo Mã học sinh.');
      }
      if (!/^[A-Z0-9-]+$/.test(studentCode)) {
        errors.push(`Mã học sinh '${rawCode}' chứa ký tự không hợp lệ (chỉ cho phép chữ cái, số và dấu gạch ngang).`);
      }
      if (duplicateStudentCodes.has(studentCode)) {
        errors.push(`Mã học sinh bị trùng lặp trong file: ${studentCode}`);
      }
    }

    // 5. Student specific requirements - class_name and academic_year_name resolution
    let classId: string | null = null;
    let className: string | null = null;
    let academicYearId: string | null = null;
    let academicYearName: string | null = null;

    if (isStudent) {
      const rawClassName = r.class_name?.trim();
      const rawClassId = r.class_id?.trim();

      if (rawClassName) {
        const matchedClasses = classes.filter(
          (c) => c.name?.trim().toLowerCase() === rawClassName.toLowerCase()
        );

        if (matchedClasses.length > 1) {
          errors.push(`Có nhiều lớp cùng tên ‘${rawClassName}’. Vui lòng kiểm tra cấu hình lớp học.`);
        } else if (matchedClasses.length === 1) {
          classId = matchedClasses[0].id;
          className = matchedClasses[0].name;
        } else {
          // Fallback check to UUID if rawClassId exists and matches
          const matchedClassById = rawClassId ? classes.find((c) => c.id === rawClassId) : null;
          if (matchedClassById) {
            classId = rawClassId;
            className = matchedClassById.name;
          } else {
            errors.push(`Không tìm thấy lớp ‘${rawClassName}’ trong hệ thống.`);
          }
        }
      } else if (rawClassId) {
        const matchedClassById = classes.find((c) => c.id === rawClassId);
        if (matchedClassById) {
          classId = rawClassId;
          className = matchedClassById.name;
        } else {
          errors.push(`Mã lớp học (class_id) '${rawClassId}' không tồn tại trong hệ thống.`);
        }
      } else {
        errors.push('Học sinh bắt buộc phải điền Tên lớp học (class_name).');
      }

      const rawYearName = r.academic_year_name?.trim();
      const rawYearId = r.academic_year_id?.trim();

      if (rawYearName) {
        const matchedYears = academicYears.filter(
          (y) => y.name?.trim().toLowerCase() === rawYearName.toLowerCase()
        );

        if (matchedYears.length > 1) {
          errors.push(`Có nhiều năm học cùng tên ‘${rawYearName}’. Vui lòng kiểm tra cấu hình.`);
        } else if (matchedYears.length === 1) {
          academicYearId = matchedYears[0].id;
          academicYearName = matchedYears[0].name;
        } else {
          // Fallback check to UUID if rawYearId exists and matches
          const matchedYearById = rawYearId ? academicYears.find((y) => y.id === rawYearId) : null;
          if (matchedYearById) {
            academicYearId = rawYearId;
            academicYearName = matchedYearById.name;
          } else {
            errors.push(`Không tìm thấy năm học ‘${rawYearName}’ trong hệ thống.`);
          }
        }
      } else if (rawYearId) {
        const matchedYearById = academicYears.find((y) => y.id === rawYearId);
        if (matchedYearById) {
          academicYearId = rawYearId;
          academicYearName = matchedYearById.name;
        } else {
          errors.push(`Mã năm học (academic_year_id) '${rawYearId}' không tồn tại trong hệ thống.`);
        }
      } else {
        errors.push('Học sinh bắt buộc phải điền Tên năm học (academic_year_name).');
      }
    }

    return {
      row_number: r.row_number,
      full_name: fullName,
      student_code: studentCode,
      email,
      roles: validRoles,
      class_id: classId,
      academic_year_id: academicYearId,
      class_name: className || r.class_name || null,
      academic_year_name: academicYearName || r.academic_year_name || null,
      isValid: errors.length === 0,
      errors
    };
  });
};
