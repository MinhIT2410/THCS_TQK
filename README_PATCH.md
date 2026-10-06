# PATCH - Khóa cứng bộ lọc GVCN ở Ghi nhận & Thống kê

## Mục tiêu
Cho 2 tab:
- `GHI NHẬN TRONG TUẦN`
- `THỐNG KÊ LỖI VI PHẠM`

hoạt động giống tab `XUẤT BÁO CÁO LỚP` khi người dùng là GVCN.

## GVCN
- Khối tự chọn đúng khối của lớp chủ nhiệm và **disabled**.
- Lớp tự chọn đúng lớp chủ nhiệm và **disabled**.
- Không còn option `Tất cả khối` / `Tất cả lớp`.
- Backend query vẫn truyền đúng `allowedClassIds`, đồng thời UI cũng khóa cứng nên không gây hiểu nhầm.
- Có dòng `Chỉ xem dữ liệu lớp chủ nhiệm của bạn.`

## Thống kê
Bổ sung bộ lọc `4. Lớp`.
- Admin/người có quyền rộng: vẫn có thể chọn Tất cả lớp hoặc một lớp cụ thể.
- GVCN: khóa đúng lớp mình.

## Phạm vi patch
Chỉ 2 component UI/report:
- `src/components/competition/WeeklyIncidentsReportCard.tsx`
- `src/components/competition/ViolationStatisticsCard.tsx`

Không đụng:
- `competitionService.ts`
- DB / migration
- Edge Function
- phần PDF
- auto-lock
- nén ảnh
- các hotfix trước

=> Patch tối thiểu, tránh ghi đè tính năng đã làm.
