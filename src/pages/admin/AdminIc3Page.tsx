import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../features/auth/AuthContext';
import { LEVELS, TESTS, type Grade } from '../../config/ic3Catalog';

type CodeRow = { test_id: string; access_code: string; updated_at: string };
export default function AdminIc3Page() {
  const { hasRole } = useAuth();
  const canManage = hasRole('SUPER_ADMIN') || hasRole('PRINCIPAL') || hasRole('VICE_PRINCIPAL');
  const [grade, setGrade] = useState<Grade>('6');
  const [testId, setTestId] = useState(TESTS['6'][0].id);
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<Array<{id:string;user_id:string;test_id:string;started_at:string;submitted_at:string|null;score:number|null;status:string}>>([]);
  const [attemptError, setAttemptError] = useState('');
  const tests = useMemo(() => TESTS[grade], [grade]);
  const codes = useMemo(() => new Map(rows.map(x => [x.test_id, x])), [rows]);
  const selected = tests.find(x => x.id === testId);

  async function load() {
    const { data, error } = await supabase.from('ic3_test_access_codes').select('test_id,access_code,updated_at').order('test_id');
    if (error) setStatus('Không đọc được dữ liệu IC3. Hãy kiểm tra migration và quyền: ' + error.message);
    else { setRows((data ?? []) as CodeRow[]); setStatus(''); }
  }
  async function loadAttempts() {
    const { data, error } = await supabase.from('ic3_practice_attempts').select('id,user_id,test_id,started_at,submitted_at,score,status').order('started_at', { ascending: false }).limit(200);
    if (error) setAttemptError(error.message);
    else { setAttempts((data ?? []) as typeof attempts); setAttemptError(''); }
  }
  useEffect(() => { if (canManage) { void load(); void loadAttempts(); } }, [canManage]);
  useEffect(() => { setInput(codes.get(testId)?.access_code ?? ''); }, [testId, rows]);
  async function save() {
    if (!canManage || !selected) return;
    const value = input.trim();
    setBusy(true); setStatus('');
    const result = value ? await supabase.from('ic3_test_access_codes').upsert({ test_id: testId, access_code: value }, { onConflict: 'test_id' }) : await supabase.from('ic3_test_access_codes').delete().eq('test_id', testId);
    setBusy(false);
    if (result.error) { setStatus('Lỗi lưu mã: ' + result.error.message); return; }
    await load(); setStatus(value ? 'Đã lưu mã cho bài đã chọn.' : 'Đã xóa mã cho bài đã chọn.');
  }
  if (!canManage) return <p className="p-6">Bạn không có quyền quản lý mã IC3.</p>;
  return <div className="space-y-5 max-w-5xl mx-auto">
    <header><h1 className="text-2xl font-bold">Quản lý IC3</h1><p className="text-sm text-slate-500 mt-1">Đặt mã mở bài riêng cho từng Test và Chủ đề mở rộng. Mã lưu ở Supabase, không đưa vào source website.</p></header>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-white dark:bg-slate-900 border p-5">
      <label className="text-sm font-semibold">Chọn khối<select value={grade} onChange={e => { const next = e.target.value as Grade; setGrade(next); setTestId(TESTS[next][0].id); }} className="block w-full mt-2 p-3 border rounded-lg bg-white dark:bg-slate-900"><option value="6">Khối 6 · Level 1</option><option value="7">Khối 7 · Level 2</option><option value="8">Khối 8 · Level 3</option></select></label>
      <label className="text-sm font-semibold sm:col-span-2">Chọn bài<select value={testId} onChange={e => setTestId(e.target.value)} className="block w-full mt-2 p-3 border rounded-lg bg-white dark:bg-slate-900">{tests.map(t => <option key={t.id} value={t.id}>{t.name} {codes.has(t.id) ? '✓' : ''}</option>)}</select></label>
      <label className="text-sm font-semibold sm:col-span-2">Mã mở bài (từng bài khác nhau)<input autoComplete="off" type="text" value={input} onChange={e => setInput(e.target.value)} className="block w-full mt-2 p-3 border rounded-lg bg-white dark:bg-slate-900" placeholder="Nhập mã giáo viên đã được cấp" /></label>
      <div className="flex items-end"><button type="button" disabled={busy} onClick={save} className="w-full bg-blue-600 text-white rounded-lg px-5 py-3 font-bold disabled:opacity-50">{busy ? 'Đang lưu…' : input.trim() ? 'Lưu mã' : 'Xóa mã đã lưu'}</button></div>
      {status && <p role="status" className="sm:col-span-3 text-sm text-blue-700 dark:text-blue-300">{status}</p>}
    </div>
    <div className="rounded-2xl bg-white dark:bg-slate-900 border p-5"><h2 className="font-semibold mb-3">Tình trạng nhập mã · {LEVELS[grade].gradeLabel}</h2><div className="grid sm:grid-cols-2 gap-2">{tests.map(t => <div key={t.id} className="flex gap-2 text-sm items-center border-b py-2"><span className={codes.has(t.id) ? 'text-emerald-600' : 'text-slate-400'}>{codes.has(t.id) ? '●' : '○'}</span><span>{t.name}</span></div>)}</div></div>
    <section className="rounded-2xl bg-white dark:bg-slate-900 border p-5 space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Nhật ký luyện tập IC3 (200 lượt gần nhất)</h2><button type="button" onClick={() => void loadAttempts()} className="border rounded-lg px-3 py-2 text-sm">Làm mới</button></div>
      <p className="text-xs text-slate-500">Điểm học sinh tự khai báo, chưa được IIG xác minh. Mã tài khoản dùng để đối chiếu với danh sách tài khoản trường.</p>
      {attemptError && <p className="text-sm text-red-600">Không tải được log: {attemptError}</p>}
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left border-b"><th className="p-2">Tài khoản (UUID)</th><th className="p-2">Bài</th><th className="p-2">Mở lúc</th><th className="p-2">Điểm</th><th className="p-2">Trạng thái</th></tr></thead><tbody>{attempts.map(a => <tr key={a.id} className="border-b"><td className="p-2 font-mono text-xs">{a.user_id}</td><td className="p-2">{a.test_id}</td><td className="p-2 whitespace-nowrap">{new Date(a.started_at).toLocaleString('vi-VN')}</td><td className="p-2">{a.score ?? '—'}</td><td className="p-2">{a.status === 'self_reported' ? 'Đã khai báo điểm' : 'Đã mở bài'}</td></tr>)}</tbody></table></div>
    </section>
    <p className="text-xs text-slate-500">Mã chỉ được cung cấp cho người đăng nhập có quyền theo cấu hình Supabase. Không tự điền mã vào trang IIG, học sinh sao chép và dán vào bài.</p>
  </div>;
}
