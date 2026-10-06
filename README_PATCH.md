# Patch giao diện Cài đặt tự động thi đua

Chỉ thay đổi bố cục modal, không thay đổi logic DB/cron.

- Tăng chiều rộng modal từ `max-w-lg` lên `max-w-4xl`.
- Giới hạn chiều cao `92vh` và cho cuộn bên trong để không tràn màn hình.
- Dàn ngang 2 khối `Tự động tạo tuần thi đua` và `Tự động khóa tuần thi đua` trên desktop.
- Mobile vẫn tự xếp 1 cột.
- Giảm nhẹ padding/spacing để gọn hơn.

File thay đổi:
- `src/components/admin/competition/ProgramAndWeeksTab.tsx`
