ALTER TABLE school.site_settings
  ADD COLUMN IF NOT EXISTS footer_unit_name TEXT DEFAULT 'LIÊN ĐỘI THCS TRẦN QUANG KHẢI',
  ADD COLUMN IF NOT EXISTS footer_slogan TEXT DEFAULT 'Thiếu nhi Trần Quang Khải - Chăm ngoan, học tốt, tiếp bước cha anh.',
  ADD COLUMN IF NOT EXISTS phone_2 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS footer_nav_title TEXT DEFAULT 'Danh mục chính',
  ADD COLUMN IF NOT EXISTS footer_feedback_title TEXT DEFAULT 'Hộp thư "Điều em muốn nói"',
  ADD COLUMN IF NOT EXISTS footer_feedback_desc TEXT DEFAULT 'Nơi học sinh gửi gắm tâm tư, nguyện vọng, góp ý hoặc nhờ sự hỗ trợ từ Thầy Cô Tổng phụ trách và Ban Giám Hiệu.',
  ADD COLUMN IF NOT EXISTS footer_text TEXT DEFAULT '© 2026 Liên đội THCS Trần Quang Khải. Tất cả quyền được bảo lưu.';
