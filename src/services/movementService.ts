/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import { MovementCampaign, MovementEvent, MovementEvidence } from '../types/movement';
import { generateSlug } from '../utils/slug';

function isValidUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return false;
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
}

export const movementService = {
  /**
   * Get all published campaigns for public view (excludes drafts)
   * Single relational query avoiding N+1 loops
   */
  async getPublishedCampaigns(): Promise<MovementCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('movement_campaigns')
        .select('*, events:movement_events(*), evidence:movement_evidence(*)')
        .eq('is_published', true)
        .neq('status', 'draft')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in getPublishedCampaigns:', error);
        throw new Error('Không thể tải dữ liệu hoạt động phong trào.');
      }

      const campaigns = (data || []).map((c: any) => ({
        ...c,
        events: (c.events || []).sort((a: MovementEvent, b: MovementEvent) => a.display_order - b.display_order),
        evidence: (c.evidence || []).sort((a: MovementEvidence, b: MovementEvidence) => a.display_order - b.display_order)
      }));

      return campaigns as MovementCampaign[];
    } catch (err: any) {
      console.error('getPublishedCampaigns failed:', err);
      throw new Error(err.message || 'Không thể tải dữ liệu hoạt động phong trào.');
    }
  },

  /**
   * Get a single published campaign by slug
   */
  async getPublishedCampaignBySlug(slug: string): Promise<MovementCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('movement_campaigns')
        .select('*, events:movement_events(*), evidence:movement_evidence(*)')
        .eq('slug', slug)
        .eq('is_published', true)
        .neq('status', 'draft')
        .maybeSingle();

      if (error) {
        console.error('Error in getPublishedCampaignBySlug:', error);
        throw new Error('Không thể tải thông tin phong trào.');
      }

      if (!data) return null;

      return {
        ...data,
        events: (data.events || []).sort((a: MovementEvent, b: MovementEvent) => a.display_order - b.display_order),
        evidence: (data.evidence || []).sort((a: MovementEvidence, b: MovementEvidence) => a.display_order - b.display_order)
      } as MovementCampaign;
    } catch (err: any) {
      console.error('getPublishedCampaignBySlug failed:', err);
      throw new Error(err.message || 'Không thể tải thông tin phong trào.');
    }
  },

  /**
   * Admin: Get all campaigns (including drafts, archived, and unpublished)
   */
  async getAdminCampaigns(): Promise<MovementCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('movement_campaigns')
        .select('*, events:movement_events(*), evidence:movement_evidence(*)')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in getAdminCampaigns:', error);
        throw new Error('Không thể tải danh sách quản trị phong trào.');
      }

      const campaigns = (data || []).map((c: any) => ({
        ...c,
        events: (c.events || []).sort((a: MovementEvent, b: MovementEvent) => a.display_order - b.display_order),
        evidence: (c.evidence || []).sort((a: MovementEvidence, b: MovementEvidence) => a.display_order - b.display_order)
      }));

      return campaigns as MovementCampaign[];
    } catch (err: any) {
      console.error('getAdminCampaigns failed:', err);
      throw new Error(err.message || 'Không thể tải danh sách quản trị phong trào.');
    }
  },

  /**
   * Admin: Get a single campaign by ID
   */
  async getAdminCampaignById(id: string): Promise<MovementCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('movement_campaigns')
        .select('*, events:movement_events(*), evidence:movement_evidence(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error in getAdminCampaignById:', error);
        throw new Error('Không thể tải chi tiết phong trào.');
      }

      if (!data) return null;

      return {
        ...data,
        events: (data.events || []).sort((a: MovementEvent, b: MovementEvent) => a.display_order - b.display_order),
        evidence: (data.evidence || []).sort((a: MovementEvidence, b: MovementEvidence) => a.display_order - b.display_order)
      } as MovementCampaign;
    } catch (err: any) {
      console.error('getAdminCampaignById failed:', err);
      throw new Error(err.message || 'Không thể tải chi tiết phong trào.');
    }
  },

  /**
   * Create a new campaign (defaults to draft / is_published = false)
   */
  async createCampaign(data: Partial<MovementCampaign>): Promise<MovementCampaign> {
    const title = data.title?.trim();
    if (!title) {
      throw new Error('Tên phong trào không được để trống.');
    }

    const slug = data.slug?.trim() || generateSlug(title);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error('Đường dẫn (slug) không hợp lệ. Chỉ chấp nhận chữ cái thường, số và dấu gạch ngang.');
    }

    if (data.start_date && data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
      throw new Error('Ngày kết thúc phải diễn ra sau hoặc bằng ngày bắt đầu.');
    }

    const payload = {
      title,
      slug,
      summary: data.summary?.trim() || null,
      content: data.content?.trim() || null,
      cover_image_url: data.cover_image_url?.trim() || null,
      national_anthem_video_url: data.national_anthem_video_url?.trim() || null,
      team_song_video_url: data.team_song_video_url?.trim() || null,
      ceremony_salute_command: data.ceremony_salute_command?.trim() || null,
      ceremony_salute_audio_url: data.ceremony_salute_audio_url?.trim() || null,
      ceremony_readiness_motto: data.ceremony_readiness_motto?.trim() || null,
      ceremony_readiness_audio_url: data.ceremony_readiness_audio_url?.trim() || null,
      campaign_type: data.campaign_type || 'theo_dot',
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      status: data.status || 'draft',
      is_featured: data.is_featured ?? false,
      is_published: data.is_published ?? false,
      display_order: Number(data.display_order) >= 0 ? Number(data.display_order) : 0,
      academic_year: data.academic_year?.trim() || '2025-2026',
    };

    const { data: created, error } = await supabase
      .from('movement_campaigns')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error in createCampaign:', error);
      throw new Error(`Thêm phong trào thất bại: ${error.message}`);
    }

    return {
      ...(created as MovementCampaign),
      events: [],
      evidence: []
    };
  },

  /**
   * Update an existing campaign
   */
  async updateCampaign(id: string, data: Partial<MovementCampaign>): Promise<MovementCampaign> {
    const payload: any = {};

    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new Error('Tên phong trào không được để trống.');
      payload.title = title;
    }

    if (data.slug !== undefined) {
      const slug = data.slug.trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error('Đường dẫn (slug) không hợp lệ. Chỉ chấp nhận chữ cái thường, số và dấu gạch ngang.');
      }
      payload.slug = slug;
    }

    if (data.summary !== undefined) payload.summary = data.summary?.trim() || null;
    if (data.content !== undefined) payload.content = data.content?.trim() || null;
    if (data.cover_image_url !== undefined) payload.cover_image_url = data.cover_image_url?.trim() || null;
    if (data.national_anthem_video_url !== undefined) payload.national_anthem_video_url = data.national_anthem_video_url?.trim() || null;
    if (data.team_song_video_url !== undefined) payload.team_song_video_url = data.team_song_video_url?.trim() || null;
    if (data.ceremony_salute_command !== undefined) payload.ceremony_salute_command = data.ceremony_salute_command?.trim() || null;
    if (data.ceremony_salute_audio_url !== undefined) payload.ceremony_salute_audio_url = data.ceremony_salute_audio_url?.trim() || null;
    if (data.ceremony_readiness_motto !== undefined) payload.ceremony_readiness_motto = data.ceremony_readiness_motto?.trim() || null;
    if (data.ceremony_readiness_audio_url !== undefined) payload.ceremony_readiness_audio_url = data.ceremony_readiness_audio_url?.trim() || null;
    if (data.campaign_type !== undefined) payload.campaign_type = data.campaign_type;
    if (data.start_date !== undefined) payload.start_date = data.start_date || null;
    if (data.end_date !== undefined) payload.end_date = data.end_date || null;
    if (data.status !== undefined) payload.status = data.status;
    if (data.is_featured !== undefined) payload.is_featured = data.is_featured;
    if (data.is_published !== undefined) payload.is_published = data.is_published;
    if (data.display_order !== undefined) payload.display_order = Number(data.display_order) >= 0 ? Number(data.display_order) : 0;
    if (data.academic_year !== undefined) payload.academic_year = data.academic_year.trim() || '2025-2026';

    const { data: updated, error } = await supabase
      .from('movement_campaigns')
      .update(payload)
      .eq('id', id)
      .select('*, events:movement_events(*), evidence:movement_evidence(*)')
      .single();

    if (error) {
      console.error('Error in updateCampaign:', error);
      throw new Error(`Cập nhật phong trào thất bại: ${error.message}`);
    }

    return {
      ...(updated as MovementCampaign),
      events: (updated.events || []).sort((a: MovementEvent, b: MovementEvent) => a.display_order - b.display_order),
      evidence: (updated.evidence || []).sort((a: MovementEvidence, b: MovementEvidence) => a.display_order - b.display_order)
    };
  },

  /**
   * Archive a campaign (soft delete)
   */
  async archiveCampaign(id: string): Promise<void> {
    const { error } = await supabase
      .from('movement_campaigns')
      .update({ status: 'archived', is_published: false })
      .eq('id', id);

    if (error) {
      console.error('Error in archiveCampaign:', error);
      throw new Error(`Lưu trữ phong trào thất bại: ${error.message}`);
    }
  },

  /**
   * Permanently delete a campaign (and its child events/evidence via CASCADE)
   */
  async deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase
      .from('movement_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error in deleteCampaign:', error);
      throw new Error(`Xóa phong trào thất bại: ${error.message}`);
    }
  },

  /**
   * Get events for a campaign
   */
  async getCampaignEvents(campaignId: string): Promise<MovementEvent[]> {
    const { data, error } = await supabase
      .from('movement_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error in getCampaignEvents:', error);
      throw new Error(`Tải hoạt động con thất bại: ${error.message}`);
    }

    return (data || []) as MovementEvent[];
  },

  /**
   * Create a child event
   */
  async createCampaignEvent(data: Partial<MovementEvent>): Promise<MovementEvent> {
    if (!data.campaign_id) throw new Error('campaign_id là bắt buộc.');
    const title = data.title?.trim();
    if (!title) throw new Error('Tên hoạt động con không được để trống.');

    const payload = {
      campaign_id: data.campaign_id,
      title,
      description: data.description?.trim() || null,
      event_date: data.event_date || null,
      location: data.location?.trim() || null,
      status: data.status || 'sap_dien_ra',
      cover_image_url: data.cover_image_url?.trim() || null,
      national_anthem_video_url: data.national_anthem_video_url?.trim() || null,
      team_song_video_url: data.team_song_video_url?.trim() || null,
      summary_result: data.summary_result?.trim() || null,
      display_order: Number(data.display_order) >= 0 ? Number(data.display_order) : 0,
    };

    const { data: created, error } = await supabase
      .from('movement_events')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error in createCampaignEvent:', error);
      throw new Error(`Thêm hoạt động con thất bại: ${error.message}`);
    }

    return created as MovementEvent;
  },

  /**
   * Update a child event
   */
  async updateCampaignEvent(id: string, data: Partial<MovementEvent>): Promise<MovementEvent> {
    const payload: any = {};
    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new Error('Tên hoạt động con không được để trống.');
      payload.title = title;
    }
    if (data.description !== undefined) payload.description = data.description?.trim() || null;
    if (data.event_date !== undefined) payload.event_date = data.event_date || null;
    if (data.location !== undefined) payload.location = data.location?.trim() || null;
    if (data.status !== undefined) payload.status = data.status;
    if (data.cover_image_url !== undefined) payload.cover_image_url = data.cover_image_url?.trim() || null;
    if (data.national_anthem_video_url !== undefined) payload.national_anthem_video_url = data.national_anthem_video_url?.trim() || null;
    if (data.team_song_video_url !== undefined) payload.team_song_video_url = data.team_song_video_url?.trim() || null;
    if (data.summary_result !== undefined) payload.summary_result = data.summary_result?.trim() || null;
    if (data.display_order !== undefined) payload.display_order = Number(data.display_order) >= 0 ? Number(data.display_order) : 0;

    const { data: updated, error } = await supabase
      .from('movement_events')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error in updateCampaignEvent:', error);
      throw new Error(`Cập nhật hoạt động con thất bại: ${error.message}`);
    }

    return updated as MovementEvent;
  },

  /**
   * Delete a child event
   */
  async deleteCampaignEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('movement_events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error in deleteCampaignEvent:', error);
      throw new Error(`Xóa hoạt động con thất bại: ${error.message}`);
    }
  },

  /**
   * Get evidence for a campaign
   */
  async getCampaignEvidence(campaignId: string): Promise<MovementEvidence[]> {
    const { data, error } = await supabase
      .from('movement_evidence')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error in getCampaignEvidence:', error);
      throw new Error(`Tải minh chứng thất bại: ${error.message}`);
    }

    return (data || []) as MovementEvidence[];
  },

  /**
   * Add evidence to a campaign
   */
  async addCampaignEvidence(data: Partial<MovementEvidence>): Promise<MovementEvidence> {
    if (!data.campaign_id) throw new Error('campaign_id là bắt buộc.');
    const title = data.title?.trim();
    if (!title) throw new Error('Tên minh chứng không được để trống.');

    const url = data.url?.trim();
    if (!url) throw new Error('Liên kết minh chứng không được để trống.');

    if (!isValidUrl(url)) {
      throw new Error('Liên kết minh chứng không an toàn hoặc sai định dạng (phải bắt đầu bằng http://, https:// hoặc /).');
    }

    const payload = {
      campaign_id: data.campaign_id,
      event_id: data.event_id || null,
      title,
      evidence_type: data.evidence_type || 'image',
      url,
      notes: data.notes?.trim() || null,
      display_order: Number(data.display_order) >= 0 ? Number(data.display_order) : 0,
    };

    const { data: created, error } = await supabase
      .from('movement_evidence')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error in addCampaignEvidence:', error);
      throw new Error(`Thêm minh chứng thất bại: ${error.message}`);
    }

    return created as MovementEvidence;
  },

  /**
   * Delete evidence
   */
  async deleteCampaignEvidence(id: string): Promise<void> {
    const { error } = await supabase
      .from('movement_evidence')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error in deleteCampaignEvidence:', error);
      throw new Error(`Xóa minh chứng thất bại: ${error.message}`);
    }
  }
};
