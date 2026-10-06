/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { 
  BarChart3, 
  ArrowLeft, 
  Calendar,
  ShieldAlert,
  Loader2,
  School
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { competitionService } from '../services/competitionService';
import { ROUTES } from '../config/routes';
import WeeklyIncidentsReportCard from '../components/competition/WeeklyIncidentsReportCard';
import ViolationStatisticsCard from '../components/competition/ViolationStatisticsCard';
import SaveExportReportCard from '../components/competition/SaveExportReportCard';

export default function CompetitionReportPage() {
  const { user, profile, isAuthenticated, loading, profileLoading, hasAnyRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [allowedClassIds, setAllowedClassIds] = useState<string[] | undefined>(undefined);
  const [isHomeroomScoped, setIsHomeroomScoped] = useState(false);

  const initialTab = (tabParam === 'statistics' || tabParam === 'save-export' || tabParam === 'weekly') ? tabParam : 'weekly';
  const [activeReportTab, setActiveReportTab] = useState<'weekly' | 'statistics' | 'save-export'>(initialTab);

  useEffect(() => {
    if (tabParam && ['weekly', 'statistics', 'save-export'].includes(tabParam)) {
      if (tabParam !== activeReportTab) {
        setActiveReportTab(tabParam as 'weekly' | 'statistics' | 'save-export');
      }
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'weekly' | 'statistics' | 'save-export') => {
    setActiveReportTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (loading || (isAuthenticated && !profile && profileLoading)) return;

    if (!isAuthenticated || !user) {
      setHasPermission(false);
      setCheckingPermission(false);
      return;
    }

    async function checkReportPermission() {
      try {
        if (hasPermission === null) {
          setCheckingPermission(true);
        }

        // 1. Direct roles
        const isAuthorizedByRole = hasAnyRole([
          'SUPER_ADMIN',
          'ADMIN',
          'PRINCIPAL',
          'VICE_PRINCIPAL',
          'COMPETITION_MANAGE',
          'COMPETITION_REPORT_VIEW',
        ]);

        if (isAuthorizedByRole) {
          setAllowedClassIds(undefined);
          setIsHomeroomScoped(false);
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        // 2. Actor assignments (SUPERVISOR or RED_STAR)
        const myAssignments = await competitionService.getMyActorAssignments();
        const today = new Date().toISOString().split('T')[0];

        const hasActorAssignment = (myAssignments || []).some((a: any) => {
          if (a.is_active === false) return false;
          const isActor = a.assignment_type === 'SUPERVISOR' || a.assignment_type === 'RED_STAR';
          const isValidStart = !a.start_date || a.start_date <= today;
          const isValidEnd = !a.end_date || a.end_date >= today;

          return isActor && isValidStart && isValidEnd;
        });

        if (hasActorAssignment) {
          setAllowedClassIds(undefined);
          setIsHomeroomScoped(false);
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        // 3. GVCN: may view reports, but only for the class(es) currently assigned to them.
        const myHomeroomClassIds = await competitionService.getMyActiveHomeroomClassIds();
        if (myHomeroomClassIds.length > 0) {
          setAllowedClassIds(myHomeroomClassIds);
          setIsHomeroomScoped(true);
          setHasPermission(true);
          setCheckingPermission(false);
          return;
        }

        setAllowedClassIds(undefined);
        setIsHomeroomScoped(false);
        setHasPermission(false);
      } catch (err) {
        console.error('[CompetitionReportPage] Error checking report permission:', err);
        setHasPermission(false);
      } finally {
        setCheckingPermission(false);
      }
    }

    checkReportPermission();
  }, [user, isAuthenticated, loading, profileLoading, hasAnyRole]);

  // Loading state: Only show initial spinner if profile is not loaded or permission hasn't been determined yet
  if (loading || (isAuthenticated && !profile && profileLoading) || (hasPermission === null && checkingPermission)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Đang kiểm tra quyền xem báo cáo...</p>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Authenticated but no permission
  if (hasPermission === false) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Quyền truy cập bị hạn chế
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Bạn không có quyền xem báo cáo thi đua.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 pt-2">
              Chức năng này dành cho GVCN (phạm vi lớp chủ nhiệm), Giám thị, Đội Sao đỏ, Ban BGH, Quản trị viên hoặc lực lượng được ủy quyền thi đua.
            </p>
          </div>

          <div>
            <Link
              to={ROUTES.COMPETITION}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trang Thi đua</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans pb-16">
      {/* Header & Navigation */}
      <div className="space-y-4">
        <Link
          to={ROUTES.COMPETITION}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang Thi đua & Khen thưởng</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Báo cáo thi đua
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 pl-0.5">
              Theo dõi tình hình ghi nhận trong ngày, tổng hợp theo tuần, nhóm lỗi và lớp vi phạm.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {isHomeroomScoped && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <School className="w-3.5 h-3.5" />
                <span>Chỉ lớp chủ nhiệm</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>Năm học hiện tại</span>
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Selector */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto no-scrollbar sm:grid sm:grid-cols-3">

        <button
          type="button"
          onClick={() => handleTabChange('weekly')}
          className={`h-10 px-4 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center justify-center ${
            activeReportTab === 'weekly'
              ? 'bg-red-600 text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
          }`}
        >
          GHI NHẬN TRONG TUẦN
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('statistics')}
          className={`h-10 px-4 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center justify-center ${
            activeReportTab === 'statistics'
              ? 'bg-red-600 text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
          }`}
        >
          THỐNG KÊ LỖI VI PHẠM
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('save-export')}
          className={`h-10 px-4 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center justify-center ${
            activeReportTab === 'save-export'
              ? 'bg-red-600 text-white shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
          }`}
        >
          {isHomeroomScoped ? 'XUẤT BÁO CÁO LỚP' : 'LƯU BÁO CÁO & XUẤT FILE'}
        </button>
      </div>

      {/* Active Tab Content Panel */}
      <div>
        {activeReportTab === 'weekly' && <WeeklyIncidentsReportCard allowedClassIds={allowedClassIds} />}
        {activeReportTab === 'statistics' && <ViolationStatisticsCard allowedClassIds={allowedClassIds} />}
        {activeReportTab === 'save-export' && (
          <SaveExportReportCard
            allowedClassIds={allowedClassIds}
            exportOnly={isHomeroomScoped}
          />
        )}
      </div>
    </div>
  );
}
