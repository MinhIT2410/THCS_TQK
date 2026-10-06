# HOTFIX - Khôi phục quyền xem báo cáo GVCN sau patch cột điểm

## Nguyên nhân
Patch `competition_score_columns` trước đó có copy đè `src/services/competitionService.ts`
từ một bản source cũ.

Vì vậy nó vô tình làm mất:
- `getMyActiveHomeroomClassIds()` -> GVCN không còn được nhận diện lớp chủ nhiệm để hiện/xem báo cáo.
- phần tối ưu ảnh upload minh chứng > 3 MB.
- các RPC cấu hình auto-lock tuần đã thêm trước đó.

## Hotfix này
Khôi phục `competitionService.ts` từ bản cumulative mới hơn, đồng thời GIỮ phần mới của cột điểm:
- `incident_bonus_points`
- `incident_penalty_points`
trong public snapshot mapping.

## Chỉ 1 file
`src/services/competitionService.ts`

Không SQL migration.
Không Edge Function.

Sau deploy, đăng nhập lại tài khoản GVCN và tải lại `/thi-dua`.
Phần xem/xuất báo cáo lớp chủ nhiệm phải xuất hiện lại.
