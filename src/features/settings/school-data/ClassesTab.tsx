/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { sortClassesNaturally } from '../../../utils/classSortUtils';
import { Users, Plus, Edit2, Trash2, CheckCircle2, Loader2, AlertCircle, Search, Filter } from 'lucide-react';

interface ClassEntity {
  id: string;
  name: string;
  code: string | null;
  grade_level: number;
  grade_level_id: string | null;
  academic_year_id: string | null;
  expected_capacity: number | null;
  actual_enrollment: number | null;
  primary_classroom_id: string | null;
  is_active: boolean;
  notes: string | null;
  grade_levels?: { name: string } | null;
  academic_years?: { name: string } | null;
  classrooms?: { name: string } | null;
}

interface DropdownItem {
  id: string;
  name: string;
}

export default function ClassesTab() {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [grades, setGrades] = useState<DropdownItem[]>([]);
  const [years, setYears] = useState<DropdownItem[]>([]);
  const [rooms, setRooms] = useState<DropdownItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    grade_level_id: '',
    academic_year_id: '',
    expected_capacity: '',
    primary_classroom_id: '',
    is_active: true,
    notes: '',
  });

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch dropdowns
      const { data: gradesData } = await supabase.from('grade_levels').select('id, name').eq('is_active', true);
      const { data: yearsData } = await supabase.from('academic_years').select('id, name').eq('is_active', true);
      const { data: roomsData } = await supabase.from('classrooms').select('id, name').eq('is_active', true);

      setGrades(gradesData || []);
      setYears(yearsData || []);
      setRooms(roomsData || []);

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          grade_levels:grade_level_id(name),
          academic_years:academic_year_id(name),
          classrooms:primary_classroom_id(name)
        `);

      if (classesError) throw classesError;
      setClasses(classesData || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải danh sách lớp học: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      code: '',
      grade_level_id: grades[0]?.id || '',
      academic_year_id: years[0]?.id || '',
      expected_capacity: '40',
      primary_classroom_id: '',
      is_active: true,
      notes: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls: ClassEntity) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      code: cls.code || '',
      grade_level_id: cls.grade_level_id || '',
      academic_year_id: cls.academic_year_id || '',
      expected_capacity: cls.expected_capacity !== null ? String(cls.expected_capacity) : '',
      primary_classroom_id: cls.primary_classroom_id || '',
      is_active: cls.is_active,
      notes: cls.notes || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Tên lớp học là bắt buộc.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      // Find grade level number for backward compatibility grade_level integer
      let levelNumber = 6;
      const selectedGrade = grades.find(g => g.id === formData.grade_level_id);
      if (selectedGrade) {
        // e.g. "Khối 6" -> parse number 6, or default to 6
        const match = selectedGrade.name.match(/\d+/);
        if (match) levelNumber = parseInt(match[0]);
      }

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() ? formData.code.trim().toUpperCase() : null,
        grade_level_id: formData.grade_level_id || null,
        academic_year_id: formData.academic_year_id || null,
        expected_capacity: formData.expected_capacity ? parseInt(formData.expected_capacity) : null,
        primary_classroom_id: formData.primary_classroom_id || null,
        is_active: formData.is_active,
        notes: formData.notes.trim() || null,
        grade_level: levelNumber, // for compatibility
      };

      if (editingClass) {
        const { error: updateError } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', editingClass.id);

        if (updateError) throw updateError;
        setSuccess('Cập nhật lớp học thành công!');
      } else {
        const { error: insertError } = await supabase
          .from('classes')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Thêm lớp học mới thành công!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Lỗi lưu thông tin lớp học.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = (id: string, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('safe_delete_school_entity', {
        p_entity_type: 'class',
        p_entity_id: deletingId,
      });

      if (rpcError) throw rpcError;

      if (data && data.success === false) {
        setError(data.message || 'Không thể xóa thực thể.');
      } else {
        setSuccess('Xóa lớp học thành công!');
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi hệ thống khi xóa.');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
      setDeletingName(null);
    }
  };

  const filteredClasses = sortClassesNaturally<ClassEntity>(classes.filter(cls => {
    const matchesSearch = 
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.code && cls.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesYear = selectedYearFilter === 'all' || cls.academic_year_id === selectedYearFilter;
    const matchesGrade = selectedGradeFilter === 'all' || cls.grade_level_id === selectedGradeFilter;
    
    return matchesSearch && matchesYear && matchesGrade;
  }));

  return (
    <div className="space-y-6" id="classes-tab">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Lớp học</h2>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm lớp học</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50/50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-xl">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold">{success}</span>
        </div>
      )}

      {/* Filter Options */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên lớp hoặc mã lớp..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {/* Grade filter */}
          <select
            value={selectedGradeFilter}
            onChange={e => setSelectedGradeFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">Tất cả Khối</option>
            {grades.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {/* Year filter */}
          <select
            value={selectedYearFilter}
            onChange={e => setSelectedYearFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">Tất cả Năm học</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Đang tải lớp học...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Không tìm thấy dữ liệu lớp học nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 font-bold text-slate-500">Tên lớp</th>
                <th className="p-4 font-bold text-slate-500">Mã lớp</th>
                <th className="p-4 font-bold text-slate-500">Khối</th>
                <th className="p-4 font-bold text-slate-500">Năm học</th>
                <th className="p-4 font-bold text-slate-500">Sĩ số dự kiến</th>
                <th className="p-4 font-bold text-slate-500">Sĩ số thực tế</th>
                <th className="p-4 font-bold text-slate-500">Phòng học chính</th>
                <th className="p-4 font-bold text-slate-500 text-center">Trạng thái</th>
                <th className="p-4 font-bold text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{cls.name}</td>
                  <td className="p-4 text-slate-500 font-mono">{cls.code || '-'}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{cls.grade_levels?.name || `Khối ${cls.grade_level}`}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                    {cls.academic_years?.name || <span className="text-slate-400 italic">Chưa xác định</span>}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 font-bold">{cls.expected_capacity ?? '-'} học sinh</td>
                  <td className="p-4 font-bold text-blue-700 dark:text-blue-400">{cls.actual_enrollment ?? '—'} học sinh</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{cls.classrooms?.name || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cls.is_active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {cls.is_active ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(cls)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Sửa"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(cls.id, cls.name)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              {editingClass ? 'Sửa thông tin lớp học' : 'Thêm lớp học mới'}
            </h3>

            {modalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 animate-pulse" />
                <span className="text-xs font-semibold">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tên lớp học *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: 6A1"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Mã lớp</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ví dụ: LH6A1"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Khối lớp *</label>
                  <select
                    value={formData.grade_level_id}
                    onChange={e => setFormData({ ...formData, grade_level_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                    required
                  >
                    <option value="" disabled>Chọn Khối lớp</option>
                    {grades.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Năm học</label>
                  <select
                    value={formData.academic_year_id}
                    onChange={e => setFormData({ ...formData, academic_year_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">Chưa xác định</option>
                    {years.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Sĩ số dự kiến</label>
                  <input
                    type="number"
                    value={formData.expected_capacity}
                    onChange={e => setFormData({ ...formData, expected_capacity: e.target.value })}
                    placeholder="40"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Phòng học chính</label>
                  <select
                    value={formData.primary_classroom_id}
                    onChange={e => setFormData({ ...formData, primary_classroom_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">Không phân phòng học</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="class-is-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="class-is-active" className="font-semibold text-slate-700 dark:text-slate-300">
                  Trạng thái hoạt động
                </label>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về lớp..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors shadow-sm"
                >
                  {modalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Xác nhận xóa lớp học</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa lớp học <span className="font-semibold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              Hệ thống sẽ không cho phép xóa nếu có học sinh nhập học, phân công giáo viên hoặc phân giảng dạy trong lớp này.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={deleteLoading}
                onClick={() => { setDeletingId(null); setDeletingName(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                disabled={deleteLoading}
                onClick={handleDelete}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-colors shadow-sm"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
