/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Image as ImageIcon,
  Paintbrush,
  Users,
  Settings,
  LucideIcon,
  Info,
  Flag,
  Award,
  BookOpenCheck
} from 'lucide-react';

export interface AdminMenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    label: 'Tổng quan',
    href: '/quan-tri',
    icon: LayoutDashboard,
  },
  {
    label: 'Thi đua',
    href: '/quan-tri/thi-dua',
    icon: Award,
  },
  {
    label: 'Quản lý IC3',
    href: '/quan-tri/ic3',
    icon: BookOpenCheck,
  },
  {
    label: 'Tin tức',
    href: '/quan-tri/tin-tuc',
    icon: Newspaper,
  },
  {
    label: 'Phong trào',
    href: '/quan-tri/hoat-dong-phong-trao',
    icon: Flag,
  },
  {
    label: 'Tài liệu',
    href: '/quan-tri/tai-lieu',
    icon: FileText,
  },
  {
    label: 'Album ảnh',
    href: '/quan-tri/album',
    icon: ImageIcon,
  },
  {
    label: 'Giới thiệu',
    href: '/quan-tri/gioi-thieu',
    icon: Info,
  },
  {
    label: 'CMS giao diện',
    href: '/quan-tri/cms',
    icon: Paintbrush,
  },
  {
    label: 'Người dùng',
    href: '/quan-tri/nguoi-dung',
    icon: Users,
  },
  {
    label: 'Cài đặt',
    href: '/quan-tri/cai-dat',
    icon: Settings,
  },
];
