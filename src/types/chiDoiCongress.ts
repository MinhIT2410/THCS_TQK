export type ChiDoiCongressStatus = 'draft' | 'submitted';

export interface ChiDoiCongressSubmission {
  id?: string;
  campaign_id: string;
  class_id: string;
  teacher_id: string;
  meeting_date: string | null;
  location: string | null;
  total_members: number | null;
  attendees: number | null;
  chairperson: string | null;
  secretary: string | null;
  agenda: string | null;
  election_result: string | null;
  executive_committee: string | null;
  notes: string | null;
  image_urls: string[];
  status: ChiDoiCongressStatus;
  submitted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HomeroomClassInfo {
  id: string;
  name: string;
  grade_level?: number | null;
}
