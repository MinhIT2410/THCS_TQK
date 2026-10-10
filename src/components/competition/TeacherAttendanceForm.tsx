import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';

type Teacher = { id: string; full_name: string };
type Rule = { code: string; name: string };
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function TeacherAttendanceForm() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [teacherId, setTeacherId] = useState('');
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
  const needMinutes = ruleCode === 'LATE' || ruleCode === 'EARLY';
  const save = async () => { setError(''); setMessage('');
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) { setError('Hãy chọn giáo viên.'); return; }
    if (needMinutes && (!Number.isInteger(Number(minutes)) || Number(minutes) < 1 || Number(minutes) > 240)) {
      setError('Số phút phải từ 1 đến 240.'); return;
    }
    if (!window.confirm(`Xác nhận ghi nhận chính thức cho ${teacher.full_name}?`)) return;
    setBusy(true);
    const { error: insertError } = await supabase.from('teacher_attendance_records').insert({
      teacher_id: teacher.id, teacher_name: teacher.full_name, rule_code: ruleCode,
      occurred_at: new Date(occurredAt).toISOString(), session, period_number: Number(period),
      class_name: className.trim() || null, minutes: needMinutes ? Number(minutes) : null, note: note.trim() || null,
    });
    setBusy(false);
    if (insertError) setError(insertError.message);
    else { setMessage(`Đã ghi nhận chính thức: ${teacher.full_name}.`); setNote(''); setMinutes(''); }
  };
  const field = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm';
  return <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
    <div className="font-bold text-slate-900 dark:text-white">Ghi nhận chuyên cần giáo viên</div>
    <p className="text-xs text-slate-500">Giám thị lưu là ghi nhận chính thức, không cần duyệt và không ảnh hưởng điểm thi đua lớp.</p>
    <div className="space-y-4">
      <label className="block text-sm font-medium">Giáo viên *<select required className={field} value={teacherId} onChange={e=>setTeacherId(e.target.value)}><option value="">Chọn giáo viên</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
      <label className="block text-sm font-medium">Quy tắc chuyên cần *<select className={field} value={ruleCode} onChange={e=>setRuleCode(e.target.value)}>{rules.map(r=><option key={r.code} value={r.code}>{r.name}</option>)}</select></label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm font-medium">Thời gian *<input required className={field} type="datetime-local" value={occurredAt} onChange={e=>setOccurredAt(e.target.value)}/></label>
        <label className="text-sm font-medium">Buổi<select className={field} value={session} onChange={e=>setSession(e.target.value)}><option value="MORNING">Sáng</option><option value="AFTERNOON">Chiều</option></select></label>
        <label className="text-sm font-medium">Tiết<select className={field} value={period} onChange={e=>setPeriod(e.target.value)}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm font-medium">Lớp (nếu có)<input className={field} value={className} onChange={e=>setClassName(e.target.value)} placeholder="Ví dụ: 6/1"/></label>
        {needMinutes && <label className="text-sm font-medium">Số phút *<input required type="number" min={1} max={240} className={field} value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}
      </div>
      <label className="block text-sm font-medium">Ghi chú<textarea className={field} rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Lý do, tình huống ghi nhận..."/></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      <button disabled={busy || !teacherId || !rules.length} type="button" onClick={save} className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">{busy?'Đang lưu...':'Lưu ghi nhận chính thức'}</button>
    </div>
  </div>;
}
