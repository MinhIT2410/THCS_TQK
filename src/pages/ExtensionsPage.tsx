/** Public directory of optional modules. Add new tools to the cards list without changing the site navigation. */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MonitorPlay } from 'lucide-react';
import { ROUTES } from '../config/routes';

const tools = [
  {
    id: 'international-it',
    name: 'Học Tin học quốc tế',
    description: 'Không gian học tập và ôn luyện IC3, MOS dành cho học sinh.',
    path: ROUTES.INTERNATIONAL_IT,
    Icon: MonitorPlay,
  },
];

export default function ExtensionsPage() {
  return (
    <section className="min-h-[65vh] bg-slate-50 dark:bg-slate-950 py-12 md:py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950 px-4 py-2 text-xs font-bold tracking-wide text-blue-700 dark:text-blue-300">
            <BookOpen className="w-4 h-4" /> KHÔNG GIAN HỌC TẬP VÀ TIỆN ÍCH
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-4 text-slate-900 dark:text-white">Mở rộng</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Khám phá các tiện ích bổ trợ dành cho học sinh và giáo viên Trường THCS Trần Quang Khải.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map(({ id, name, description, path, Icon }) => (
            <Link key={id} to={path} className="group block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-5">
                <Icon className="w-7 h-7" aria-hidden="true" />
              </div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">{name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-2 min-h-[3rem]">{description}</p>
              <span className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all">Khám phá <ArrowRight className="w-4 h-4" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
