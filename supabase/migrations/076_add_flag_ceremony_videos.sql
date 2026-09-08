-- 076_add_flag_ceremony_videos.sql
-- Video nghi lễ cho phong trào "Sinh hoạt đầu tuần".

alter table public.movement_campaigns
  add column if not exists national_anthem_video_url text,
  add column if not exists team_song_video_url text;

comment on column public.movement_campaigns.national_anthem_video_url is 'Public URL video Quốc ca dùng trong trang chào cờ đồng bộ';
comment on column public.movement_campaigns.team_song_video_url is 'Public URL video Đội ca dùng trong trang chào cờ đồng bộ';
