import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, ChevronRight } from 'lucide-react';

export default function AdminExtensionsPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6 py-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mở rộng</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Quản lý các tiện ích bổ sung của website Liên đội.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/quan-tri/ic3" className="group flex min-h-44 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900" aria-label="Quản lý Tin học quốc tế">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><BookOpenCheck size={26}/></span>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Quản lý Tin học quốc tế</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quản lý mã mở bài IC3 cho khối 6, 7 và 8.</p></div>
            <ChevronRight className="shrink-0 text-slate-400 group-hover:text-blue-600" size={20}/>
          </div>
        </Link>
      </div>
    </section>
  );
}
