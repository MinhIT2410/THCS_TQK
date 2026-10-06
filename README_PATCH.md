# Patch: Tự động khóa tuần thi đua + giữ nén ảnh >3MB

Patch này là **cumulative**: đã giữ nguyên các thay đổi nén ảnh >3MB ở patch trước, đồng thời bổ sung tự động khóa tuần thi đua.

## Tính năng mới
- Thêm checkbox **Tự động khóa tuần thi đua** trong modal `Cài đặt tự động thi đua`.
- Chọn **Thứ** (Thứ Hai → Chủ Nhật) và **Giờ** tự động khóa.
- Chỉ khóa các tuần `OPEN` đã kết thúc tính đến lịch khóa.
- Dùng múi giờ `Asia/Ho_Chi_Minh`.
- Nếu cron trễ/offline, lần chạy sau vẫn bắt kịp slot gần nhất.
- Mỗi slot tuần chỉ chạy một lần. Nếu admin **Mở khóa** thủ công sau khi auto-lock đã chạy, tuần sẽ không bị khóa lại ngay; chỉ có thể bị auto-lock lại ở lịch tuần kế tiếp.
- Sau khi auto-lock, snapshot công khai được refresh ngay.
- Giữ nguyên nút khóa/mở khóa thủ công hiện có.

## Sửa kèm theo
Migration cũng tạo/đảm bảo cron `competition-auto-publish-minute` để cấu hình tự động công bố 06:00/12:00/18:00 thực sự được gọi, vì code hiện tại có function nhưng migration cũ chưa schedule cron này.

## Cách áp dụng
1. Copy đè toàn bộ file trong zip vào repo theo đúng đường dẫn.
2. **Quan trọng:** chạy file sau trong Supabase SQL Editor một lần:
   `supabase/migrations/086_auto_lock_competition_weeks.sql`
3. Commit/push GitHub để Vercel deploy frontend.
4. Vào `Quản trị → Thi đua → Tuần thi đua → Cài đặt tự động`.
5. Bật `Tự động khóa tuần thi đua`, chọn Thứ + Giờ, rồi `Lưu cấu hình`.

## Gợi ý cấu hình
Nếu tuần thi đua là Thứ Hai → Chủ Nhật, cấu hình an toàn:
- **Thứ Hai**
- **00:05** hoặc **00:15**

Khi đó hệ thống khóa tuần vừa kết thúc vào Chủ Nhật nhưng vẫn giữ tuần mới đang mở.

## File chính thay đổi
- `src/components/admin/competition/ProgramAndWeeksTab.tsx`
- `src/services/competitionService.ts`
- `src/types/competition.ts`
- `supabase/migrations/086_auto_lock_competition_weeks.sql`

Các file nén ảnh từ patch trước cũng được kèm lại để tránh ghi đè mất thay đổi cũ.
