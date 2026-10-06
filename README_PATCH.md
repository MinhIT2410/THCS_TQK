# PATCH - Lọc theo Lớp + GVCN tự xuất PDF lớp mình

## Mục tiêu
1. Thêm bộ lọc **Lớp** vào tab `LƯU BÁO CÁO & XUẤT FILE`.
2. Admin/Giám thị có thể chọn:
   - Tất cả khối
   - Một khối
   - Một lớp cụ thể
3. GVCN được mở tab **XUẤT BÁO CÁO LỚP** nhưng chỉ thấy lớp mình chủ nhiệm.
4. GVCN chỉ xuất PDF trực tiếp, **không lưu snapshot**, nên gần như không tăng dung lượng Supabase.

## Hành vi GVCN
- Phạm vi lấy từ `homeroom_assignments` hiện có.
- Khối/lớp bị giới hạn theo lớp chủ nhiệm.
- Không thể xem/xuất lớp khác bằng UI.
- Không hiện nút `Lưu báo cáo`.
- Không hiện lịch sử snapshot toàn trường.
- Có thể chọn Tuần / Tháng / Học kỳ / Năm học rồi xuất PDF lớp mình.

## Hành vi Admin/Giám thị
- Có thêm dropdown `4. Chọn Lớp`.
- `Tất cả lớp trong phạm vi` giữ hành vi cũ.
- Chọn 1 lớp -> preview/PDF chỉ có lớp đó.
- Nếu bấm `Lưu báo cáo`, snapshot sẽ lưu đúng phạm vi đang xem như trước.

## Dung lượng
GVCN export PDF là tạo file ở trình duyệt theo yêu cầu, không upload lại Supabase.
=> Không nhân 65 bản PDF mỗi tuần, không tăng storage đáng kể.

## File thay đổi
- `src/pages/CompetitionReportPage.tsx`
- `src/components/competition/SaveExportReportCard.tsx`

## Yêu cầu nền
Patch này dựa trên phần GVCN report scope đã làm trước đó (`getMyActiveHomeroomClassIds`) và giữ phần ghi chú lỗi/PDF hiện tại.

Không SQL migration. Không Edge Function.
