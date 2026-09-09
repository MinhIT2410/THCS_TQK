/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CampaignType = 'thuong_xuyen' | 'theo_dot' | 'cuoc_thi' | 'cao_diem' | 'ke_hoach_thang';

export type CampaignStatus = 'draft' | 'sap_dien_ra' | 'dang_dien_ra' | 'da_ket_thuc' | 'archived';

export type EventStatus = 'sap_dien_ra' | 'dang_dien_ra' | 'da_hoan_thanh' | 'huy';

export type EvidenceType = 'image' | 'news_link' | 'document_link' | 'album_link' | 'other_link';

export interface MovementCampaign {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  national_anthem_video_url?: string | null;
  team_song_video_url?: string | null;
  ceremony_salute_command?: string | null;
  ceremony_readiness_motto?: string | null;
  campaign_type: CampaignType;
  start_date?: string | null;
  end_date?: string | null;
  status: CampaignStatus;
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
  academic_year: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined relations
  events?: MovementEvent[];
  evidence?: MovementEvidence[];
}

export interface MovementEvent {
  id: string;
  campaign_id: string;
  title: string;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  status: EventStatus;
  cover_image_url?: string | null;
  national_anthem_video_url?: string | null;
  team_song_video_url?: string | null;
  summary_result?: string | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface MovementEvidence {
  id: string;
  campaign_id: string;
  event_id?: string | null;
  title: string;
  evidence_type: EvidenceType;
  url: string;
  notes?: string | null;
  display_order: number;
  created_at?: string;
}

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  thuong_xuyen: 'Thường xuyên',
  theo_dot: 'Theo đợt',
  cuoc_thi: 'Cuộc thi',
  cao_diem: 'Hoạt động cao điểm',
  ke_hoach_thang: 'Kế hoạch tháng',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Bản nháp',
  sap_dien_ra: 'Sắp diễn ra',
  dang_dien_ra: 'Đang diễn ra',
  da_ket_thuc: 'Đã kết thúc',
  archived: 'Lưu trữ',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  sap_dien_ra: 'Sắp diễn ra',
  dang_dien_ra: 'Đang diễn ra',
  da_hoan_thanh: 'Đã hoàn thành',
  huy: 'Đã hủy',
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  image: 'Hình ảnh',
  news_link: 'Bài viết tin tức',
  document_link: 'Văn bản kế hoạch',
  album_link: 'Album hình ảnh',
  other_link: 'Liên kết khác',
};
