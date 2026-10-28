import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, RefreshCw, TableProperties, Clock3 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

type Test = { id:string; topic:number; test_number:number; title:string; published:boolean };
type Student = { id:string; name:string; code:string|null; class_id:string; class_name:string };
type Score = {user_id:string;set_id:string;best_score:number;attempts:number;last_submitted:string};
type Log = {id:string;user_id:string;set_id:string;score:number;correct_count:number;finished_at:string;mode:string;full_name:string;student_code:string|null;class_id:string;class_name:string;topic:number;test_number:number;title:string};
type Data = {year:string;grade:number;classes:{id:string;class_name:string}[];tests:Test[];students:Student[];scores:Score[];latest_log:Log[]};
const sel='rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const date=(v:string)=>new Date(v).toLocaleString('vi-VN',{hour12:false,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

export default function Ic3ClassGradebook(){
 const [grade,setGrade]=useState(6),[classId,setClassId]=useState(''),[topic,setTopic]=useState('all');
 const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [search,setSearch]=useState('');
 async function load(g=grade){setBusy(true);setError('');const {data:res,error:e}=await supabase.rpc('ic3_school_admin_gradebook',{p_grade:g});if(e){setError(e.message);setData(null);}else setData(res as Data);setBusy(false);}
 useEffect(()=>{setClassId('');setTopic('all');void load(grade);},[grade]);
 const tests=useMemo(()=> (data?.tests||[]).filter(t=>topic==='all'||t.topic===Number(topic)),[data,topic]);
 const roster=useMemo(()=> (data?.students||[]).filter(s=>(!classId||s.class_id===classId)&&(!search||`${s.name} ${s.code||''}`.toLowerCase().includes(search.toLowerCase()))),[data,classId,search]);
 const scoreMap=useMemo(()=>new Map((data?.scores||[]).map(s=>[`${s.user_id}|${s.set_id}`,s])),[data]);
 const log=useMemo(()=> (data?.latest_log||[]).filter(x=>(!classId||x.class_id===classId)&&(topic==='all'||x.topic===Number(topic))),[data,classId,topic]);
 const counts=useMemo(()=>({finished:roster.filter(s=>tests.some(t=>scoreMap.has(`${s.id}|${t.id}`))).length,records:roster.reduce((n,s)=>n+tests.filter(t=>scoreMap.has(`${s.id}|${t.id}`)).length,0)}),[roster,tests,scoreMap]);
 function exportExcel(){if(!data)return;
   const headers=['STT','Mã học sinh','Họ và tên','Lớp',...tests.map(t=>`CĐ${t.topic} - Test ${t.test_number}`),'Nộp gần nhất'];
   const rows=roster.map((s,i)=>{
     const values=tests.map(t=>scoreMap.get(`${s.id}|${t.id}`)?.best_score??'');
     const last=(data.scores||[]).filter(x=>x.user_id===s.id && tests.some(t=>t.id===x.set_id)).map(x=>x.last_submitted).sort().pop();
     return [i+1,s.code||'',s.name,s.class_name,...values,last?date(last):''];
   });
   const lastRows=log.map((l,i)=>[i+1,l.full_name,l.student_code||'',l.class_name,`CĐ${l.topic} - Test ${l.test_number}`,l.score,l.correct_count,l.mode==='learn'?'Học':'Kiểm tra',date(l.finished_at)]);
   const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);ws['!cols']=[{wch:7},{wch:16},{wch:28},{wch:12},...tests.map(()=>({wch:17})),{wch:22}];XLSX.utils.book_append_sheet(wb,ws,'BANG_DIEM');
   const logs=XLSX.utils.aoa_to_sheet([['STT','Học sinh','Mã học sinh','Lớp','Bài','Điểm','Số câu đúng','Chế độ','Lần nộp gần nhất'],...lastRows]);XLSX.utils.book_append_sheet(wb,logs,'NOP_BAI_GAN_NHAT');
   XLSX.writeFile(wb,`IC3_Bang_diem_Khoi_${grade}_${classId?(data.classes.find(c=>c.id===classId)?.class_name||'Lop').replace(/[\\/]/g,'-'):'Tat_ca'}.xlsx`);
 }
 return <section className="space-y-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold flex gap-2 items-center"><TableProperties size={21}/> Bảng điểm theo lớp</h2><p className="text-sm text-slate-500">Mỗi học sinh một dòng · Mỗi Chủ đề/Test một cột · Điểm cao nhất /1000 · Năm học {data?.year||'hiện hành'}</p></div><div className="flex gap-2"><button className={sel} disabled={busy} onClick={()=>void load()}><RefreshCw size={16} className="inline mr-1"/> Tải lại</button><button className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-bold disabled:opacity-40" disabled={!data||busy} onClick={exportExcel}><Download size={16} className="inline mr-1"/> Xuất Excel</button></div></div>
   <div className="rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
     <label className="text-xs font-bold text-slate-500">KHỐI<select className={'mt-1 block w-full '+sel} value={grade} onChange={e=>setGrade(Number(e.target.value))}>{[6,7,8].map(g=><option key={g} value={g}>Khối {g}</option>)}</select></label>
     <label className="text-xs font-bold text-slate-500">LỚP<select className={'mt-1 block w-full '+sel} value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Tất cả lớp</option>{(data?.classes||[]).map(c=><option key={c.id} value={c.id}>{c.class_name}</option>)}</select></label>
     <label className="text-xs font-bold text-slate-500">CHỦ ĐỀ<select className={'mt-1 block w-full '+sel} value={topic} onChange={e=>setTopic(e.target.value)}><option value="all">Tất cả chủ đề</option>{[...new Set((data?.tests||[]).map(t=>t.topic))].sort((a,b)=>a-b).map(t=><option key={t} value={t}>Chủ đề {t}</option>)}</select></label>
     <label className="text-xs font-bold text-slate-500">TÌM HỌC SINH<input className={'mt-1 block w-full '+sel} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Họ tên / mã HS"/></label>
   </div>
   {error&&<p role="alert" className="rounded-xl p-4 bg-red-50 text-red-700">{error}</p>}
   <div className="flex gap-5 text-sm text-slate-600 dark:text-slate-300"><span><b>{roster.length}</b> học sinh</span><span><b>{counts.finished}</b> đã làm ít nhất 1 Test</span><span><b>{counts.records}</b> ô điểm đã có</span></div>
   <div className="rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 overflow-auto max-h-[650px]">
     <table className="text-sm whitespace-nowrap border-collapse min-w-full"><thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800"><tr><th className="p-3 text-left border-b">STT</th><th className="p-3 text-left border-b sticky left-0 bg-slate-100 dark:bg-slate-800">Học sinh</th><th className="p-3 border-b">Lớp</th>{tests.map(t=><th key={t.id} title={t.title} className="p-3 border-b">CĐ{t.topic}<div className="text-xs font-normal">Test {t.test_number}</div></th>)}<th className="p-3 border-b">Nộp gần nhất</th></tr></thead>
       <tbody>{roster.map((s,i)=>{const recents=tests.map(t=>scoreMap.get(`${s.id}|${t.id}`)?.last_submitted).filter(Boolean) as string[];const last=recents.sort().pop();return <tr key={s.id} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"><td className="px-3 py-2">{i+1}</td><td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-900"><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-400">{s.code}</div></td><td className="px-3 py-2 text-center">{s.class_name}</td>{tests.map(t=>{const sc=scoreMap.get(`${s.id}|${t.id}`);return <td key={t.id} title={sc?`${sc.attempts} lượt · gần nhất ${date(sc.last_submitted)}`:'Chưa làm'} className={'px-3 py-2 text-center font-bold '+(sc?.best_score!==undefined&&sc.best_score>=900?'text-emerald-700':'')}>{sc?sc.best_score:'—'}</td>})}<td className="px-3 py-2 text-xs text-slate-500">{last?date(last):'—'}</td></tr>})}</tbody></table>
     {!busy&&roster.length===0&&<p className="text-center p-8 text-sm text-slate-500">Không có học sinh phù hợp bộ lọc.</p>}
   </div>
   <div className="rounded-2xl border dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3"><div><h3 className="font-bold flex gap-2 items-center"><Clock3 size={18}/> Log nộp bài gần nhất</h3><p className="text-xs text-slate-500">Lần nộp mới nhất của mỗi học sinh ở từng Test · Chỉ kết quả nội bộ, không bao gồm IC3 Review tự khai · Tối đa 300 bản ghi gần nhất trong khối.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800"><tr>{['Học sinh','Lớp','Test','Điểm lần gần nhất','Số câu đúng','Chế độ','Nộp lúc'].map(x=><th key={x} className="p-2 text-left whitespace-nowrap">{x}</th>)}</tr></thead><tbody>{log.map(l=><tr key={l.id} className="border-b dark:border-slate-800"><td className="p-2">{l.full_name}</td><td className="p-2">{l.class_name}</td><td className="p-2 whitespace-nowrap">CĐ{l.topic} - Test {l.test_number}</td><td className="p-2 font-bold">{l.score}</td><td className="p-2">{l.correct_count??'—'}</td><td className="p-2">{l.mode==='learn'?'Học':'Kiểm tra'}</td><td className="p-2 whitespace-nowrap">{date(l.finished_at)}</td></tr>)}</tbody></table>{!log.length&&<p className="p-5 text-center text-slate-500 text-sm">Chưa có lượt nộp hoàn thành.</p>}</div></div>
 </section>;
}
