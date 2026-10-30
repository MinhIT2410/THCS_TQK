import React,{useEffect,useState} from 'react';
import {supabase} from '../../services/supabaseClient';
export default function MovementSubmissionManager({campaignId}:{campaignId:string}){
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);try{
 const {data:events,error:ee}=await supabase.from('movement_events').select('id,title').eq('campaign_id',campaignId);if(ee)throw ee;
 const ids=(events||[]).map(e=>e.id);if(!ids.length){setItems([]);return;}
 const {data,error:e}=await supabase.from('movement_class_submissions').select('*,movement_submission_files(*)').in('event_id',ids).order('updated_at',{ascending:false});if(e)throw e;
 const classes=[...new Set((data||[]).map(x=>x.class_id))];
 const {data:classRows}=classes.length?await supabase.from('classes').select('id,name').in('id',classes):{data:[]};
 setItems((data||[]).map(s=>({...s,event_title:(events||[]).find(x=>x.id===s.event_id)?.title||'',class_name:(classRows||[]).find(c=>c.id===s.class_id)?.name||'—'})));
 }catch(e:any){setError(e.message||'Không tải được bài nộp');}finally{setBusy(false)}}
 useEffect(()=>{void load()},[campaignId]);
 async function review(id:string,status:string){try{const {error:e}=await supabase.from('movement_class_submissions').update({status}).eq('id',id);if(e)throw e;await load()}catch(e:any){setError(e.message)}}
 async function view(path:string){const {data,error:e}=await supabase.storage.from('movement-submissions').createSignedUrl(path,60);if(e){setError(e.message);return;}window.open(data.signedUrl,'_blank','noopener,noreferrer')}
 return <div className="space-y-3"><div className="flex justify-between items-center"><h3 className="font-bold">Bài nộp của các lớp</h3><button className="border px-3 py-1 rounded-lg" onClick={()=>void load()}>Tải lại</button></div>
 {error&&<p className="text-red-600 text-sm">{error}</p>}
 {busy&&<p className="text-slate-500 text-sm">Đang tải…</p>}
 {!items.length&&!busy&&<p className="text-sm text-slate-500">Chưa có bài nộp.</p>}
 {items.map(s=><div key={s.id} className="rounded-xl border dark:border-slate-700 p-3 space-y-2 text-sm"><div className="flex justify-between gap-2"><b>Lớp {s.class_name} – {s.event_title}</b><span>{s.status==='submitted'?'Đã nộp':s.status==='needs_revision'?'Cần bổ sung':'Bản nháp'}</span></div>{s.notes&&<p>{s.notes}</p>}{s.video_url&&<a className="text-blue-600 underline" href={s.video_url} target="_blank" rel="noopener noreferrer">Mở liên kết video</a>}
 <div className="flex flex-wrap gap-2">{(s.movement_submission_files||[]).map((f:any)=><button key={f.id} className="border rounded-lg p-2 text-blue-600" onClick={()=>void view(f.storage_path)}>{f.original_name}</button>)}</div>
 <div className="flex gap-2"><button className="px-3 py-1 border rounded-lg" onClick={()=>void review(s.id,'needs_revision')}>Yêu cầu bổ sung</button><button className="px-3 py-1 border rounded-lg" onClick={()=>void review(s.id,'submitted')}>Đã tiếp nhận</button></div></div>)}
 </div>
}
