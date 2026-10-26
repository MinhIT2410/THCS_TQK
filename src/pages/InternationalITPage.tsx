import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';
import { ROUTES } from '../config/routes';

const IC3_REVIEW_URL = 'https://ic3review.iigvietnam.edu.vn/';

/** Landing page only: external question banks are not copied or embedded on school infrastructure. */
export default function InternationalITPage() {
  return (
    <section className="min-h-[65vh] bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to={ROUTES.EXTENSIONS} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> Trở về Mở rộng
        </Link>
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 md:p-10 shadow-sm">
          <div className="w-14 h-14 flex items-center justify-center bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 rounded-2xl mb-5">
            <GraduationCap className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">Học Tin học quốc tế – IC3</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Không gian định hướng và luyện tập IC3 dành cho học sinh THCS.</p>
          <div className="mt-8 rounded-2xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Luyện tập IC3 – THCS</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">Truy cập bộ câu hỏi ôn luyện trực tuyến trên IC3 Review. Tại trang luyện tập, chọn chương trình phù hợp với khối THCS, sau đó chọn bài test để bắt đầu.</p>
                <a href={IC3_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                  Bắt đầu luyện tập <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Mở trang IC3 Review của IIG Việt Nam trong tab mới. Một số bài có thể yêu cầu mật khẩu do giáo viên cung cấp.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <p className="text-sm text-slate-600 dark:text-slate-300">Bài luyện tập và dữ liệu câu hỏi được cung cấp trên website bên ngoài, không lưu trên hệ thống Liên đội. Kết quả làm bài tại đó không tự đồng bộ với website trường.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
