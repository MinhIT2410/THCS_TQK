/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeaderProfile, AchievementItem } from '../types';

export const SCHOOL_NAME = "Liên Đội THCS Trần Quang Khải";
export const SCHOOL_SLOGAN = "Thiếu nhi Trần Quang Khải - Chăm ngoan, học tốt, tiếp bước cha anh";

export const defaultLeaders: LeaderProfile[] = [
  {
    id: "1",
    name: "Cô Nguyễn Thanh Hà",
    position: "Giáo viên Tổng phụ trách Đội",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Phụ trách chỉ đạo toàn diện hoạt động Đội, bồi dưỡng Ban chỉ huy Liên đội và triển khai các phong trào thi đua cấp trường, cấp Quận.",
    email: "nguyenha.tpt@gmail.com"
  },
  {
    id: "2",
    name: "Em Trần Nam Khánh",
    position: "Liên đội trưởng - Lớp 9A1",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Đại diện Liên đội, điều hành sinh hoạt Ban chỉ huy Liên đội, đôn đốc phong trào tự quản và học tập của Đội viên.",
    email: "namkhanh9a1@gmail.com"
  },
  {
    id: "3",
    name: "Em Lê Mỹ Linh",
    position: "Liên đội phó - Lớp 8B2",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Phụ trách mảng văn thể mỹ, phong trào văn nghệ, báo chí và phát thanh măng non của Liên đội.",
    email: "mylinh8b2@gmail.com"
  },
  {
    id: "4",
    name: "Em Nguyễn Hoàng Nam",
    position: "Liên đội phó - Lớp 8A3",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
    roleDescription: "Phụ trách mảng nề nếp, kỷ luật, đội cờ đỏ thi đua và công tác đền ơn đáp nghĩa, chăm sóc công trình măng non.",
    email: "hoangnam8a3@gmail.com"
  }
];

export const defaultAchievements: AchievementItem[] = [
  {
    id: "ach-1",
    year: "2025",
    title: "Cờ Thi Đua Dẫn Đầu Phong Trào Đội Toàn Thành Phố",
    description: "Thành tích cao quý do Hội đồng Đội Thành phố trao tặng nhờ nỗ lực thi đua rèn luyện xuất sắc của tập thể học sinh và giáo viên trường.",
    badge: "🏆"
  },
  {
    id: "ach-2",
    year: "2024",
    title: "Bằng khen của Trung ương Đoàn TNCS Hồ Chí Minh",
    description: "Khen thưởng tập thể có thành tích xuất sắc đặc biệt trong công tác Đội và phong trào thiếu nhi trường học toàn quốc.",
    badge: "🥇"
  },
  {
    id: "ach-3",
    year: "2023",
    title: "Liên đội Mạnh Xuất Sắc cấp Quận liên tục 5 năm liền",
    description: "Danh hiệu ghi nhận nề nếp sinh hoạt vững mạnh, các phong trào kế hoạch nhỏ, rèn luyện đội viên luôn duy trì chất lượng hàng đầu.",
    badge: "⭐"
  }
];
