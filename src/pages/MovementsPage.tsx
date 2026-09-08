/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Flag,
  Calendar,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Clock,
  Layers,
  FileCheck
} from 'lucide-react';
import { movementService } from '../services/movementService';
import { MovementTimelineTreeSvg } from '../components/activity/MovementTimelineTreeSvg';
import { ROUTES } from '../config/routes';
import {
  MovementCampaign,
  CampaignType,
  CampaignStatus,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS
} from '../types/movement';

// Cohesive color themes matching the reference timeline image
const COLOR_THEMES = [
  {
    name: 'light-blue',
    hex: '#3b82f6',
    textColor: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    name: 'dark-blue',
    hex: '#1e40af',
    textColor: 'text-indigo-800 dark:text-indigo-400',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  {
    name: 'maroon',
    hex: '#9f1239',
    textColor: 'text-rose-900 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  {
    name: 'cyan',
    hex: '#0891b2',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  {
    name: 'coral',
    hex: '#ef4444',
    textColor: 'text-red-600 dark:text-red-400',
    badgeBg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  {
    name: 'plum',
    hex: '#6b21a8',
    textColor: 'text-purple-800 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    name: 'orange',
    hex: '#f97316',
    textColor: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  {
    name: 'lime',
    hex: '#65a30d',
    textColor: 'text-lime-700 dark:text-lime-400',
    badgeBg: 'bg-lime-50 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-200 dark:border-lime-800',
  }
];

// Development / Preview 8-milestone placeholder items if real timeline data has fewer items
const DEMO_PREVIEW_CAMPAIGN_ITEMS: MovementCampaign[] = [
  {
    id: 'demo-1',
    title: 'Chương trình "Khởi động năm học mới 2024 - 2025"',
    summary: 'Phát động phong trào thi đua học tập và rèn luyện Đội viên đầu năm học.',
    campaign_type: 'cao_diem',
    status: 'dang_dien_ra',
    start_date: '2024-09-05',
    end_date: '2024-09-30',
    slug: 'khoi-dong-nam-hoc',
    is_featured: false,
    is_published: true,
    display_order: 1,
    academic_year: '2024-2025',
  },
  {
    id: 'demo-2',
    title: 'Hội thu Kế hoạch nhỏ đợt 1',
    summary: 'Quyên góp giấy vụn, vỏ lon gây quỹ học bổng "Thắp sáng giấc mơ thiếu nhi".',
    campaign_type: 'cuoc_thi',
    status: 'sap_dien_ra',
    start_date: '2024-10-15',
    end_date: '2024-10-25',
    slug: 'ke-hoach-nho-dot-1',
    is_featured: false,
    is_published: true,
    display_order: 2,
    academic_year: '2024-2025',
  },
  {
    id: 'demo-3',
    title: 'Thi đua Chào mừng Ngày Nhà giáo Việt Nam 20/11',
    summary: 'Hội thi làm báo tường, hoa điểm tốt và văn nghệ tri ân thầy cô giáo.',
    campaign_type: 'cao_diem',
    status: 'sap_dien_ra',
    start_date: '2024-11-01',
    end_date: '2024-11-20',
    slug: 'chao-mung-20-11',
    is_featured: false,
    is_published: true,
    display_order: 3,
    academic_year: '2024-2025',
  },
  {
    id: 'demo-4',
    title: 'Hội khỏe Phù Đổng cấp Trường',
    summary: 'Giải thi đấu các môn thể thao học sinh: bóng đá, cầu lông, cờ vua, kéo co.',
    campaign_type: 'cuoc_thi',
    status: 'sap_dien_ra',
    start_date: '2024-12-10',
    end_date: '2024-12-22',
    slug: 'hoi-khoe-phu-dong',
    is_featured: false,
    is_published: true,
    display_order: 4,
    academic_year: '2024-2025',
  },
  {
    id: 'demo-5',
    title: 'Chương trình "Xuân yêu thương - Tết sẻ chia"',
    summary: 'Trao tặng quà Tết cho các bạn học sinh có hoàn cảnh khó khăn vươn lên.',
    campaign_type: 'cao_diem',
    status: 'sap_dien_ra',
    start_date: '2025-01-10',
    end_date: '2025-01-22',
    slug: 'xuan-yeu-thuong-2025',
    is_featured: false,
    is_published: true,
    display_order: 5,
    academic_year: '2024-2025',
  },
  {
    id: 'demo-6',
    title: 'Cuộc thi Sáng tạo Thanh thiếu niên Nhi đồng',
    summary: 'Trưng bày và chấm giải các mô hình, sản phẩm sáng tạo KHKT của thiếu nhi.',
    campaign_type: 'cuoc_thi',
    status: 'sap_dien_ra',
    start_date: '2025-02-15',
    end_date: '2025-03-01',
    slug: 'sang-tao-thanh-thieu-nien',
    is_featured: false,
    is_published: true,
    display_order: 6,
    academic_year: '2024-2025',
  },
  {
    id: 'demo-7',
    title: 'Tháng Thanh niên & Kỷ niệm 94 năm Ngày thành lập Đoàn',
    summary: 'Ngày hội "Tiến bước lên Đoàn", kết náp Đoàn viên mới và hội trại kỹ năng.',
    campaign_type: 'cao_diem',
    status: 'sap_dien_ra',
    start_date: '2025-03-01',
    end_date: '2025-03-26',
    slug: 'thang-thanh-nien-2025',
    is_featured: false,
    is_published: true,
    display_order: 7,
    academic_year: '2024-2025',
  },
  {
    id: 'demo-8',
    title: 'Đại hội Cháu ngoan Bác Hồ & Tổng kết năm học',
    summary: 'Tuyên dương các dũng sĩ Kế hoạch nhỏ, Cháu ngoan Bác Hồ xuất sắc toàn trường.',
    campaign_type: 'cao_diem',
    status: 'sap_dien_ra',
    start_date: '2025-05-15',
    end_date: '2025-05-25',
    slug: 'dai-hoi-chau-ngoan-bac-ho',
    is_featured: false,
    is_published: true,
    display_order: 8,
    academic_year: '2024-2025',
  },
];

export default function MovementsPage() {
  const [campaigns, setCampaigns] = useState<MovementCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await movementService.getPublishedCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      console.error('Error loading movement campaigns:', err);
      setError(err.message || 'Không thể tải dữ liệu hoạt động phong trào.');
    } finally {
      setLoading(false);
    }
  };

  // Group 1: Real timeline campaigns
  const timelineCampaigns = useMemo(() => {
    return campaigns
      .filter(c => c.campaign_type !== 'thuong_xuyen' && Boolean(c.start_date))
      .sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
  }, [campaigns]);

  // For desktop preview: Ensure at least 8 items are displayed to match reference layout
  const displayTimelineCampaigns = useMemo(() => {
    if (timelineCampaigns.length >= 8) {
      return timelineCampaigns;
    }
    const needed = 8 - timelineCampaigns.length;
    const fillers = DEMO_PREVIEW_CAMPAIGN_ITEMS.slice(0, needed);
    return [...timelineCampaigns, ...fillers];
  }, [timelineCampaigns]);

  // Calculations for Desktop Timeline SVG alignment
  const ITEM_WIDTH = 190;
  const ITEM_GAP = 20;
  const EDGE_GAP = 28;
  const SIDE_PADDING = ITEM_WIDTH / 2 + EDGE_GAP; // 123px
  const timelineCount = displayTimelineCampaigns.length;
  const timelineCanvasWidth =
    timelineCount > 0
      ? SIDE_PADDING * 2 + timelineCount * ITEM_WIDTH + (timelineCount - 1) * ITEM_GAP
      : 0;
  const effectiveTimelineSidePadding = SIDE_PADDING;

  // Group 2: Hoạt động thường xuyên
  const regularCampaigns = useMemo(() => {
    return campaigns.filter(c => c.campaign_type === 'thuong_xuyen');
  }, [campaigns]);

  const getStatusBadgeClass = (status: CampaignStatus) => {
    switch (status) {
      case 'dang_dien_ra':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50';
      case 'sap_dien_ra':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50';
      case 'da_ket_thuc':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50';
    }
  };

  const getTypeBadgeClass = (type: CampaignType) => {
    switch (type) {
      case 'thuong_xuyen':
        return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200/50 dark:border-red-800/50';
      case 'cao_diem':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50';
      case 'cuoc_thi':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50';
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50';
    }
  };

  const formatCampaignDate = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate) return 'Đang cập nhật';
    const start = new Date(startDate);
    const startStr = `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')}/${start.getFullYear()}`;
    if (!endDate) return startStr;
    const end = new Date(endDate);
    const endStr = `${end.getDate().toString().padStart(2, '0')}/${(end.getMonth() + 1).toString().padStart(2, '0')}/${end.getFullYear()}`;
    return `${startStr} – ${endStr}`;
  };

  const renderTimelineCard = (
    campaign: MovementCampaign,
    theme: typeof COLOR_THEMES[0],
    position: 'top' | 'bottom' = 'top'
  ) => {
    const isTop = position === 'top';
    return (
      <div className="relative group w-full h-[175px] flex flex-col justify-between">
        <Link
          to={`/hoat-dong/${campaign.slug}`}
          className="block bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all text-center space-y-1.5 h-full flex flex-col justify-between overflow-hidden"
        >
          <div className="space-y-1 overflow-hidden">
            {/* Prominent Date / Year in Theme Color */}
            <div className={`font-display font-black text-lg sm:text-xl tracking-tight ${theme.textColor} truncate`}>
              {formatCampaignDate(campaign.start_date, campaign.end_date)}
            </div>

            {/* Campaign Title */}
            <h3 className="font-display font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 line-clamp-2 transition-colors leading-tight">
              {campaign.title}
            </h3>

            {/* Short Summary */}
            {campaign.summary && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                {campaign.summary}
              </p>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(campaign.status)} truncate max-w-[95px]`}>
              {CAMPAIGN_STATUS_LABELS[campaign.status] || 'Đang diễn ra'}
            </span>
            <span className="flex items-center gap-1 text-[11px] shrink-0">
              Chi tiết
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        {/* Pointer Arrow pointing to Timeline */}
        <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 ${
          isTop ? '-bottom-2' : '-top-2'
        }`}>
          <svg width="18" height="9" viewBox="0 0 18 9" className="fill-slate-100 dark:fill-slate-800 drop-shadow-sm">
            <polygon points={isTop ? "0,0 18,0 9,9" : "0,9 18,9 9,0"} />
          </svg>
        </div>
      </div>
    );
  };

  const renderMobileTimelineCard = (campaign: MovementCampaign, theme: typeof COLOR_THEMES[0]) => {
    return (
      <div className="relative group w-full min-w-0">
        <Link
          to={`/hoat-dong/${campaign.slug}`}
          className="block bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-3.5 shadow-sm transition-all text-left space-y-1.5 overflow-hidden"
        >
          <div className="space-y-1 overflow-hidden">
            {/* Prominent Date / Year in Theme Color */}
            <div className={`font-display font-black text-base sm:text-lg tracking-tight ${theme.textColor} truncate`}>
              {formatCampaignDate(campaign.start_date, campaign.end_date)}
            </div>

            {/* Campaign Title */}
            <h3 className="font-display font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 line-clamp-2 transition-colors leading-tight">
              {campaign.title}
            </h3>

            {/* Short Summary */}
            {campaign.summary && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                {campaign.summary}
              </p>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(campaign.status)} truncate max-w-[110px]`}>
              {CAMPAIGN_STATUS_LABELS[campaign.status] || 'Đang diễn ra'}
            </span>
            <span className="flex items-center gap-1 text-[11px] shrink-0">
              Chi tiết
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        {/* Pointer Arrow pointing LEFT towards node */}
        <div className="absolute -left-2 top-3.5 pointer-events-none z-10">
          <svg width="8" height="12" viewBox="0 0 8 12" className="fill-slate-100 dark:fill-slate-800 drop-shadow-sm">
            <polygon points="8,0 0,6 8,12" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12 pb-20 font-sans relative min-h-[60vh]">
      {/* 1. Static Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 rounded-full inline-block border border-red-200/30">
          HOẠT ĐỘNG ĐỘI & PHONG TRÀO THIẾU NHI
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Phong trào & Hoạt động
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Nơi cập nhật các chương trình thi đua, hoạt động theo từng thời điểm và các hoạt động thường xuyên của Liên đội THCS Trần Quang Khải.
        </p>
      </div>

      {/* Global Error Banner if query fails */}
      {error && !loading && (
        <div className="text-center py-8 border border-dashed border-red-300 dark:border-red-900 rounded-[2.5rem] max-w-xl mx-auto space-y-4 bg-red-50/10 dark:bg-red-950/20 p-8">
          <AlertCircle className="h-10 w-10 mx-auto text-red-500 opacity-80" />
          <h3 className="font-display text-base font-bold text-red-800 dark:text-red-400">
            Không thể tải dữ liệu hoạt động phong trào.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Có lỗi xảy ra trong quá trình kết nối dữ liệu. Vui lòng thử lại sau.
          </p>
          <button
            onClick={loadCampaigns}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors shadow-sm"
          >
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 2. SECTION: Hoạt động thường xuyên */}
      <section className="space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Hoạt động thường xuyên
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Các hoạt động được duy trì định kỳ trong suốt năm học.
          </p>
        </div>

        {/* Loading Skeleton for Regular Activities */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60"
              />
            ))}
          </div>
        )}

        {/* Empty State for Regular Activities */}
        {!loading && !error && regularCampaigns.length === 0 && (
          <div className="max-w-xl mx-auto border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center bg-white/50 dark:bg-slate-900/50 space-y-2">
            <Flag className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="font-display text-sm font-bold text-slate-700 dark:text-slate-300">
              Các hoạt động thường xuyên đang được cập nhật.
            </p>
          </div>
        )}

        {/* Regular Activities Grid */}
        {!loading && !error && regularCampaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularCampaigns.map((campaign) => (
              <motion.article
                key={campaign.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group cursor-pointer flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:border-red-500/30 transition-all duration-300 relative"
              >
                <Link
                  to={
                    campaign.slug === 'sinh-hoat-dau-tuan' || campaign.title.trim().toLowerCase() === 'sinh hoạt đầu tuần'
                      ? ROUTES.FLAG_CEREMONY
                      : `${ROUTES.ACTIVITIES}/${campaign.slug}`
                  }
                  className="flex flex-col h-full justify-between"
                >
                  <div>
                    {/* Cover Image Container */}
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      {campaign.cover_image_url ? (
                        <img
                          src={campaign.cover_image_url}
                          alt={campaign.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/10 to-blue-500/10">
                          <Flag className="w-12 h-12 text-red-500/40" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm ${getTypeBadgeClass(campaign.campaign_type)}`}>
                          {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm ${getStatusBadgeClass(campaign.status)}`}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5 text-red-500" />
                          <span>
                            {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('vi-VN') : '---'}
                          </span>
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Năm học {campaign.academic_year}
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400 leading-tight line-clamp-2 transition-colors">
                        {campaign.title}
                      </h3>

                      {campaign.summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                          {campaign.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        {campaign.events?.length || 0} hoạt động
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {campaign.evidence?.length || 0} minh chứng
                      </span>
                    </div>

                    <span className="inline-flex items-center space-x-1 text-red-600 dark:text-red-400 font-bold group-hover:underline">
                      <span>Chi tiết</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {/* 3. SECTION: Cây Timeline hoạt động theo mốc */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Hoạt động theo mốc thời gian
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Các đợt hoạt động thi đua trọng tâm, cuộc thi và phong trào diễn ra theo lịch trình năm học.
          </p>
        </div>

        {/* Loading Skeleton for Timeline */}
        {loading && (
          <div className="space-y-4 animate-pulse py-4">
            <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
              <div className="w-3/4 h-2 bg-slate-200 dark:bg-slate-800 rounded-full relative">
                <div className="absolute left-1/4 -top-12 w-32 h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="absolute right-1/4 -bottom-12 w-32 h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Empty State for Timeline */}
        {!loading && !error && timelineCampaigns.length === 0 && (
          <div className="max-w-xl mx-auto border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center bg-white/50 dark:bg-slate-900/50 space-y-2">
            <Clock className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="font-display text-sm font-bold text-slate-700 dark:text-slate-300">
              Chưa có hoạt động theo mốc thời gian.
            </p>
          </div>
        )}

        {/* Cây Timeline Content */}
        {!loading && !error && displayTimelineCampaigns.length > 0 && (
          <div>
            {/* Desktop / Tablet Horizontal Tree Timeline */}
            <div className="hidden md:block w-full overflow-x-auto overflow-y-visible pb-4 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-red-400/60 dark:[&::-webkit-scrollbar-thumb]:bg-red-500/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-red-500 transition-all cursor-grab active:cursor-grabbing">
              <div
                className="relative py-2 flex flex-col justify-center mx-auto"
                style={{
                  width: `${timelineCanvasWidth}px`,
                  minWidth: `${timelineCanvasWidth}px`,
                }}
              >
                {/* HÀNG CARD PHÍA TRÊN (Các card index chẵn: 0, 2, 4...) */}
                <div className="relative h-[175px] w-full">
                  {displayTimelineCampaigns.map((campaign, idx) => {
                    if (idx % 2 !== 0) return null;
                    const theme = COLOR_THEMES[idx % COLOR_THEMES.length];
                    const left = effectiveTimelineSidePadding + idx * (ITEM_WIDTH + ITEM_GAP);
                    return (
                      <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                        className="absolute bottom-0"
                        style={{
                          left: `${left}px`,
                          width: `${ITEM_WIDTH}px`,
                        }}
                      >
                        {renderTimelineCard(campaign, theme, 'top')}
                      </motion.div>
                    );
                  })}
                </div>

                {/* HÀNG SVG CÂY TIMELINE (MovementTimelineTreeSvg) */}
                <div className="w-full py-0">
                  <MovementTimelineTreeSvg
                    count={timelineCount}
                    width={timelineCanvasWidth}
                    itemWidth={ITEM_WIDTH}
                    gap={ITEM_GAP}
                    sidePadding={effectiveTimelineSidePadding}
                    colors={COLOR_THEMES.map((t) => t.hex)}
                  />
                </div>

                {/* HÀNG CARD PHÍA DƯỚI (Các card index lẻ: 1, 3, 5...) */}
                <div className="relative h-[175px] w-full">
                  {displayTimelineCampaigns.map((campaign, idx) => {
                    if (idx % 2 === 0) return null;
                    const theme = COLOR_THEMES[idx % COLOR_THEMES.length];
                    const left = effectiveTimelineSidePadding + idx * (ITEM_WIDTH + ITEM_GAP);
                    return (
                      <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                        className="absolute top-0"
                        style={{
                          left: `${left}px`,
                          width: `${ITEM_WIDTH}px`,
                        }}
                      >
                        {renderTimelineCard(campaign, theme, 'bottom')}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Vertical Tree Timeline */}
            <div className="block md:hidden relative pl-11 pr-2 space-y-6">
              {/* Thân cây dọc màu đen 4px */}
              <div className="absolute left-[20px] top-4 bottom-4 w-[4px] bg-[#0b0b0b] dark:bg-slate-100 rounded-full z-0" />

              {displayTimelineCampaigns.map((campaign, idx) => {
                const theme = COLOR_THEMES[idx % COLOR_THEMES.length];

                return (
                  <div key={campaign.id} className="relative flex items-start">
                    {/* Node Circle & Leaf Cluster SVG on Vertical Trunk */}
                    <div className="absolute -left-[44px] top-3.5 w-11 h-11 z-20 pointer-events-none flex items-center justify-center">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 44 44">
                        {/* Main colored leaf (pointing top-right towards card, 25% larger) */}
                        <g transform="translate(22, 14) rotate(-35) scale(1.25)">
                          <path d="M 0 0 C 6 -6 16 -6 22 0 C 16 6 6 6 0 0 Z" fill={theme.hex} />
                        </g>
                        {/* Secondary small black leaf */}
                        <g transform="translate(26, 26) rotate(20) scale(0.6)">
                          <path d="M 0 0 C 4 -4 10 -4 14 0 C 10 4 4 4 0 0 Z" fill="currentColor" className="text-[#0b0b0b] dark:text-slate-100" />
                        </g>
                        {/* Center Node Circle on Trunk */}
                        <circle
                          cx="22"
                          cy="22"
                          r="7"
                          fill="#ffffff"
                          stroke={theme.hex}
                          strokeWidth="3"
                          className="dark:fill-slate-900"
                        />
                      </svg>
                    </div>

                    {/* Card on Right Side */}
                    <div className="w-full">
                      {renderMobileTimelineCard(campaign, theme)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
