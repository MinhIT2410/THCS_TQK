# Cập nhật menu: Tin tức → Mở rộng

## Thay đổi
- Đổi nhãn menu Tin tức thành **Mở rộng**.
- Chuyển mục này xuống sau **Thi đua**.
- Giữ nguyên `id: news` và `path: ROUTES.NEWS` để không ảnh hưởng trang Tin tức, các đường dẫn và dữ liệu cũ.
- `NAV_MENU` dùng chung cho header/footer, nên nhãn ở footer cũng đổi theo.

## Cách áp dụng
Giải nén và chép đè đúng đường dẫn `src/config/menu.ts` vào project mới nhất, không xóa file khác. Kiểm tra `git diff`, chạy `npm run build`, sau đó commit và push.

## Ghi chú
Bản vá chỉ thay đổi menu; không bao gồm bản vá trang chủ ẩn Tin tức và hiển thị 6 hoạt động. Giữ nguyên bản vá trang chủ đã triển khai. Không có SQL hoặc thao tác xóa dữ liệu.

Commit: `chore(nav): rename news to mo rong and move after competition`
