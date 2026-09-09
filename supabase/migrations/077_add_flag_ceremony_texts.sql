-- Add two configurable ceremonial phrases for Sinh hoạt đầu tuần.
-- Run once in Supabase SQL Editor or through the normal migration flow.

alter table public.movement_campaigns
  add column if not exists ceremony_salute_command text default 'Chào cờ, chào!',
  add column if not exists ceremony_readiness_motto text default 'Vì Tổ quốc xã hội chủ nghĩa, vì lý tưởng của Bác Hồ vĩ đại. Sẵn sàng!';

comment on column public.movement_campaigns.ceremony_salute_command is
  'Khẩu lệnh hiển thị trước Quốc ca trong nghi lễ chào cờ.';
comment on column public.movement_campaigns.ceremony_readiness_motto is
  'Khẩu hiệu hiển thị sau Đội ca trong nghi lễ chào cờ.';
