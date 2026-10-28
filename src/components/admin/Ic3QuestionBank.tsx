
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { BookOpen, Download, FileUp, Plus, Save, Trash2, Pencil, RefreshCw, LayoutGrid, CircleCheck, Eye, EyeOff, ClipboardList, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../features/auth/AuthContext';

type Topic = { topic: number; title: string };
type SetRow = { id: string; topic: number | null; test_number: number | null; title: string; published: boolean; question_count: number };
type Question = { id: string; position: number; prompt: string; choices: string[]; correct_index: number; explanation: string; tip: string; image_url: string };
const HEADERS = ['STT','Câu hỏi','Đáp án A','Đáp án B','Đáp án C','Đáp án D','Đáp án đúng (A/B/C/D)','Giải thích','Mẹo ghi nhớ','Ảnh minh họa (URL)'];
const blank = (position:number): Question => ({id:'',position,prompt:'',choices:['','','',''],correct_index:0,explanation:'',tip:'',image_url:''});
const cls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';
const btnGhost = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800';

export default function Ic3QuestionBank(){
 const {hasRole}=useAuth();
 const allowed=hasRole('SUPER_ADMIN')||hasRole('PRINCIPAL')||hasRole('VICE_PRINCIPAL');
 const [grade,setGrade]=useState(6),[topics,setTopics]=useState<Topic[]>([]),[sets,setSets]=useState<SetRow[]>([]);
 const [topic,setTopic]=useState(1),[testNo,setTestNo]=useState(1),[selected,setSelected]=useState('');
 const [questions,setQuestions]=useState<Question[]>([]),[edit,setEdit]=useState<Question|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [pending,setPending]=useState<Question[]>([]);
 const filtered=useMemo(()=>sets.filter(x=>x.topic===topic).sort((a,b)=>(a.test_number??0)-(b.test_number??0)),[sets,topic]);
 const current=sets.find(x=>x.id===selected);
 const publishedCount = filtered.filter(x=>x.published).length;
 const draftCount = filtered.length - publishedCount;
 const totalQuestions = filtered.reduce((sum,x)=>sum + (x.question_count||0),0);
 const gradeLabel = grade === 6 ? 'Khối 6 - Level 1' : grade === 7 ? 'Khối 7 - Level 2' : 'Khối 8 - Level 3';

 const error=(e:unknown)=>setMessage(e instanceof Error?e.message:String(e));
 async function loadCatalog(g=grade){
   const {data,error:e}=await supabase.rpc('ic3_school_admin_catalog',{p_grade:g});
   if(e){error(e.message);return;}
   setTopics(data?.topics??[]);
   setSets(data?.sets??[]);
 }
 async function loadQuestions(id=selected){
   if(!id){setQuestions([]);return;}
   const {data,error:e}=await supabase.rpc('ic3_school_admin_questions',{p_set_id:id});
   if(e){error(e.message);return;}
   setQuestions(Array.isArray(data)?data:[]);
 }
 useEffect(()=>{if(allowed) void loadCatalog(grade);},[grade,allowed]);
 useEffect(()=>{setSelected('');setQuestions([]);setEdit(null);setPending([]);},[grade,topic]);
 useEffect(()=>{void loadQuestions(selected);},[selected]);
 const invoke=async(name:string,args:Record<string,unknown>)=>{const {data,error:e}=await supabase.rpc(name as never,args as never);if(e)throw new Error(e.message);return data;};
 async function createTest(){
   setBusy(true);setMessage('');
   try{
     const id=await invoke('ic3_school_admin_set',{p_grade:grade,p_topic:topic,p_test:testNo,p_published:false});
     await loadCatalog();
     setSelected(String(id));
     setMessage('Đã tạo Test và chuyển sang chế độ quản lý chi tiết.');
   }catch(e){error(e)}finally{setBusy(false)}
 }
 async function publish(){if(!current)return;setBusy(true);try{await invoke('ic3_school_admin_publish',{p_set_id:current.id,p_published:!current.published});await loadCatalog();setMessage('Đã cập nhật trạng thái xuất bản.')}catch(e){error(e)}finally{setBusy(false)}}
 async function deleteTest(){
   if(!current) return;
   if(!window.confirm(`Xóa toàn bộ ${current.title}?`)) return;
   setBusy(true);
   try{
      await invoke('ic3_school_admin_delete_set',{p_set_id:current.id});
      setSelected(''); setQuestions([]); setEdit(null); setPending([]);
      await loadCatalog();
      setMessage('Đã xóa Test.');
   }catch(e){error(e)}finally{setBusy(false)}
 }
 async function save(q:Question){if(!selected)return;setBusy(true);setMessage('');try{await invoke('ic3_school_admin_save_question_media',{p_set_id:selected,p_id:q.id||null,p_position:q.position,p_prompt:q.prompt,p_choices:q.choices,p_correct_index:q.correct_index,p_explanation:q.explanation,p_tip:q.tip,p_image_url:q.image_url||null});await loadQuestions();await loadCatalog();setEdit(null);setMessage('Đã lưu câu hỏi.')}catch(e){error(e)}finally{setBusy(false)}}
 async function remove(q:Question){if(!selected||!window.confirm('Xóa câu hỏi này?'))return;setBusy(true);try{await invoke('ic3_school_admin_delete_question',{p_set_id:selected,p_question_id:q.id});await loadQuestions();await loadCatalog();setMessage('Đã xóa câu hỏi.')}catch(e){error(e)}finally{setBusy(false)}}
 function template(){
   const rows=[HEADERS,[1,'Một trang web thường dùng cần được lưu để truy cập nhanh. Tính năng phù hợp là gì?','Dấu trang','Lịch sử tải xuống','Ẩn danh','Phóng to','A','Dấu trang lưu địa chỉ của website để mở nhanh vào lần sau.','Bookmark là dấu trang.','https://example.com/hinh-minh-hoa.jpg']];
   const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet(rows);
   ws['!cols']=[{wch:8},{wch:75},{wch:30},{wch:30},{wch:30},{wch:30},{wch:24},{wch:75},{wch:45},{wch:48}];
   XLSX.utils.book_append_sheet(wb,ws,'CAU_HOI');XLSX.writeFile(wb,'MAU_NHAP_CAU_HOI_IC3.xlsx');
 }
 async function readExcel(file?:File){if(!file)return;setMessage('');try{const book=XLSX.read(await file.arrayBuffer(),{type:'array'});const sheet=book.Sheets['CAU_HOI'];if(!sheet)throw new Error('Không tìm thấy sheet CAU_HOI');const rows=(XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}) as unknown[][]);if(HEADERS.some((v,i)=>String(rows[0]?.[i]??'').trim()!==v))throw new Error('Tên hoặc thứ tự cột không khớp mẫu Excel cố định');const parsed:Question[]=rows.slice(1).filter(r=>r.some(x=>String(x).trim())).map((r,i)=>{const pos=Number(r[0]);const choices=r.slice(2,6).map(String).map(x=>x.trim());const key=String(r[6]??'').trim().toUpperCase();const prompt=String(r[1]??'').trim(),explanation=String(r[7]??'').trim();const image_url=String(r[9]??'').trim();if(!Number.isInteger(pos)||pos<1||pos>32767||prompt.length<8||choices.length!==4||choices.some(x=>!x)||!['A','B','C','D'].includes(key)||explanation.length<5)throw new Error('Dòng '+(i+2)+' có STT, câu hỏi, đáp án hoặc giải thích không hợp lệ');return {...blank(pos),prompt,choices,correct_index:key.charCodeAt(0)-65,explanation,tip:String(r[8]??'').trim(),image_url};});const pos=new Set(parsed.map(q=>q.position));if(pos.size!==parsed.length)throw new Error('Trùng STT trong Excel');if(!parsed.length)throw new Error('File Excel không có câu hỏi');const existing=new Set(questions.map(x=>x.position));if(parsed.some(x=>existing.has(x.position)))throw new Error('Có STT trùng câu hỏi đã có. Hãy sửa STT trong Excel hoặc chỉnh sửa từng câu trên giao diện.');setPending(parsed);setMessage(`Đã kiểm tra ${parsed.length} câu hợp lệ. Nhấn Nhập vào Test để lưu.`)}catch(e){error(e);setPending([])}}
 async function importAll(){if(!selected||!pending.length)return;setBusy(true);setMessage('');let count=0;try{for(const q of pending){await invoke('ic3_school_admin_save_question_media',{p_set_id:selected,p_id:null,p_position:q.position,p_prompt:q.prompt,p_choices:q.choices,p_correct_index:q.correct_index,p_explanation:q.explanation,p_tip:q.tip,p_image_url:q.image_url||null});count++;}setPending([]);await loadQuestions();await loadCatalog();setMessage(`Đã nhập ${count} câu thành công.`)}catch(e){setMessage(`Đã nhập ${count}/${pending.length} câu; lỗi: ${String(e)}. Tải lại danh sách trước khi thử nhập lại để tránh trùng.`);await loadQuestions();}finally{setBusy(false)}}
 if(!allowed)return <p className="rounded-xl border p-4">Không có quyền quản trị ngân hàng câu hỏi IC3.</p>;
 return <section className="space-y-5">
  <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-5 text-white flex flex-wrap items-center justify-between gap-3">
    <div>
      <div className="flex items-center gap-2 font-black text-xl"><BookOpen size={24}/> Ngân hàng câu hỏi IC3</div>
      <p className="text-blue-100 text-sm mt-1">21 chủ đề có sẵn · Tạo Test · Soạn câu hỏi · Nhập Excel · Xuất bản cho học sinh</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <button onClick={()=>void loadCatalog()} className="rounded-xl border border-white/30 bg-white/10 text-white px-4 py-2.5 font-semibold text-sm flex gap-2 items-center hover:bg-white/20"><RefreshCw size={17}/> Tải lại</button>
      <button onClick={template} className="rounded-xl bg-white text-blue-800 px-4 py-2.5 font-semibold text-sm flex gap-2 items-center"><Download size={17}/> Tải Excel mẫu</button>
    </div>
  </div>

  <div className="grid lg:grid-cols-4 gap-4">
    <div className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Khối đang quản lý</div><div className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">{gradeLabel}</div><div className="mt-3 text-xs text-slate-500">Chọn khối để tải đúng 7 chủ đề và các Test đã có.</div></div>
    <div className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Số Test của chủ đề</div><div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{filtered.length}</div><div className="mt-2 text-xs text-slate-500">Hiển thị tất cả Test đã tạo trong chủ đề đang chọn.</div></div>
    <div className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Đã xuất bản / Nháp</div><div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{publishedCount}<span className="text-base text-slate-400"> / {draftCount}</span></div><div className="mt-2 text-xs text-slate-500">Theo dõi nhanh để biết bài nào đã mở cho học sinh.</div></div>
    <div className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Tổng số câu hỏi</div><div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{totalQuestions}</div><div className="mt-2 text-xs text-slate-500">Tổng số câu của các Test trong chủ đề hiện tại.</div></div>
  </div>

  <div className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-4 md:p-5 space-y-4">
   <div className="grid md:grid-cols-3 gap-3">
      <label className="text-xs font-bold text-slate-500">KHỐI<select className={cls} value={grade} onChange={e=>setGrade(Number(e.target.value))}>{[6,7,8].map(x=><option key={x} value={x}>Khối {x} – Level {x-5}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-500">CHỦ ĐỀ<select className={cls} value={topic} onChange={e=>setTopic(Number(e.target.value))}>{topics.map(t=><option key={t.topic} value={t.topic}>Chủ đề {t.topic}: {t.title}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-500">TEST ĐANG MỞ QUẢN LÝ<select className={cls} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">— Chọn Test —</option>{filtered.map(s=><option key={s.id} value={s.id}>Test {s.test_number ?? 'cũ'} · {s.question_count} câu {s.published?'✓':'(Nháp)'}</option>)}</select></label>
   </div>
   <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4 flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
      <div className="flex-1 grid sm:grid-cols-[120px_120px_1fr] gap-3 items-end"><label className="text-sm font-semibold">Thêm Test số<input className={cls} type="number" min={1} max={99} value={testNo} onChange={e=>setTestNo(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void createTest()} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"><Plus size={16}/> Tạo Test</button><p className="text-xs text-slate-500">Khi tạo xong, Test sẽ hiện ngay ở danh sách bên dưới để bạn tiếp tục quản lý. Không ảnh hưởng đến các bài trên IIG.</p></div>
      <div className="text-xs text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2">Gợi ý: tạo đủ Test trước, sau đó chọn từng Test để nhập câu hỏi và xuất bản.</div>
   </div>
  </div>

  <div className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-4 md:p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-lg flex items-center gap-2"><LayoutGrid size={18}/> Test hiện có của chủ đề</h3><p className="text-sm text-slate-500">Test nào đã có sẽ hiện ra ở đây. Tạo xong là thấy ngay để tiếp tục quản lý.</p></div><div className="text-xs rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">{filtered.length} Test</div></div>
    {filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">Chủ đề này chưa có Test nào. Hãy tạo Test đầu tiên để bắt đầu nhập câu hỏi.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map(s => {const active = s.id === selected; return <div key={s.id} className={'rounded-2xl border p-4 transition-all ' + (active ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30 bg-blue-50/40 dark:bg-blue-950/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900')}><div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase font-bold text-slate-500">Test {s.test_number ?? 'cũ'}</div><h4 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white leading-snug">{s.title}</h4></div><span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ' + (s.published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')}>{s.published ? 'Đã xuất bản' : 'Bản nháp'}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="text-xs text-slate-500">Số câu hỏi</div><div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{s.question_count}</div></div><div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="text-xs text-slate-500">Trạng thái</div><div className="mt-1 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">{s.published ? <CircleCheck size={16} className="text-emerald-600"/> : <ClipboardList size={16} className="text-amber-600"/>}{s.published ? 'Hiện cho học sinh' : 'Chưa xuất bản'}</div></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>setSelected(s.id)} className={active ? 'rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold' : btnGhost}>{active ? 'Đang quản lý' : 'Quản lý Test'}</button>{active && <button onClick={()=>void publish()} disabled={busy} className={'rounded-xl px-4 py-2 text-sm font-semibold border ' + (s.published ? 'border-amber-400 text-amber-700 dark:text-amber-300' : 'border-emerald-500 text-emerald-700 dark:text-emerald-300')}>{s.published ? <span className="inline-flex items-center gap-1"><EyeOff size={15}/> Ẩn Test</span> : <span className="inline-flex items-center gap-1"><Eye size={15}/> Xuất bản</span>}</button>}</div></div>})}</div>}
  </div>

  {current&&<div className="rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-4 md:p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-lg">Quản lý nội dung · {current.title}</h3><p className="text-xs text-slate-500">{questions.length} câu · {current.published?'Đã xuất bản':'Bản nháp'}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void publish()} disabled={busy} className={'rounded-xl px-4 py-2.5 text-sm font-semibold border '+(current.published?'border-amber-400 text-amber-700':'border-emerald-500 text-emerald-700')}>{current.published ? <span className="inline-flex items-center gap-1"><EyeOff size={16}/> Ẩn Test</span> : <span className="inline-flex items-center gap-1"><Eye size={16}/> Xuất bản cho học sinh</span>}</button><button onClick={()=>void deleteTest()} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-red-300 text-red-700"><Trash2 size={16} className="inline mr-1"/>Xóa Test</button></div></div>
    <div className="rounded-xl bg-amber-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-200"><b>Gợi ý nâng chất lượng:</b> Với các câu hỏi dễ nhầm, nên thêm <b>ảnh minh họa thực tế</b> (ví dụ cửa sổ trình duyệt, biểu tượng thiết bị, ảnh cổng kết nối, giao diện hệ điều hành...) để học sinh nhìn là nhớ.</div>
    <div className="flex flex-wrap gap-2"><button disabled={busy} className="rounded-xl bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 flex items-center gap-2" onClick={()=>setEdit(blank(questions.length?Math.max(...questions.map(x=>x.position))+1:1))}><Plus size={16}/> Thêm câu hỏi</button><label className="rounded-xl border text-sm font-semibold px-4 py-2.5 flex items-center gap-2 cursor-pointer"><FileUp size={17}/> Chọn Excel<input type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>{void readExcel(e.target.files?.[0]);e.target.value='';}}/></label>{pending.length>0&&<button disabled={busy} onClick={()=>void importAll()} className="rounded-xl bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5">Nhập {pending.length} câu vào Test</button>}</div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500 border-b"><th className="py-2">STT</th><th>Câu hỏi</th><th>Đáp án</th><th>Ảnh</th><th className="text-right">Thao tác</th></tr></thead><tbody>{questions.map(q=><tr key={q.id} className="border-b dark:border-slate-800"><td className="py-3 w-14">{q.position}</td><td className="py-3 pr-3">{q.prompt}</td><td className="py-3">{String.fromCharCode(65+q.correct_index)}</td><td className="py-3">{q.image_url ? <span className="inline-flex items-center gap-1 text-emerald-700 text-xs"><ImageIcon size={14}/> Có ảnh</span> : <span className="text-slate-400 text-xs">Không</span>}</td><td className="py-3"><div className="flex justify-end gap-2"><button title="Sửa câu" onClick={()=>setEdit({...q,choices:[...q.choices]})} className="text-blue-600 p-2"><Pencil size={17}/></button><button title="Xóa câu" onClick={()=>void remove(q)} className="text-red-600 p-2"><Trash2 size={17}/></button></div></td></tr>)}</tbody></table>{!questions.length&&<p className="p-5 text-center text-sm text-slate-500">Test chưa có câu hỏi. Thêm từng câu hoặc nhập Excel.</p>}</div></div>}
  {edit&&<div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 dark:bg-slate-900 dark:border-blue-900 p-4 md:p-5 space-y-3"><h3 className="font-bold">{edit.id?'Chỉnh sửa':'Thêm'} câu hỏi</h3><div className="grid md:grid-cols-[90px_1fr] gap-3"><label className="text-sm">STT<input className={cls} type="number" min={1} value={edit.position} onChange={e=>setEdit({...edit,position:Number(e.target.value)})}/></label><label className="text-sm">Nội dung câu hỏi<textarea rows={2} className={cls} value={edit.prompt} onChange={e=>setEdit({...edit,prompt:e.target.value})}/></label></div><div className="grid md:grid-cols-2 gap-3">{edit.choices.map((c,i)=><label key={i} className="text-sm">Đáp án {String.fromCharCode(65+i)}<input className={cls} value={c} onChange={e=>setEdit({...edit,choices:edit.choices.map((v,j)=>j===i?e.target.value:v)})}/></label>)}</div><label className="text-sm block">Đáp án đúng<select className={cls} value={edit.correct_index} onChange={e=>setEdit({...edit,correct_index:Number(e.target.value)})}>{['A','B','C','D'].map((x,i)=><option key={x} value={i}>{x}</option>)}</select></label><label className="text-sm block">Giải thích sau khi học sinh trả lời<textarea rows={3} className={cls} value={edit.explanation} onChange={e=>setEdit({...edit,explanation:e.target.value})}/></label><label className="text-sm block">Mẹo ghi nhớ (không bắt buộc)<textarea rows={2} className={cls} value={edit.tip} onChange={e=>setEdit({...edit,tip:e.target.value})}/></label><label className="text-sm block">Ảnh minh họa thực tế (URL, không bắt buộc)<input className={cls} value={edit.image_url} onChange={e=>setEdit({...edit,image_url:e.target.value})} placeholder="https://..."/></label>{edit.image_url && <div className="rounded-xl border bg-white dark:bg-slate-950 p-3"><div className="text-xs text-slate-500 mb-2">Xem trước ảnh minh họa</div><img src={edit.image_url} alt="Ảnh minh họa" className="max-h-56 rounded-lg border object-contain" onError={(e)=>{(e.currentTarget.style.display='none');}} /></div>}<div className="flex gap-2"><button disabled={busy} onClick={()=>void save(edit)} className="rounded-xl bg-blue-600 text-white px-5 py-2.5 font-bold flex items-center gap-2"><Save size={16}/> Lưu câu hỏi</button><button onClick={()=>setEdit(null)} className="rounded-xl border px-4 py-2.5">Hủy</button></div></div>}
  {message&&<div role="status" className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 p-3 text-sm dark:bg-slate-900 dark:text-blue-300">{message}</div>}
 </section>;
}
