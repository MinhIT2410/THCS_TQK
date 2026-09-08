/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, FileText, Calendar, FileCode, ArrowRight, AlertCircle 
} from 'lucide-react';

import { ROUTES } from './config/routes';
import { STORAGE_KEYS } from './config/storageKeys';

import Layout from './pages/Layout';
import HomePage from './pages/HomePage';

// Route-level code splitting:
// Keep only the public shell + homepage in the initial bundle.
// Heavy admin/report/Excel/PDF/chart code is downloaded only when that route is opened.
const AboutPage = React.lazy(() => import('./pages/AboutPage'));
const NewsPage = React.lazy(() => import('./pages/NewsPage'));
const GalleryPage = React.lazy(() => import('./pages/GalleryPage'));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const AdminLayout = React.lazy(() => import('./layouts/admin/AdminLayout'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminNewsPage = React.lazy(() => import('./pages/admin/AdminNewsPage'));
const AdminDocumentsPage = React.lazy(() => import('./pages/admin/AdminDocumentsPage'));
const AdminAlbumsPage = React.lazy(() => import('./pages/admin/AdminAlbumsPage'));
const AdminCmsPage = React.lazy(() => import('./pages/admin/AdminCmsPage'));
const AdminAboutPage = React.lazy(() => import('./pages/admin/AdminAboutPage'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminSettingsPage = React.lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminMovementsPage = React.lazy(() => import('./pages/admin/AdminMovementsPage'));
const NewsDetailPage = React.lazy(() => import('./pages/NewsDetailPage'));
const AlbumDetailPage = React.lazy(() => import('./pages/AlbumDetailPage'));
const AboutDetailPage = React.lazy(() => import('./pages/AboutDetailPage'));
const MovementsPage = React.lazy(() => import('./pages/MovementsPage'));
const MovementDetailPage = React.lazy(() => import('./pages/MovementDetailPage'));
const FlagCeremonyPage = React.lazy(() => import('./pages/FlagCeremonyPage'));
const CompetitionOverviewPage = React.lazy(() => import('./pages/CompetitionOverviewPage'));
const PublicUnitCompetitionPage = React.lazy(() => import('./pages/PublicUnitCompetitionPage'));
const StudentCompetitionPage = React.lazy(() => import('./pages/StudentCompetitionPage'));
const PublicGoodDeedsPage = React.lazy(() => import('./pages/PublicGoodDeedsPage'));
const PublicRewardShopPage = React.lazy(() => import('./pages/PublicRewardShopPage'));
const RecordIncidentPage = React.lazy(() => import('./pages/RecordIncidentPage'));
const CompetitionPendingPage = React.lazy(() => import('./pages/CompetitionPendingPage'));
const CompetitionReportPage = React.lazy(() => import('./pages/CompetitionReportPage'));
const AdminCompetitionPage = React.lazy(() => import('./pages/admin/AdminCompetitionPage'));
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import { CompetitionDetailGuard } from './components/auth/CompetitionDetailGuard';
import { AccessDenied } from './components/auth/AccessDenied';

import { newsService } from './services/newsService';
import { activityService } from './services/activityService';
import { documentService } from './services/documentService';
import { galleryService } from './services/galleryService';
import { aboutService } from './services/aboutService';
import { storage } from './services/storage/localStorage';
import { NewsItem, ActivityItem, PhotoItem, DocumentItem, ContactSubmission, LeaderProfile } from './types';

export const AppDataContext = React.createContext<any>(null);

export default function App() {
  return (
    <AppContent />
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- View state derived from Route Path ---
  const getActiveView = (pathname: string): string => {
    if (pathname === ROUTES.HOME) return 'home';
    if (pathname === ROUTES.ABOUT) return 'about';
    if (pathname === ROUTES.NEWS) return 'news';
    if (pathname === ROUTES.ACTIVITIES || pathname.startsWith('/hoat-dong') || pathname === ROUTES.MOVEMENTS || pathname.startsWith('/hoat-dong-phong-trao')) return 'activities';
    if (pathname === ROUTES.GALLERY) return 'gallery';
    if (pathname === ROUTES.DOCUMENTS) return 'documents';
    if (pathname === ROUTES.COMPETITION || pathname.startsWith('/thi-dua')) return 'competition';
    if (pathname === ROUTES.CONTACT) return 'contact';
    if (pathname === ROUTES.ADMIN) return 'cms';
    return 'home';
  };
  const currentView = getActiveView(location.pathname);

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = storage.get<string>(STORAGE_KEYS.THEME);
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // --- Core Persistent State ---
  const [schoolName, setSchoolName] = useState<string>(() => {
    const saved = storage.get<string>(STORAGE_KEYS.SCHOOL_NAME);
    return (!saved || saved === "Liên đội THCS Chu Văn An") ? aboutService.getSchoolName() : saved;
  });
  
  const [schoolSlogan, setSchoolSlogan] = useState<string>(() => {
    const saved = storage.get<string>(STORAGE_KEYS.SCHOOL_SLOGAN);
    return (!saved || saved === "Thiếu nhi Chu Văn An - Chăm ngoan, học tốt, tiếp bước cha anh") ? aboutService.getSchoolSlogan() : saved;
  });

  const [leaders, setLeaders] = useState<LeaderProfile[]>(() => {
    const saved = storage.get<LeaderProfile[]>(STORAGE_KEYS.LEADERS);
    return saved !== null ? saved : aboutService.getAll();
  });

  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = storage.get<NewsItem[]>(STORAGE_KEYS.NEWS);
    return saved !== null ? saved : newsService.getAll();
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const saved = storage.get<ActivityItem[]>(STORAGE_KEYS.ACTIVITIES);
    return saved !== null ? saved : activityService.getAll();
  });

  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const saved = storage.get<PhotoItem[]>(STORAGE_KEYS.PHOTOS);
    return saved !== null ? saved : galleryService.getAll();
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = storage.get<DocumentItem[]>(STORAGE_KEYS.DOCUMENTS);
    return saved !== null ? saved : documentService.getAll();
  });

  const [contacts, setContacts] = useState<ContactSubmission[]>(() => {
    const saved = storage.get<ContactSubmission[]>(STORAGE_KEYS.CONTACTS);
    return saved !== null ? saved : [];
  });

  // --- Search Overlay States ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // --- Scroll to Top Helper on Route Change ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  // --- Dark Mode Sync with Class ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      storage.set<string>(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      storage.set<string>(STORAGE_KEYS.THEME, 'light');
    }
  }, [isDarkMode]);

  // --- Persist Core Data changes to Local Storage ---
  useEffect(() => {
    storage.set<string>(STORAGE_KEYS.SCHOOL_NAME, schoolName);
  }, [schoolName]);

  useEffect(() => {
    storage.set<string>(STORAGE_KEYS.SCHOOL_SLOGAN, schoolSlogan);
  }, [schoolSlogan]);

  useEffect(() => {
    storage.set<LeaderProfile[]>(STORAGE_KEYS.LEADERS, leaders);
  }, [leaders]);

  useEffect(() => {
    storage.set<NewsItem[]>(STORAGE_KEYS.NEWS, news);
  }, [news]);

  useEffect(() => {
    storage.set<ActivityItem[]>(STORAGE_KEYS.ACTIVITIES, activities);
  }, [activities]);

  useEffect(() => {
    storage.set<PhotoItem[]>(STORAGE_KEYS.PHOTOS, photos);
  }, [photos]);

  useEffect(() => {
    storage.set<DocumentItem[]>(STORAGE_KEYS.DOCUMENTS, documents);
  }, [documents]);

  useEffect(() => {
    storage.set<ContactSubmission[]>(STORAGE_KEYS.CONTACTS, contacts);
  }, [contacts]);

  // --- Reset database to default seed data ---
  const handleResetDefaults = () => {
    setSchoolName(aboutService.getSchoolName());
    setSchoolSlogan(aboutService.getSchoolSlogan());
    setLeaders(aboutService.getAll());
    setNews(newsService.getAll());
    setActivities(activityService.getAll());
    setPhotos(galleryService.getAll());
    setDocuments(documentService.getAll());
    setContacts([]);
  };

  // --- Interactivity handlers ---
  const handleIncrementNewsViews = (id: string) => {
    setNews(prev => prev.map(item => item.id === id ? { ...item, views: item.views + 1 } : item));
  };

  const handleRegisterActivityParticipation = (id: string) => {
    setActivities(prev => prev.map(item => item.id === id ? { ...item, participantsCount: item.participantsCount + 1 } : item));
  };

  const handleSubmitContactForm = (submission: Omit<ContactSubmission, 'id' | 'date' | 'status'>) => {
    const newSubmission: ContactSubmission = {
      ...submission,
      id: `sub-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'unread'
    };
    setContacts(prev => [newSubmission, ...prev]);
  };

  // --- Navigation routers mapping ---
  const handleNavigate = (viewId: string) => {
    if (viewId === 'home') navigate(ROUTES.HOME);
    else if (viewId === 'about') navigate(ROUTES.ABOUT);
    else if (viewId === 'news') navigate(ROUTES.NEWS);
    else if (viewId === 'activities') navigate(ROUTES.ACTIVITIES);
    else if (viewId === 'movements') navigate(ROUTES.MOVEMENTS);
    else if (viewId === 'gallery') navigate(ROUTES.GALLERY);
    else if (viewId === 'documents') navigate(ROUTES.DOCUMENTS);
    else if (viewId === 'competition') navigate(ROUTES.COMPETITION);
    else if (viewId === 'contact') navigate(ROUTES.CONTACT);
    else if (viewId === 'cms') navigate(ROUTES.ADMIN);
  };

  const handleSelectNewsItem = (item: NewsItem) => {
    setSelectedNews(item);
    navigate(ROUTES.NEWS);
  };

  const handleSelectActivityItem = (item: ActivityItem) => {
    setSelectedActivity(item);
    navigate(ROUTES.ACTIVITIES);
  };

  // --- Global search engine matches ---
  const searchResults = React.useMemo(() => {
    if (!globalSearchTerm.trim()) return { news: [], activities: [], docs: [] };
    const term = globalSearchTerm.toLowerCase();

    const matchedNews = news.filter(n => n.title.toLowerCase().includes(term) || n.summary.toLowerCase().includes(term));
    const matchedActs = activities.filter(a => a.title.toLowerCase().includes(term) || a.description.toLowerCase().includes(term));
    const matchedDocs = documents.filter(d => d.title.toLowerCase().includes(term) || d.code.toLowerCase().includes(term));

    return { news: matchedNews, activities: matchedActs, docs: matchedDocs };
  }, [globalSearchTerm, news, activities, documents]);

  const handleJumpToSearchResult = (view: string, item: any) => {
    setIsSearchOpen(false);
    setGlobalSearchTerm('');
    if (view === 'news') {
      setSelectedNews(item);
      navigate(ROUTES.NEWS);
    } else if (view === 'activities') {
      setSelectedActivity(item);
      navigate(ROUTES.ACTIVITIES);
    } else {
      handleNavigate(view);
    }
  };

  const contextValue = {
    news,
    activities,
    photos,
    documents,
    contacts,
    leaders,
    schoolName,
    setSchoolName,
    schoolSlogan,
    setSchoolSlogan,
    selectedNews,
    setSelectedNews,
    selectedActivity,
    setSelectedActivity,
    handleIncrementNewsViews,
    handleRegisterActivityParticipation,
    handleSubmitContactForm,
    handleResetDefaults,
    handleNavigate,
    handleSelectNewsItem,
    handleSelectActivityItem,
    achievements: aboutService.getAchievements(),
    isDarkMode,
    setIsDarkMode,
    setIsSearchOpen
  };

  return (
    <AppDataContext.Provider value={contextValue}>
      <React.Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Đang tải trang...</p>
            </div>
          </div>
        }
      >
      <Routes>
        <Route element={<Layout />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={`${ROUTES.ABOUT}/:slug`} element={<AboutDetailPage />} />
          <Route path={ROUTES.NEWS} element={<NewsPage />} />
          <Route path={`${ROUTES.NEWS}/:slug`} element={<NewsDetailPage />} />
          <Route path={ROUTES.ACTIVITIES} element={<MovementsPage />} />
          <Route path={ROUTES.FLAG_CEREMONY} element={<FlagCeremonyPage />} />
          <Route path={`${ROUTES.ACTIVITIES}/:slug`} element={<MovementDetailPage />} />
          {/* Backward-compatible alias for the temporary movement URL used during flag-ceremony development. */}
          <Route path={ROUTES.MOVEMENTS} element={<Navigate to={ROUTES.ACTIVITIES} replace />} />
          <Route path={`${ROUTES.MOVEMENTS}/:slug`} element={<MovementDetailPage />} />
          <Route path={ROUTES.GALLERY} element={<GalleryPage />} />
          <Route path={`${ROUTES.GALLERY}/:id`} element={<AlbumDetailPage />} />
          <Route path={ROUTES.DOCUMENTS} element={<DocumentsPage />} />
          <Route path={ROUTES.COMPETITION} element={<CompetitionOverviewPage />} />
          <Route
            path={ROUTES.COMPETITION_UNITS}
            element={
              <CompetitionDetailGuard>
                <PublicUnitCompetitionPage />
              </CompetitionDetailGuard>
            }
          />
          <Route
            path={ROUTES.COMPETITION_STUDENT}
            element={
              <CompetitionDetailGuard allowStudent>
                <StudentCompetitionPage />
              </CompetitionDetailGuard>
            }
          />
          <Route path={ROUTES.COMPETITION_GOOD_DEEDS} element={<PublicGoodDeedsPage />} />
          <Route path={ROUTES.COMPETITION_REWARDS} element={<PublicRewardShopPage />} />
          <Route
            path={ROUTES.COMPETITION_RECORD}
            element={
              <CompetitionDetailGuard>
                <RecordIncidentPage />
              </CompetitionDetailGuard>
            }
          />
          <Route
            path={ROUTES.COMPETITION_PENDING}
            element={
              <CompetitionDetailGuard>
                <CompetitionPendingPage />
              </CompetitionDetailGuard>
            }
          />
          <Route
            path={ROUTES.COMPETITION_REPORT}
            element={
              <CompetitionDetailGuard>
                <CompetitionReportPage />
              </CompetitionDetailGuard>
            }
          />
          <Route path={ROUTES.CONTACT} element={<ContactPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
        </Route>

        <Route
          path={ROUTES.ADMIN}
          element={
            <ProtectedRoute>
              <RoleGuard
                allowedRoles={['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL']}
                fallback={<AccessDenied message="Bạn không có quyền truy cập khu vực quản trị" />}
              >
                <AdminLayout />
              </RoleGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="thi-dua" element={<AdminCompetitionPage />} />
          <Route path="thi-dua/chi-doi" element={<AdminCompetitionPage />} />
          <Route path="thi-dua/cua-hang" element={<AdminCompetitionPage />} />
          <Route path="thi-dua/doi-qua" element={<AdminCompetitionPage />} />
          <Route path="thi-dua/xem-lai" element={<AdminCompetitionPage />} />
          <Route path="tin-tuc" element={<AdminNewsPage />} />
          <Route path="hoat-dong-phong-trao" element={<AdminMovementsPage />} />
          <Route path="tai-lieu" element={<AdminDocumentsPage />} />
          <Route path="album" element={<AdminAlbumsPage />} />
          <Route path="gioi-thieu" element={<AdminAboutPage />} />
          <Route path="cms" element={<AdminCmsPage />} />
          <Route
            path="nguoi-dung"
            element={
              <RoleGuard
                allowedRoles={['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL']}
                fallback={<AccessDenied message="Bạn không có quyền truy cập khu vực Quản lý người dùng. Chỉ tài khoản Quản trị viên và Ban giám hiệu mới có thể xem và điều khiển phân quyền." />}
              >
                <AdminUsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="cai-dat"
            element={
              <RoleGuard
                allowedRoles={['SUPER_ADMIN', 'PRINCIPAL']}
                fallback={<AccessDenied message="Bạn không có quyền truy cập khu vực Cài đặt cấu hình trường học. Quyền hạn hiện tại chỉ cho phép SUPER_ADMIN và PRINCIPAL toàn quyền quản trị. Với các vai trò khác (VICE_PRINCIPAL, STAFF), hệ thống cần được mở rộng thêm cấu hình Grant tài nguyên trong tương lai." />}
              >
                <AdminSettingsPage />
              </RoleGuard>
            }
          />
        </Route>
      </Routes>
      </React.Suspense>

      {/* Global Search Overlay Popup Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="global-search-modal">
            {/* Background blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:p-12 sm:pt-24">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6"
              >
                {/* Search header input */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center space-x-2 flex-1 mr-4">
                    <Search className="h-5 w-5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm nhanh mọi thông tin trên trang..."
                      autoFocus
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => { setIsSearchOpen(false); setGlobalSearchTerm(''); }}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Display matches list */}
                <div className="max-h-[50vh] overflow-y-auto space-y-5 pr-2">
                  {!globalSearchTerm.trim() ? (
                    <div className="text-center py-12 text-slate-400 font-sans text-xs space-y-2">
                      <Search className="h-8 w-8 mx-auto opacity-40 text-blue-500 animate-pulse" />
                      <p>Hãy nhập từ khóa tìm kiếm để tra cứu thông tin hoạt động, tin măng non, hay quyết định.</p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
                        {['Đại hội', 'Heo đất', 'Văn nghệ', 'Bằng khen'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setGlobalSearchTerm(tag)}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-full"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (searchResults.news.length === 0 && searchResults.activities.length === 0 && searchResults.docs.length === 0) ? (
                    <div className="text-center py-12 text-slate-400 font-sans text-xs space-y-1">
                      <AlertCircle className="h-8 w-8 mx-auto opacity-40 text-red-500" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 pt-1">Không tìm thấy kết quả phù hợp</h4>
                      <p>Em thử viết lại đúng tên viết tắt hoặc chuyển đổi từ khóa khác nhé.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 font-sans text-xs">
                      {/* Section matches: News */}
                      {searchResults.news.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">Tin tức măng non ({searchResults.news.length})</h4>
                          <div className="space-y-1">
                            {searchResults.news.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleJumpToSearchResult('news', item)}
                                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section matches: Activities */}
                      {searchResults.activities.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">Kế hoạch phong trào ({searchResults.activities.length})</h4>
                          <div className="space-y-1">
                            {searchResults.activities.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleJumpToSearchResult('activities', item)}
                                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <Calendar className="h-4 w-4 text-red-500" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section matches: Docs */}
                      {searchResults.docs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">Kho văn bản chỉ đạo ({searchResults.docs.length})</h4>
                          <div className="space-y-1">
                            {searchResults.docs.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleJumpToSearchResult('documents', item)}
                                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <FileCode className="h-4 w-4 text-emerald-500" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title} <strong className="text-red-500 font-mono">[{item.code}]</strong></span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </AppDataContext.Provider>
  );
}

