import { supabase } from '../lib/supabase/client';
import { ChiDoiCongressSubmission, HomeroomClassInfo } from '../types/chiDoiCongress';

const BUCKET = 'school-media';

function safeFileName(name: string) {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'anh';
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

export const chiDoiCongressService = {
  async getHomeroomClass(teacherId: string, academicYear: string): Promise<HomeroomClassInfo | null> {
    const { data: year, error: yearError } = await supabase
      .from('academic_years').select('id').eq('name', academicYear).maybeSingle();
    if (yearError) throw yearError;
    if (!year) return null;

    const { data, error } = await supabase
      .from('homeroom_assignments')
      .select('class_id, classes:class_id(id,name,grade_level)')
      .eq('teacher_id', teacherId)
      .eq('academic_year_id', year.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data?.classes as any) || null;
  },

  async getSubmission(campaignId: string, classId: string): Promise<ChiDoiCongressSubmission | null> {
    const { data, error } = await supabase
      .from('chi_doi_congress_submissions')
      .select('*').eq('campaign_id', campaignId).eq('class_id', classId).maybeSingle();
    if (error) throw error;
    return data as ChiDoiCongressSubmission | null;
  },

  async saveSubmission(payload: ChiDoiCongressSubmission): Promise<ChiDoiCongressSubmission> {
    const { data, error } = await supabase
      .from('chi_doi_congress_submissions')
      .upsert(payload, { onConflict: 'campaign_id,class_id' })
      .select('*').single();
    if (error) throw error;
    return data as ChiDoiCongressSubmission;
  },

  async uploadImage(file: File, userId: string): Promise<string> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.');
    }
    if (file.size > 8 * 1024 * 1024) throw new Error('Mỗi ảnh tối đa 8MB.');
    const path = `dai-hoi-chi-doi/${userId}/${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Không lấy được đường dẫn ảnh.');
    return data.publicUrl;
  }
};
