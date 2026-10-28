# HOTFIX 107 — Nút sao chép mã IC3 Review có phản hồi

Chỉ sửa `src/pages/Ic3ReviewPage.tsx`.

- Bấm sao chép thành công: nút đổi xanh lá, hiện `✓ Đã sao chép`.
- Khi trình duyệt từ chối clipboard: hiện cảnh báo lỗi thay vì báo thành công sai.
- Chọn bài khác / khối khác / tải lại mã: nút trở về `Sao chép mã`.
- Không thay đổi mã IC3, RPC, mở IIG, hay lưu điểm.

Cài đặt: đối chiếu file với source đang deploy, copy đúng path, chạy npm run build và push.
Patch dựa trên phiên bản file từ Hotfix 106; nếu có sửa file này sau 106, chỉ ghép các dòng copyState/copyCode và nút vào code mới nhất.
Không cần SQL. Chưa build với code gốc đang deploy.
