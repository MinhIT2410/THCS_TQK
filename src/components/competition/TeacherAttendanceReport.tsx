import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../../lib/supabase/client';

type Row = { id:string; teacher_id:string; teacher_name:string; rule_code:string; occurred_at:string; session:string; period_number:number; class_name:string|null; minutes:number|null; note:string|null };
type Saved = { id:string; period_label:string; period_start:string; period_end:string; report_data: {rows:Row[]}; created_at:string };
type Props = { periodType:'WEEK'|'MONTH'|'SEMESTER'|'YEAR'; periodLabel:string; start:string; end:string; valid:boolean; exportOnly?:boolean };
const names:Record<string,string>={LATE:'Đi trễ',ABSENT_EXCUSED:'Vắng tiết có phép',ABSENT_UNEXCUSED:'Vắng tiết không phép',EARLY:'Rời tiết sớm'};
const formatDate = (date:string) => new Date(date).toLocaleString('vi-VN');

export default function TeacherAttendanceReport({periodType,periodLabel,start,end,valid,exportOnly}:Props) {
 const [rows,setRows]=useState<Row[]>([]);
 const [history,setHistory]=useState<Saved[]>([]);
 const [selectedTeacher,setSelectedTeacher]=useState('ALL');
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [savedView,setSavedView]=useState<Saved|null>(null);
 const printRef=useRef<HTMLDivElement>(null);
 const loadHistory=useCallback(async()=>{
  if(exportOnly)return;
  const {data,error:e}=await supabase.from('teacher_attendance_reports').select('id,period_label,period_start,period_end,report_data,created_at').order('created_at',{ascending:false}).limit(100);
  if(e)setError(e.message);else setHistory((data||[]) as Saved[]);
 },[exportOnly]);
 useEffect(()=>{void loadHistory();},[loadHistory]);
 useEffect(()=>{
  if(!valid||!start||!end){setRows([]);return;}
  let live=true;setLoading(true);setError('');
  const from=`${start}T00:00:00+07:00`;
  const until=new Date(`${end}T00:00:00+07:00`);until.setUTCDate(until.getUTCDate()+1);
  supabase.from('teacher_attendance_records').select('id,teacher_id,teacher_name,rule_code,occurred_at,session,period_number,class_name,minutes,note').gte('occurred_at',from).lt('occurred_at',until.toISOString()).order('occurred_at',{ascending:false}).range(0,9999)
   .then(({data,error:e})=>{if(!live)return;if(e)setError(e.message);else setRows((data||[]) as Row[]);setLoading(false);});
  return()=>{live=false;};
 },[start,end,valid]);
 const teachers=useMemo(()=>Array.from(new Map(rows.map(r=>[r.teacher_id,{id:r.teacher_id,name:r.teacher_name}])).values()).sort((a,b)=>a.name.localeCompare(b.name,'vi')),[rows]);
 const visible=useMemo(()=>selectedTeacher==='ALL'?rows:rows.filter(r=>r.teacher_id===selectedTeacher),[rows,selectedTeacher]);
 const summary=useMemo(()=>{
  const m=new Map<string,{name:string,late:number,minutes:number,excused:number,unexcused:number,early:number}>();
  visible.forEach(r=>{let x=m.get(r.teacher_id);if(!x){x={name:r.teacher_name,late:0,minutes:0,excused:0,unexcused:0,early:0};m.set(r.teacher_id,x);}
   if(r.rule_code==='LATE'){x.late++;x.minutes+=r.minutes||0;}else if(r.rule_code==='ABSENT_EXCUSED')x.excused++;else if(r.rule_code==='ABSENT_UNEXCUSED')x.unexcused++;else if(r.rule_code==='EARLY')x.early++;
  });return Array.from(m.values()).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 },[visible]);
 const save=async()=>{
  if(!valid)return;setSaving(true);setError('');
  const {error:e}=await supabase.from('teacher_attendance_reports').insert({period_type:periodType,period_label:periodLabel,period_start:start,period_end:end,report_data:{rows:visible,teacher_filter:selectedTeacher,generated_at:new Date().toISOString()}});
  setSaving(false);if(e)setError(e.message);else{setSuccess('Đã lưu snapshot báo cáo giáo viên.');void loadHistory();}
 };
 const exportPdf=async()=>{
  if(!printRef.current||!valid)return;setExporting(true);setError('');
  try{
   const canvas=await html2canvas(printRef.current,{scale:2,backgroundColor:'#ffffff',useCORS:true});
   const pdf=new jsPDF('p','mm','a4');const width=190;const height=canvas.height*width/canvas.width;
   const img=canvas.toDataURL('image/png');const pageHeight=277;
   let y=0;while(y<height){if(y>0)pdf.addPage();pdf.addImage(img,'PNG',10,10-y,width,height);y+=pageHeight;}
   pdf.save(`Chuyen-can-giao-vien-${start}-${end}.pdf`);
  }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setExporting(false);}
 };
 const displayRows=savedView?.report_data?.rows||visible;
 const displaySummary = savedView ? (() => { const m=new Map<string,{name:string,late:number,minutes:number,excused:number,unexcused:number,early:number}>(); displayRows.forEach(r=>{let x=m.get(r.teacher_id);if(!x){x={name:r.teacher_name,late:0,minutes:0,excused:0,unexcused:0,early:0};m.set(r.teacher_id,x);} if(r.rule_code==='LATE'){x.late++;x.minutes+=r.minutes||0;}else if(r.rule_code==='ABSENT_EXCUSED')x.excused++;else if(r.rule_code==='ABSENT_UNEXCUSED')x.unexcused++;else if(r.rule_code==='EARLY')x.early++;});return Array.from(m.values()); })() : summary;
 const displayLabel=savedView?.period_label||periodLabel;
 const displayStart=savedView?.period_start||start;
 const displayEnd=savedView?.period_end||end;
 const box='rounded-xl border border-slate-200 dark:border-slate-700 p-3';
 return <div className="space-y-5">
  <div className="flex flex-wrap items-end justify-between gap-3">
   <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Giáo viên
    <select className="block mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm min-w-56" value={selectedTeacher} onChange={e=>setSelectedTeacher(e.target.value)}><option value="ALL">Tất cả giáo viên</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
   </label>
   <div className="flex gap-2">
    {!exportOnly&&<button type="button" onClick={save} disabled={!valid||loading||saving} className="rounded-lg bg-amber-600 px-4 py-2 text-white text-xs font-bold disabled:opacity-50">{saving?'Đang lưu...':'Lưu báo cáo'}</button>}
    <button type="button" onClick={exportPdf} disabled={!valid||loading||exporting} className="rounded-lg bg-slate-900 px-4 py-2 text-white text-xs font-bold disabled:opacity-50">{exporting?'Đang xuất...':'Xuất PDF'}</button>
   </div>
  </div>
  {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  {success&&<p role="status" className="text-sm text-green-700">{success}</p>}
  {loading?<p className="text-sm text-slate-500">Đang tải chuyên cần giáo viên...</p>:!valid?<p className="text-sm text-amber-700">Chưa có ngày bắt đầu/kết thúc kỳ báo cáo.</p>:
   <div ref={printRef} className="bg-white text-slate-900 p-6 border border-slate-200 rounded-xl space-y-4 text-sm">
    <div className="text-center"><div className="font-semibold">TRƯỜNG THCS TRẦN QUANG KHẢI</div><h3 className="text-lg font-bold mt-3">BÁO CÁO CHUYÊN CẦN GIÁO VIÊN</h3><div>{displayLabel}</div><div>{displayStart} – {displayEnd}</div></div>
    <p className="font-semibold">Tổng số ghi nhận: {displayRows.length} lượt</p>
    <div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr>{['Giáo viên','Trễ','Phút trễ','Vắng phép','Vắng KP','Về sớm'].map(s=><th key={s} className="border p-2 text-left">{s}</th>)}</tr></thead><tbody>{displaySummary.map(s=><tr key={s.name}><td className="border p-2">{s.name}</td>{[s.late,s.minutes,s.excused,s.unexcused,s.early].map((n,i)=><td key={i} className="border p-2">{n}</td>)}</tr>)}</tbody></table></div>
    <h4 className="font-bold">Chi tiết ghi nhận</h4>
    <div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr>{['Ngày giờ','Giáo viên','Nội dung','Buổi / Tiết','Lớp','Phút','Ghi chú'].map(s=><th key={s} className="border p-2 text-left">{s}</th>)}</tr></thead><tbody>{displayRows.map(r=><tr key={r.id}><td className="border p-2">{formatDate(r.occurred_at)}</td><td className="border p-2">{r.teacher_name}</td><td className="border p-2">{names[r.rule_code]||r.rule_code}</td><td className="border p-2">{r.session==='MORNING'?'Sáng':'Chiều'} / {r.period_number}</td><td className="border p-2">{r.class_name||'—'}</td><td className="border p-2">{r.minutes||'—'}</td><td className="border p-2">{r.note||'—'}</td></tr>)}</tbody></table></div>
   </div>}
  {!exportOnly&&<div className={box}><h4 className="font-bold text-sm mb-2">Báo cáo giáo viên đã lưu</h4>{history.length===0?<p className="text-xs text-slate-500">Chưa có báo cáo.</p>:<div className="space-y-2">{history.map(h=><button key={h.id} type="button" onClick={()=>setSavedView(h)} className="block w-full text-left text-xs rounded-lg border p-2 hover:bg-slate-50 dark:hover:bg-slate-800">{h.period_label} — {formatDate(h.created_at)} ({h.report_data?.rows?.length||0} lượt)</button>)}</div>}{savedView&&<button type="button" onClick={()=>setSavedView(null)} className="text-xs underline mt-3">Quay lại dữ liệu hiện tại</button>}</div>}
 </div>;
}
