/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Award, ArrowRight, Eye, Calendar, Sparkles, BookOpen, Volume2, Landmark, FileText, ExternalLink } from 'lucide-react';
import { NewsItem, ActivityItem, PhotoItem } from '../../types';
import Hero from './Hero';
import { bannerService } from '../../services/bannerService';
import { HomeBanner } from '../../types/banner';
import { newsApi } from '../../features/news/newsApi';
import { documentApi } from '../../features/documents/documentApi';
import { albumApi } from '../../features/albums/albumApi';
import { DEFAULT_IMAGES } from '../../config/defaults/images.defaults';
import { useHomeCmsData } from '../../features/cms/hooks/useHomeCmsData';
import { RADIO_PROGRAM_DEFAULT, GALLERY_BLOCK_DEFAULT, UNCLE_HO_BLOCK_DEFAULT, NEWS_BLOCK_DEFAULT, CAMPAIGNS_BLOCK_DEFAULT, DOCUMENTS_BLOCK_DEFAULT } from '../../config/defaults/home.defaults';
import { deepMerge } from '../../utils/deepMerge';
import RadioProgramBanner from './RadioProgramBanner';
import RadioProgramPlayer from './RadioProgramPlayer';
import EditableBlock from '../editable/EditableBlock';
import { movementService } from '../../services/movementService';
import type { MovementCampaign } from '../../types/movement';

interface HomeProps {
  news: NewsItem[];
  activities: ActivityItem[];
  photos: PhotoItem[];
  onNavigate: (viewId: string) => void;
  onSelectNews: (item: NewsItem) => void;
  onSelectActivity: (item: ActivityItem) => void;
}

