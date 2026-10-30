# Hotfix 110 — file đầy đủ để copy đè

Nguồn: source bạn gửi `THCS_TQK-main(20261030-084313).zip`, đã so sánh khớp 100%. Patch 109 không sửa file service này.

Sửa duy nhất **4 dòng**: xóa `national_anthem_video_url` và `team_song_video_url` trong `createCampaignEvent` và `updateCampaignEvent`. **Giữ nguyên** các trường tương tự trong `createCampaign`/`updateCampaign`.

Giải nén ZIP, copy `src/services/movementService.ts` vào đúng đường dẫn trong project, xem GitHub Desktop chỉ 4 dòng bị xóa, build và push. **Không cần SQL**.

Nếu file trên GitHub đã thay đổi sau bản source tải lên, phải đối chiếu trước khi copy đè để không mất cập nhật mới. Chưa kiểm thử trên Supabase production.
