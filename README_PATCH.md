# PATCH - Làm rõ cấu trúc điểm thi đua

## Cột mới
Thay các cột mơ hồ `Điểm cộng / Điểm trừ` bằng:

1. **KHỞI ĐIỂM**
2. **VI PHẠM**
3. **ĐIỂM THƯỞNG**
4. **ĐIỀU CHỈNH KHÁC**
5. **TỔNG**

## Công thức
`TỔNG = KHỞI ĐIỂM - VI PHẠM + ĐIỂM THƯỞNG + ĐIỀU CHỈNH KHÁC`

Trong đó:
- `VI PHẠM` = điểm trừ phát sinh từ các sự việc/rule đã duyệt (`incident_penalty_points`)
- `ĐIỂM THƯỞNG` = điểm cộng phát sinh từ sự việc khen thưởng (`incident_bonus_points`)
- `ĐIỀU CHỈNH KHÁC` = phần quản trị điều chỉnh tay:
  `manual_bonus_points - manual_penalty_points`

Ví dụ:
`100 - 0 + 6 + 0 = 106`

## Phạm vi sửa
- Bảng quản trị Tuần thi đua
- Bảng tổng hợp tuần
- Bảng xếp hạng công khai desktop
- Thẻ mobile công khai
- Sửa service public để đọc luôn `incident_bonus_points` và `incident_penalty_points` từ snapshot

## Không cần migration
Bảng `competition_public_unit_snapshots` hiện đã có sẵn:
- `incident_bonus_points`
- `incident_penalty_points`

nên không cần SQL/DB migration.
