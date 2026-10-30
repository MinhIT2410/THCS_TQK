import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { chiDoiCongressService } from '../../services/chiDoiCongressService';
import { supabase } from '../../services/supabaseClient';

type AttachedFile = { id: string; storage_path: string; original_name: string; size_bytes: number; file_type: string };
export default function MovementEventSubmission({ campaignId: _campaignId, eventId, academicYear, enabled, allowImages = true, allowMp3 = false, allowVideoLink = false, maxImages = 5, deadline }: {
  campaignId: string; eventId: string; academicYear: string; enabled?: boolean; allowImages?: boolean; allowMp3?: boolean;
  allowVideoLink?: boolean; maxImages?: number; deadline?: string | null;
}) {
  const { user, isAuthenticated } = useAuth();
  const [cls, setCls] = useState<{ id: string; name: string } | null>(null);
  const [record, setRecord] = useState<{ id: string; status: string } | null>(null);
  const [attached, setAttached] = useState<AttachedFile[]>([]);
  const [selected, setSelected] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [video, setVideo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const expired = !!deadline && new Date(deadline).getTime() < Date.now();

  async function loadFiles(id: string) {
    const { data, error: e } = await supabase.from('movement_submission_files').select('id,storage_path,original_name,size_bytes,file_type').eq('submission_id', id).order('created_at');
    if (e) throw e;
    setAttached(data || []);
  }
  useEffect(() => {
    let active = true;
    setCls(null); setRecord(null); setAttached([]); setSelected([]); setNotes(''); setVideo(''); setError(''); setInfo('');
    async function load() {
      if (!user || !enabled) return;
      try {
        const c = await chiDoiCongressService.getHomeroomClass(user.id, academicYear);
        if (!active) return;
        setCls(c);
        if (!c) return;
        const { data, error: e } = await supabase.from('movement_class_submissions').select('id,status,notes,video_url').eq('event_id', eventId).eq('class_id', c.id).maybeSingle();
        if (e) throw e;
        if (data && active) {
          setRecord({ id: data.id, status: data.status }); setNotes(data.notes || ''); setVideo(data.video_url || '');
          await loadFiles(data.id);
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Không tải được bài nộp'); }
    }
    void load(); return () => { active = false; };
  }, [user?.id, eventId, academicYear, enabled]);

  function chooseFiles(list: FileList | null) {
    if (!list) return;
    const next = [...selected, ...Array.from(list)];
    const countImages = next.filter(f => f.type.startsWith('image/')).length + attached.filter(f => f.file_type === 'image').length;
    if (countImages > maxImages) { setError(`Chỉ được tối đa ${maxImages} ảnh.`); return; }
    for (const f of next) {
      if (f.size > 20 * 1024 * 1024 || f.size === 0) { setError(`Tệp ${f.name} phải lớn hơn 0 và không quá 20 MB.`); return; }
      if (f.type.startsWith('image/') ? !allowImages || !['image/jpeg','image/png','image/webp'].includes(f.type) : !allowMp3 || !['audio/mpeg'].includes(f.type)) {
        setError(`Định dạng ${f.name} không được cho phép.`); return;
      }
    }
    setSelected(next); setError(''); setInfo('');
  }
  const hasProduct = selected.length > 0 || attached.length > 0 || (!!allowVideoLink && !!video.trim());

  async function submit() {
    if (!user || !cls || busy || expired) return;
    if (!hasProduct) { setError('Bạn phải chọn ít nhất một tệp ảnh/MP3 hoặc nhập liên kết video trước khi nộp.'); return; }
    if (video.trim() && (!allowVideoLink || !/^https:\/\/[^\s]+$/i.test(video.trim()) || video.length > 1500)) { setError('Liên kết video phải là HTTPS hợp lệ.'); return; }
    setBusy(true); setError(''); setInfo('');
    const uploaded: string[] = [];
    try {
      const filePayload: { path: string; name: string; kind: string; bytes: number }[] = [];
      for (const f of selected) {
        const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : f.type === 'image/jpeg' ? 'jpg' : 'mp3';
        const path = `submissions/${user.id}/${eventId}/${cls.id}/${crypto.randomUUID()}.${ext}`;
        const { error: up } = await supabase.storage.from('movement-submissions').upload(path, f, { upsert: false, contentType: f.type });
        if (up) throw new Error(`Không tải được ${f.name}: ${up.message}`);
        uploaded.push(path);
        filePayload.push({ path, name: f.name, kind: f.type.startsWith('image/') ? 'image' : 'audio', bytes: f.size });
      }
      const { data, error: e } = await supabase.rpc('movement_submit_product', {
        p_event_id: eventId, p_class_id: cls.id, p_notes: notes.trim() || null,
        p_video_url: allowVideoLink && video.trim() ? video.trim() : null, p_files: filePayload,
      });
      if (e) throw e;
      setRecord({ id: String(data), status: 'submitted' });
      setSelected([]);
      await loadFiles(String(data));
      setInfo('Đã nộp sản phẩm thành công. Các tệp đã được ghi nhận.');
    } catch (e) {
      // Never create a submitted record if upload or validation failed.
      // Remove staged files, without deleting any previously submitted file.
      if (uploaded.length) await supabase.storage.from('movement-submissions').remove(uploaded);
      setError(e instanceof Error ? e.message : 'Không thể nộp sản phẩm');
    } finally { setBusy(false); }
  }
  async function view(path: string) {
    const { data, error: e } = await supabase.storage.from('movement-submissions').createSignedUrl(path, 60);
    if (e) { setError(e.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }
  if (!enabled || !isAuthenticated || !cls) return null;
  return <div className="mt-4 rounded-xl border border-blue-200 dark:border-slate-700 bg-blue-50/60 dark:bg-slate-900 p-4 space-y-3 text-sm">
    <div className="flex items-center justify-between gap-2"><b>Bài nộp của lớp {cls.name}</b><span className="text-xs text-slate-600">{record?.status === 'submitted' ? 'Đã nộp' : record?.status === 'needs_revision' ? 'Cần bổ sung' : 'Chưa nộp'}</span></div>
    {deadline && <p className="text-xs text-slate-600">Hạn nộp: {new Date(deadline).toLocaleString('vi-VN')}</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}{info && <p role="status" className="text-emerald-700">{info}</p>}
    <textarea disabled={expired || busy} className="w-full border rounded-lg p-2 bg-white dark:bg-slate-800" rows={2} placeholder="Ghi chú sản phẩm (không bắt buộc)" value={notes} onChange={e => setNotes(e.target.value)} />
    {allowVideoLink && <input disabled={expired || busy} className="w-full border rounded-lg p-2 bg-white dark:bg-slate-800" placeholder="Link video HTTPS (nếu có)" value={video} onChange={e => setVideo(e.target.value)} />}
    {!expired && (allowImages || allowMp3) && <label className="inline-flex px-3 py-2 bg-white rounded-lg border cursor-pointer text-blue-700 font-semibold">Chọn ảnh / MP3<input type="file" multiple className="hidden" accept={[allowImages ? 'image/jpeg,image/png,image/webp' : '', allowMp3 ? 'audio/mpeg' : ''].filter(Boolean).join(',')} disabled={busy} onChange={e => { chooseFiles(e.target.files); e.target.value = ''; }} /></label>}
    {selected.length > 0 && <div className="space-y-2"><b>Tệp chuẩn bị nộp ({selected.length})</b>{selected.map((f, i) => <div key={`${f.name}-${i}`} className="flex justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-lg"><span className="truncate">{f.name} ({Math.round(f.size / 1024)} KB)</span><button disabled={busy} onClick={() => setSelected(v => v.filter((_, j) => i !== j))} className="text-red-600">Bỏ</button></div>)}</div>}
    {attached.length > 0 && <div className="space-y-2"><b>Tệp đã nộp ({attached.length})</b>{attached.map(f => <div key={f.id} className="flex justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-lg"><span className="truncate">{f.original_name}</span><button className="text-blue-600" onClick={() => void view(f.storage_path)}>Xem</button></div>)}</div>}
    {record?.status === 'submitted' && attached.length === 0 && !video && <p className="text-amber-700">Bài cũ chưa có sản phẩm. Hãy bổ sung tệp trước khi nộp lại.</p>}
    {!expired && <button disabled={busy || !hasProduct} onClick={() => void submit()} className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold disabled:opacity-50">{busy ? 'Đang tải và nộp…' : 'Nộp sản phẩm'}</button>}
    <p className="text-xs text-slate-500">Không lưu nháp. Chỉ ghi nhận bài nộp khi có tệp hoặc liên kết video hợp lệ.</p>
  </div>;
}
