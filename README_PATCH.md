# PATCH - GVCN xem Báo cáo thi đua chỉ trong lớp chủ nhiệm

## Mục tiêu
- GVCN thấy thẻ **Báo cáo** ở trang Thi đua.
- Khi vào báo cáo, dữ liệu chỉ lấy các lớp đang được phân công GVCN cho chính tài khoản đó trong năm học hiện tại.
- GVCN xem được:
  - **Ghi nhận trong tuần**
  - **Thống kê lỗi vi phạm**
- GVCN **không thấy / không truy cập** tab **Lưu báo cáo & xuất file**, vì lịch sử snapshot có thể chứa dữ liệu toàn trường.
- Người có quyền báo cáo toàn trường (Admin/BGH/thi đua/giám thị/sao đỏ theo logic cũ) vẫn giữ nguyên quyền và giao diện.

## An toàn dữ liệu
- Scope được resolve từ `homeroom_assignments.teacher_id = auth user` + `is_active = true` + năm học hiện tại.
- Hai component báo cáo đã có sẵn `allowedClassIds`; patch chỉ nối đúng scope GVCN vào các component này.
- Nếu GVCN gõ trực tiếp URL `?tab=save-export`, hệ thống tự chuyển về tab **Thống kê lỗi vi phạm**.

## File thay đổi
- `src/services/competitionService.ts`
- `src/pages/CompetitionReportPage.tsx`
- `src/components/competition/CompetitionQuickActions.tsx`

## Triển khai
Copy đè đúng đường dẫn, commit/push để Vercel build. **Không cần SQL migration** và không cần deploy Edge Function.
