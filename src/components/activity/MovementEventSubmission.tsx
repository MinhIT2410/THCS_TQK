import React,{useEffect,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {chiDoiCongressService} from '../../services/chiDoiCongressService';
import {supabase} from '../../services/supabaseClient';

export default function MovementEventSubmission({campaignId,eventId,academicYear,enabled,allowImages=true,allowMp3=false,allowVideoLink=false,maxImages=5,deadline}:{campaignId:string;eventId:string;academicYear:string;enabled?:boolean;allowImages?:boolean;allowMp3?:boolean;allowVideoLink?:boolean;maxImages?:number;deadline?:string|null}){
 const {user,isAuthenticated}=useAuth();
 const [cls,setCls]=useState<{id:string;name:string}|null>(null),[id,setId]=useState<string|null>(null);
 const [files,setFiles]=useState<any[]>([]),[notes,setNotes]=useState(''),[video,setVideo]=useState(''),[status,setStatus]=useState('draft');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const expired=!!deadline && new Date(deadline).getTime()<Date.now();
 async function reload(submissionId:string){const {data,error:e}=await supabase.from('movement_submission_files').select('*').eq('submission_id',submissionId).order('created_at');if(e)throw e;setFiles(data||[]);}
 useEffect(()=>{let live=true;async function load(){if(!user||!enabled)return;try{
 const c=await chiDoiCongressService.getHomeroomClass(user.id,academicYear);if(!live)return;setCls(c);
 if(!c)return;const {data,error:e}=await supabase.from('movement_class_submissions').select('*').eq('event_id',eventId).eq('class_id',c.id).maybeSingle();if(e)throw e;
 if(data&&live){setId(data.id);setNotes(data.notes||'');setVideo(data.video_url||'');setStatus(data.status);await reload(data.id);}
 }catch(e:any){if(live)setError(e.message||'Không tải được bài nộp');}}void load();return()=>{live=false};},[eventId,user?.id,academicYear,enabled]);
 if(!enabled||!isAuthenticated||!cls)return null;
 async function save(submit:boolean){if(!user||busy)return;setBusy(true);setError('');try{
 if(video && (!/^https:\/\/[^\s]+$/i.test(video)||video.length>1500))throw new Error('Link video phải bắt đầu bằng https:// và không có khoảng trắng.');
 const payload={event_id:eventId,class_id:cls.id,teacher_id:user.id,notes:notes||null,video_url:allowVideoLink?(video||null):null,status:submit?'submitted':'draft',submitted_at:submit?new Date().toISOString():null,updated_at:new Date().toISOString()};
 const {data,error:e}=await supabase.from('movement_class_submissions').upsert(payload,{onConflict:'event_id,class_id'}).select('id').single();if(e)throw e;
 setId(data.id);setStatus(payload.status);setInfo(submit?'Đã nộp thành công.':'Đã lưu bản nháp.');
 }catch(e:any){setError(e.message||'Không lưu được');}finally{setBusy(false)}}
 async function upload(file:File){if(!user||!id||busy)return;setBusy(true);setError('');try{
 const image=file.type.startsWith('image/');const kind=image?'image':'audio';
 if(image?(!allowImages||!['image/jpeg','image/png','image/webp'].includes(file.type)):(!allowMp3||file.type!=='audio/mpeg'))throw new Error('Định dạng tệp không được cho phép.');
 if(image&&files.filter(f=>f.file_type==='image').length>=maxImages)throw new Error('Đã đạt giới hạn ảnh của hoạt động.');
 if(file.size>20*1024*1024)throw new Error('Tệp vượt quá 20MB.');
 const path=`submissions/${user.id}/${id}/${crypto.randomUUID()}.${image?(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'):'mp3'}`;
 const {error:up}=await supabase.storage.from('movement-submissions').upload(path,file,{upsert:false,contentType:file.type});if(up)throw up;
 const {error:e}=await supabase.from('movement_submission_files').insert({submission_id:id,storage_path:path,file_type:kind,original_name:file.name,size_bytes:file.size});
 if(e){await supabase.storage.from('movement-submissions').remove([path]);throw e;}await reload(id);setInfo('Đã tải tệp lên.');
 }catch(e:any){setError(e.message||'Tải tệp lỗi');}finally{setBusy(false)}}
 async function view(path:string){const {data,error:e}=await supabase.storage.from('movement-submissions').createSignedUrl(path,60);if(e){setError(e.message);return;}window.open(data.signedUrl,'_blank','noopener,noreferrer');}
 async function remove(f:any){if(!id||!window.confirm('Bỏ tệp này khỏi bài nộp?'))return;setBusy(true);try{const {error:e}=await supabase.from('movement_submission_files').delete().eq('id',f.id);if(e)throw e;await supabase.storage.from('movement-submissions').remove([f.storage_path]);await reload(id);}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <div className="mt-4 rounded-xl border border-blue-200 dark:border-slate-700 bg-blue-50/60 dark:bg-slate-900 p-4 space-y-3 text-sm">
 <div className="flex items-center justify-between gap-2"><b>Bài nộp của lớp {cls.name}</b><span className="text-xs text-slate-600">{status==='submitted'?'Đã nộp':status==='needs_revision'?'Cần bổ sung':'Bản nháp'}</span></div>
 {deadline&&<p className="text-xs text-slate-600">Hạn nộp: {new Date(deadline).toLocaleString('vi-VN')}</p>}
 {error&&<p role="alert" className="text-red-600">{error}</p>}{info&&<p role="status" className="text-emerald-700">{info}</p>}
 <textarea disabled={expired} className="w-full border rounded-lg p-2 bg-white dark:bg-slate-800" rows={2} placeholder="Ghi chú sản phẩm của lớp" value={notes} onChange={e=>setNotes(e.target.value)}/>
 {allowVideoLink&&<input disabled={expired} className="w-full border rounded-lg p-2 bg-white dark:bg-slate-800" placeholder="Link video HTTPS (Google Drive/YouTube…)" value={video} onChange={e=>setVideo(e.target.value)}/>}
 {id&& (allowImages||allowMp3)&&!expired&&<label className="inline-flex px-3 py-2 bg-white rounded-lg border cursor-pointer text-blue-700 font-semibold">Tải ảnh / MP3 lên<input className="hidden" type="file" accept={[allowImages?'image/jpeg,image/png,image/webp':'',allowMp3?'audio/mpeg':''].filter(Boolean).join(',')} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}} disabled={busy}/></label>}
 {!id&&<p className="text-xs text-amber-700">Lưu bản nháp trước, sau đó có thể đính kèm tệp.</p>}
 {files.map(f=><div key={f.id} className="flex gap-3 items-center justify-between border rounded-lg bg-white dark:bg-slate-800 px-3 py-2"><span className="truncate">{f.original_name} ({Math.round(f.size_bytes/1024)} KB)</span><span className="shrink-0 flex gap-2"><button onClick={()=>void view(f.storage_path)} className="text-blue-600">Xem</button>{!expired&&<button onClick={()=>void remove(f)} className="text-red-600">Bỏ</button>}</span></div>)}
 {!expired&&<div className="flex gap-2"><button disabled={busy} onClick={()=>void save(false)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-50">Lưu nháp</button><button disabled={busy} onClick={()=>void save(true)} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50">Nộp sản phẩm</button></div>}
 </div>;
}
