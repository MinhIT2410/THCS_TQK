-- Âm thanh cho khẩu lệnh mở đầu và khẩu hiệu kết thúc nghi lễ chào cờ.
alter table public.movement_campaigns
  add column if not exists ceremony_salute_audio_url text,
  add column if not exists ceremony_readiness_audio_url text;
