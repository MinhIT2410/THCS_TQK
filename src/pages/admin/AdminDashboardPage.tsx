/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import {
  Medal,
  LayoutGrid,
  FileText,
  Image as ImageIcon,
  Paintbrush,
  Users,
  Settings,
  ChevronRight,
  Info
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Quản lý Thi đua',
      description: 'Quản lý tuần thi đua, quy tắc, sự việc chờ duyệt, phần thưởng và phân công nhiệm vụ.',
      href: '/quan-tri/thi-dua',
      icon: Medal,
      color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40',
    },
    {
      title: 'Mở rộng',
      description: 'Quản lý các tiện ích bổ sung, trước mắt là Tin học quốc tế IC3.',
      href: '/quan-tri/mo-rong',
      icon: LayoutGrid,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40',
    },
    {
      title: 'Quản lý Tài liệu',
      description: 'Lưu trữ, tải lên và cập nhật các kế hoạch, công văn chỉ đạo, biểu mẫu.',
      href: '/quan-tri/tai-lieu',
      icon: FileText,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40',
    },
    {
      title: 'Album ảnh & Thư viện',
      description: 'Đăng tải hình ảnh ngày hội học sinh, hoạt động ngoại khóa, phong trào thi đua.',
      href: '/quan-tri/album',
      icon: ImageIcon,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40',
    },
    {
      title: 'CMS & Giao diện',
      description: 'Chỉnh sửa tiêu đề Hero, khẩu hiệu, các khối trang chủ qua Visual Edit Mode.',
      href: '/quan-tri/cms',
      icon: Paintbrush,
      badge: 'Bổ sung nâng cao',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40',
    },
    {
      title: 'Người dùng & Phân quyền',
      description: 'Phân vai trò quản trị cho giáo viên, học sinh và kiểm soát trạng thái hoạt động tài khoản.',
      href: '/quan-tri/nguoi-dung',
      icon: Users,
      color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900/40',
    },
    {
      title: 'Cài đặt hệ thống',
      description: 'Thiết lập thông tin của trường, lớp, giáo viên, học sinh và các cấu hình nền tảng.',
      href: '/quan-tri/cai-dat',
      icon: Settings,
      badge: 'Cấu hình chung',
      color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800',
    },
  ];

  return (
    <div className="space-y-10 py-4 font-sans" id="admin-dashboard">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-2">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Bảng điều khiển quản trị
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Xin chào, <strong className="text-slate-700 dark:text-slate-200">{profile?.full_name || 'Quản trị viên'}</strong>. Khu vực này cho phép bạn quản lý các hoạt động, tiện ích và tư liệu giảng dạy của nhà trường.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-10 pointer-events-none hidden md:block">
          <div className="h-full w-48 bg-gradient-to-l from-blue-600 to-transparent translate-x-12" />
        </div>
      </div>

      {/* Grid of Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="group flex flex-col justify-between p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="space-y-4">
                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl border ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {card.title}
                    </h3>
                    {card.badge && (
                      <span className="text-[10px] px-2 py-0.5 font-semibold text-slate-500 bg-slate-100 dark:bg-slate-900 dark:text-slate-400 rounded-full shrink-0">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-900 mt-6">
                <button
                  onClick={() => navigate(card.href)}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-transform group-hover:translate-x-1 font-sans"
                >
                  <span>Đi tới quản lý</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
