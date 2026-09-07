/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HeroButtonConfig = {
  label: string;
  href: string;
};

export type BadgeConfig = {
  title: string;
  description: string;
};

export type DecorativeImageConfig = {
  url: string;
  alt: string;
  tag: string;
  title: string;
};

export type StatConfig = {
  label: string;
  value: string;
};

export type RadioProgramConfig = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  buttonLabel: string;
  audioUrl: string;
  coverImageUrl: string;
  description: string;
  durationLabel: string;
  publishedAt: string;
  openMode: 'PLAYER' | 'NEW_TAB' | 'DOWNLOAD';
};

export type HomeHeroConfig = {
  slogan?: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  primaryButton: HeroButtonConfig;
  secondaryButton: HeroButtonConfig;
  badge1: BadgeConfig;
  badge2: BadgeConfig;
  decorImage: DecorativeImageConfig;
  stat1: StatConfig;
  stat2: StatConfig;
  stat3: StatConfig;
  stat4: StatConfig;
};

export const HOME_HERO_DEFAULT: HomeHeroConfig = {
  slogan: "Tuổi nhỏ làm việc nhỏ, tùy theo sức của mình",
  title: "Chào mừng bạn đến với Liên đội trường THCS Trần Quang Khải",
  subtitle: "Nơi ươm mầm tri thức, nuôi dưỡng ước mơ và xây dựng hoài bão cho tương lai Đội viên",
  description: "Nơi nuôi dưỡng lý tưởng cách mạng, bồi dưỡng kỹ năng toàn diện, rèn luyện phẩm chất Đội viên tài năng, sẵn sàng tiếp bước xây dựng Tổ quốc xã hội chủ nghĩa tươi đẹp.",
  backgroundImage: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80",
  primaryButton: {
    label: "Xem hoạt động nổi bật",
    href: "/hoat-dong",
  },
  secondaryButton: {
    label: "Tìm hiểu truyền thống",
    href: "/gioi-thieu",
  },
  badge1: {
    title: "Liên đội mạnh",
    description: "Năm học 2025 - 2026",
  },
  badge2: {
    title: "100% Đội viên",
    description: "Rèn luyện đạt chuẩn",
  },
  decorImage: {
    url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
    alt: "Pioneer Activities",
    tag: "Sinh hoạt Đội",
    title: "Hành trình rèn luyện phấn đấu lên Đoàn",
  },
  stat1: {
    value: "1,250+",
    label: "Đội viên tích cực",
  },
  stat2: {
    value: "32",
    label: "Chi đội tự quản",
  },
  stat3: {
    value: "05",
    label: "Công trình măng non",
  },
  stat4: {
    value: "05+",
    label: "Năm học dẫn đầu",
  },
};

export const RADIO_PROGRAM_DEFAULT: RadioProgramConfig = {
  enabled: true,
  eyebrow: "PHÁT THANH MĂNG NON",
  title: "Chương trình phát thanh kỳ này: “Thiếu nhi Thủ đô thi đua học tốt rèn ngoan”",
  buttonLabel: "Nghe chương trình",
  audioUrl: "",
  coverImageUrl: "",
  description: "",
  durationLabel: "",
  publishedAt: "",
  openMode: "PLAYER"
};

export type GalleryBlockConfig = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
};

export const GALLERY_BLOCK_DEFAULT: GalleryBlockConfig = {
  eyebrow: "Ghi dấu kỷ niệm",
  title: "Khoảnh khắc đẹp Liên đội",
  description: "Ghi lại những khoảnh khắc tươi đẹp đầy sức trẻ dưới mái trường của chúng mình.",
  buttonLabel: "Mở thư viện ảnh",
};

export type UncleHoBlockConfig = {
  eyebrow: string;
  title: string;
  description: string;
  rule1: string;
  rule2: string;
  rule3: string;
  rule4: string;
  rule5: string;
  imageUrl: string;
  imageCaption: string;
};

export const UNCLE_HO_BLOCK_DEFAULT: UncleHoBlockConfig = {
  eyebrow: "Phòng truyền thống",
  title: "Bác Hồ Với Thiếu Niên Nhi Đồng",
  description: "\"Ai yêu các nhi đồng bằng Bác Hồ Chí Minh\". Cả cuộc đời Người luôn dành tình cảm sâu sắc, ấm áp nhất cho các thế hệ tương lai. Lời dạy \"5 Điều Bác Hồ dạy\" luôn là kim chỉ nam soi đường, khích lệ thiếu niên nhi đồng cả nước tu dưỡng đạo đức, rèn luyện tri thức để đưa non sông Việt Nam vươn vai sánh vai với các cường quốc năm châu.",
  rule1: "1. Yêu Tổ quốc, yêu đồng bào",
  rule2: "2. Học tập tốt, lao động tốt",
  rule3: "3. Đoàn kết tốt, kỷ luật tốt",
  rule4: "4. Giữ gìn vệ sinh thật tốt",
  rule5: "5. Khiêm tốn, thật thà, dũng cảm",
  imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
  imageCaption: "Bác Hồ phát kẹo cho các cháu nhi đồng",
};

export type NewsBlockConfig = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
};

export const NEWS_BLOCK_DEFAULT: NewsBlockConfig = {
  eyebrow: "Măng non tin nhanh",
  title: "Tin tức măng non",
  description: "Cập nhật tin hoạt động Đội, gương sáng thiếu nhi và thông báo mới nhất.",
  buttonLabel: "Xem tất cả tin tức",
};

export type CampaignsBlockConfig = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
};

export const CAMPAIGNS_BLOCK_DEFAULT: CampaignsBlockConfig = {
  eyebrow: "Phong trào sôi nổi",
  title: "Phong trào thi đua đang diễn ra",
  description: "Các bạn hãy tham gia tích cực để cùng hoàn thành phong trào Đội viên tốt nhé.",
  buttonLabel: "Xem toàn bộ kế hoạch",
};

export type DocumentsBlockConfig = {
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
};

export const DOCUMENTS_BLOCK_DEFAULT: DocumentsBlockConfig = {
  eyebrow: "Học tập & Nghiệp vụ",
  title: "Văn bản - Tài liệu nổi bật",
  description: "Học sinh và phụ huynh có thể tra cứu nhanh các văn bản, kế hoạch thi đua mới của Liên đội.",
  buttonLabel: "Xem tất cả văn bản",
};
