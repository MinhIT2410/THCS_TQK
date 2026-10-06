/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  ClipboardList, 
  Clock, 
  BarChart3, 
  ChevronRight 
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { competitionService } from '../../services/competitionService';
import { ROUTES } from '../../config/routes';

export default function CompetitionQuickActions() {
  const { user, isAuthenticated, hasAnyRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [pendingLoading, setPendingLoading] = useState<boolean>(false);
  const [isHomeroomReport, setIsHomeroomReport] = useState(false);

  const [permissions, setPermissions] = useState({
    canRecord: false,
    canApprove: false,
    canViewReports: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function evaluatePermissions() {
      try {
        setLoading(true);

        // 1. Direct role checks
        const isSuperAdmin = hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
        const isPrincipal = hasAnyRole(['PRINCIPAL', 'VICE_PRINCIPAL']);
        const isRecordRole = hasAnyRole(['COMPETITION_RECORD', 'COMPETITION_MANAGE']);
        const isApproveRole = hasAnyRole(['COMPETITION_APPROVE', 'COMPETITION_MANAGE']);
        const isManageRole = hasAnyRole(['COMPETITION_MANAGE']);
        const isReportRole = hasAnyRole(['COMPETITION_REPORT_VIEW']);

        let supervisorActive = false;
        let supervisorCanRecord = false;
        let supervisorCanApprove = false;
        let redStarActive = false;
        let redStarCanRecord = false;

        try {
          const myAssignments = await competitionService.getMyActorAssignments();
          const today = new Date().toISOString().split('T')[0];

          (myAssignments || []).forEach((a: any) => {
            if (a.is_active === false) return;

            const isValidStart = !a.start_date || a.start_date <= today;
            const isValidEnd = !a.end_date || a.end_date >= today;

            if (isValidStart && isValidEnd) {
              if (a.assignment_type === 'SUPERVISOR') {
                supervisorActive = true;
                if (a.can_record_incident !== false) supervisorCanRecord = true;
                if (a.can_approve_red_star === true) supervisorCanApprove = true;
              }
              if (a.assignment_type === 'RED_STAR') {
                redStarActive = true;
                if (a.can_record_incident !== false) redStarCanRecord = true;
              }
            }
          });
        } catch (err) {
          console.error('[CompetitionQuickActions] Lỗi tải nhiệm vụ thi đua:', err);
        }

        let homeroomClassIds: string[] = [];
        try {
          homeroomClassIds = await competitionService.getMyActiveHomeroomClassIds();
        } catch (err) {
          console.error('[CompetitionQuickActions] Lỗi tải lớp chủ nhiệm:', err);
        }

        if (!isMounted) return;

        // Card 1: Ghi nhận
        const canRecord =
          isSuperAdmin ||
          isPrincipal ||
          isRecordRole ||
          supervisorCanRecord ||
          redStarCanRecord;

        // Card 2: Chờ duyệt
        const canApprove =
          isSuperAdmin ||
          isPrincipal ||
          isApproveRole ||
          supervisorCanApprove;

        // Card 3: Báo cáo
        const canViewReports =
          isSuperAdmin ||
          isPrincipal ||
          isManageRole ||
          isReportRole ||
          supervisorActive ||
          redStarActive ||
          homeroomClassIds.length > 0;

        const fullReportAccess = isSuperAdmin || isPrincipal || isManageRole || isReportRole || supervisorActive || redStarActive;
        setIsHomeroomReport(!fullReportAccess && homeroomClassIds.length > 0);

        setPermissions({
          canRecord,
          canApprove,
          canViewReports,
        });

        // 2. Fetch pending incidents count if user can approve
        if (canApprove) {
          try {
            setPendingLoading(true);
            const count = await competitionService.getPendingIncidentsCount();
            if (isMounted) setPendingCount(count);
          } catch (err) {
            console.error('[CompetitionQuickActions] Lỗi tải số lượng sự việc chờ duyệt:', err);
            if (isMounted) setPendingCount(0);
          } finally {
            if (isMounted) setPendingLoading(false);
          }
        }
      } catch (err) {
        console.error('[CompetitionQuickActions] Evaluate permissions error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    evaluatePermissions();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, hasAnyRole]);

  if (loading || !isAuthenticated) return null;

  const quickActions = [
    {
      key: 'record',
      title: 'Ghi nhận',
      description: 'Ghi nhận đi trễ, vi phạm cá nhân, vi phạm tập thể và khen thưởng.',
      icon: ClipboardList,
      btnText: 'Mở ghi nhận',
      route: ROUTES.COMPETITION_RECORD,
      visible: permissions.canRecord,
      badgeColor: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
      borderColor: 'border-red-200/80 hover:border-red-400 dark:border-red-900/50 dark:hover:border-red-700',
      bgTint: 'bg-gradient-to-b from-red-50/60 via-white to-white dark:from-red-950/20 dark:via-slate-900 dark:to-slate-900',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-xs shadow-red-600/20',
    },
    {
      key: 'pending',
      title: 'Chờ duyệt',
      description: 'Xem các sự việc đang chờ duyệt từ Sao đỏ hoặc lực lượng ghi nhận.',
      icon: Clock,
      btnText: 'Xem chờ duyệt',
      route: ROUTES.COMPETITION_PENDING,
      visible: permissions.canApprove,
      badgeColor: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      borderColor: 'border-amber-200/80 hover:border-amber-400 dark:border-amber-900/50 dark:hover:border-amber-700',
      bgTint: 'bg-gradient-to-b from-amber-50/60 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-600/20',
    },
    {
      key: 'report',
      title: 'Báo cáo',
      description: isHomeroomReport
        ? 'Xem ghi nhận và thống kê thi đua của riêng lớp chủ nhiệm.'
        : 'Theo dõi tình hình trong ngày, tổng hợp tuần, nhóm lỗi và lớp vi phạm.',
      icon: BarChart3,
      btnText: 'Xem báo cáo',
      route: ROUTES.COMPETITION_REPORT,
      visible: permissions.canViewReports,
      badgeColor: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      borderColor: 'border-blue-200/80 hover:border-blue-400 dark:border-blue-900/50 dark:hover:border-blue-700',
      bgTint: 'bg-gradient-to-b from-blue-50/60 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20',
    },
  ].filter(item => item.visible);

  if (quickActions.length === 0) return null;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 fill-red-600/20" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Tác vụ nhanh thi đua
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Các công cụ được sử dụng nhiều nhất trong công tác thi đua hằng ngày.
          </p>
        </div>
      </div>

      {/* Grid of 3 Cards */}
      <div
        className={`grid grid-cols-1 ${
          quickActions.length === 2
            ? 'sm:grid-cols-2'
            : quickActions.length === 3
            ? 'sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1'
        } gap-4 sm:gap-6 items-stretch`}
      >
        {quickActions.map(action => (
          <div
            key={action.key}
            className={`relative overflow-hidden border ${action.borderColor} ${action.bgTint} rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-200 group h-full`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${action.badgeColor} flex items-center justify-center shrink-0 shadow-2xs`}>
                  <action.icon className="w-5 h-5" />
                </div>

                {action.key === 'pending' && (
                  <div>
                    {pendingLoading ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse">
                        ...
                      </span>
                    ) : pendingCount !== null ? (
                      <span
                        className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-black shadow-2xs transition-all ${
                          pendingCount > 0
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {pendingCount}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {action.description}
                </p>

                {action.key === 'pending' && (
                  <div className="mt-2 text-xs font-semibold">
                    {pendingLoading ? (
                      <span className="text-slate-400 animate-pulse">Đang tải số lượng...</span>
                    ) : pendingCount !== null && pendingCount > 0 ? (
                      <span className="text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>Có <strong className="font-extrabold text-amber-800 dark:text-amber-200">{pendingCount}</strong> sự việc cần xử lý</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        • Không có sự việc chờ duyệt
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-2">
              <Link
                to={action.route}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs ${action.btnBg} transition-all active:scale-[0.98]`}
              >
                <span>{action.btnText}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
