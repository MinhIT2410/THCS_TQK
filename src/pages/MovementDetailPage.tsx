/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Share2,
  FileCheck,
  ExternalLink,
  Layers,
  ChevronRight,
  AlertCircle,
  Award,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { movementService } from '../services/movementService';
import ChiDoiCongressOnlineForm from '../components/activity/ChiDoiCongressOnlineForm';
import {
  MovementCampaign,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  EVENT_STATUS_LABELS,
  EVIDENCE_TYPE_LABELS
} from '../types/movement';

export default function MovementDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<MovementCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (slug) {
      loadCampaignDetail(slug);
    }
  }, [slug]);

  const loadCampaignDetail = async (campaignSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await movementService.getPublishedCampaignBySlug(campaignSlug);
      if (!data) {
        setError('Không tìm thấy phong trào hoặc phong trào chưa được xuất bản.');
      } else {
        setCampaign(data);
      }
    } catch (err: any) {
      console.error('Error loading campaign detail:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải thông tin phong trào.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getProgressPercentage = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải chi tiết phong trào...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900/60 py-16 px-4">
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {error || 'Không tìm thấy phong trào'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vui lòng kiểm tra lại đường dẫn hoặc quay lại danh sách phong trào Đội.
          </p>
          <Link
            to="/hoat-dong"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trở về Hoạt động</span>
          </Link>
        </div>
      </div>
    );
  }

  const progress = getProgressPercentage(campaign.start_date, campaign.end_date);
  const normalizedTitle = campaign.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const isChiDoiCongress = normalizedTitle.includes('dai hoi chi doi');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/60 pb-16">
      
      {/* Top Breadcrumb Navigation */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-3.5 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 overflow-hidden">
            <Link to="/" className="hover:text-red-600 transition-colors shrink-0">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <Link to="/hoat-dong" className="hover:text-red-600 transition-colors shrink-0">Hoạt động</Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{campaign.title}</span>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Đã sao chép link!' : 'Chia sẻ'}</span>
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        
        {/* Cover & Main Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
          
          {campaign.cover_image_url && (
            <div className="relative h-64 sm:h-80 md:h-96 w-full bg-slate-100 dark:bg-slate-900">
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold shadow-sm">
                    {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-sm">
                    {CAMPAIGN_STATUS_LABELS[campaign.status]}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white/20 backdrop-blur-md text-white text-xs font-semibold">
                    Năm học {campaign.academic_year}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight">
                  {campaign.title}
                </h1>
              </div>
            </div>
          )}

          {!campaign.cover_image_url && (
            <div className="p-6 sm:p-8 space-y-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold">
                  {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                  {CAMPAIGN_STATUS_LABELS[campaign.status]}
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                  Năm học {campaign.academic_year}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                {campaign.title}
              </h1>
            </div>
          )}

          {/* Key details bar */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-300 font-medium">
              {(campaign.start_date || campaign.end_date) && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    Thời gian: <strong>{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('vi-VN') : '---'}</strong> đến <strong>{campaign.end_date ? new Date(campaign.end_date).toLocaleDateString('vi-VN') : '---'}</strong>
                  </span>
                </div>
              )}
            </div>

            {progress !== null && campaign.status === 'dang_dien_ra' && (
              <div className="sm:w-64 space-y-1 shrink-0">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span>Tiến độ thực hiện</span>
                  <span className="text-red-600">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Short Summary Card */}
        {campaign.summary && (
          <div className="p-5 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-700 dark:text-red-400">
              <Sparkles className="w-4 h-4" />
              Tóm tắt mục tiêu phong trào
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              {campaign.summary}
            </p>
          </div>
        )}

        {/* Detailed Content */}
        {campaign.content && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Award className="w-5 h-5 text-red-600" />
              Nội dung & Kế hoạch triển khai
            </h2>
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {campaign.content}
            </div>
          </section>
        )}

        {/* GVCN online submission for Đại hội Chi đội */}
        {isChiDoiCongress && <ChiDoiCongressOnlineForm campaign={campaign} />}

        {/* Child Events Section */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Danh sách Hoạt động con ({campaign.events?.length || 0})
            </h2>
          </div>

          {!campaign.events || campaign.events.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              Chưa có hoạt động con nào được cập nhật trong phong trào này.
            </p>
          ) : (
            <div className="space-y-4">
              {campaign.events.map((evt, idx) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {evt.title}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                        {EVENT_STATUS_LABELS[evt.status]}
                      </span>
                    </div>

                    {evt.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                        {evt.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pl-8 pt-1">
                      {evt.event_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-red-500" />
                          {new Date(evt.event_date).toLocaleString('vi-VN')}
                        </span>
                      )}
                      {evt.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          {evt.location}
                        </span>
                      )}
                    </div>

                    {evt.summary_result && (
                      <div className="ml-8 mt-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Kết quả / Tổng kết:
                        </div>
                        <p>{evt.summary_result}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Evidence Section */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              Minh chứng phong trào ({campaign.evidence?.length || 0})
            </h2>
          </div>

          {!campaign.evidence || campaign.evidence.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              Chưa có tài liệu / hình ảnh minh chứng nào được đính kèm.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {campaign.evidence.map((ev) => (
                <a
                  key={ev.id}
                  href={ev.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-red-500/50 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 text-[10px] font-bold uppercase">
                        {EVIDENCE_TYPE_LABELS[ev.evidence_type]}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 transition-colors" />
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 transition-colors line-clamp-2">
                      {ev.title}
                    </h4>

                    {ev.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {ev.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                    <span>Xem tài liệu / hình ảnh</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Back Link */}
        <div className="pt-4 text-center">
          <Link
            to="/hoat-dong"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Danh sách hoạt động</span>
          </Link>
        </div>

      </main>
    </div>
  );
}
