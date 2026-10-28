# PATCH 105 – Tab Bảng điểm theo lớp + log nộp gần nhất

## Thay đổi (chỉ 3 file)
- `src/pages/admin/AdminIc3Page.tsx`: thêm tab thứ tư **Bảng điểm & nhật ký nộp** sau Thống kê; giữ các tab cũ.
- `src/components/admin/Ic3ClassGradebook.tsx`: file mới, lọc khối, lớp, chủ đề, tìm học sinh, bảng ngang một học sinh/dòng với từng Chủ đề–Test/cột, điểm tốt nhất, lần nộp gần nhất; xuất Excel hai sheet `BANG_DIEM` và `NOP_BAI_GAN_NHAT`.
- `supabase/migrations/105_ic3_class_gradebook.sql`: RPC chỉ dành cho quản trị; dựa trên danh sách học sinh có ghi danh năm học hiện hành và bảng điểm nội bộ của IC3.

## Cách cài
1. Yêu cầu đã chạy SQL 098–104 và đã có tab quản trị theo patch 104.
2. Chạy `105_ic3_class_gradebook.sql` trong Supabase SQL Editor.
3. Copy đúng hai file TSX theo đường dẫn. Kiểm tra DIFF với source đang dùng trước khi ghi đè `AdminIc3Page.tsx`, vì bản này dựa trên patch 104.
4. Chạy `npm run build` và kiểm thử vai trò quản trị, sau đó deploy.

## Quy tắc dữ liệu
- Mỗi ô là **điểm cao nhất trong các lần làm đã hoàn thành** của học sinh trong Test đó, trên thang 1000. Ô chưa làm hiển thị —.
- Cột Nộp gần nhất lấy timestamp hoàn thành lớn nhất trong các Test đang hiển thị.
- Log dưới bảng lấy **lần nộp gần nhất cho mỗi học sinh/Test**, tối đa 300 dòng gần nhất trong khối để tránh tải quá nặng. KHÔNG phải nhật ký toàn bộ mọi lần nộp.
- Lọc lớp theo lớp được ghi danh **năm học hiện hành**; không ghi danh thì không có trong bảng. Lớp lấy từ `student_enrollments` → `classes`, tên lớp phải bắt đầu `6/`, `6.`, `6-`, tương tự khối 7 và 8.
- Chỉ có điểm nội bộ được chấm tự động, không nhập điểm tự khai IIG.
- Chỉ có người giữ role SUPER_ADMIN, PRINCIPAL, VICE_PRINCIPAL mới gọi được RPC. Không có API public cho danh sách học sinh.
- Xuất Excel gồm sheet bảng điểm và sheet log nộp gần nhất, theo bộ lọc đang chọn.
- Nếu hơn 300 học sinh/bài, vẫn đưa đầy đủ học sinh và các ô điểm trong bảng, nhưng log gần nhất chỉ giữ 300 lượt theo khối.

## Checklist
- Chọn Khối 6, Lớp 6/1: hiển thị tất cả học sinh đang học lớp này, cả em chưa làm bài.
- Chọn Tất cả chủ đề: CĐ1-Test1, CĐ1-Test2, CĐ2-Test1,... là các cột khác nhau.
- Một học sinh làm hai lần 700 và 900: ô điểm là 900, log gần nhất có thể là 700 nếu lần nộp 700 đến sau.
- Xuất Excel đầy đủ hai sheet, tên và lớp đúng.
- Kiểm tra quyền truy cập bằng tài khoản không phải quản trị.

## Lưu ý kiểm thử
Chưa được test trực tiếp trên database thật; nếu thực tế classes.name không dùng ký hiệu khối đầu tên lớp, bộ lọc cần điều chỉnh theo schema trường trước khi chạy production. Không thay đổi dữ liệu hiện có, không sửa thi đua/IIG/chức năng ảnh.
