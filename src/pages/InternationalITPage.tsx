import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, GraduationCap, ShieldCheck } from 'lucide-react';
import { ROUTES } from '../config/routes';

type Level = '6' | '7' | '8';
type PracticeTest = { id: string; name: string; url: string };

// Only publish independently verified IIG URLs. Do not derive links from guesses.
const TESTS: Record<Level, PracticeTest[]> = {
  '6': [
    { id: 'L1-CD1-T1', name: 'Chủ đề 1: Căn bản về công nghệ – Test 1', url: 'https://ic3review.iigvietnam.edu.vn/newdata/IC3GS6L1/IC3GS6L1-CD1-T1%20%28Published%29/index.html' },
    { id: 'L1-CD1-T2', name: 'Chủ đề 1: Căn bản về công nghệ – Test 2', url: 'https://ic3review.iigvietnam.edu.vn/newdata/IC3GS6L1/IC3GS6L1-CD1-T2%20%28Published%29/index.html' },
  ],
  '7': [
    { id: 'L2-CD1-T1', name: 'Chủ đề 1 – Test 1', url: 'https://ic3review.iigvietnam.edu.vn/newdata/IC3GS6L2/IC3GS6L2-CD1-T1%20%28Published%29/index.html' },
  ],
  '8': [
    { id: 'L3-CD1-T1', name: 'Chủ đề 1 – Test 1', url: 'https://ic3review.iigvietnam.edu.vn/newdata/IC3GS6L3/IC3GS6L3-CD1-T1%20%28Published%29/index.html' },
  ],
};

export default function InternationalITPage() {
  const [grade, setGrade] = useState<Level>('6');
  const [testId, setTestId] = useState('L1-CD1-T1');
  const availableTests = useMemo(() => TESTS[grade], [grade]);
  const selected = availableTests.find((test) => test.id === testId) ?? availableTests[0];

  function changeGrade(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextGrade = event.target.value as Level;
    setGrade(nextGrade);
    setTestId(TESTS[nextGrade][0].id);
  }

  return (
    <section className="min-h-[70vh] bg-[#eef2f8] dark:bg-slate-950 pb-16">
      <div className="bg-gradient-to-r from-[#101d3d] via-[#1e3159] to-[#32345a] text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-b from-red-400 to-red-700 rounded-xl flex items-center justify-center font-black shadow-lg">IC3</div>
            <div><h1 className="text-lg md:text-xl font-extrabold">Bộ câu hỏi ôn luyện IC3</h1><p className="text-xs text-slate-300">Học Tin học quốc tế · Dành cho học sinh THCS</p></div>
          </div>
          <span className="text-xs rounded-full border border-white/20 px-3 py-1.5 bg-white/10">IC3 GS6 · Khối 6–8</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 -mt-1">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-t-4 border-t-red-500 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
            <Link to={ROUTES.EXTENSIONS} className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-5"><ArrowLeft size={15} /> Trở về Mở rộng</Link>
            <p className="text-xs font-black tracking-wider text-red-600 uppercase mb-1">Vào bài luyện tập</p>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Chọn bài để bắt đầu</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Chọn khối và bài luyện tập. Bài sẽ mở trực tiếp trên hệ thống IC3 Review của IIG Việt Nam.</p>
            <div className="flex flex-wrap gap-2 mt-5 text-xs font-semibold">
              <span className="rounded-full border border-red-200 text-red-600 dark:border-red-800 px-3 py-1.5">1 · Chọn khối</span>
              <span className="rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5">2 · Chọn bài</span>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">Chọn khối
                <select value={grade} onChange={changeGrade} className="mt-2 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 font-normal text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="6">Khối 6 – IC3 GS6 Level 1</option>
                  <option value="7">Khối 7 – IC3 GS6 Level 2</option>
                  <option value="8">Khối 8 – IC3 GS6 Level 3</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">Chọn bài
                <select value={selected.id} onChange={(event) => setTestId(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-3 font-normal text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400">
                  {availableTests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
                </select>
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white break-words">{selected.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">IC3 GS6 Level {grade === '6' ? '1' : grade === '7' ? '2' : '3'} · <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Có liên kết bài luyện tập</span></p>
              </div>
              <a href={selected.url} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Mở bài làm <ExternalLink size={16} /></a>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed"><ShieldCheck size={17} className="shrink-0 text-emerald-600" /><p>Một số bài cần mật khẩu do giáo viên cung cấp. Nội dung và kết quả bài làm thuộc hệ thống IIG, chưa tự động đồng bộ về website Liên đội. Chỉ những liên kết đã được xác minh mới hiển thị ở đây.</p></div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">Nguồn luyện tập: IC3 Review – IIG Việt Nam · Trang Liên đội chỉ điều hướng, không lưu bản sao đề thi.</p>
      </div>
    </section>
  );
}
