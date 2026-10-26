import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { ROUTES } from '../config/routes';
import { TESTS, LEVELS, type Grade } from '../config/ic3Catalog';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../services/supabaseClient';

export default function InternationalITPage() {
  const { isAuthenticated } = useAuth();
  const [secret, setSecret] = useState<string | null>(null);
  const [codeState, setCodeState] = useState<'idle'|'loading'|'error'>('idle');
  const [grade, setGrade] = useState<Grade>('6');
  const [optionId, setOptionId] = useState<string>('');

  const levelConfig = LEVELS[grade];
  const availableOptions = useMemo(() => TESTS[grade], [grade]);
  const selectedOption = availableOptions.find((item) => item.id === optionId) ?? null;

  function handleGradeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextGrade = event.target.value as Grade;
    setSecret(null);
    setCodeState('idle');
    setGrade(nextGrade);
    setOptionId('');
  }

  async function showCode() {
    if (!isAuthenticated || !selectedOption) return;
    setCodeState('loading');
    setSecret(null);
    const { data, error } = await supabase.rpc('ic3_get_access_code', { p_test_id: selectedOption.id });
    if (error) { setCodeState('error'); return; }
    setSecret(typeof data === 'string' ? data : '');
    setCodeState('idle');
  }

  return (
    <section className="min-h-[70vh] bg-[#eef2f8] dark:bg-slate-950 pb-16">
      <div className="bg-gradient-to-r from-[#101d3d] via-[#1d3159] to-[#31375d] text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-b from-red-400 to-red-700 shadow-lg flex items-center justify-center font-black">IC3</div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold">Bộ câu hỏi ôn luyện IC3</h1>
              <p className="text-xs text-slate-300">Học Tin học quốc tế · Dành cho học sinh THCS</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1.5">3 khối</span>
            <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1.5">Giao diện mô phỏng IIG</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 md:px-8 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
            <Link to={ROUTES.EXTENSIONS} className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-5">
              <ArrowLeft size={15} /> Trở về Mở rộng
            </Link>
            <p className="text-xs font-black tracking-wider text-red-600 uppercase mb-1">Vào bài thi</p>
            <h2 className="text-2xl md:text-[2rem] leading-tight font-extrabold text-slate-900 dark:text-white">Chọn bài test để bắt đầu</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Chọn khối, chọn bài rồi mở bài làm. Nếu bài có khóa, trình phát sẽ hỏi mật khẩu do giáo viên cung cấp.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 text-xs font-semibold">
              <span className="rounded-full border border-red-200 text-red-600 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 dark:border-red-900/60">1 Chọn khối</span>
              <span className="rounded-full border border-red-200 text-red-600 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 dark:border-red-900/60">2 Chọn bài</span>
              <span className="rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 px-3 py-1.5">3 Mở bài</span>
            </div>
          </div>

          <div className="px-6 md:px-8 py-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                Môn học
                <select
                  value={grade}
                  onChange={handleGradeChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 font-normal text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="6">IC3 GS6 Level 1 (Khối 6)</option>
                  <option value="7">IC3 GS6 Level 2 (Khối 7)</option>
                  <option value="8">IC3 GS6 Level 3 (Khối 8)</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                Bài test
                <select
                  value={optionId}
                  onChange={(event) => { setOptionId(event.target.value); setSecret(null); setCodeState('idle'); }}
                  className="mt-2 block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 font-normal text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">— Chọn bài —</option>
                  {availableOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white break-words">
                  {selectedOption ? selectedOption.name : 'Chọn một bài test để xem thông tin'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {levelConfig.levelLabel} · {levelConfig.gradeLabel}
                  {selectedOption ? (
                    selectedOption.status === 'ready' ? (
                      <span className="ml-1 text-emerald-700 dark:text-emerald-400 font-semibold">• Sẵn sàng mở bài làm</span>
                    ) : (
                      <span className="ml-1 text-amber-700 dark:text-amber-400 font-semibold">• Chưa gắn liên kết trực tiếp</span>
                    )
                  ) : (
                    <span className="ml-1">• Chưa chọn bài</span>
                  )}
                </p>
              </div>

              {selectedOption?.url ? (
                <a
                  href={selectedOption.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Mở bài làm <ExternalLink size={16} />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-5 py-3 cursor-not-allowed"
                >
                  Mở bài làm
                </button>
              )}
            </div>

            {selectedOption && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <p className="font-semibold text-slate-900 dark:text-white">Mã mở bài do nhà trường quản lý</p>
                {!isAuthenticated ? (
                  <p className="text-sm text-amber-700">Hãy đăng nhập website Liên đội để xem mã được cấp cho bài này. Bạn vẫn có thể mở bài IIG và nhập mã được giáo viên cung cấp.</p>
                ) : (
                  <>
                    <button type="button" onClick={showCode} disabled={codeState === 'loading'} className="px-3 py-2 border rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {codeState === 'loading' ? 'Đang tải mã…' : 'Xem mã mở bài'}
                    </button>
                    {codeState === 'error' && <p className="text-sm text-red-600">Không tải được mã. Kiểm tra bảng/RPC IC3 đã cài và quyền tài khoản.</p>}
                    {secret === '' && <p className="text-sm text-amber-700">Mục này chưa được quản trị nhập mã.</p>}
                    {secret && <div className="flex flex-wrap items-center gap-3"><code className="rounded bg-slate-100 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white">{secret}</code><button type="button" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm" onClick={() => navigator.clipboard.writeText(secret)}>Sao chép mã</button></div>}
                  </>
                )}
              </div>
            )}
            <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-blue-50/70 dark:bg-slate-800/60 p-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-1">
                  <p>
                    Danh sách bài được sắp theo đúng menu chọn bài bạn chụp từ trang IC3 Review. Các bài Test 1, Test 2, Test 3 được gắn mở trực tiếp theo cấu trúc liên kết của IIG.
                  </p>
                  <p>
                    Riêng mục <strong>“Chủ đề mở rộng”</strong> hiện chỉ hiển thị trong danh sách để khớp giao diện IIG, chưa gắn URL vì ảnh không cho thấy mã bài cụ thể.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Nguồn luyện tập: IC3 Review – IIG Việt Nam · Website Liên đội chỉ điều hướng, không lưu bản sao đề thi.
        </p>
      </div>
    </section>
  );
}
