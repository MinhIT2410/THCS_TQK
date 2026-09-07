/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowRightLeft,
  UserPlus,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  GraduationCap,
  CheckCircle2,
  Info,
  Trash2,
} from 'lucide-react';
import {
  studentEnrollmentService,
  StudentEnrollmentItem,
} from '../../../services/studentEnrollmentService';
import { CreateUserModal } from '../../users/components/CreateUserModal';
import { sortClassesNaturally } from '../../../utils/classSortUtils';
import { useAuth } from '../../auth/useAuth';
import StudentRosterResetModal from './StudentRosterResetModal';

export default function StudentsTab() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const [students, setStudents] = useState<StudentEnrollmentItem[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Modal states for creating students
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [isRosterResetModalOpen, setIsRosterResetModalOpen] = useState<boolean>(false);

  // Filter states
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [gradeLevels, setGradeLevels] = useState<any[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>('all'); // 'all' | 'unassigned' | grade_level_id
  const [selectedClassId, setSelectedClassId] = useState<string>('all'); // 'all' | uuid
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all' | 'active' | 'inactive'

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Loading & Alert states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page to 1 on filter or page size change
  useEffect(() => {
    setPage(1);
  }, [selectedYearId, selectedScope, selectedClassId, statusFilter, debouncedSearch, pageSize]);

  // Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [modalTargetStudents, setModalTargetStudents] = useState<StudentEnrollmentItem[]>([]);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [targetYearId, setTargetYearId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Transfer single student modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferStudent, setTransferStudent] = useState<StudentEnrollmentItem | null>(null);
  const [newClassId, setNewClassId] = useState<string>('');

  // 1. Initial Load: Academic Years & Grade Levels
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [years, grades] = await Promise.all([
        studentEnrollmentService.getAcademicYears(),
        studentEnrollmentService.getGradeLevels(),
      ]);
      setAcademicYears(years);
      setGradeLevels(grades);

      if (years && years.length > 0) {
        // Find current or first year
        const current = years.find((y: any) => y.is_current || y.is_active) || years[0];
        setSelectedYearId(current.id);
        setTargetYearId(current.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu khởi tạo.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Load classes when year changes
  useEffect(() => {
    if (selectedYearId) {
      loadClasses(selectedYearId);
    }
  }, [selectedYearId]);

  const loadClasses = async (yearId: string) => {
    try {
      const clsList = await studentEnrollmentService.getClassesByAcademicYear(yearId);
      setClasses(clsList);
    } catch (err: any) {
      console.error('Lỗi tải danh sách lớp:', err);
    }
  };

  // 3. Fetch students when filters or pagination changes
  const fetchStudents = useCallback(async () => {
    if (!selectedYearId) return;

    setLoading(true);
    setError(null);
    try {
      const isUnassigned = selectedScope === 'unassigned';
      const targetGradeLevelId =
        selectedScope !== 'all' && selectedScope !== 'unassigned' ? selectedScope : null;

      const res = await studentEnrollmentService.getStudentsWithEnrollment({
        academicYearId: selectedYearId,
        gradeLevelId: targetGradeLevelId,
        classId: selectedClassId,
        search: debouncedSearch,
        isActive: statusFilter === 'all' ? null : statusFilter === 'active',
        unassignedOnly: isUnassigned,
        page,
        pageSize,
      });

      setStudents(res.students);
      setTotalItems(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách học sinh.');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedScope, selectedClassId, debouncedSearch, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle auto toast timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Selection toggle
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPage = () => {
    if (selectedStudentIds.length === students.length && students.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  // Open Assign Modal for bulk or single
  const openAssignModal = (targetList?: StudentEnrollmentItem[]) => {
    const listToAssign = targetList || students.filter(s => selectedStudentIds.includes(s.id));
    if (listToAssign.length === 0) {
      setError('Vui lòng chọn ít nhất một học sinh.');
      return;
    }
    setModalTargetStudents(listToAssign);
    setTargetYearId(selectedYearId);
    setTargetClassId(classes[0]?.id || '');
    setIsAssignModalOpen(true);
  };

  // Confirm Assign
  const handleConfirmAssign = async () => {
    if (!targetClassId) {
      setError('Vui lòng chọn lớp học.');
      return;
    }
    if (!targetYearId) {
      setError('Vui lòng chọn năm học.');
      return;
    }

    try {
      setIsSubmitting(true);
      const studentIds = modalTargetStudents.map(s => s.id);
      await studentEnrollmentService.assignStudentsToClass(studentIds, targetClassId, targetYearId);

      const targetClassName = classes.find(c => c.id === targetClassId)?.name || 'mới';
      setSuccess(`Đã phân ${studentIds.length} học sinh vào lớp ${targetClassName} thành công!`);
      setIsAssignModalOpen(false);
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi phân lớp học sinh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Transfer Modal
  const openTransferModal = (student: StudentEnrollmentItem) => {
    setTransferStudent(student);
    const availableNewClasses = classes.filter(c => c.id !== student.enrollment?.class_id);
    setNewClassId(availableNewClasses[0]?.id || '');
    setIsTransferModalOpen(true);
  };

  // Confirm Transfer Class
  const handleConfirmTransfer = async () => {
    if (!transferStudent || !newClassId || !selectedYearId) return;

    try {
      setIsSubmitting(true);
      await studentEnrollmentService.transferStudentClass(
        transferStudent.id,
        newClassId,
        selectedYearId
      );

      const newClassName = classes.find(c => c.id === newClassId)?.name || 'mới';
      setSuccess(`Đã chuyển học sinh ${transferStudent.full_name} sang lớp ${newClassName}!`);
      setIsTransferModalOpen(false);
      setTransferStudent(null);
      fetchStudents();
    } catch (err: any) {
      setError(err?.message || 'Không thể chuyển lớp học sinh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered and sorted class options for main Lớp học filter dropdown
  const filteredClassesForScope = useMemo(() => {
    if (selectedScope === 'all' || selectedScope === 'unassigned') return [];
    return classes.filter(c => {
      const currentGradeObj = gradeLevels.find(g => g.id === selectedScope);
      const gradeNum = currentGradeObj?.level_number || (currentGradeObj?.name?.match(/\d+/)?.[0]);
      if (c.grade_level_id) return c.grade_level_id === selectedScope;
      if (gradeNum && c.name) return c.name.startsWith(String(gradeNum));
      return false;
    });
  }, [classes, gradeLevels, selectedScope]);

  const sortedClassOptions = useMemo(() => {
    const sorted = sortClassesNaturally<any>(filteredClassesForScope, c => c.name);
    if (process.env.NODE_ENV !== 'production') {
      console.table(sorted.map(item => item.name));
    }
    return sorted;
  }, [filteredClassesForScope]);

  // Sorted classes for assign modal dropdown
  const sortedAssignClasses = useMemo(() => {
    return sortClassesNaturally<any>(classes, c => c.name);
  }, [classes]);

  // Sorted classes for transfer modal dropdown
  const sortedTransferClasses = useMemo(() => {
    if (!transferStudent) return [];
    const filtered = classes.filter(c => c.id !== transferStudent.enrollment?.class_id);
    return sortClassesNaturally<any>(filtered, c => c.name);
  }, [classes, transferStudent]);

  // Helper to determine empty state message
  const getEmptyStateMessage = () => {
    if (selectedScope === 'unassigned') {
      return 'Không có học sinh chưa được phân lớp trong năm học này.';
    }
    const isGradeScope = selectedScope !== 'all' && selectedScope !== 'unassigned';
    if (isGradeScope) {
      const currentGradeObj = gradeLevels.find(g => g.id === selectedScope);
      const gradeNum = currentGradeObj?.level_number || (currentGradeObj?.name?.match(/\d+/)?.[0]);
      const classesInGrade = classes.filter(c => {
        if (c.grade_level_id) return c.grade_level_id === selectedScope;
        if (gradeNum && c.name) return c.name.startsWith(String(gradeNum));
        return false;
      });

      if (classesInGrade.length === 0) {
        return 'Chưa có lớp nào thuộc khối này trong năm học đã chọn.';
      }
      if (selectedClassId && selectedClassId !== 'all') {
        return 'Không có học sinh phù hợp trong lớp đã chọn.';
      }
    }
    if (selectedClassId && selectedClassId !== 'all') {
      return 'Không có học sinh phù hợp trong lớp đã chọn.';
    }
    return 'Không tìm thấy học sinh nào phù hợp.';
  };

  const selectedYearName = academicYears.find(y => y.id === selectedYearId)?.name || '---';

  return (
    <div className="space-y-6" id="students-tab">
      {/* Toast Messages */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Danh Sách Học Sinh & Phân Lớp
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý danh sách học sinh, phân học sinh vào lớp và thực hiện chuyển lớp trong niên khóa.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedStudentIds.length > 0 && (
            <button
              type="button"
              onClick={() => openAssignModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Phân vào lớp ({selectedStudentIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Thêm học sinh</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsRosterResetModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all"
              title="Xóa toàn bộ tài khoản STUDENT cũ và nhập lại từ danh sách Excel chính thức"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset & nhập lại HS</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchStudents}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1 relative">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Tìm kiếm
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm tên hoặc Mã học sinh..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
            />
          </div>
        </div>

        {/* Academic Year Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Năm học
          </label>
          <select
            value={selectedYearId}
            onChange={e => {
              setSelectedYearId(e.target.value);
              setSelectedScope('all');
              setSelectedClassId('all');
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
          >
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>
                Năm học {y.name} {y.is_current ? '(Hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Phạm vi học sinh Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Phạm vi học sinh
          </label>
          <select
            value={selectedScope}
            onChange={e => {
              setSelectedScope(e.target.value);
              setSelectedClassId('all');
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
          >
            <option value="all">Tất cả học sinh</option>
            <option value="unassigned">Chưa phân lớp</option>
            {gradeLevels.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lớp học Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Lớp học
          </label>
          <select
            value={selectedClassId}
            onChange={e => {
              setSelectedClassId(e.target.value);
            }}
            disabled={selectedScope === 'all' || selectedScope === 'unassigned'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {selectedScope === 'all' && <option value="all">Chọn khối trước</option>}
            {selectedScope === 'unassigned' && <option value="all">Không áp dụng</option>}
            {selectedScope !== 'all' && selectedScope !== 'unassigned' && (
              <>
                <option value="all">
                  Tất cả lớp {gradeLevels.find(g => g.id === selectedScope)?.name || ''}
                </option>
                {sortedClassOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Trạng thái tài khoản
          </label>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>
        </div>
      </div>

      {/* Total items info */}
      <div className="flex justify-end text-xs text-slate-500 font-medium">
        Tổng cộng: <strong className="text-slate-900 dark:text-white font-bold ml-1">{totalItems}</strong> học sinh
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAllPage}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    {selectedStudentIds.length === students.length && students.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Mã học sinh</th>
                <th className="p-3.5">Họ và tên</th>
                <th className="p-3.5">Năm học</th>
                <th className="p-3.5">Lớp hiện tại</th>
                <th className="p-3.5 text-center">Phân lớp</th>
                <th className="p-3.5 text-center">Tài khoản</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Đang tải danh sách học sinh...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="space-y-2">
                      <Info className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {getEmptyStateMessage()}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map(student => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isAssigned = !!student.enrollment;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectStudent(student.id)}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {student.student_code || '---'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {student.full_name?.charAt(0) || 'S'}
                          </div>
                          <span>{student.full_name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                        {selectedYearName}
                      </td>
                      <td className="p-3.5">
                        {isAssigned ? (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs inline-block">
                            Lớp {student.enrollment?.class_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa phân lớp</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {isAssigned ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã phân lớp
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px] inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Chưa phân lớp
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {student.is_active ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-medium">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[11px] font-medium">
                            Khóa
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {isAssigned ? (
                          <button
                            type="button"
                            onClick={() => openTransferModal(student)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950/60 dark:text-slate-300 dark:hover:text-blue-300 font-bold text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Chuyển lớp</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openAssignModal([student])}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Phân vào lớp</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Trang <strong className="text-slate-900 dark:text-white font-bold">{page}</strong> / <strong className="text-slate-900 dark:text-white font-bold">{totalPages || 1}</strong> (Tổng số <strong className="text-slate-900 dark:text-white font-bold">{totalItems}</strong> học sinh)
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-400 font-medium">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value={25}>25 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>Trang sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL 1: ASSIGN / BULK ASSIGN STUDENTS TO CLASS --- */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Phân Học Sinh Vào Lớp
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Selected Academic Year */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Năm học áp dụng
                </label>
                <select
                  value={targetYearId}
                  onChange={e => {
                    setTargetYearId(e.target.value);
                    loadClasses(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium outline-none"
                >
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>
                      Năm học {y.name} {y.is_current ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Select */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Lớp học phân vào <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetClassId}
                  onChange={e => setTargetClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">-- Chọn lớp học --</option>
                  {sortedAssignClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* List of target students */}
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Danh sách học sinh sẽ phân lớp ({modalTargetStudents.length})
                </label>
                <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-800">
                  {modalTargetStudents.map(s => (
                    <div key={s.id} className="py-1.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{s.full_name}</span>
                        <span className="ml-2 font-mono text-slate-400">({s.student_code || 'Chưa có mã'})</span>
                      </div>
                      {s.enrollment && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium">
                          Đang ở Lớp {s.enrollment.class_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Hệ thống tự động liên kết học sinh vào lớp theo niên khóa được chọn. Học sinh đã phân lớp sẽ được cập nhật sang lớp mới.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting || !targetClassId}
                onClick={handleConfirmAssign}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận phân lớp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: TRANSFER CLASS --- */}
      {isTransferModalOpen && transferStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                Chuyển Lớp Cho Học Sinh
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setTransferStudent(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Student info summary */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {transferStudent.full_name}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    Mã học sinh: {transferStudent.student_code || 'Chưa cập nhật'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Năm học</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedYearName}</span>
                </div>
              </div>

              {/* Class transition display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Lớp hiện tại</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Lớp {transferStudent.enrollment?.class_name || '---'}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Lớp mới chuyển sang <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newClassId}
                    onChange={e => setNewClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="">-- Chọn lớp mới --</option>
                    {sortedTransferClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Chuyển lớp chỉ cập nhật phân lớp trong niên khóa <strong>{selectedYearName}</strong>. Dữ liệu lịch sử phân lớp ở các năm học trước không bị thay đổi.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setTransferStudent(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting || !newClassId}
                onClick={handleConfirmTransfer}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận chuyển lớp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      <CreateUserModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSuccess={() => {
          setIsAddStudentModalOpen(false);
          setSuccess('Đã thêm học sinh thành công!');
          fetchStudents();
        }}
        defaultRole="STUDENT"
        initialAcademicYearId={selectedYearId}
        initialClassId={selectedClassId}
      />


      <StudentRosterResetModal
        isOpen={isRosterResetModalOpen}
        onClose={() => setIsRosterResetModalOpen(false)}
        onSuccess={() => {
          setSuccess('Đã reset và nhập lại danh sách học sinh.');
          setSelectedStudentIds([]);
          fetchStudents();
        }}
        academicYearId={selectedYearId}
        academicYearName={selectedYearName}
        classes={classes}
      />
    </div>
  );
}
