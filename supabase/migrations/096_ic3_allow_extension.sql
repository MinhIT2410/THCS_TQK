-- Cho phép lưu mã Chủ đề mở rộng.
-- Chạy sau migration 095, trước file PRIVATE_RUN_MANUALLY_IC3_38_CODES.sql.
ALTER TABLE public.ic3_test_access_codes
  DROP CONSTRAINT IF EXISTS ic3_test_access_codes_test_id_check;
ALTER TABLE public.ic3_test_access_codes
  ADD CONSTRAINT ic3_test_access_codes_test_id_check
  CHECK (test_id ~ '^IC3GS6L[123]-(CD[1-7]-T[1-9][0-9]*|EXT)$');
