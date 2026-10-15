/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROUTES } from './routes';

export interface MenuItem {
  title: string;
  path: string;
  id: string;
  showInNavbar: boolean;
}

export const NAV_MENU: MenuItem[] = [
  {
    title: 'Giới thiệu',
    path: ROUTES.ABOUT,
    id: 'about',
    showInNavbar: true,
  },
  {
    title: 'Hoạt động',
    path: ROUTES.ACTIVITIES,
    id: 'activities',
    showInNavbar: true,
  },
  {
    title: 'Thư viện ảnh',
    path: ROUTES.GALLERY,
    id: 'gallery',
    showInNavbar: true,
  },
  {
    title: 'Văn bản',
    path: ROUTES.DOCUMENTS,
    id: 'documents',
    showInNavbar: true,
  },
  {
    title: 'Thi đua',
    path: ROUTES.COMPETITION,
    id: 'competition',
    showInNavbar: true,
  },
  {
    title: 'Mở rộng',
    path: ROUTES.NEWS,
    id: 'news',
    showInNavbar: true,
  },
];
