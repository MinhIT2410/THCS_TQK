# Sửa trang Hoạt động - chỉ hiển thị dữ liệu thực tế

## Thay đổi
- Xóa 8 hoạt động demo/clone 2024-2025 hard-code trong `MovementsPage.tsx`.
- Timeline chỉ dùng dữ liệu đã xuất bản từ Supabase.
- Không chèn dữ liệu mẫu để đủ 8 mốc.
- Nếu chưa có hoạt động thực tế: **Hoạt động đang cập nhật**.
- Nếu có ít hoạt động thực tế thì chỉ hiển thị đúng số hoạt động đó.

## File copy đè
`src/pages/MovementsPage.tsx`

## SQL
Không cần chạy SQL/migration.

## Commit gợi ý
`fix(activities): remove demo campaigns and show real data only`
