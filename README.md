# PATCH: 2 thẻ Ôn tập Tin học quốc tế

## Kết quả
- `/mo-rong/tin-hoc-quoc-te`: trang chọn hai thẻ lớn theo phong cách tác vụ nhanh của mục Thi đua.
- Thẻ **Ôn tập tại trường** mở `/mo-rong/tin-hoc-quoc-te/luyen-tap` (route và SchoolIc3Page đang có).
- Thẻ **Bài test trên IC3 Review** mở `/mo-rong/tin-hoc-quoc-te/ic3-review`.
- Giao diện cũ chọn khối/chọn bài IIG được chuyển nguyên chức năng sang `Ic3ReviewPage.tsx`, không thay đổi RPC, mã IC3, log hay nhập điểm.
- Trên trang IIG đã bỏ ô dẫn ngược sang ôn tập tại trường, vì giờ có trang hai thẻ riêng.

## File thay đổi (chỉ 4 file)
- `src/pages/InternationalITPage.tsx`: **thay nội dung** bằng trang chọn 2 thẻ.
- `src/pages/Ic3ReviewPage.tsx`: **file mới**, chứa chức năng IIG cũ.
- `src/config/routes.ts`: thêm `ROUTES.IC3_REVIEW`.
- `src/App.tsx`: đăng ký route mới và lazy import trang IIG.

## Cài đặt
1. Yêu cầu source của bạn đã có bản `098_ic3_school_quiz` cùng trang `SchoolIc3Page.tsx` và bản IC3 IIG/ghi log đang hoạt động.
2. Giải nén ZIP tại thư mục project, copy đúng 4 file giữ cấu trúc `src/...` và ghi đè file cũ.
3. Dùng GitHub Desktop kiểm tra DIFF, chỉ commit các file trên; không ghi đè các bản hotfix khác.
4. Chạy build/test của dự án trước khi push nếu môi trường đã cài dependency.

## Checklist kiểm thử
- Menu Mở rộng -> Học Tin học quốc tế mở 2 thẻ.
- Thẻ trường mở bài luyện tập như cũ.
- Thẻ IIG mở trang chọn khối/bài, xem mã, sao chép mã, ghi log và gửi điểm.
- Quay về trang hai thẻ; kiểm tra giao diện trên điện thoại và dark mode.
- Không có SQL migration mới; không sửa Supabase hoặc quản trị.
- Không xóa dữ liệu/tin tức, không thay đổi thi đua, GVCN, báo cáo.

## Lưu ý
Patch dựa trên file mới nhất có sẵn trong ZIP `TQK_PATCH_IC3_BO_KHUNG_LUYEN_TAP_098.zip`. Nếu bạn đã có hotfix riêng cho `InternationalITPage.tsx` hoặc `App.tsx` sau bản này, hãy đối chiếu và ghép thay đổi chứ không copy đè mù.
