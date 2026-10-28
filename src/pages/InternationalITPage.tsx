import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, ExternalLink, GraduationCap, ArrowRight, BrainCircuit } from 'lucide-react';
import { ROUTES } from '../config/routes';

export default function InternationalITPage() {
  return (
    <section className="min-h-[70vh] bg-[#f7f9fc] dark:bg-slate-950 pb-16">
      <div className="max-w-6xl mx-auto px-4 py-9 md:py-12">
        <Link to={ROUTES.EXTENSIONS} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-6">
          <ArrowLeft size={16} /> Trở về Mở rộng
        </Link>

        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 text-xs font-extrabold tracking-wide uppercase">
            <GraduationCap size={16} /> IC3 GS6 · Dành cho học sinh THCS
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            Ôn tập Tin học quốc tế
          </h1>
          <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            Chọn hình thức luyện tập phù hợp để củng cố kiến thức và chuẩn bị cho bài thi IC3.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 md:p-7">
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
            <span className="inline-flex items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 p-3">
              <BookOpenCheck size={23} />
            </span>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">Chọn hình thức ôn tập</h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Hai hình thức học tập, sử dụng độc lập</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <article className="rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-gradient-to-b from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 p-5 flex flex-col min-h-[260px]">
              <span className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <BrainCircuit size={26} />
              </span>
              <h3 className="text-xl font-extrabold mt-4 text-slate-900 dark:text-white">Ôn tập tại trường</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed flex-1">
                Học qua câu hỏi tự biên soạn, xem giải thích ngay sau khi chọn đáp án.
                Có chế độ kiểm tra, chấm điểm và lưu kết quả trên hệ thống trường.
              </p>
              <Link to={ROUTES.IC3_SCHOOL} className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-3 flex justify-center items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                Vào ôn tập tại trường <ArrowRight size={17} />
              </Link>
            </article>

            <article className="rounded-2xl border border-blue-200 dark:border-blue-800/70 bg-gradient-to-b from-blue-50/70 to-white dark:from-blue-950/20 dark:to-slate-900 p-5 flex flex-col min-h-[260px]">
              <span className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                <ExternalLink size={25} />
              </span>
              <h3 className="text-xl font-extrabold mt-4 text-slate-900 dark:text-white">Bài test trên IC3 Review</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed flex-1">
                Chọn khối và bài test để mở đề trên IIG Việt Nam. Xem và sao chép mã mở bài đã
                được nhà trường cấp; ghi nhận lượt mở và gửi kết quả theo cách hiện tại.
              </p>
              <Link to={ROUTES.IC3_REVIEW} className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-3 flex justify-center items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                Vào bài test IC3 Review <ArrowRight size={17} />
              </Link>
            </article>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-5">
          Phần ôn tập tại trường đang phát triển ngân hàng câu hỏi theo từng khối. Bài test IIG hoạt động trên hệ thống bên ngoài.
        </p>
      </div>
    </section>
  );
}
