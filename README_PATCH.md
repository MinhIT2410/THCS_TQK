# Patch tối ưu ảnh upload > 3MB

## File thay đổi
- src/utils/imageOptimizer.ts (mới)
- src/services/storageService.ts
- src/services/competitionService.ts
- src/services/chiDoiCongressService.ts

## Quy tắc
- Ảnh <= 3MB: giữ nguyên file.
- GIF: giữ nguyên để không mất animation.
- Ảnh > 3MB: resize cạnh dài tối đa 1920px và encode WebP.
- JPEG/WebP quality: 84%; PNG quality: 88%.
- Chỉ dùng bản tối ưu nếu nhỏ hơn file gốc ít nhất 10%.
- Nếu trình duyệt xử lý/encode lỗi: tự fallback về file gốc, không chặn upload.
- Video, audio, document: không thay đổi.

## Phạm vi đã phủ
- Upload ảnh dùng chung qua storageService: CMS, News, Gallery, Movement, Radio cover...
- Ảnh album.
- Ảnh giới thiệu trường (exact path).
- Ảnh minh chứng thi đua/sự việc.
- Ảnh biên bản Đại hội Chi đội.

## Lưu ý
- Giới hạn validate ảnh hiện hữu vẫn được giữ nguyên (10MB; Đại hội Chi đội 8MB).
- Không có dependency mới, không cần npm install package nén ảnh.
