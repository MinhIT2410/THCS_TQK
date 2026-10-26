import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ClipboardCheck, GraduationCap } from 'lucide-react';
import { ROUTES } from '../config/routes';

export default function InternationalITPage() {
  return (
    <section className="min-h-[65vh] bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to={ROUTES.EXTENSIONS} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> Trở về Mở rộng
        </Link>
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 md:p-10 shadow-sm">
          <div className="w-14 h-14 flex items-center justify-center bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-2xl mb-5"><GraduationCap className="w-8 h-8" /></div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">Học Tin học quốc tế</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Không gian ôn luyện IC3 và MOS cho học sinh.</p>
          <div className="mt-8 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 p-5">
            <p className="font-semibold text-blue-800 dark:text-blue-200">Đang cập nhật nội dung</p>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">Ngân hàng câu hỏi, bài luyện tập và thi thử sẽ được bổ sung tại đây. Hiện chưa có đề thi để bắt đầu.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3"><BookOpen className="w-5 h-5 text-blue-600 shrink-0" /><div><h2 className="font-semibold">Luyện tập IC3</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nội dung sẽ được bổ sung.</p></div></div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3"><ClipboardCheck className="w-5 h-5 text-blue-600 shrink-0" /><div><h2 className="font-semibold">Thi thử MOS</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Nội dung sẽ được bổ sung.</p></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
