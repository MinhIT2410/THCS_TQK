/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { ADMIN_MENU_ITEMS } from '../../config/adminMenu';
import { Home, X, GraduationCap } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const { hasRole } = useAuth();
  const isSuperAdminOrPrincipal = hasRole('SUPER_ADMIN') || hasRole('PRINCIPAL');
  const canManageUsers = hasRole('SUPER_ADMIN') || hasRole('PRINCIPAL') || hasRole('VICE_PRINCIPAL');

  const filteredMenuItems = ADMIN_MENU_ITEMS.filter((item) => {
    if (item.href === '/quan-tri/nguoi-dung') {
      return canManageUsers;
    }
    if (item.href === '/quan-tri/cai-dat') {
      return isSuperAdminOrPrincipal;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          id="sidebar-backdrop"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-900">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <GraduationCap className="h-6 w-6" />
            <span className="font-display text-sm font-bold tracking-tight text-slate-800 dark:text-white uppercase">
              THCS Trần Quang Khải
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
            id="close-sidebar-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/quan-tri'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20">
          <NavLink
            to="/"
            className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <Home className="h-4.5 w-4.5 shrink-0" />
            <span>Về website chính</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
};
