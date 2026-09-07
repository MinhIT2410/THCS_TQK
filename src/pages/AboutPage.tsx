/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { aboutContentService } from '../services/aboutContentService';
import { AboutItem, AboutItemType } from '../types/about';
import { ROUTES } from '../config/routes';

const DynamicIcon = ({ name, className }: { name?: string | null; className?: string }) => {
  if (!name) return <Icons.Shield className={className} />;
  const IconComponent = (Icons as any)[name] || Icons.Shield;
  return <IconComponent className={className} />;
};

const itemTypeLabels: Record<AboutItemType, string> = {
  ORGANIZATION: 'Tổ chức cấp trên',
  SCHOOL_UNIT: 'Đơn vị trung tâm',
  TEAM: 'Ban chỉ huy / Đội chuyên trách',
  CLUB: 'Câu lạc bộ',
  OTHER: 'Khác',
};

export default function AboutPage() {
  const [items, setItems] = useState<AboutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      setError(null);
      try {
        const data = await aboutContentService.getPublishedItems();
        setItems(data);
      } catch (err) {
        console.error('Failed to load about items:', err);
        setError('Không thể tải sơ đồ tổ chức giới thiệu.');
      } finally {
        setLoading(false);
      }
    }
    loadItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Organize elements into 3 Tiers purely based on data specifications
  // Tầng 1: Mục không có parent_id và có loại ORGANIZATION
  const tier1 = items
    .filter(item => item.is_published && !item.parent_id && item.item_type === 'ORGANIZATION')
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  
  const tier1Ids = tier1.map(t => t.id);

  // Tầng 2: Mục có parent_id trỏ tới tổ chức cấp trên hoặc có loại SCHOOL_UNIT
  const tier2 = items
    .filter(
      item =>
        item.is_published &&
        (item.item_type === 'SCHOOL_UNIT' || (item.parent_id && tier1Ids.includes(item.parent_id)))
    )
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const tier2Ids = tier2.map(t => t.id);

  // Tầng 3: Các mục có parent_id trỏ tới Liên đội (Tầng 2)
  const tier3 = items
    .filter(item => item.is_published && item.parent_id && tier2Ids.includes(item.parent_id))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12 pb-24 font-sans relative">
      {/* Page Header / Hero Area */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 rounded-full inline-block border border-red-200/30">
          Sơ đồ tổ chức & các đội nhóm trực thuộc
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Đội TNTP Hồ Chí Minh & Liên đội
        </h1>
        <p className="font-sans text-slate-600 dark:text-slate-400 text-sm sm:text-base">
          Thông tin, lịch sử về tổ chức Đội TNTP Hồ Chí Minh, Liên đội THCS Trần Quang Khải, các Đội nhóm măng non
        </p>
      </div>

      {loading ? (
        <div className="space-y-12 max-w-4xl mx-auto animate-pulse">
          <div className="h-48 bg-slate-100 dark:bg-slate-900 rounded-2xl w-full max-w-2xl mx-auto" />
          <div className="h-40 bg-slate-100 dark:bg-slate-900 rounded-2xl w-full max-w-xl mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-20 border border-dashed border-red-300 dark:border-red-900 rounded-2xl max-w-xl mx-auto space-y-4 bg-red-50/10">
          <Icons.AlertCircle className="h-12 w-12 mx-auto text-red-500 opacity-80" />
          <h3 className="font-display text-lg font-bold text-red-800 dark:text-red-400">{error}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Có lỗi xảy ra trong quá trình kết nối với cơ sở dữ liệu. Vui lòng tải lại trang hoặc quay lại sau!
          </p>
        </div>
      ) : (
        <div className="space-y-0 relative">
          {/* ==================================================
              TẦNG 1 — TỔ CHỨC CẤP TRÊN
             ================================================== */}
          <div className="relative flex flex-col items-center">
            {tier1.length === 0 ? (
              <div className="max-w-2xl w-full border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 dark:text-slate-500 text-sm">
                Chưa thiết lập tổ chức cấp trên.
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-6">
                {tier1.map(item => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -4 }}
                    className="max-w-2xl w-full bg-white dark:bg-slate-900 border-2 border-red-500/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative group"
                  >
                    <Link to={`${ROUTES.ABOUT}/${item.slug}`} className="block h-full p-6 md:p-8">
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {item.logo_url ? (
                          <img
                            src={item.logo_url}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="h-20 w-20 rounded-2xl object-contain bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-850 shrink-0 shadow-inner"
                          />
                        ) : (
                          <div
                            className="h-20 w-20 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
                            style={{ backgroundColor: item.accent_color || '#ef4444' }}
                          >
                            <DynamicIcon name={item.icon_name} className="h-10 w-10" />
                          </div>
                        )}
                        <div className="space-y-2 text-center md:text-left flex-1">
                          <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-200/30">
                            {itemTypeLabels[item.item_type]}
                          </span>
                          <h2 className="font-display text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {item.title}
                          </h2>
                          {item.summary && (
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                              {item.summary}
                            </p>
                          )}
                          <div className="pt-2 flex justify-center md:justify-start">
                            <span className="inline-flex items-center space-x-1 text-xs font-bold text-red-600 dark:text-red-400 group-hover:underline">
                              <span>Tìm hiểu thêm</span>
                              <Icons.ChevronRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Connective Line 1 -> 2 */}
          {tier1.length > 0 && tier2.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="h-12 w-0.5 bg-indigo-500/40 dark:bg-indigo-400/30" />
              <div className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
            </div>
          )}

          {/* ==================================================
              TẦNG 2 — ĐƠN VỊ TRUNG TÂM
             ================================================== */}
          <div className="relative flex flex-col items-center">
            {tier2.length === 0 ? (
              <div className="max-w-xl w-full border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 dark:text-slate-500 text-sm">
                Chưa thiết lập đơn vị Liên đội.
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-6">
                {tier2.map(item => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -4 }}
                    className="max-w-xl w-full bg-white dark:bg-slate-900 border-2 border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative group"
                  >
                    <Link to={`${ROUTES.ABOUT}/${item.slug}`} className="block h-full p-6 md:p-7">
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                        {item.logo_url ? (
                          <img
                            src={item.logo_url}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="h-16 w-16 rounded-xl object-contain bg-slate-50 dark:bg-slate-950 p-1.5 border border-slate-100 dark:border-slate-850 shrink-0 shadow-inner"
                          />
                        ) : (
                          <div
                            className="h-16 w-16 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                            style={{ backgroundColor: item.accent_color || '#3b82f6' }}
                          >
                            <DynamicIcon name={item.icon_name} className="h-8 w-8" />
                          </div>
                        )}
                        <div className="space-y-1.5 text-center md:text-left flex-1">
                          <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-200/30">
                            {itemTypeLabels[item.item_type]}
                          </span>
                          <h3 className="font-display text-lg md:text-xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.title}
                          </h3>
                          {item.summary && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                              {item.summary}
                            </p>
                          )}
                          <div className="pt-2 flex justify-center md:justify-start">
                            <span className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                              <span>Xem thông tin Liên đội</span>
                              <Icons.ChevronRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Connective Line 2 -> 3 */}
          {tier2.length > 0 && (
            <div className="relative flex flex-col items-center">
              <div className="h-12 w-0.5 bg-indigo-500/40 dark:bg-indigo-400/30" />
              <div className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-indigo-200/50 dark:border-indigo-800/30">
                Các đội nhóm trực thuộc
              </div>
              <div className="h-10 w-0.5 bg-indigo-500/40 dark:bg-indigo-400/30" />
            </div>
          )}

          {/* ==================================================
              TẦNG 3 — CÁC ĐỘI NHÓM TRỰC THUỘC
             ================================================== */}
          <div className="relative">
            {/* Visual branching layout line helper on Desktop only */}
            {tier3.length > 1 && (
              <div className="absolute top-0 left-[15%] right-[15%] h-0.5 bg-indigo-500/20 dark:bg-indigo-400/20 hidden xl:block" />
            )}

            {tier3.length === 0 ? (
              <div className="max-w-xl mx-auto border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                Các đội nhóm trực thuộc đang được cập nhật.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                {tier3.map(item => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -4 }}
                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-indigo-500/30 transition-all duration-300 relative flex flex-col justify-between h-full"
                  >
                    <Link to={`${ROUTES.ABOUT}/${item.slug}`} className="flex flex-col justify-between h-full p-6 space-y-4">
                      <div className="space-y-3">
                        {/* Branch line from top horizontal bar to card on Desktop */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-4 w-0.5 bg-indigo-500/20 dark:bg-indigo-400/20 hidden xl:block" />

                        <div className="flex items-center space-x-3">
                          {item.logo_url ? (
                            <img
                              src={item.logo_url}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="h-12 w-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-950 p-1 border border-slate-100 dark:border-slate-850 shrink-0"
                            />
                          ) : (
                            <div
                              className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: item.accent_color || '#10b981' }}
                            >
                              <DynamicIcon name={item.icon_name} className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <span className="text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30">
                              {itemTypeLabels[item.item_type] || 'Đội nhóm'}
                            </span>
                            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-0.5">
                              {item.title}
                            </h4>
                          </div>
                        </div>

                        {item.summary && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {item.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center text-[10px] font-bold text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Xem chi tiết</span>
                        <Icons.ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

