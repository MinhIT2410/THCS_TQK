/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ROUTES = {
  HOME: '/',
  ABOUT: '/gioi-thieu',
  NEWS: '/tin-tuc',
  ACTIVITIES: '/hoat-dong',
  FLAG_CEREMONY: '/hoat-dong/sinh-hoat-dau-tuan',
  MOVEMENTS: '/hoat-dong-phong-trao',
  GALLERY: '/thu-vien',
  DOCUMENTS: '/van-ban',
  COMPETITION: '/thi-dua',
  COMPETITION_UNITS: '/thi-dua/chi-doi',
  COMPETITION_STUDENT: '/thi-dua/doi-vien',
  COMPETITION_GOOD_DEEDS: '/thi-dua/nguoi-tot-viec-tot',
  COMPETITION_REWARDS: '/thi-dua/cua-hang',
  COMPETITION_RECORD: '/thi-dua/ghi-nhan',
  COMPETITION_PENDING: '/thi-dua/cho-duyet',
  COMPETITION_REPORT: '/thi-dua/bao-cao',
  CONTACT: '/lien-he',
  ADMIN: '/quan-tri',
  ADMIN_COMPETITION: '/quan-tri/thi-dua',
  ADMIN_COMPETITION_UNITS: '/quan-tri/thi-dua/chi-doi',
  ADMIN_COMPETITION_REWARDS: '/quan-tri/thi-dua/cua-hang',
  ADMIN_COMPETITION_REDEMPTIONS: '/quan-tri/thi-dua/doi-qua',
  ADMIN_COMPETITION_REVIEWS: '/quan-tri/thi-dua/xem-lai',
  ADMIN_MOVEMENTS: '/quan-tri/hoat-dong-phong-trao',
  LOGIN: '/dang-nhap',
  RESET_PASSWORD: '/reset-password',
} as const;

export type RouteKeys = keyof typeof ROUTES;
