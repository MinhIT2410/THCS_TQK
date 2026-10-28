import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Users, ClipboardList, Trophy, Target } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

type Summary = {grade:number; test_count:number; published_count:number; total_questions:number; attempts:number; students:number; average_score:number|null; reached_900:number};
type TestStats = {id:string; grade:number; topic:number|null; test_number:number|null; title:string; published:boolean; questions:number; attempts:number; students:number; average_score:number|null; reached_900:number};
const fmt=(v:number|null|undefined)=>v===null||v===undefined?'—':Math.round(v).toLocaleString('vi-VN');
export default function Ic3AdminStatistics(){
 const [grade,setGrade]=useState(6),[summary,setSummary]=useState<Summary|null>(null),[tests,setTests]=useState<TestStats[]>([]);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 async function load(){
  setLoading(true);setError('');
  const result=await supabase.rpc('ic3_school_admin_statistics',{p_grade:grade});
  setLoading(false);
  if(result.error){setError('Không tải được thống kê: '+result.error.message);setSummary(null);setTests([]);return;}
  const d=result.data as {summary?:Summary;tests?:TestStats[]}|null;
  setSummary(d?.summary??null);setTests(Array.isArray(d?.tests)?d.tests:[]);
 }
 useEffect(()=>{void load();},[grade]);
 return <section className="space-y-5">
  <div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Thống kê luyện tập nội bộ</h2><p className="text-sm text-slate-500">Điểm do hệ thống trường chấm; không bao gồm điểm tự khai trên IC3 Review (IIG).</p></div><div className="flex gap-2"><select aria-label="Chọn khối" value={grade} onChange={e=>setGrade(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-900">{[6,7,8].map(g=><option key={g} value={g}>Khối {g} · Level {g-5}</option>)}</select><button onClick={()=>void load()} disabled={loading} className="rounded-xl border px-3 py-2 text-sm flex gap-2 items-center"><RefreshCw size={16}/>{loading?'Đang tải':'Làm mới'}</button></div></div>
  {error&&<div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm">{error}. Hãy chạy SQL 104 và kiểm tra quyền quản trị.</div>}
  {!error&&<><div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
   {[{label:'Test đã tạo',value:fmt(summary?.test_count),icon:ClipboardList,sub:`${fmt(summary?.published_count)} đã xuất bản`},{label:'Học sinh tham gia',value:fmt(summary?.students),icon:Users,sub:'Không tính trùng học sinh'},{label:'Lượt nộp hoàn tất',value:fmt(summary?.attempts),icon:BarChart3,sub:'Chỉ các lượt đã nộp'},{label:'Đạt ≥ 900 điểm',value:fmt(summary?.reached_900),icon:Trophy,sub:'Số lượt đạt, không phải số học sinh'}].map(x=><div key={x.label} className="rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-2"><div className="text-xs font-semibold text-slate-500 flex items-center gap-2"><x.icon size={16}/>{x.label}</div><div className="text-3xl font-extrabold">{x.value}</div><div className="text-xs text-slate-500">{x.sub}</div></div>)}
  </div><div className="rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 p-5"><div className="font-bold text-lg">Kết quả theo từng Test</div><p className="text-sm text-slate-500 mt-1">Điểm trung bình khối: <b>{fmt(summary?.average_score)}/1000</b> (tính theo lượt nộp).</p><div className="overflow-x-auto mt-4"><table className="min-w-full text-sm"><thead><tr className="border-b text-slate-500 text-left"><th className="py-3 pr-3">Test</th><th className="pr-3">Câu</th><th className="pr-3">Trạng thái</th><th className="pr-3">Học sinh</th><th className="pr-3">Lượt nộp</th><th className="pr-3">Điểm TB</th><th>≥ 900</th></tr></thead><tbody>{tests.map(t=><tr key={t.id} className="border-b dark:border-slate-800"><td className="py-3 pr-3 font-medium">{t.title}</td><td>{fmt(t.questions)}</td><td className="pr-3">{t.published?'Đã xuất bản':'Bản nháp'}</td><td>{fmt(t.students)}</td><td>{fmt(t.attempts)}</td><td>{fmt(t.average_score)}</td><td>{fmt(t.reached_900)}</td></tr>)}</tbody></table>{!tests.length&&<p className="text-sm text-slate-500 p-5 text-center">Chưa có Test trong khối này.</p>}</div></div></>}
 </section>;
}
