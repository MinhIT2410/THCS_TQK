# Fix: Duyệt/Từ chối sự việc không reload bảng

## Hiện tượng
Ở màn hình **Chờ duyệt sự việc thi đua**, sau khi bấm **Duyệt** hoặc xác nhận **Từ chối**, giao diện bật trạng thái loading và tải lại toàn bộ danh sách. Điều này gây nháy trang/bảng, mất nhịp khi giám thị duyệt nhiều sự việc liên tiếp.

## Nguyên nhân
`PendingIncidentsTab.tsx` gọi `fetchPendingIncidents()` ngay sau RPC duyệt/từ chối. Hàm này thực hiện `setLoading(true)`, vì vậy toàn bộ vùng bảng bị thay bằng màn hình "Đang tải danh sách..." rồi render lại.

## Thay đổi
- Sau khi `approve_competition_incident` thành công: loại đúng incident vừa duyệt khỏi state `incidents` bằng `setIncidents(...filter...)`.
- Sau khi `reject_competition_incident` thành công: loại đúng incident vừa từ chối khỏi state tương tự.
- Không gọi lại `fetchPendingIncidents()` sau mỗi thao tác.
- Nút **Làm mới** vẫn giữ nguyên để người dùng chủ động đồng bộ lại toàn bộ danh sách khi cần.
- Không thay đổi RPC, database, cách tính điểm hay logic duyệt/từ chối.

## File thay đổi
`src/components/admin/competition/PendingIncidentsTab.tsx`

## Cách kiểm tra
1. Mở màn hình Chờ duyệt sự việc.
2. Bấm Duyệt một dòng.
3. Dòng vừa duyệt phải biến mất ngay, bảng không chuyển sang màn hình loading và trang không nháy.
4. Thử Từ chối một dòng: kết quả tương tự.
5. Bộ lọc/vị trí trang hiện tại không bị reset do thao tác duyệt.

## Commit gợi ý
`fix(competition): prevent list reload after incident approval`