export default function Home({
  news,
  activities,
  photos,
  onNavigate,
  onSelectNews,
  onSelectActivity
}: HomeProps) {
  const navigate = useNavigate();

  const [publishedBanners, setPublishedBanners] = useState<HomeBanner[]>([]);
  const [latestTimelineCampaigns, setLatestTimelineCampaigns] = useState<MovementCampaign[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState(false);

  useEffect(() => {
    let active = true;
    movementService.getPublishedCampaigns()
      .then((items) => {
        if (!active) return;
        setLatestTimelineCampaigns(items
          .filter((item) => item.campaign_type !== 'thuong_xuyen' && Boolean(item.start_date))
          .sort((a, b) => new Date(b.start_date!).getTime() - new Date(a.start_date!).getTime() || a.id.localeCompare(b.id))
          .slice(0, 6));
      })
      .catch((err) => {
        console.error('Cannot load homepage timeline campaigns:', err);
        if (active) setTimelineError(true);
      })
      .finally(() => { if (active) setTimelineLoading(false); });
    return () => { active = false; };
  }, []);
  
  // CMS overrides for radio program
  const { overrides, status, saveOverride, resetOverride, error } = useHomeCmsData();
  const radioOverride = overrides['radioProgram'];
  const finalRadioData = deepMerge(RADIO_PROGRAM_DEFAULT, radioOverride?.data);
  const galleryOverride = overrides['galleryBlock'];
  const finalGalleryData = deepMerge(GALLERY_BLOCK_DEFAULT, galleryOverride?.data);
  const uncleHoOverride = overrides['uncleHoBlock'];
  const finalUncleHoData = deepMerge(UNCLE_HO_BLOCK_DEFAULT, uncleHoOverride?.data);
  const newsOverride = overrides['newsBlock'];
  const finalNewsData = deepMerge(NEWS_BLOCK_DEFAULT, newsOverride?.data);
  const campaignsOverride = overrides['campaignsBlock'];
  const finalCampaignsData = deepMerge(CAMPAIGNS_BLOCK_DEFAULT, campaignsOverride?.data);
  const documentsOverride = overrides['documentsBlock'];
  const finalDocumentsData = deepMerge(DOCUMENTS_BLOCK_DEFAULT, documentsOverride?.data);

  // Audio player state
  const [activeAudio, setActiveAudio] = useState<{
    audioUrl: string;
    title: string;
    eyebrow: string;
    coverImageUrl?: string;
    durationLabel?: string;
  } | null>(null);

  const getSafeFilename = (titleText: string, defaultName: string = 'phat-thanh-mang-non.mp3') => {
    if (!titleText) return defaultName;
    const cleaned = titleText
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return cleaned ? `${cleaned}.mp3` : defaultName;
  };

  const isSameOrigin = (urlStr: string) => {
    try {
      const url = new URL(urlStr, window.location.origin);
      return url.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  };

  const handleListenClick = () => {
    if (!finalRadioData.audioUrl) {
      return;
    }

    if (finalRadioData.openMode === 'DOWNLOAD') {
      const isExternal = !isSameOrigin(finalRadioData.audioUrl);
      if (isExternal) {
        const newWindow = window.open(
          finalRadioData.audioUrl,
          '_blank',
          'noopener,noreferrer'
        );
        if (newWindow) {
          newWindow.opener = null;
        }
      } else {
        const safeName = getSafeFilename(finalRadioData.title);
        const link = document.createElement('a');
        link.href = finalRadioData.audioUrl;
        link.download = safeName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else if (finalRadioData.openMode === 'NEW_TAB') {
      const newWindow = window.open(
        finalRadioData.audioUrl,
        '_blank',
        'noopener,noreferrer'
      );
      if (newWindow) {
        newWindow.opener = null;
      }
    } else {
      // PLAYER mode
      setActiveAudio({
        audioUrl: finalRadioData.audioUrl,
        title: finalRadioData.title,
        eyebrow: finalRadioData.eyebrow,
        coverImageUrl: finalRadioData.coverImageUrl,
        durationLabel: finalRadioData.durationLabel,
      });
    }
  };
  const [isLoadingBanners, setIsLoadingBanners] = useState<boolean>(true);

  // Dynamic state for live sections
  const [newsList, setNewsList] = useState<any[]>([]);
  const [docList, setDocList] = useState<any[]>([]);
  const [albumList, setAlbumList] = useState<any[]>([]);

  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState<boolean>(true);

  const [errorNews, setErrorNews] = useState<string | null>(null);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);
  const [errorAlbums, setErrorAlbums] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchBanners = async () => {
      try {
        const list = await bannerService.getPublishedBanners();
        if (active) {
          setPublishedBanners(list);
        }
      } catch (err) {
        console.error('Error fetching published banners:', err);
      } finally {
        if (active) {
          setIsLoadingBanners(false);
        }
      }
    };
    fetchBanners();
    return () => {
      active = false;
    };
  }, []);

  // Fetch live News
  useEffect(() => {
    let active = true;
    const fetchNewsData = async () => {
      try {
        setIsLoadingNews(true);
        setErrorNews(null);
        const posts = await newsApi.getPublishedNews();
        if (active) {
          if (posts && posts.length > 0) {
            setNewsList(posts.slice(0, 3));
          } else if (news && news.length > 0) {
            setNewsList(news.slice(0, 3));
          }
        }
      } catch (err: any) {
        console.warn('Error loading news on homepage:', err);
        if (active) {
          if (news && news.length > 0) {
            setNewsList(news.slice(0, 3));
          } else {
            setErrorNews('Không thể tải dữ liệu mới nhất.');
          }
        }
      } finally {
        if (active) {
          setIsLoadingNews(false);
        }
      }
    };
    fetchNewsData();
    return () => {
      active = false;
    };
  }, [news]);

  // Fetch live Documents
  useEffect(() => {
    let active = true;
    const fetchDocsData = async () => {
      try {
        setIsLoadingDocs(true);
        setErrorDocs(null);
        const docs = await documentApi.getDocuments();
        if (active) {
          setDocList(docs.slice(0, 4)); // Show up to 4 latest documents
        }
      } catch (err: any) {
        console.warn('Error loading docs on homepage:', err);
        if (active) {
          setErrorDocs('Không thể tải dữ liệu mới nhất.');
        }
      } finally {
        if (active) {
          setIsLoadingDocs(false);
        }
      }
    };
    fetchDocsData();
    return () => {
      active = false;
    };
  }, []);

  // Fetch live Albums
  useEffect(() => {
    let active = true;
    const fetchAlbumsData = async () => {
      try {
        setIsLoadingAlbums(true);
        setErrorAlbums(null);
        const albums = await albumApi.getAlbums();
        if (active) {
          setAlbumList(albums.slice(0, 4)); // Show up to 4 latest albums
        }
      } catch (err: any) {
        console.warn('Error loading albums on homepage:', err);
        if (active) {
          setErrorAlbums('Không thể tải dữ liệu mới nhất.');
        }
      } finally {
        if (active) {
          setIsLoadingAlbums(false);
        }
      }
    };
    fetchAlbumsData();
    return () => {
      active = false;
    };
  }, []);


  // Document categories map
  const docCategoryMap: Record<string, string> = {
    ke_hoach: 'Kế hoạch',
    cong_van: 'Công văn',
    bieu_mau: 'Biểu mẫu',
    quyet_dinh: 'Quyết định',
    khac: 'Khác'
  };

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero Banner Component */}
      <Hero 
        onNavigate={onNavigate}
        overrides={overrides}
        saveOverride={saveOverride}
        resetOverride={resetOverride}
        error={error}
        status={status}
      />

      {/* 2. Quick Broadcast / Phát thanh măng non strip */}
      <RadioProgramBanner
        data={finalRadioData}
        overrideData={radioOverride}
        onSave={saveOverride}
        onReset={resetOverride}
        error={error}
        onListenClick={handleListenClick}
      />

      {/* Homepage news block intentionally hidden. News routes and CMS data remain unchanged. */}

      {/* 4. Movements & Activities Tracker (Call to Action) */}
      <section className="bg-blue-900/5 dark:bg-blue-950/10 py-16 transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EditableBlock
          pageKey="home"
          blockKey="campaignsBlock"
          title="Khối Phong Trào Thi Đua"
          defaultData={CAMPAIGNS_BLOCK_DEFAULT}
          overrideData={campaignsOverride}
          onSave={saveOverride}
          onReset={resetOverride}
          error={error}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 p-2">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
                {finalCampaignsData.eyebrow}
              </span>
              <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {finalCampaignsData.title}
              </h2>
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
                {finalCampaignsData.description}
              </p>
            </div>
            <button
              onClick={() => navigate('/hoat-dong')}
              id="view-all-activities-btn"
              className="flex items-center space-x-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline mt-2 sm:mt-0 transition-colors"
            >
              <span>{finalCampaignsData.buttonLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </EditableBlock>

          {timelineLoading && <p className="text-sm text-slate-500" role="status">Đang tải hoạt động...</p>}
          {timelineError && <p className="text-sm text-red-600" role="alert">Chưa thể tải hoạt động từ trang Hoạt động.</p>}
          {!timelineLoading && !timelineError && latestTimelineCampaigns.length === 0 && (
            <p className="text-sm text-slate-500">Chưa có hoạt động theo mốc thời gian được công bố.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {latestTimelineCampaigns.map((campaign, idx) => (
              <motion.article
                key={campaign.id}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-[2rem] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 flex flex-col sm:flex-row gap-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="w-full sm:w-44 h-44 shrink-0 rounded-2xl overflow-hidden bg-slate-100 relative">
                  <img src={campaign.cover_image_url || DEFAULT_IMAGES.newsThumbnail} alt={campaign.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <span className="absolute top-3 left-3 uppercase text-[9px] font-extrabold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-md">
                    {campaign.status === 'dang_dien_ra' ? 'Đang diễn ra' : campaign.status === 'sap_dien_ra' ? 'Sắp diễn ra' : 'Đã kết thúc'}
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Thời gian: {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('vi-VN') : '---'}{campaign.end_date ? ` – ${new Date(campaign.end_date).toLocaleDateString('vi-VN')}` : ''}</span>
                    </span>
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight">{campaign.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{campaign.summary || 'Xem thông tin chi tiết hoạt động.'}</p>
                  </div>
                  <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button onClick={() => navigate(`/hoat-dong/${campaign.slug}`)} className="rounded-xl bg-blue-50 text-blue-600 px-4 py-2 text-xs font-bold hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors">
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* 4.5. Featured Documents Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EditableBlock
          pageKey="home"
          blockKey="documentsBlock"
          title="Khối Văn Bản - Tài Liệu"
          defaultData={DOCUMENTS_BLOCK_DEFAULT}
          overrideData={documentsOverride}
          onSave={saveOverride}
          onReset={resetOverride}
          error={error}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 p-2">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
                {finalDocumentsData.eyebrow}
              </span>
              <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {finalDocumentsData.title}
              </h2>
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
                {finalDocumentsData.description}
              </p>
            </div>
            <button
              onClick={() => navigate('/tai-lieu')}
              className="flex items-center space-x-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline mt-2 sm:mt-0 transition-colors"
            >
              <span>{finalDocumentsData.buttonLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </EditableBlock>

        {isLoadingDocs ? (
          <div className="flex justify-center items-center py-16">
            <span className="text-xs font-semibold text-slate-400 animate-pulse">Đang tải danh sách tài liệu...</span>
          </div>
        ) : errorDocs ? (
          <div className="flex justify-center items-center py-12 rounded-[2rem] border border-dashed border-red-200 bg-red-50/20 text-red-500 text-xs font-semibold">
            Không thể tải dữ liệu mới nhất.
          </div>
        ) : docList.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] max-w-md mx-auto p-8 space-y-3">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Chưa có tài liệu nào</h3>
            <p className="text-xs text-slate-400 font-medium">Các tài liệu, công văn hướng dẫn sẽ được cập nhật sớm nhất.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {docList.map((doc, idx) => {
              // Format file size nicely
              let sizeStr = 'Không rõ';
              if (doc.file_size && doc.file_size > 0) {
                if (doc.file_size >= 1024 * 1024) {
                  sizeStr = `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`;
                } else {
                  sizeStr = `${(doc.file_size / 1024).toFixed(0)} KB`;
                }
              } else if (typeof doc.file_size === 'string') {
                sizeStr = doc.file_size;
              }

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  className="p-5 rounded-[2rem] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm flex items-start gap-4 hover:shadow-md transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 uppercase">
                        {docCategoryMap[doc.category] || doc.category || 'Khác'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {doc.published_at ? new Date(doc.published_at).toLocaleDateString('vi-VN') : new Date(doc.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {doc.description || 'Không có mô tả chi tiết cho tài liệu này.'}
                    </p>
                    {doc.file_name && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        Tên tệp: {doc.file_name} ({sizeStr})
                      </p>
                    )}
                    <div className="pt-2 flex items-center gap-4">
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>Xem tài liệu</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 cursor-not-allowed">
                          Không có liên kết
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Traditional Section / Lịch sử măng non */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EditableBlock
          pageKey="home"
          blockKey="uncleHoBlock"
          title="Khối Bác Hồ Với Thiếu Nhi"
          defaultData={UNCLE_HO_BLOCK_DEFAULT}
          overrideData={uncleHoOverride}
          onSave={saveOverride}
          onReset={resetOverride}
          error={error}
        >
          <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 md:p-12 relative overflow-hidden shadow-2xl border border-white/5">
            {/* Accent decoration */}
            <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600 via-blue-600 to-transparent pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-5 relative z-10">
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-red-600/30 border border-red-500/40 px-3.5 py-1.5 text-xs font-bold text-red-300 uppercase tracking-wider">
                  <Landmark className="h-3.5 w-3.5" />
                  <span>{finalUncleHoData.eyebrow}</span>
                </span>
                <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl leading-tight">
                  {finalUncleHoData.title}
                </h2>
                <p className="font-sans text-sm text-slate-300 leading-relaxed max-w-3xl whitespace-pre-wrap">
                  {finalUncleHoData.description}
                </p>
                <div className="flex flex-wrap gap-2.5 text-xs font-bold pt-2">
                  {finalUncleHoData.rule1 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                      {finalUncleHoData.rule1}
                    </div>
                  )}
                  {finalUncleHoData.rule2 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                      {finalUncleHoData.rule2}
                    </div>
                  )}
                  {finalUncleHoData.rule3 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                      {finalUncleHoData.rule3}
                    </div>
                  )}
                  {finalUncleHoData.rule4 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                      {finalUncleHoData.rule4}
                    </div>
                  )}
                  {finalUncleHoData.rule5 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                      {finalUncleHoData.rule5}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="lg:col-span-4 flex justify-center relative z-10">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-2 backdrop-blur-md max-w-[280px] shadow-2xl">
                  <div className="overflow-hidden rounded-2xl aspect-[4/5] bg-slate-800 relative">
                    <img 
                      src={finalUncleHoData.imageUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80"} 
                      alt="Bác Hồ cùng thiếu nhi" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {finalUncleHoData.imageCaption && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                        <p className="text-[10px] text-slate-300 italic text-center w-full">
                          {finalUncleHoData.imageCaption}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </EditableBlock>
      </section>

      {/* 6. Photo Gallery Highlights */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <EditableBlock
          pageKey="home"
          blockKey="galleryBlock"
          title="Khối Thư Viện Ảnh"
          defaultData={GALLERY_BLOCK_DEFAULT}
          overrideData={galleryOverride}
          onSave={saveOverride}
          onReset={resetOverride}
          error={error}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 p-2">
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/40 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
                {finalGalleryData.eyebrow}
              </span>
              <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {finalGalleryData.title}
              </h2>
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
                {finalGalleryData.description}
              </p>
            </div>
            <button
              onClick={() => navigate('/thu-vien')}
              id="view-all-gallery-btn"
              className="flex items-center space-x-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline mt-2 sm:mt-0 transition-colors"
            >
              <span>{finalGalleryData.buttonLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </EditableBlock>

        {isLoadingAlbums ? (
          <div className="flex justify-center items-center py-16">
            <span className="text-xs font-semibold text-slate-400 animate-pulse">Đang tải danh sách album...</span>
          </div>
        ) : errorAlbums ? (
          <div className="flex justify-center items-center py-12 rounded-[2rem] border border-dashed border-red-200 bg-red-50/20 text-red-500 text-xs font-semibold">
            Không thể tải dữ liệu mới nhất.
          </div>
        ) : albumList.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] max-w-md mx-auto p-8 space-y-3">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Chưa có album ảnh nào</h3>
            <p className="text-xs text-slate-400 font-medium">Các album ghi lại hoạt động Đội của trường sẽ sớm được ra mắt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {albumList.map((album, idx) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -6 }}
                onClick={() => navigate(`/thu-vien/${album.id}`)}
                className="group cursor-pointer rounded-[2rem] overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
              >
                <div className="relative aspect-video overflow-hidden bg-slate-150">
                  <img 
                    src={album.cover_image_url || DEFAULT_IMAGES.albumCover} 
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{album.published_at ? new Date(album.published_at).toLocaleDateString('vi-VN') : new Date(album.created_at).toLocaleDateString('vi-VN')}</span>
                    </span>
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                      {album.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {album.description || 'Không có mô tả cho album này.'}
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-1 hover:underline">
                    <span>Xem album</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Floating Radio Program Player */}
      {activeAudio && (
        <RadioProgramPlayer
          audioUrl={activeAudio.audioUrl}
          title={activeAudio.title}
          eyebrow={activeAudio.eyebrow}
          coverImageUrl={activeAudio.coverImageUrl}
          durationLabel={activeAudio.durationLabel}
          onClose={() => setActiveAudio(null)}
        />
      )}
    </div>
  );
}
