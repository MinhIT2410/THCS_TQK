import React, { useEffect, useMemo, useState } from 'react';
import { Flag, Play, Radio, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { CeremonyStartSignal, flagCeremonyService } from '../services/flagCeremonyService';

type CeremonyView = 'waiting' | 'countdown' | 'salute';

export default function FlagCeremonyPage() {
  const { hasAnyRole } = useAuth();
  const canControl = hasAnyRole(['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF']);
  const [signal, setSignal] = useState<CeremonyStartSignal | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => flagCeremonyService.subscribe((next) => {
    setSignal((current) => (current?.id === next.id ? current : next));
    setError(null);
  }), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!signal) return null;
    return Math.max(0, Math.ceil((new Date(signal.startsAt).getTime() - now) / 1000));
  }, [signal, now]);

  const view: CeremonyView = !signal ? 'waiting' : countdown && countdown > 0 ? 'countdown' : 'salute';

  const start = async () => {
    try {
      setSending(true);
      setError(null);
      const next = await flagCeremonyService.startCountdown(10);
      setSignal(next);
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi lệnh bắt đầu chào cờ.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-20">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white shadow-xl">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide">
            <Flag className="h-4 w-4" /> SINH HOẠT ĐẦU TUẦN
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Chào cờ đồng bộ toàn trường</h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-blue-100">
            Giáo viên mở sẵn trang này. Khi có tín hiệu, các lớp có tiết HĐTN trong cùng buổi đứng dậy và thực hiện nghi lễ chào cờ cùng lúc với học sinh dưới sân.
          </p>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
          <div><strong>Chưa có Realtime.</strong> Trang chỉ đồng bộ giữa các tab trên cùng thiết bị. Khi Supabase đã cấu hình, các máy trong trường sẽ nhận lệnh cùng lúc và không cần chạy SQL cho chức năng này.</div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="min-h-[430px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10 flex items-center justify-center text-center">
          {view === 'waiting' && (
            <div>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <Radio className="h-11 w-11" />
              </div>
              <div className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-blue-600">Đã kết nối</div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">Đang chờ chào cờ</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400">
                Giáo viên cho học sinh ổn định tại lớp và giữ trang này mở. Khi Ban tổ chức bắt đầu, màn hình sẽ tự chuyển sang đếm ngược.
              </p>
            </div>
          )}

          {view === 'countdown' && (
            <div>
              <div className="text-sm font-extrabold uppercase tracking-[0.24em] text-red-600">Toàn trường chuẩn bị</div>
              <div className="mt-3 text-[9rem] sm:text-[12rem] leading-none font-black tabular-nums text-red-600">{countdown}</div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Đứng dậy – chỉnh đốn trang phục</h2>
            </div>
          )}

          {view === 'salute' && (
            <div>
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30">
                <Flag className="h-14 w-14" />
              </div>
              <div className="mt-7 text-5xl sm:text-7xl font-black tracking-tight text-red-600">NGHIÊM!</div>
              <div className="mt-5 text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">CHÀO CỜ – CHÀO!</div>
              <p className="mt-5 text-base font-semibold text-slate-500 dark:text-slate-400">Thực hiện nghi lễ đồng thời với học sinh dưới sân.</p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <Wifi className="h-5 w-5 text-emerald-600" /> Trạng thái
            </div>
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              {isSupabaseConfigured ? 'Realtime đang hoạt động' : 'Chế độ cục bộ'}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Không cần chọn lớp, không cần mở phiên. Chỉ cần giáo viên mở trang trước giờ chào cờ.
            </p>
          </div>

          {canControl && (
            <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/50 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-red-600" /> Ban tổ chức
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Bấm một lần khi chuẩn bị bắt đầu nghi lễ. Tất cả lớp đang mở trang sẽ cùng đếm ngược 10 giây.
              </p>
              <button
                type="button"
                onClick={start}
                disabled={sending}
                className="mt-5 w-full rounded-2xl bg-red-600 px-4 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Play className="h-5 w-5" /> {sending ? 'Đang gửi tín hiệu...' : 'BẮT ĐẦU CHÀO CỜ'}
              </button>
              <button
                type="button"
                onClick={() => setSignal(null)}
                className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Trở về màn hình chờ trên máy này
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
