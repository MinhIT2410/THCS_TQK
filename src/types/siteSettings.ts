export interface SiteSettings {
  id: number;
  site_name: string | null;
  school_name: string | null;
  slogan: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  address: string | null;
  phone: string | null;
  phone_2?: string | null;
  email: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  zalo_url: string | null;
  map_url: string | null;
  footer_title: string | null;
  footer_description: string | null;
  footer_unit_name?: string | null;
  footer_slogan?: string | null;
  footer_nav_title?: string | null;
  footer_feedback_title?: string | null;
  footer_feedback_desc?: string | null;
  footer_text?: string | null;
  contact_intro: string | null;
  home_hero_slogan: string | null;
  home_hero_title: string | null;
  home_hero_subtitle: string | null;
  home_hero_description: string | null;
  home_hero_background_url: string | null;
  home_hero_button_text: string | null;
  home_hero_button_url: string | null;
  updated_by: string | null;
  created_at?: string;
  updated_at?: string;
  reception_hours?: string;
  faqs?: { id: string; question: string; answer: string }[];
}

export type SiteSettingsInput = Omit<SiteSettings, 'id' | 'created_at' | 'updated_at'>;
