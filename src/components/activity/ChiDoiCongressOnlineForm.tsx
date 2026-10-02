import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, FileText, Loader2, Save, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MovementCampaign } from '../../types/movement';
import { ChiDoiCongressSubmission, HomeroomClassInfo } from '../../types/chiDoiCongress';
import { chiDoiCongressService } from '../../services/chiDoiCongressService';

const emptyForm = (campaignId: string, classId: string, teacherId: string): ChiDoiCongressSubmission => ({
  campaign_id: campaignId, class_id: classId, teacher_id: teacherId,
  meeting_date: null, location: null, total_members: null, attendees: null,
  chairperson: null, secretary: null, agenda: null, election_result: null,
  executive_committee: null, notes: null, image_urls: [], status: 'draft'
});

export default function ChiDoiCongressOnlineForm({ campaign }: { campaign: MovementCampaign }) {
  const { user, profile, isAuthenticated } = useAuth();
  const [classInfo, setClassInfo] = useState<HomeroomClassInfo | null>(null);
  const [form, setForm] = useState<ChiDoiCongressSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true); setError(null);
        const cls = await chiDoiCongressService.getHomeroomClass(user.id, campaign.academic_year);
        setClassInfo(cls);
        if (!cls) return;
        const existing = await chiDoiCongressService.getSubmission(campaign.id, cls.id);
        setForm(existing || emptyForm(campaign.id, cls.id, user.id));
      } catch (e: any) { setError(e.message || 'Không thể tải biên bản.'); }
      finally { setLoading(false); }
    };
    load();
  }, [user?.id, campaign.id, campaign.academic_year]);

  const set = (key: keyof ChiDoiCongressSubmission, value: any) => setForm(prev => prev ? ({ ...prev, [key]: value }) : prev);

  const save = async (submit: boolean) => {
    if (!form) return;
    if (submit && (!form.meeting_date || !form.location || !form.chairperson || !form.secretary || !form.agenda)) {
      setError('Vui lòng điền các mục bắt buộc trước khi nộp biên bản.'); return;
    }
    try {
      setSaving(true); setError(null); setMessage(null);
      const saved = await chiDoiCongressService.saveSubmission({
        ...form,
        status: submit ? 'submitted' : 'draft',
        submitted_at: submit ? new Date().toISOString() : form.submitted_at || null
      });
      setForm(saved);
      setMessage(submit ? 'Đã nộp biên bản Đại hội Chi đội.' : 'Đã lưu bản nháp.');
    } catch (e: any) { setError(e.message || 'Không thể lưu biên bản.'); }
    finally { setSaving(false); }
  };

  const addImages = async (files: FileList | null) => {
    if (!files || !form || !user) return;
    const picked = Array.from(files);
    if (form.image_urls.length + picked.length > 3) { setError('Chỉ được đính kèm tối đa 3 hình ảnh.'); return; }
    try {
      setUploading(true); setError(null);
      const urls: string[] = [];
      for (const file of picked) urls.push(await chiDoiCongressService.uploadImage(file, user.id));
      set('image_urls', [...form.image_urls, ...urls]);
    } catch (e: any) { setError(e.message || 'Không thể tải hình ảnh.'); }
    finally { setUploading(false); }
  };

  if (!isAuthenticated) return (
    <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-900">
      <b>Biên bản Đại hội Chi đội trực tuyến:</b> GVCN vui lòng đăng nhập tài khoản giáo viên để thực hiện và nộp biên bản.
    </section>
  );
  if (loading) return <div className="p-6 text-sm text-slate-500 flex gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Đang tải biên bản...</div>;
  if (!classInfo || !form) return (
    <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-900">
      Tài khoản này chưa được phân công GVCN trong năm học {campaign.academic_year}, nên chưa thể gửi biên bản.
    </section>
  );

  const input = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm';
  const label = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5';
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-7 border border-red-200 dark:border-red-900 shadow-sm space-y-6">
      <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
        <FileText className="w-6 h-6 text-red-600 shrink-0"/>
        <div><h2 className="text-lg font-black text-slate-900 dark:text-white">Biên bản Đại hội Chi đội trực tuyến</h2>
          <p className="text-xs text-slate-500 mt-1">GVCN: <b>{profile?.full_name || 'Giáo viên'}</b> · Chi đội/lớp: <b>{classInfo.name}</b> · Năm học {campaign.academic_year}</p></div>
      </div>
      {form.status === 'submitted' && <div className="flex gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm"><CheckCircle2 className="w-5 h-5"/>Biên bản đã được nộp. GVCN vẫn có thể cập nhật và nộp lại khi cần.</div>}
      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{message}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className={label}>Thời gian đại hội *</label><input type="datetime-local" className={input} value={form.meeting_date ? form.meeting_date.slice(0,16) : ''} onChange={e=>set('meeting_date', e.target.value ? new Date(e.target.value).toISOString() : null)}/></div>
        <div><label className={label}>Địa điểm *</label><input className={input} value={form.location || ''} onChange={e=>set('location',e.target.value)} placeholder="Ví dụ: Phòng học lớp 6/1"/></div>
        <div><label className={label}>Tổng số đội viên</label><input type="number" min="0" className={input} value={form.total_members ?? ''} onChange={e=>set('total_members',e.target.value===''?null:Number(e.target.value))}/></div>
        <div><label className={label}>Số đội viên tham dự</label><input type="number" min="0" className={input} value={form.attendees ?? ''} onChange={e=>set('attendees',e.target.value===''?null:Number(e.target.value))}/></div>
        <div><label className={label}>Chủ tọa *</label><input className={input} value={form.chairperson || ''} onChange={e=>set('chairperson',e.target.value)}/></div>
        <div><label className={label}>Thư ký *</label><input className={input} value={form.secretary || ''} onChange={e=>set('secretary',e.target.value)}/></div>
      </div>
      <div><label className={label}>Nội dung / diễn biến Đại hội *</label><textarea rows={5} className={input} value={form.agenda || ''} onChange={e=>set('agenda',e.target.value)} placeholder="Ghi các nội dung chính đã thực hiện tại Đại hội..."/></div>
      <div><label className={label}>Kết quả biểu quyết / bầu cử</label><textarea rows={3} className={input} value={form.election_result || ''} onChange={e=>set('election_result',e.target.value)}/></div>
      <div><label className={label}>Ban Chỉ huy Chi đội được bầu</label><textarea rows={4} className={input} value={form.executive_committee || ''} onChange={e=>set('executive_committee',e.target.value)} placeholder="Ghi họ tên, chức vụ từng em..."/></div>
      <div><label className={label}>Ghi chú</label><textarea rows={2} className={input} value={form.notes || ''} onChange={e=>set('notes',e.target.value)}/></div>

      <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-5">
        <div><h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2"><Camera className="w-4 h-4 text-red-600"/>Hình ảnh minh chứng ({form.image_urls.length}/3)</h3><p className="text-xs text-slate-500 mt-1">Đính kèm tối đa 3 ảnh JPG/PNG/WEBP, mỗi ảnh tối đa 8MB.</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{form.image_urls.map((url,i)=><div key={url} className="relative aspect-video rounded-xl overflow-hidden border"><img src={url} className="w-full h-full object-cover"/><button type="button" onClick={()=>set('image_urls',form.image_urls.filter((_,x)=>x!==i))} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-red-600"><Trash2 className="w-4 h-4"/></button></div>)}</div>
        {form.image_urls.length < 3 && <label className="inline-flex cursor-pointer items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-red-300 text-red-700 text-sm font-bold hover:bg-red-50"><Camera className="w-4 h-4"/>{uploading?'Đang tải ảnh...':'Thêm hình ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={uploading} onChange={e=>addImages(e.target.files)}/></label>}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-end border-t border-slate-100 dark:border-slate-700 pt-5">
        <button disabled={saving||uploading} onClick={()=>save(false)} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2"><Save className="w-4 h-4"/>Lưu nháp</button>
        <button disabled={saving||uploading} onClick={()=>save(true)} className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}Nộp biên bản</button>
      </div>
    </section>
  );
}
