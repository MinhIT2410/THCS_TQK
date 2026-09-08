import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Flag, Play, Radio, ShieldCheck, Volume2, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { CeremonyStartSignal, flagCeremonyService } from '../services/flagCeremonyService';
import { movementService } from '../services/movementService';

type CeremonyView = 'waiting' | 'countdown' | 'salute';
type MediaPhase = 'idle' | 'national' | 'team' | 'done';

export default function FlagCeremonyPage() {
  const { hasAnyRole } = useAuth();
  const canControl = hasAnyRole(['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF']);
  const [signal, setSignal] = useState<CeremonyStartSignal | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nationalAnthemUrl, setNationalAnthemUrl] = useState('');
  const [teamSongUrl, setTeamSongUrl] = useState('');
  const [mediaPhase, setMediaPhase] = useState<MediaPhase>('idle');
  const [audioReady, setAudioReady] = useState(false);
  const [mediaBlocked, setMediaBlocked] = useState(false);

  const nationalRef = useRef<HTMLVideoElement | null>(null);
  const teamRef = useRef<HTMLVideoElement | null>(null);
  const startedSignalRef = useRef<string | null>(null);

  useEffect(() => flagCeremonyService.subscribe((next) => {
    setSignal((current) => (current?.id === next.id ? current : next));
    setMediaPhase('idle');
    setMediaBlocked(false);
    setError(null);
  }), []);

  useEffect(() => {
    let cancelled = false;
    movementService.getPublishedCampaignBySlug('sinh-hoat-dau-tuan')
      .then((campaign) => {
        if (cancelled || !campaign) return;
        setNationalAnthemUrl(campaign.national_anthem_video_url || '');
        setTeamSongUrl(campaign.team_song_video_url || '');
      })
      .catch((err) => console.error('Không thể tải video nghi lễ:', err));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!signal) return null;
    return Math.max(0, Math.ceil((new Date(signal.startsAt).getTime() - now) / 1000));
  }, [signal, now]);

  const view: CeremonyView = !signal ? 'waiting' : countdown && countdown > 0 ? 'countdown' : 'salute';

  const playElement = async (el: HTMLVideoElement | null) => {
    if (!el) return false;
    try {
      el.currentTime = 0;
      el.muted = false;
      el.volume = 1;
      await el.play();
      setMediaBlocked(false);
      return true;
    } catch (err) {
      console.warn('Trình duyệt chặn tự phát âm thanh:', err);
      setMediaBlocked(true);
      return false;
    }
  };

  const startMediaSequence = () => {
    if (nationalAnthemUrl) {
      setMediaPhase('national');
      return;
    }
    if (teamSongUrl) {
      setMediaPhase('team');
      return;
    }
    setMediaPhase('done');
  };

  useEffect(() => {
    if (view !== 'salute' || !signal) return;
    if (startedSignalRef.current === signal.id) return;
    startedSignalRef.current = signal.id;
    startMediaSequence();
  }, [view, signal?.id, nationalAnthemUrl, teamSongUrl]);

  useEffect(() => {
    if (view !== 'salute') return;
    if (mediaPhase !== 'national' && mediaPhase !== 'team') return;

    const timer = window.setTimeout(() => {
      void playElement(mediaPhase === 'national' ? nationalRef.current : teamRef.current);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [view, mediaPhase]);

  const handleNationalEnded = () => {
    if (teamSongUrl) setMediaPhase('team');
    else setMediaPhase('done');
  };

  const handleTeamEnded = () => setMediaPhase('done');

  const prepareAudio = () => {
    // Một thao tác trực tiếp của giáo viên giúp trình duyệt cho phép phát âm thanh
    // khi tín hiệu Realtime đến sau đó.
    setAudioReady(true);
    setMediaBlocked(false);
  };

  const retryCurrentMedia = () => {
    setAudioReady(true);
    if (mediaPhase === 'national') void playElement(nationalRef.current);
    else if (mediaPhase === 'team') void playElement(teamRef.current);
  };

  const start = async () => {
    try {
      setSending(true);
      setError(null);
      setMediaPhase('idle');
      startedSignalRef.current = null;
      const next = await flagCeremonyService.startCountdown(10);
      setSignal(next);
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi lệnh bắt đầu chào cờ.');
    } finally {
      setSending(false);
    }
  };

  const hasCeremonyMedia = Boolean(nationalAnthemUrl || teamSongUrl);

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
          <div><strong>Chưa có Realtime.</strong> Trang chỉ đồng bộ giữa các tab trên cùng thiết bị.</div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="min-h-[430px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10 flex items-center justify-center text-center overflow-hidden">
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
              {hasCeremonyMedia && (
                <button
                  type="button"
                  onClick={prepareAudio}
                  className={`mx-auto mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition ${audioReady ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {audioReady ? <CheckCircle2 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  {audioReady ? 'Âm thanh đã sẵn sàng' : 'BẬT ÂM THANH / SẴN SÀNG'}
                </button>
              )}
            </div>
          )}

          {view === 'countdown' && (
            <div>
              <div className="text-sm font-extrabold uppercase tracking-[0.24em] text-red-600">Toàn trường chuẩn bị</div>
              <div className="mt-3 text-[9rem] sm:text-[12rem] leading-none font-black tabular-nums text-red-600">{countdown}</div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Đứng dậy – chỉnh đốn trang phục</h2>
            </div>
          )}

          {view === 'salute' && mediaPhase === 'national' && nationalAnthemUrl && (
            <div className="w-full">
              <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-red-600">NGHIÊM! — CHÀO CỜ, CHÀO!</div>
              <div className="mx-auto overflow-hidden rounded-2xl bg-black shadow-lg max-w-4xl aspect-video">
                <video ref={nationalRef} src={nationalAnthemUrl} preload="auto" playsInline onEnded={handleNationalEnded} className="h-full w-full object-contain" />
              </div>
              <div className="mt-4 text-xl font-black text-slate-900 dark:text-white">QUỐC CA</div>
              {mediaBlocked && (
                <button onClick={retryCurrentMedia} className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white">
                  <Volume2 className="mr-2 inline h-4 w-4" /> NHẤN ĐỂ PHÁT ÂM THANH
                </button>
              )}
            </div>
          )}

          {view === 'salute' && mediaPhase === 'team' && teamSongUrl && (
            <div className="w-full">
              <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Tiếp tục nghi lễ</div>
              <div className="mx-auto overflow-hidden rounded-2xl bg-black shadow-lg max-w-4xl aspect-video">
                <video ref={teamRef} src={teamSongUrl} preload="auto" playsInline onEnded={handleTeamEnded} className="h-full w-full object-contain" />
              </div>
              <div className="mt-4 text-xl font-black text-slate-900 dark:text-white">ĐỘI CA</div>
              {mediaBlocked && (
                <button onClick={retryCurrentMedia} className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white">
                  <Volume2 className="mr-2 inline h-4 w-4" /> NHẤN ĐỂ PHÁT ÂM THANH
                </button>
              )}
            </div>
          )}

          {view === 'salute' && (mediaPhase === 'done' || (!hasCeremonyMedia && mediaPhase !== 'national' && mediaPhase !== 'team')) && (
            <div>
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30">
                <Flag className="h-14 w-14" />
              </div>
              <div className="mt-7 text-5xl sm:text-7xl font-black tracking-tight text-red-600">NGHIÊM!</div>
              <div className="mt-5 text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">CHÀO CỜ – CHÀO!</div>
              {mediaPhase === 'done' && hasCeremonyMedia && (
                <p className="mt-5 text-base font-bold text-emerald-600">Đã hoàn tất Quốc ca và Đội ca.</p>
              )}
            </div>
          )}

          {view !== 'salute' && nationalAnthemUrl && <video src={nationalAnthemUrl} preload="auto" className="hidden" aria-hidden="true" />}
          {view !== 'salute' && teamSongUrl && <video src={teamSongUrl} preload="auto" className="hidden" aria-hidden="true" />}
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
              {hasCeremonyMedia ? 'Video Quốc ca và Đội ca đã được nạp từ mục quản trị Sinh hoạt đầu tuần.' : 'Chưa cài video nghi lễ trong mục quản trị Sinh hoạt đầu tuần.'}
            </p>
          </div>

          {canControl && (
            <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/50 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-red-600" /> Ban tổ chức
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Bấm một lần. Tất cả lớp đang mở trang cùng đếm ngược 10 giây; sau đó Quốc ca và Đội ca tự phát theo thứ tự.
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
                onClick={() => { setSignal(null); setMediaPhase('idle'); startedSignalRef.current = null; }}
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
