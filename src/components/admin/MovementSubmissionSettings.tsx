import React,{useState} from 'react';
import {supabase} from '../../services/supabaseClient';
type Config={id:string;title:string;submission_enabled?:boolean;submission_deadline?:string|null;allow_images?:boolean;allow_mp3?:boolean;allow_video_link?:boolean;max_images?:number;instructions?:string|null};
export default function MovementSubmissionSettings({event,onClose,onSaved}:{event:Config;onClose:()=>void;onSaved:()=>Promise<void>}){
 const [v,setV]=useState({submission_enabled:!!event.submission_enabled,submission_deadline:event.submission_deadline?.slice(0,16)||'',allow_images:event.allow_images!==false,allow_mp3:!!event.allow_mp3,allow_video_link:!!event.allow_video_link,max_images:event.max_images??5,instructions:event.instructions||''});
 const [saving,setSaving]=useState(false),[error,setError]=useState('');
 async function save(){setSaving(true);setError('');try{if(v.max_images<0||v.max_images>20)throw new Error('Số ảnh tối đa phải từ 0 đến 20');const payload={...v,submission_deadline:v.submission_deadline?new Date(v.submission_deadline).toISOString():null};const {error:e}=await supabase.from('movement_events').update(payload).eq('id',event.id);if(e)throw e;await onSaved();onClose()}catch(e:any){setError(e.message||'Không lưu được')}finally{setSaving(false)}}
 const field='w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2 bg-white dark:bg-slate-800 text-sm';
 return <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-3"><div className="bg-white dark:bg-slate-900 rounded-2xl border w-full max-w-lg p-5 space-y-4"><div className="flex items-center justify-between"><h3 className="font-bold">Cấu hình nộp bài: {event.title}</h3><button onClick={onClose}>Đóng ✕</button></div>
 <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.submission_enabled} onChange={e=>setV({...v,submission_enabled:e.target.checked})}/> Cho phép GVCN nộp sản phẩm</label>
 <label className="block text-sm">Hạn nộp<input className={field} type="datetime-local" value={v.submission_deadline} onChange={e=>setV({...v,submission_deadline:e.target.value})}/></label>
 <div className="flex gap-4 flex-wrap text-sm">{([['allow_images','Ảnh'],['allow_mp3','MP3'],['allow_video_link','Link video']] as const).map(([key,label])=><label key={key} className="flex gap-2 items-center"><input type="checkbox" checked={v[key]} onChange={e=>setV({...v,[key]:e.target.checked})}/>{label}</label>)}</div>
 <label className="block text-sm">Số ảnh tối đa/lớp<input className={field} type="number" min={0} max={20} value={v.max_images} onChange={e=>setV({...v,max_images:Number(e.target.value)})}/></label>
 <label className="block text-sm">Yêu cầu sản phẩm<textarea className={field} rows={3} value={v.instructions} onChange={e=>setV({...v,instructions:e.target.value})}/></label>
 {error&&<p className="text-red-600 text-sm">{error}</p>}
 <div className="flex justify-end gap-2"><button onClick={onClose} className="border rounded-lg px-4 py-2">Hủy</button><button disabled={saving} onClick={()=>void save()} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50">Lưu cấu hình</button></div></div></div>
}
