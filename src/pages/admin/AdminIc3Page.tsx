import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../features/auth/AuthContext';
import { LEVELS, TESTS, type Grade } from '../../config/ic3Catalog';
import Ic3QuestionBank from '../../components/admin/Ic3QuestionBank';
import Ic3AdminStatistics from '../../components/admin/Ic3AdminStatistics';
import { BookOpenCheck, KeyRound, BarChart3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

type CodeRow = { test_id: string; access_code: string; updated_at: string };
function Ic3ReviewManagement() {
  const { hasRole } = useAuth();
  const canManage = hasRole('SUPER_ADMIN') || hasRole('PRINCIPAL') || hasRole('VICE_PRINCIPAL');
  const [grade, setGrade] = useState<Grade>('6');
  const [testId, setTestId] = useState(TESTS['6'][0].id);
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const tests = useMemo(() => TESTS[grade], [grade]);
  const codes = useMemo(() => new Map(rows.map(x => [x.test_id, x])), [rows]);
  const selected = tests.find(x => x.id === testId);

  async function load() {
    const { data, error } = await supabase.from('ic3_test_access_codes').select('test_id,access_code,updated_at').order('test_id');
    if (error) setStatus('Không đọc được dữ liệu IC3. Hãy kiểm tra migration và quyền: ' + error.message);
    else { setRows((data ?? []) as CodeRow[]); setStatus(''); }
  }
  useEffect(() => { if (canManage) void load(); }, [canManage]);
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
  return <div className="space-y-5">
    <div className="rounded-2xl border p-5 bg-white dark:bg-slate-900 dark:border-slate-700"><h2 className="font-bold text-lg">Quản lý mã mở bài IC3 Review (IIG)</h2><div className="mt-5 space-y-5">
    <header><h1 className="text-2xl font-bold">Quản lý IC3</h1><p className="text-sm text-slate-500 mt-1">Đặt mã mở bài riêng cho từng Test và Chủ đề mở rộng. Mã lưu ở Supabase, không đưa vào source website.</p></header>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-white dark:bg-slate-900 border p-5">
      <label className="text-sm font-semibold">Chọn khối<select value={grade} onChange={e => { const next = e.target.value as Grade; setGrade(next); setTestId(TESTS[next][0].id); }} className="block w-full mt-2 p-3 border rounded-lg bg-white dark:bg-slate-900"><option value="6">Khối 6 · Level 1</option><option value="7">Khối 7 · Level 2</option><option value="8">Khối 8 · Level 3</option></select></label>
      <label className="text-sm font-semibold sm:col-span-2">Chọn bài<select value={testId} onChange={e => setTestId(e.target.value)} className="block w-full mt-2 p-3 border rounded-lg bg-white dark:bg-slate-900">{tests.map(t => <option key={t.id} value={t.id}>{t.name} {codes.has(t.id) ? '✓' : ''}</option>)}</select></label>
      <label className="text-sm font-semibold sm:col-span-2">Mã mở bài (từng bài khác nhau)<input autoComplete="off" type="text" value={input} onChange={e => setInput(e.target.value)} className="block w-full mt-2 p-3 border rounded-lg bg-white dark:bg-slate-900" placeholder="Nhập mã giáo viên đã được cấp" /></label>
      <div className="flex items-end"><button type="button" disabled={busy} onClick={save} className="w-full bg-blue-600 text-white rounded-lg px-5 py-3 font-bold disabled:opacity-50">{busy ? 'Đang lưu…' : input.trim() ? 'Lưu mã' : 'Xóa mã đã lưu'}</button></div>
      {status && <p role="status" className="sm:col-span-3 text-sm text-blue-700 dark:text-blue-300">{status}</p>}
    </div>
    <div className="rounded-2xl bg-white dark:bg-slate-900 border p-5"><h2 className="font-semibold mb-3">Tình trạng nhập mã · {LEVELS[grade].gradeLabel}</h2><div className="grid sm:grid-cols-2 gap-2">{tests.map(t => <div key={t.id} className="flex gap-2 text-sm items-center border-b py-2"><span className={codes.has(t.id) ? 'text-emerald-600' : 'text-slate-400'}>{codes.has(t.id) ? '●' : '○'}</span><span>{t.name}</span></div>)}</div></div>
    <p className="text-xs text-slate-500">Mã chỉ được cung cấp cho người đăng nhập có quyền theo cấu hình Supabase. Không tự điền mã vào trang IIG, học sinh sao chép và dán vào bài.</p>
    </div></div>
  </div>;
}


type Ic3Tab = 'bank' | 'review' | 'statistics';
const validTabs: Ic3Tab[] = ['bank','review','statistics'];
export default function AdminIc3Page() {
  const [searchParams,setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: Ic3Tab = validTabs.includes(raw as Ic3Tab) ? raw as Ic3Tab : 'bank';
  const tabs = [
    {key:'bank' as const, title:'Ngân hàng câu hỏi nội bộ', icon:BookOpenCheck},
    {key:'review' as const, title:'IC3 Review (IIG)', icon:KeyRound},
    {key:'statistics' as const, title:'Thống kê', icon:BarChart3},
  ];
  return <div className="max-w-6xl mx-auto space-y-6 pb-10">
    <header className="pt-2">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Quản lý Tin học quốc tế</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý ngân hàng đề nội bộ, bài IC3 Review và thống kê kết quả học sinh.</p>
    </header>
    <nav role="tablist" aria-label="Các mục quản lý Tin học quốc tế" className="flex items-center flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
      {tabs.map(t=>{const Icon=t.icon;return <button key={t.key} role="tab" type="button" aria-selected={tab===t.key}
        onClick={()=>{const next=new URLSearchParams(searchParams);next.set('tab',t.key);setSearchParams(next);}}
        className={'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors '+(tab===t.key?'bg-red-600 text-white shadow-sm':'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800')}>
        <Icon size={17}/>{t.title}</button>})}
    </nav>
    <div role="tabpanel" aria-label={tabs.find(t=>t.key===tab)?.title}>
      {tab==='bank'&&<Ic3QuestionBank/>}
      {tab==='review'&&<Ic3ReviewManagement/>}
      {tab==='statistics'&&<Ic3AdminStatistics/>}
    </div>
  </div>;
}
