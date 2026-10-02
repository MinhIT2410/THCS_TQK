# Timeline Hoạt động - hiển thị đầy đủ thời gian

- Giữ bản sửa trước: chỉ dùng hoạt động thực tế, không chèn demo/clone.
- Bỏ dấu `...` ở ngày tháng.
- Khoảng thời gian hiển thị 2 dòng, ví dụ:
  `07/09/2026`
  `→ 30/09/2026`
- Hoạt động một ngày chỉ hiển thị một dòng.
- Giảm cỡ chữ ngày và tăng nhẹ chiều cao card.
- Áp dụng cả desktop và mobile.

File copy đè:
`src/pages/MovementsPage.tsx`

Không cần SQL/migration.

Commit:
`fix(activities): show full timeline date ranges`
