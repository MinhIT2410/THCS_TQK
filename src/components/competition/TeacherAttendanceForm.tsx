import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

type Teacher = { id: string; full_name: string };
type Rule = { code: string; name: string };
type Pending = { id: string; teacher_name: string; identity_status: string; occurred_at: string; class_name: string | null; subject_name: string | null; rule_code: string };
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function TeacherAttendanceForm() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [unknownMode, setUnknownMode] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [canResolve, setCanResolve] = useState(false);
  const [resolutionRecordId, setResolutionRecordId] = useState('');
  const [resolutionTeacherId, setResolutionTeacherId] = useState('');
  const [resolutionSearch, setResolutionSearch] = useState('');
  const [resolutionBusy, setResolutionBusy] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showTeacherResults, setShowTeacherResults] = useState(false);
  const teacherSearchRef = useRef<HTMLDivElement>(null);
  const teacherInputRef = useRef<HTMLInputElement>(null);
  const [ruleCode, setRuleCode] = useState('LATE');
  const [occurredAt, setOccurredAt] = useState(nowLocal);
  const [session, setSession] = useState('MORNING');
  const [period, setPeriod] = useState('1');
  const [className, setClassName] = useState('');
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    Promise.all([
      supabase.rpc('list_teacher_attendance_directory'),
      supabase.from('teacher_attendance_rules').select('code,name').eq('is_active',true).order('sort_order'),
    ]).then(([t,r]) => {
      if (!live) return;
      if (t.error || r.error) setError(t.error?.message || r.error?.message || 'Không thể tải dữ liệu giáo viên.');
      else { setTeachers((t.data || []) as Teacher[]); setRules((r.data || []) as Rule[]); }
    }).catch(e => { if (live) setError(String(e)); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (teacherSearchRef.current && !teacherSearchRef.current.contains(event.target as Node)) {
        setShowTeacherResults(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);
  const loadPending = async () => {
    const { data, error: pendingError } = await supabase.rpc('list_pending_teacher_attendance');
    if (!pendingError) { setCanResolve(true); setPending((data || []) as Pending[]); }
    else setCanResolve(false); // Only leadership/admin can access this RPC.
  };
  useEffect(() => { void loadPending(); }, []);
  const selectedTeacher = teachers.find(t => t.id === teacherId);
  const matchingTeachers = useMemo(() => {
    const keyword = normalizeSearch(teacherSearch);
    if (!keyword) return [];
    return teachers.filter(t => normalizeSearch(t.full_name).includes(keyword)).slice(0, 30);
  }, [teachers, teacherSearch]);
  const selectTeacher = (teacher: Teacher) => {
    setTeacherId(teacher.id);
    setTeacherSearch('');
    setShowTeacherResults(false);
    setError('');
  };
  const clearTeacher = () => {
    setTeacherId('');
    setTeacherSearch('');
    setShowTeacherResults(false);
    teacherInputRef.current?.focus();
  };
  const needMinutes = ruleCode === 'LATE' || ruleCode === 'EARLY';
  const resolveTeacher = async () => {
    if (!resolutionRecordId || !resolutionTeacherId) { setError('Chọn ghi nhận và giáo viên cần liên kết.'); return; }
    const target = teachers.find(t => t.id === resolutionTeacherId);
    if (!target || !window.confirm(`Liên kết ghi nhận này với ${target.full_name}?`)) return;
    setResolutionBusy(true); setError(''); setMessage('');
    const { error: resolveError } = await supabase.rpc('resolve_teacher_attendance_identity', { p_record_id: resolutionRecordId, p_teacher_id: resolutionTeacherId });
    setResolutionBusy(false);
    if (resolveError) { setError(resolveError.message); return; }
    setMessage(`Đã xác minh và liên kết với ${target.full_name}.`);
    setResolutionRecordId(''); setResolutionTeacherId(''); setResolutionSearch('');
    await loadPending();
  };
  const save = async () => { setError(''); setMessage('');
    const teacher = teachers.find(t => t.id === teacherId);
    if (!unknownMode && !teacher) { setError('Hãy chọn giáo viên.'); return; }
    if (unknownMode && !className.trim()) { setError('Trường hợp chưa có giáo viên phải chọn/nhập lớp dạy.'); return; }
    if (!occurredAt || Number.isNaN(new Date(occurredAt).getTime())) { setError('Thời gian ghi nhận không hợp lệ.'); return; }
    if (needMinutes && (!Number.isInteger(Number(minutes)) || Number(minutes) < 1 || Number(minutes) > 240)) {
      setError('Số phút phải từ 1 đến 240.'); return;
    }
    const name = unknownMode ? (externalName.trim() || 'Chưa xác định giáo viên') : teacher!.full_name;
    if (!window.confirm(`Xác nhận ghi nhận chính thức cho ${name}?`)) return;
    setBusy(true);
    const { error: insertError } = await supabase.from('teacher_attendance_records').insert({
      teacher_id: unknownMode ? null : teacher!.id, teacher_name: name,
      identity_status: unknownMode ? (externalName.trim() ? 'EXTERNAL' : 'UNIDENTIFIED') : 'IDENTIFIED',
      subject_name: subjectName.trim() || null, rule_code: ruleCode,
      occurred_at: new Date(occurredAt).toISOString(), session, period_number: Number(period),
      class_name: className.trim() || null, minutes: needMinutes ? Number(minutes) : null, note: note.trim() || null,
    });
    setBusy(false);
    if (insertError) setError(insertError.message);
    else { setMessage(`Đã ghi nhận chính thức: ${name}${unknownMode ? ' (chờ xác minh danh tính).' : '.'}`); setNote(''); setMinutes(''); setExternalName(''); setSubjectName(''); if (unknownMode) void loadPending(); }
  };
  const field = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm';
  return <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
    <div className="font-bold text-slate-900 dark:text-white">Ghi nhận chuyên cần giáo viên</div>
    <p className="text-xs text-slate-500">Giám thị lưu là ghi nhận chính thức, không cần duyệt và không ảnh hưởng điểm thi đua lớp.</p>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={unknownMode} onChange={e => { setUnknownMode(e.target.checked); setTeacherId(''); setTeacherSearch(''); setShowTeacherResults(false); }} />Giáo viên ngoài danh sách / Chưa rõ tên</label>
        {!unknownMode ? <>
        <label htmlFor="teacher-attendance-search" className="block text-sm font-medium">Tìm theo tên giáo viên <span className="text-red-500">*</span></label>
        <div ref={teacherSearchRef} className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            id="teacher-attendance-search"
            ref={teacherInputRef}
            type="text"
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
            value={teacherSearch}
            onChange={e => { setTeacherSearch(e.target.value); setShowTeacherResults(true); }}
            onFocus={() => setShowTeacherResults(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') setShowTeacherResults(false);
              if (e.key === 'Enter' && showTeacherResults && matchingTeachers.length === 1) {
                e.preventDefault();
                selectTeacher(matchingTeachers[0]);
              }
            }}
            placeholder="Nhập tên giáo viên để tìm (có thể không dấu)..."
            aria-expanded={showTeacherResults && !!teacherSearch.trim()}
            aria-controls="teacher-attendance-results"
          />
          {showTeacherResults && teacherSearch.trim() && (
            <div id="teacher-attendance-results" className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {matchingTeachers.length ? matchingTeachers.map(t => (
                <button key={t.id} type="button" onClick={() => selectTeacher(t)} className="w-full text-left p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{t.full_name}</span>
                  {teacherId === t.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                </button>
              )) : <p className="p-3 text-sm text-slate-500">Không tìm thấy giáo viên phù hợp.</p>}
            </div>
          )}
        </div>
        {selectedTeacher && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
            <div className="min-w-0"><span className="text-xs text-slate-500">Đã chọn: </span><span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{selectedTeacher.full_name}</span></div>
            <button type="button" onClick={clearTeacher} aria-label="Bỏ chọn giáo viên" className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900"><X className="w-4 h-4" /></button>
          </div>
        )}
        </> : <div className="space-y-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3">
          <p className="text-xs text-amber-800 dark:text-amber-300">Ghi nhận chính thức ngay, không tạo tài khoản giáo viên. Có thể xác minh và liên kết sau.</p>
          <label className="block text-sm font-medium">Tên giáo viên (nếu biết)<input className={field} value={externalName} maxLength={160} onChange={e => setExternalName(e.target.value)} placeholder="Để trống nếu chưa biết tên" /></label>
        </div>}
      </div>
      <label className="block text-sm font-medium">Quy tắc chuyên cần *<select className={field} value={ruleCode} onChange={e=>setRuleCode(e.target.value)}>{rules.map(r=><option key={r.code} value={r.code}>{r.name}</option>)}</select></label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm font-medium">Thời gian *<input required className={field} type="datetime-local" value={occurredAt} onChange={e=>setOccurredAt(e.target.value)}/></label>
        <label className="text-sm font-medium">Buổi<select className={field} value={session} onChange={e=>setSession(e.target.value)}><option value="MORNING">Sáng</option><option value="AFTERNOON">Chiều</option></select></label>
        <label className="text-sm font-medium">Tiết<select className={field} value={period} onChange={e=>setPeriod(e.target.value)}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm font-medium">Lớp {unknownMode ? '*' : '(nếu có)'}<input className={field} value={className} onChange={e=>setClassName(e.target.value)} placeholder="Ví dụ: 6/1"/></label>
        {needMinutes && <label className="text-sm font-medium">Số phút *<input required type="number" min={1} max={240} className={field} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}
      </div>
      {unknownMode && <label className="block text-sm font-medium">Môn học (nếu biết)<input className={field} value={subjectName} onChange={e => setSubjectName(e.target.value)} maxLength={120} placeholder="Ví dụ: Tin học" /></label>}
      <label className="block text-sm font-medium">Ghi chú<textarea className={field} rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Lý do, tình huống ghi nhận..."/></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      <button disabled={busy || (!unknownMode && !teacherId) || !rules.length} type="button" onClick={save} className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">{busy?'Đang lưu...':'Lưu ghi nhận chính thức'}</button>
      {canResolve && <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
        <h3 className="font-bold text-sm">Xác minh giáo viên chưa có trong danh sách ({pending.length})</h3>
        <p className="text-xs text-slate-500">Dành cho quản trị/ban giám hiệu. Liên kết bản ghi cũ với giáo viên đã có hồ sơ; không tạo tài khoản mới.</p>
        {pending.length > 0 && <>
          <select className={field} value={resolutionRecordId} onChange={e => setResolutionRecordId(e.target.value)}>
            <option value="">Chọn ghi nhận cần xác minh...</option>
            {pending.map(p => <option key={p.id} value={p.id}>{new Date(p.occurred_at).toLocaleDateString('vi-VN')} · {p.teacher_name} · Lớp {p.class_name || '—'} · {p.subject_name || 'Chưa rõ môn'}</option>)}
          </select>
          <input className={field} value={resolutionSearch} onChange={e => { setResolutionSearch(e.target.value); setResolutionTeacherId(''); }} placeholder="Tìm giáo viên để liên kết (có thể không dấu)..." />
          <select className={field} value={resolutionTeacherId} onChange={e => setResolutionTeacherId(e.target.value)}>
            <option value="">Chọn giáo viên chính xác...</option>
            {teachers.filter(t => normalizeSearch(t.full_name).includes(normalizeSearch(resolutionSearch))).slice(0, 50).map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <button type="button" disabled={resolutionBusy || !resolutionRecordId || !resolutionTeacherId} onClick={resolveTeacher} className="rounded-xl bg-slate-800 text-white px-4 py-2 text-sm disabled:opacity-50">{resolutionBusy ? 'Đang xác minh...' : 'Xác minh và liên kết'}</button>
        </>}
      </div>}
    </div>
  </div>;
}
