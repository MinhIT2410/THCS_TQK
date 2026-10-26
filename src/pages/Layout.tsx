/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import EditToolbar from '../components/editable/EditToolbar';
import { AppDataContext } from '../App';
import { ROUTES } from '../config/routes';

export default function Layout() {
  const location = useLocation();
  const context = useContext(AppDataContext);

  if (!context) {
    return <Outlet />;
  }

  const {
    schoolName,
    isDarkMode,
    setIsDarkMode,
    handleNavigate,
    handleSubmitContactForm,
    setIsSearchOpen,
  } = context;

  // Derive currentView from pathname
  const getActiveView = (pathname: string): string => {
    if (pathname === ROUTES.HOME) return 'home';
    if (pathname === ROUTES.ABOUT) return 'about';
    if (pathname === ROUTES.NEWS) return 'news';
    if (pathname === ROUTES.EXTENSIONS || pathname.startsWith(`${ROUTES.EXTENSIONS}/`)) return 'extensions';
    if (pathname === ROUTES.ACTIVITIES) return 'activities';
    if (pathname === ROUTES.GALLERY) return 'gallery';
    if (pathname === ROUTES.DOCUMENTS) return 'documents';
    if (pathname === ROUTES.CONTACT) return 'contact';
    if (pathname === ROUTES.ADMIN) return 'cms';
    return 'home';
  };
  const currentView = getActiveView(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative">
      {/* Global Administrative CMS Floating Toolbar */}
      <EditToolbar />

      {/* Header Navigation Bar */}
      <Header
        currentView={currentView}
        setCurrentView={handleNavigate}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSearch={() => setIsSearchOpen(true)}
        schoolName={schoolName}
      />

      {/* Main content area */}
      <main className="flex-grow">
        <Outlet context={context} />
      </main>

      {/* Footer Section */}
      <Footer
        onNavigate={handleNavigate}
        onSubmitSuggestion={handleSubmitContactForm}
      />
    </div>
  );
}
