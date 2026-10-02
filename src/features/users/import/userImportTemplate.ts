/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { sortClassesNaturally } from '../../../utils/classSortUtils';
import { UserImportMode } from './userImportTypes';

export const downloadImportTemplate = (
  classes: any[],
  academicYears: any[],
  importMode: UserImportMode = 'MIXED'
) => {
  const studentRows = [
    {
      full_name: 'Nguyễn Văn An',
      student_code: 'HS000001',
      email: '',
      roles: 'STUDENT',
      class_name: '6/1',
      academic_year_name: '2026-2027'
    },
    {
      full_name: 'Trần Thị Bé',
      student_code: 'HS000002',
      email: '',
      roles: 'STUDENT',
      class_name: '6/1',
      academic_year_name: '2026-2027'
    }
  ];

  const staffRows = [
    {
      full_name: 'Nguyễn Thị Giáo Viên',
      student_code: '',
      email: 'giaovien1@truong.edu.vn',
      roles: 'TEACHER',
      class_name: '',
      academic_year_name: ''
    },
    {
      full_name: 'Trần Văn Cán Bộ',
      student_code: '',
      email: 'canbo1@truong.edu.vn',
      roles: 'STAFF',
      class_name: '',
      academic_year_name: ''
    }
  ];

  const accountRows =
    importMode === 'STUDENT'
      ? studentRows
      : importMode === 'STAFF'
        ? staffRows
        : [...studentRows, ...staffRows];

  let classRows: any[] = [];
  if (classes && classes.length > 0) {
    classRows = sortClassesNaturally(classes).map(c => ({
      class_name: c.name,
      grade_level: c.grade_level || ''
    }));
  } else {
    classRows = [{
      class_name: 'Không tải được danh sách lớp. Vui lòng kiểm tra cấu hình hệ thống.',
      grade_level: ''
    }];
  }

  let yearRows: any[] = [];
  if (academicYears && academicYears.length > 0) {
    yearRows = academicYears.map(y => ({
      academic_year_name: y.name,
      start_date: y.start_date || '',
      end_date: y.end_date || '',
      is_current: y.is_active ? 'TRUE' : 'FALSE'
    }));
  } else {
    yearRows = [{
      academic_year_name: 'Không tải được danh sách năm học. Vui lòng kiểm tra cấu hình hệ thống.',
      start_date: '',
      end_date: '',
      is_current: ''
    }];
  }

  const instructionRows = [
    { 'Quy tắc chuẩn bị dữ liệu': 'Chế độ file', 'Mô tả chi tiết': importMode === 'STAFF' ? 'Mẫu dành cho Giáo viên/Cán bộ. Không dùng vai trò STUDENT.' : importMode === 'STUDENT' ? 'Mẫu dành cho Học sinh. Vai trò phải có STUDENT.' : 'Mẫu hỗn hợp tương thích luồng cũ.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Họ tên (full_name)', 'Mô tả chi tiết': 'Bắt buộc nhập.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Vai trò (roles)', 'Mô tả chi tiết': 'Bắt buộc. Hợp lệ: SUPER_ADMIN, PRINCIPAL, VICE_PRINCIPAL, CONTENT_EDITOR, STAFF, TEACHER, STUDENT.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Giáo viên/Cán bộ', 'Mô tả chi tiết': 'Bắt buộc có Email. Giáo viên dùng TEACHER; cán bộ/nhân viên có thể dùng STAFF hoặc vai trò quản lý phù hợp quyền của người nhập.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Mã học sinh (student_code)', 'Mô tả chi tiết': 'Chỉ dành cho STUDENT; học sinh không có Email bắt buộc có Mã học sinh.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Tên lớp học (class_name)', 'Mô tả chi tiết': 'Chỉ bắt buộc với STUDENT. Copy chính xác từ sheet Danh_sach_lop.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Tên năm học (academic_year_name)', 'Mô tả chi tiết': 'Chỉ bắt buộc với STUDENT. Copy chính xác từ sheet Nam_hoc.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Phân cách vai trò', 'Mô tả chi tiết': 'Nhiều vai trò phân cách bằng dấu phẩy, ví dụ TEACHER,STAFF.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Giới hạn', 'Mô tả chi tiết': 'Tối đa 100 tài khoản mỗi lần nhập.' }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(accountRows), 'Tai_khoan');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(classRows), 'Danh_sach_lop');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(yearRows), 'Nam_hoc');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(instructionRows), 'Huong_dan');

  const fileName =
    importMode === 'STAFF'
      ? 'mau_nhap_giao_vien_can_bo.xlsx'
      : importMode === 'STUDENT'
        ? 'mau_nhap_hoc_sinh.xlsx'
        : 'mau_tao_tai_khoan.xlsx';

  XLSX.writeFile(workbook, fileName);
};
