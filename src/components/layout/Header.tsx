/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sun, Moon, Settings, Search } from 'lucide-react';
import { NAV_MENU } from '../../config/menu';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { AccountMenu } from '../header/AccountMenu';
import { fetchAndCacheHomeOverrides, preloadImage } from '../../features/cms/cache/homeDataCache';
import { HOME_HERO_DEFAULT } from '../../config/defaults/home.defaults';
import { deepMerge } from '../../utils/deepMerge';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenSearch: () => void;
  schoolName: string;
}

export default function Header({
  currentView,
  setCurrentView,
  isDarkMode,
  toggleDarkMode,
  onOpenSearch,
  schoolName
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { siteSettings } = useSiteSettings();

  const prefetchHomeData = async () => {
    try {
      const fetched = await fetchAndCacheHomeOverrides();
      const heroOverride = fetched['hero'];
      const finalHero = deepMerge(HOME_HERO_DEFAULT, heroOverride?.data);
      if (finalHero?.backgroundImage) {
        preloadImage(finalHero.backgroundImage);
      }
    } catch (e) {
      // ignore
    }
  };

  const navItems = NAV_MENU.filter(item => item.showInNavbar).map(item => ({
    id: item.id,
    label: item.title
  }));

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId);
    setIsMobileMenuOpen(false);
  };

  // Lock body scroll when mobile menu is open without layout shift or position change
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMobileMenuOpen]);

  // Click outside and escape key handlers for mobile menu
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isMobileMenuOpen && headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Backdrop overlay for mobile menu */}
      <div
        id="mobile-menu-backdrop"
        className={`fixed inset-0 top-16 z-40 bg-slate-900/40 backdrop-blur-xs xl:hidden transition-opacity duration-200 ease-in-out ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <header
        ref={headerRef}
        className="sticky top-0 z-50 h-16 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/95 transition-colors duration-300"
      >
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-4 sm:px-6 gap-3">
          {/* Logo and Brand Title */}
          <div 
            className="group relative inline-flex shrink-0 items-center justify-start rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 select-none gap-2" 
            onClick={() => handleNavClick('home')}
            onMouseEnter={prefetchHomeData}
            id="header-brand"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleNavClick('home');
              }
            }}
            aria-label="Về trang chủ"
          >
            <span
              className="
                relative flex items-center justify-center
                h-[42px] w-[42px] sm:h-[48px] sm:w-[48px] md:h-[50px] md:w-[50px]
                overflow-visible rounded-xl sm:rounded-2xl
                border border-blue-500/15
                bg-white/85
                shadow-[0_8px_24px_rgba(15,23,42,0.10),0_2px_8px_rgba(37,99,235,0.08)]
                backdrop-blur-sm
                transition-all duration-300 ease-out
                group-hover:-translate-y-0.5
                group-hover:scale-105
                group-hover:border-blue-500/30
                group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.14),0_4px_14px_rgba(37,99,235,0.16)]
                dark:border-slate-300/20
                dark:bg-slate-900/75
                dark:shadow-[0_8px_24px_rgba(0,0,0,0.30)]
              "
            >
              {/* Glow Background effect */}
              <span
                aria-hidden="true"
                className="
                  pointer-events-none absolute inset-1
                  -z-10 rounded-xl sm:rounded-2xl
                  bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_70%)]
                  opacity-50 blur-xl
                  transition-opacity duration-300
                  group-hover:opacity-80
                "
              />

              {siteSettings.logo_url ? (
                <img 
                  src={siteSettings.logo_url} 
                  alt="" 
                  width={38}
                  height={38}
                  className="
                    h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] md:h-[38px] md:w-[38px]
                    object-contain
                    transition-transform duration-300 ease-out
                    [filter:drop-shadow(0_2px_2px_rgba(255,255,255,0.85))_drop-shadow(0_4px_8px_rgba(15,23,42,0.18))]
                    group-hover:scale-[1.03]
                  "
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="relative flex h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] md:h-[38px] md:w-[38px] items-center justify-center rounded-lg bg-red-600 shadow-md shadow-red-500/20">
                  <span className="-mt-1 text-yellow-300 font-extrabold text-base sm:text-lg md:text-xl select-none">★</span>
                </div>
              )}
            </span>
            
            {/* Brand Title */}
            <span className="hidden 2xl:block text-left font-sans font-bold tracking-[-0.010em] ml-2.5 whitespace-nowrap select-none">
              <span className="text-[13px] leading-none uppercase font-bold bg-gradient-to-r from-red-600 via-purple-700 to-blue-700 bg-clip-text text-transparent group-hover:from-red-500 group-hover:via-purple-600 group-hover:to-blue-600 transition-all duration-300">
                LIÊN ĐỘI THCS TRẦN QUANG KHẢI
              </span>
            </span>

            <span className="sr-only">
              {siteSettings.site_name || schoolName || "Liên đội THCS Trần Quang Khải"}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1 xl:hidden" />

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex min-w-0 flex-1 items-center justify-center gap-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  onMouseEnter={item.id === 'home' ? prefetchHomeData : undefined}
                  onFocus={item.id === 'home' ? prefetchHomeData : undefined}
                  className={`relative px-2.5 py-2 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap 2xl:px-3.5 2xl:text-sm ${
                    isActive 
                      ? 'text-blue-700 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-950/30' 
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions Toolbar */}
          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-1 max-[390px]:bg-transparent max-[390px]:p-0">
              <button
                onClick={onOpenSearch}
                id="search-btn"
                title="Tìm kiếm"
                className="flex h-[42px] w-[42px] xl:h-9 xl:w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <Search className="h-4.5 w-4.5" />
              </button>

              <button
                onClick={toggleDarkMode}
                id="dark-mode-toggle"
                title={isDarkMode ? "Chuyển sang Chế độ sáng" : "Chuyển sang Chế độ tối"}
                className="hidden min-[391px]:flex h-[42px] w-[42px] xl:h-9 xl:w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isDarkMode ? "dark" : "light"}
                    initial={{ y: -12, opacity: 0, scale: 0.6, rotate: -45 }}
                    animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ y: 12, opacity: 0, scale: 0.6, rotate: 45 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="flex items-center justify-center"
                  >
                    {isDarkMode ? (
                      <Sun className="h-4.5 w-4.5 text-yellow-500" />
                    ) : (
                      <Moon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>

            <AccountMenu />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              id="mobile-menu-toggle"
              aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={isMobileMenuOpen}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 xl:hidden transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay - Fixed/Absolute overlay right below header */}
        <div
          id="mobile-menu-drawer"
          className={`absolute left-0 right-0 top-full z-50 border-b border-slate-200/80 bg-white/98 px-4 py-3 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/98 xl:hidden transition-all duration-200 ease-out origin-top ${
            isMobileMenuOpen
              ? 'opacity-100 visible pointer-events-auto translate-y-0'
              : 'opacity-0 invisible pointer-events-none -translate-y-2'
          }`}
        >
          <div className="space-y-1 pb-3 pt-2">
            {navItems.filter(item => item.id !== 'home').map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  onMouseEnter={item.id === 'home' ? prefetchHomeData : undefined}
                  onFocus={item.id === 'home' ? prefetchHomeData : undefined}
                  className={`block w-full text-left rounded-lg px-4 py-2.5 text-base font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            
            {/* Dark mode toggle inside mobile menu for screens < 390px */}
            <div className="hidden max-[390px]:block border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={toggleDarkMode}
                className="flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-base font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
                <span>{isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={() => handleNavClick('cms')}
                id="mobile-nav-cms"
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-base font-semibold ${
                  currentView === 'cms'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>Quản trị</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

