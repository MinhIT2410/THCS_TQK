import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../../lib/supabase/client';
import { CompetitionReportConfig } from '../../services/competitionReportConfigService';

type Row = { id:string; teacher_id:string; teacher_name:string; rule_code:string; occurred_at:string; session:string; period_number:number; class_name:string|null; minutes:number|null; note:string|null };
type Saved = { id:string; period_label:string; period_start:string; period_end:string; report_data: {rows:Row[]}; created_at:string };
type Props = { periodType:'WEEK'|'MONTH'|'SEMESTER'|'YEAR'; periodLabel:string; start:string; end:string; valid:boolean; exportOnly?:boolean; reportConfig?:CompetitionReportConfig; academicYearName?:string; creatorName?:string };
const names:Record<string,string>={LATE:'Đi trễ',ABSENT_EXCUSED:'Vắng tiết có phép',ABSENT_UNEXCUSED:'Vắng tiết không phép',EARLY:'Rời tiết sớm'};
const formatDate = (date:string) => new Date(date).toLocaleString('vi-VN');

export default function TeacherAttendanceReport({periodType,periodLabel,start,end,valid,exportOnly,reportConfig,academicYearName,creatorName}:Props) {
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
   <div ref={printRef} className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 space-y-6 max-w-4xl mx-auto font-sans text-sm">
    {/* Same report layout, typography, metadata and signature sections as the existing student report. */}
    <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
     <div className="text-center"><p className="font-bold uppercase tracking-wide text-slate-600">{reportConfig?.parent_organization || 'TRƯỜNG THCS TRẦN QUANG KHẢI'}</p><p className="font-bold text-slate-900 text-sm uppercase">{reportConfig?.unit_name || 'GIÁM THỊ'}</p></div>
     <div className="text-left sm:text-right text-slate-600 space-y-0.5"><p>Năm học: <strong className="text-slate-900">{academicYearName || '—'}</strong></p><p>{savedView ? 'Thời điểm lưu:' : 'Thời điểm lập:'} <strong>{formatDate(savedView?.created_at || new Date().toISOString())}</strong></p></div>
    </div>
    <div className="text-center space-y-1 py-2"><h1 className="font-bold text-lg sm:text-xl text-slate-900 uppercase tracking-tight">BẢN TỔNG KẾT CHUYÊN CẦN GIÁO VIÊN</h1><p className="text-xs font-semibold text-slate-600">{displayLabel} — {displayStart} đến {displayEnd}</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
     <div><span className="text-slate-500">Người lập báo cáo:</span> <strong className="text-slate-900">{creatorName || 'Giám thị phụ trách'}</strong></div>
     <div><span className="text-slate-500">Phạm vi theo dõi:</span> <strong className="text-slate-900">{selectedTeacher==='ALL' ? 'Tất cả giáo viên' : (teachers.find(t=>t.id===selectedTeacher)?.name || 'Giáo viên')}</strong></div>
     <div><span className="text-slate-500">Tổng số lượt ghi nhận:</span> <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">{displayRows.length} lượt</span></div>
    </div>
    <div className="space-y-2"><h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">I. BẢNG THỐNG KÊ CHUYÊN CẦN THEO GIÁO VIÊN</h4>
     <div className="overflow-x-auto border border-slate-300 rounded-lg"><table className="w-full text-left text-xs border-collapse"><thead><tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">{['STT','GIÁO VIÊN','ĐI TRỄ','PHÚT TRỄ','VẮNG CÓ PHÉP','VẮNG KHÔNG PHÉP','RỜI SỚM'].map(x=><th key={x} className="p-2.5 border-r border-slate-300">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 text-slate-800">{displaySummary.map((r,i)=><tr key={r.name} className="align-top"><td className="p-2.5 text-center border-r border-slate-200">{i+1}</td><td className="p-2.5 font-bold border-r border-slate-200">{r.name}</td>{[r.late,r.minutes,r.excused,r.unexcused,r.early].map((n,j)=><td key={j} className="p-2.5 text-center border-r border-slate-200">{n || '—'}</td>)}</tr>)}{displaySummary.length===0&&<tr><td colSpan={7} className="p-4 text-center italic text-slate-400">Không có ghi nhận trong kỳ</td></tr>}</tbody></table></div>
    </div>
    <div className="space-y-2"><h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">II. CHI TIẾT CÁC LƯỢT GHI NHẬN</h4>
     <div className="overflow-x-auto border border-slate-300 rounded-lg"><table className="w-full text-left text-xs border-collapse"><thead><tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">{['STT','GIÁO VIÊN','NỘI DUNG / THỜI GIAN / GHI CHÚ'].map(x=><th key={x} className="p-2.5 border-r border-slate-300">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 text-slate-800">{displayRows.map((r,i)=><tr key={r.id} className="align-top"><td className="p-2.5 text-center border-r border-slate-200">{i+1}</td><td className="p-2.5 font-bold border-r border-slate-200">{r.teacher_name}</td><td className="p-2.5 leading-relaxed"><span className="font-semibold">{names[r.rule_code]||r.rule_code}</span> — <span className="font-mono text-[11px] text-slate-600">{formatDate(r.occurred_at)}</span><div className="text-slate-600">{r.session==='MORNING'?'Sáng':'Chiều'} · Tiết {r.period_number}{r.class_name?` · Lớp ${r.class_name}`:''}{r.minutes?` · ${r.minutes} phút`:''}</div>{r.note&&<div className="italic text-slate-600">{r.note}</div>}</td></tr>)}{displayRows.length===0&&<tr><td colSpan={3} className="p-4 text-center italic text-slate-400">Không có ghi nhận</td></tr>}</tbody></table></div>
    </div>
    <div data-pdf-section="notes" className="space-y-2 pt-2"><h4 className="font-bold text-xs uppercase text-slate-700 tracking-wider">{reportConfig?.summary_section_title || 'III. NHẬN XÉT & TỔNG KẾT CỦA GIÁM THỊ'}</h4><div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-400 italic min-h-[60px]">Không có nhận xét bổ sung.</div></div>
    <div data-pdf-section="signatures" className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs text-center"><div className="flex flex-col items-center"><p className="font-bold uppercase text-slate-700">{reportConfig?.approver_title || 'BAN GIÁM HIỆU / XÁC NHẬN'}</p><p className="text-[11px] text-slate-400">(Ký và ghi rõ họ tên)</p><p className="text-slate-300 italic mt-28">................................................</p></div><div className="flex flex-col items-center"><p className="font-bold uppercase text-slate-700">{reportConfig?.reporter_title || 'NGƯỜI LẬP BÁO CÁO'}</p><p className="text-[11px] text-slate-400">(Ký và ghi rõ họ tên)</p><p className="font-bold text-slate-900 mt-28">{creatorName || 'Giám thị phụ trách'}</p></div></div>
   </div>}
  {!exportOnly&&<div className={box}><h4 className="font-bold text-sm mb-2">Báo cáo giáo viên đã lưu</h4>{history.length===0?<p className="text-xs text-slate-500">Chưa có báo cáo.</p>:<div className="space-y-2">{history.map(h=><button key={h.id} type="button" onClick={()=>setSavedView(h)} className="block w-full text-left text-xs rounded-lg border p-2 hover:bg-slate-50 dark:hover:bg-slate-800">{h.period_label} — {formatDate(h.created_at)} ({h.report_data?.rows?.length||0} lượt)</button>)}</div>}{savedView&&<button type="button" onClick={()=>setSavedView(null)} className="text-xs underline mt-3">Quay lại dữ liệu hiện tại</button>}</div>}
 </div>;
}
