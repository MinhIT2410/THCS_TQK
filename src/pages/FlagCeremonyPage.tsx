import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Flag,
  Maximize2,
  Minimize2,
  Play,
  Radio,
  ShieldCheck,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { CeremonyStartSignal, flagCeremonyService } from '../services/flagCeremonyService';
import { movementService } from '../services/movementService';

type CeremonyView = 'waiting' | 'countdown' | 'salute';
type MediaPhase = 'idle' | 'command' | 'national' | 'team' | 'motto' | 'done';
type MediaLoadState = 'missing' | 'loading' | 'ready' | 'error';

function VietnamFlagBackdrop({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      <rect width="1600" height="900" fill="#da251d" />
      <polygon
        points="800,185 883,430 1140,430 932,580 1012,820 800,675 588,820 668,580 460,430 717,430"
        fill="#ffde00"
      />
    </svg>
  );
}

export default function FlagCeremonyPage() {
  const { hasAnyRole } = useAuth();
  const canControl = hasAnyRole(['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL']);
  const [signal, setSignal] = useState<CeremonyStartSignal | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nationalAnthemUrl, setNationalAnthemUrl] = useState('');
  const [teamSongUrl, setTeamSongUrl] = useState('');
  const [saluteCommand, setSaluteCommand] = useState('Chào cờ, chào!');
  const [saluteAudioUrl, setSaluteAudioUrl] = useState('');
  const [readinessMotto, setReadinessMotto] = useState('Vì Tổ quốc xã hội chủ nghĩa, vì lý tưởng của Bác Hồ vĩ đại. Sẵn sàng!');
  const [readinessAudioUrl, setReadinessAudioUrl] = useState('');
  const [mediaPhase, setMediaPhase] = useState<MediaPhase>('idle');
  const [audioReady, setAudioReady] = useState(false);
  const [mediaBlocked, setMediaBlocked] = useState(false);
  const [nationalLoadState, setNationalLoadState] = useState<MediaLoadState>('missing');
  const [teamLoadState, setTeamLoadState] = useState<MediaLoadState>('missing');
  const [nationalPlaybackUrl, setNationalPlaybackUrl] = useState('');
  const [teamPlaybackUrl, setTeamPlaybackUrl] = useState('');
  const [nationalCached, setNationalCached] = useState(false);
  const [teamCached, setTeamCached] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const saluteAudioRef = useRef<HTMLAudioElement | null>(null);
  const nationalRef = useRef<HTMLVideoElement | null>(null);
  const teamRef = useRef<HTMLVideoElement | null>(null);
  const readinessAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedSignalRef = useRef<string | null>(null);

  useEffect(
    () =>
      flagCeremonyService.subscribe((next) => {
        setSignal((current) => (current?.id === next.id ? current : next));
        setMediaPhase('idle');
        setMediaBlocked(false);
        setError(null);
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    movementService
      .getPublishedCampaignBySlug('sinh-hoat-dau-tuan')
      .then((campaign) => {
        if (cancelled || !campaign) return;
        setNationalAnthemUrl(campaign.national_anthem_video_url || '');
        setTeamSongUrl(campaign.team_song_video_url || '');
        setSaluteCommand(campaign.ceremony_salute_command || 'Chào cờ, chào!');
        setSaluteAudioUrl(campaign.ceremony_salute_audio_url || '');
        setReadinessMotto(campaign.ceremony_readiness_motto || 'Vì Tổ quốc xã hội chủ nghĩa, vì lý tưởng của Bác Hồ vĩ đại. Sẵn sàng!');
        setReadinessAudioUrl(campaign.ceremony_readiness_audio_url || '');
      })
      .catch((err) => console.error('Không thể tải video nghi lễ:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    const loadOne = async (
      url: string,
      setLoadState: React.Dispatch<React.SetStateAction<MediaLoadState>>,
      setPlaybackUrl: React.Dispatch<React.SetStateAction<string>>,
      setCached: React.Dispatch<React.SetStateAction<boolean>>,
    ) => {
      if (!url) {
        setLoadState('missing');
        setPlaybackUrl('');
        setCached(false);
        return;
      }

      setLoadState('loading');
      setCached(false);

      try {
        const cacheName = 'tqk-flag-ceremony-media-v1';
        let response: Response | undefined;
        let fromCache = false;

        if ('caches' in window) {
          const cache = await caches.open(cacheName);
          const cached = await cache.match(url);
          if (cached) {
            response = cached;
            fromCache = true;
          } else {
            const fetched = await fetch(url, { cache: 'force-cache' });
            if (!fetched.ok) throw new Error(`HTTP ${fetched.status}`);
            try {
              await cache.put(url, fetched.clone());
            } catch (cacheError) {
              console.warn('Không thể lưu video vào Cache Storage:', cacheError);
            }
            response = fetched;
          }
        } else {
          const fetched = await fetch(url, { cache: 'force-cache' });
          if (!fetched.ok) throw new Error(`HTTP ${fetched.status}`);
          response = fetched;
        }

        const blob = await response.blob();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        objectUrls.push(objectUrl);
        setPlaybackUrl(objectUrl);
        setCached(fromCache);
        setLoadState('ready');
      } catch (err) {
        console.warn('Không thể tải sẵn video nghi lễ, sẽ dùng URL trực tiếp:', err);
        if (cancelled) return;
        setPlaybackUrl(url);
        setLoadState('error');
      }
    };

    const run = async () => {
      await loadOne(
        nationalAnthemUrl,
        setNationalLoadState,
        setNationalPlaybackUrl,
        setNationalCached,
      );
      if (cancelled) return;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      await loadOne(teamSongUrl, setTeamLoadState, setTeamPlaybackUrl, setTeamCached);
    };

    void run();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [nationalAnthemUrl, teamSongUrl]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        mozFullScreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };
      setIsFullscreen(
        Boolean(
          doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement,
        ),
      );
    };

    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState as EventListener);
    document.addEventListener('mozfullscreenchange', syncFullscreenState as EventListener);
    document.addEventListener('MSFullscreenChange', syncFullscreenState as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener(
        'webkitfullscreenchange',
        syncFullscreenState as EventListener,
      );
      document.removeEventListener('mozfullscreenchange', syncFullscreenState as EventListener);
      document.removeEventListener('MSFullscreenChange', syncFullscreenState as EventListener);
    };
  }, []);

  const countdown = useMemo(() => {
    if (!signal) return null;
    return Math.max(0, Math.ceil((new Date(signal.startsAt).getTime() - now) / 1000));
  }, [signal, now]);

  const view: CeremonyView = !signal ? 'waiting' : countdown && countdown > 0 ? 'countdown' : 'salute';

  const playElement = async (el: HTMLMediaElement | null) => {
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
    if (saluteCommand.trim() || saluteAudioUrl) {
      setMediaPhase('command');
      return;
    }
    if (nationalAnthemUrl) {
      setMediaPhase('national');
      return;
    }
    if (teamSongUrl) {
      setMediaPhase('team');
      return;
    }
    if (readinessMotto.trim() || readinessAudioUrl) {
      setMediaPhase('motto');
      return;
    }
    setMediaPhase('done');
  };

  useEffect(() => {
    if (view !== 'salute' || !signal) return;
    if (startedSignalRef.current === signal.id) return;
    startedSignalRef.current = signal.id;
    startMediaSequence();
  }, [view, signal?.id, saluteCommand, saluteAudioUrl, nationalAnthemUrl, teamSongUrl, readinessMotto, readinessAudioUrl]);

  const advanceAfterCommand = () => {
    if (nationalAnthemUrl) setMediaPhase('national');
    else if (teamSongUrl) setMediaPhase('team');
    else if (readinessMotto.trim() || readinessAudioUrl) setMediaPhase('motto');
    else setMediaPhase('done');
  };

  useEffect(() => {
    if (view !== 'salute' || mediaPhase !== 'command') return;
    if (saluteAudioUrl) {
      const timer = window.setTimeout(() => void playElement(saluteAudioRef.current), 50);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(advanceAfterCommand, 2600);
    return () => window.clearTimeout(timer);
  }, [view, mediaPhase, saluteAudioUrl, nationalAnthemUrl, teamSongUrl, readinessMotto, readinessAudioUrl]);

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
    else if (readinessMotto.trim() || readinessAudioUrl) setMediaPhase('motto');
    else setMediaPhase('done');
  };

  const handleTeamEnded = () => {
    if (readinessMotto.trim() || readinessAudioUrl) setMediaPhase('motto');
    else setMediaPhase('done');
  };

  useEffect(() => {
    if (view !== 'salute' || mediaPhase !== 'motto') return;
    if (readinessAudioUrl) {
      const timer = window.setTimeout(() => void playElement(readinessAudioRef.current), 50);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setMediaPhase('done'), 4500);
    return () => window.clearTimeout(timer);
  }, [view, mediaPhase, readinessAudioUrl]);

  const prepareAudio = async () => {
    const elements = [
      saluteAudioUrl ? saluteAudioRef.current : null,
      nationalAnthemUrl ? nationalRef.current : null,
      teamSongUrl ? teamRef.current : null,
      readinessAudioUrl ? readinessAudioRef.current : null,
    ].filter(Boolean) as HTMLMediaElement[];

    try {
      for (const el of elements) {
        el.muted = false;
        el.volume = 0;
        await el.play();
        el.pause();
        el.currentTime = 0;
        el.volume = 1;
      }
      setAudioReady(true);
      setMediaBlocked(false);
    } catch (err) {
      console.warn('Không thể chuẩn bị âm thanh tự động:', err);
      setAudioReady(false);
      setMediaBlocked(true);
    }
  };

  const retryCurrentMedia = () => {
    setAudioReady(true);
    if (mediaPhase === 'command') void playElement(saluteAudioRef.current);
    else if (mediaPhase === 'national') void playElement(nationalRef.current);
    else if (mediaPhase === 'team') void playElement(teamRef.current);
    else if (mediaPhase === 'motto') void playElement(readinessAudioRef.current);
  };

  const requestFullscreen = async () => {
    const target = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };

    try {
      if (target.requestFullscreen) await target.requestFullscreen();
      else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
      else if (target.mozRequestFullScreen) await target.mozRequestFullScreen();
      else if (target.msRequestFullscreen) await target.msRequestFullscreen();
    } catch (err) {
      console.warn('Không thể chuyển sang toàn màn hình:', err);
    }
  };

  const exitFullscreen = async () => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      mozCancelFullScreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };

    try {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
      else if (doc.msExitFullscreen) await doc.msExitFullscreen();
    } catch (err) {
      console.warn('Không thể thoát toàn màn hình:', err);
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) await exitFullscreen();
    else await requestFullscreen();
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

  const hasCeremonyMedia = Boolean(saluteAudioUrl || nationalAnthemUrl || teamSongUrl || readinessAudioUrl);
  const allConfiguredMediaReady =
    (!nationalAnthemUrl || nationalLoadState === 'ready') &&
    (!teamSongUrl || teamLoadState === 'ready');
  const allConfiguredMediaUsable =
    (!nationalAnthemUrl || nationalLoadState !== 'loading') &&
    (!teamSongUrl || teamLoadState !== 'loading');
  const showTeacherStageOverlay = !canControl && view !== 'waiting';

  return (
    <>
      <audio ref={saluteAudioRef} src={saluteAudioUrl} preload="auto" onEnded={advanceAfterCommand} className="hidden" />
      <audio ref={readinessAudioRef} src={readinessAudioUrl} preload="auto" onEnded={() => setMediaPhase('done')} className="hidden" />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 pb-20">
        <div
          className={`overflow-hidden rounded-3xl border text-white shadow-xl ${
            canControl
              ? 'border-red-200 bg-gradient-to-br from-red-950 via-red-900 to-slate-950'
              : 'border-blue-100 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900'
          }`}
        >
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black tracking-wide ${
                  canControl
                    ? 'bg-red-500/20 text-red-100 ring-1 ring-red-300/30'
                    : 'bg-white/10 text-white'
                }`}
              >
                {canControl ? <ShieldCheck className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                {canControl ? 'CHẾ ĐỘ ĐIỀU HÀNH' : 'MÀN HÌNH LỚP'}
              </div>
              <div className="flex items-center gap-2">
                {!canControl && (
                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    className="rounded-xl bg-white/10 px-4 py-2 text-xs font-extrabold text-white hover:bg-white/20"
                  >
                    {isFullscreen ? 'Thoát toàn màn hình' : 'Mở toàn màn hình'}
                  </button>
                )}
                {canControl && (
                  <a
                    href="/quan-tri/hoat-dong-phong-trao"
                    className="rounded-xl bg-white/10 px-4 py-2 text-xs font-extrabold text-white hover:bg-white/20"
                  >
                    Cấu hình Quốc ca / Đội ca
                  </a>
                )}
              </div>
            </div>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
              {canControl ? 'Bảng điều khiển chào cờ' : 'Chào cờ đồng bộ toàn trường'}
            </h1>
            <p
              className={`mt-3 max-w-3xl text-sm sm:text-base leading-relaxed ${
                canControl ? 'text-red-100' : 'text-blue-100'
              }`}
            >
              {canControl
                ? 'Đây là màn hình dành cho Ban tổ chức. Bấm bắt đầu một lần để gửi tín hiệu đến tất cả lớp đang mở màn hình chào cờ.'
                : 'Giáo viên chỉ cần mở sẵn trang này, bật âm thanh, bấm toàn màn hình và giữ màn hình chờ. Khi Ban tổ chức phát lệnh, lớp sẽ tự đếm ngược và phát nghi lễ.'}
            </p>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <strong>Chưa có Realtime.</strong> Trang chỉ đồng bộ giữa các tab trên cùng thiết bị.
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {canControl && (
          <div className="mt-6 rounded-3xl border-2 border-red-200 bg-red-50/70 p-5 shadow-sm dark:border-red-900/60 dark:bg-red-950/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-red-700 dark:text-red-300">
                  <ShieldCheck className="h-5 w-5" /> BAN TỔ CHỨC
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Nút điều hành chỉ hiển thị cho Quản trị hệ thống / Hiệu trưởng / Hiệu phó. Giáo viên không nhìn thấy khu vực này.
                </p>
              </div>
              <button
                type="button"
                onClick={start}
                disabled={sending}
                className="min-w-[260px] rounded-2xl bg-red-600 px-6 py-4 text-base font-black text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Play className="h-5 w-5" /> {sending ? 'Đang gửi tín hiệu...' : 'BẮT ĐẦU CHÀO CỜ'}
              </button>
            </div>
          </div>
        )}

        <div className={`mt-6 grid gap-6 ${canControl ? 'lg:grid-cols-[1fr_340px]' : 'grid-cols-1'}`}>
          <section className="min-h-[430px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10 flex items-center justify-center text-center overflow-hidden">
            {view === 'waiting' && (
              <div>
                <div
                  className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
                    canControl
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'
                  }`}
                >
                  <Radio className="h-11 w-11" />
                </div>
                <div
                  className={`mt-6 text-xs font-extrabold uppercase tracking-[0.24em] ${
                    canControl ? 'text-red-600' : 'text-blue-600'
                  }`}
                >
                  {canControl ? 'Màn hình xem trước' : 'Đã kết nối'}
                </div>
                <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  Đang chờ chào cờ
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400">
                  {canControl
                    ? 'Khi bấm BẮT ĐẦU CHÀO CỜ, màn hình này và toàn bộ máy lớp sẽ cùng chuyển sang đếm ngược.'
                    : 'Cho học sinh ổn định tại lớp, bật âm thanh một lần, bấm toàn màn hình và giữ trang này mở. Không cần thao tác gì thêm.'}
                </p>
                {hasCeremonyMedia && !canControl && (
                  <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void prepareAudio()}
                      disabled={!allConfiguredMediaUsable}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        audioReady
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {audioReady ? <CheckCircle2 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      {audioReady
                        ? 'SẴN SÀNG CHÀO CỜ'
                        : allConfiguredMediaUsable
                          ? 'BẬT ÂM THANH / SẴN SÀNG'
                          : 'ĐANG TẢI VIDEO...'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                      {isFullscreen ? 'THOÁT TOÀN MÀN HÌNH' : 'MỞ TOÀN MÀN HÌNH'}
                    </button>
                  </div>
                )}
                {hasCeremonyMedia && !canControl && (
                  <p
                    className={`mt-3 text-xs font-bold ${
                      audioReady
                        ? 'text-emerald-600'
                        : allConfiguredMediaReady
                          ? 'text-blue-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {audioReady
                      ? '✓ Máy lớp đã sẵn sàng: Realtime + video + âm thanh. Nên để toàn màn hình trước khi chào cờ.'
                      : allConfiguredMediaReady
                        ? '✓ Video đã tải xong. Bấm nút trên để chuẩn bị âm thanh.'
                        : 'Đang tải trước video để khi có hiệu lệnh không phải tải lại từ đầu.'}
                  </p>
                )}
              </div>
            )}

            {view === 'countdown' && canControl && (
              <div>
                <div className="text-sm font-extrabold uppercase tracking-[0.24em] text-red-600">
                  Toàn trường chuẩn bị
                </div>
                <div className="mt-3 text-[9rem] sm:text-[12rem] leading-none font-black tabular-nums text-red-600">
                  {countdown}
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Đứng dậy – chỉnh đốn trang phục
                </h2>
              </div>
            )}

            {view === 'salute' && mediaPhase === 'command' && canControl && (
              <div className="w-full">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30">
                  <Flag className="h-14 w-14" />
                </div>
                <div className="mt-7 text-5xl sm:text-7xl font-black tracking-tight text-red-600">{saluteCommand}</div>
                <div className="mt-4 text-base font-bold text-slate-500 dark:text-slate-300">Sau khẩu lệnh, Quốc ca sẽ tự phát.</div>
              </div>
            )}

            {nationalAnthemUrl && canControl && (
              <div className={view === 'salute' && mediaPhase === 'national' ? 'w-full' : 'hidden'}>
                <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-red-600">
                  NGHIÊM! — CHÀO CỜ, CHÀO!
                </div>
                <div className="mx-auto overflow-hidden rounded-2xl bg-black shadow-lg max-w-4xl aspect-video">
                  <video
                    ref={nationalRef}
                    src={nationalPlaybackUrl || nationalAnthemUrl}
                    preload="auto"
                    playsInline
                    onEnded={handleNationalEnded}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="mt-4 text-xl font-black text-slate-900 dark:text-white">QUỐC CA</div>
                {mediaBlocked && (
                  <button
                    onClick={retryCurrentMedia}
                    className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white"
                  >
                    <Volume2 className="mr-2 inline h-4 w-4" /> NHẤN ĐỂ PHÁT ÂM THANH
                  </button>
                )}
              </div>
            )}

            {teamSongUrl && canControl && (
              <div className={view === 'salute' && mediaPhase === 'team' ? 'w-full' : 'hidden'}>
                <div className="mb-4 text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">
                  Tiếp tục nghi lễ
                </div>
                <div className="mx-auto overflow-hidden rounded-2xl bg-black shadow-lg max-w-4xl aspect-video">
                  <video
                    ref={teamRef}
                    src={teamPlaybackUrl || teamSongUrl}
                    preload="auto"
                    playsInline
                    onEnded={handleTeamEnded}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="mt-4 text-xl font-black text-slate-900 dark:text-white">ĐỘI CA</div>
                {mediaBlocked && (
                  <button
                    onClick={retryCurrentMedia}
                    className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white"
                  >
                    <Volume2 className="mr-2 inline h-4 w-4" /> NHẤN ĐỂ PHÁT ÂM THANH
                  </button>
                )}
              </div>
            )}

            {view === 'salute' && mediaPhase === 'motto' && canControl && (
              <div className="w-full">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30">
                  <Flag className="h-14 w-14" />
                </div>
                <div className="mx-auto mt-7 max-w-3xl text-3xl sm:text-5xl font-black leading-tight text-red-600">{readinessMotto}</div>
              </div>
            )}

            {view === 'salute' && canControl && (mediaPhase === 'done' || (!hasCeremonyMedia && !saluteCommand.trim() && !readinessMotto.trim() && mediaPhase !== 'national' && mediaPhase !== 'team')) && (
              <div>
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30">
                  <Flag className="h-14 w-14" />
                </div>
                <div className="mt-7 text-5xl sm:text-7xl font-black tracking-tight text-red-600">NGHIÊM!</div>
                <div className="mt-5 text-3xl sm:text-5xl font-black text-slate-900 dark:text-white">
                  CHÀO CỜ – CHÀO!
                </div>
                {mediaPhase === 'done' && hasCeremonyMedia && (
                  <p className="mt-5 text-base font-bold text-emerald-600">Đã hoàn tất Quốc ca và Đội ca.</p>
                )}
              </div>
            )}
          </section>

          {canControl && (
            <aside className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  <Wifi className="h-5 w-5 text-emerald-600" /> Tình trạng hệ thống
                </div>
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {isSupabaseConfigured ? 'Realtime đang hoạt động' : 'Chế độ cục bộ'}
                </div>
                <div className="mt-3 space-y-2 text-xs font-bold">
                  <div
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      !nationalAnthemUrl
                        ? 'bg-slate-50 text-slate-500 dark:bg-slate-800'
                        : nationalLoadState === 'ready'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : nationalLoadState === 'loading'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                    }`}
                  >
                    <span>Quốc ca</span>
                    <span>
                      {!nationalAnthemUrl
                        ? 'Chưa cài'
                        : nationalLoadState === 'ready'
                          ? nationalCached
                            ? 'Sẵn sàng · cache'
                            : 'Sẵn sàng'
                          : nationalLoadState === 'loading'
                            ? 'Đang tải...'
                            : 'Dùng trực tiếp'}
                    </span>
                  </div>
                  <div
                    className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                      !teamSongUrl
                        ? 'bg-slate-50 text-slate-500 dark:bg-slate-800'
                        : teamLoadState === 'ready'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : teamLoadState === 'loading'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                    }`}
                  >
                    <span>Đội ca</span>
                    <span>
                      {!teamSongUrl
                        ? 'Chưa cài'
                        : teamLoadState === 'ready'
                          ? teamCached
                            ? 'Sẵn sàng · cache'
                            : 'Sẵn sàng'
                          : teamLoadState === 'loading'
                            ? 'Đang tải...'
                            : 'Dùng trực tiếp'}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Trạng thái ở đây là trạng thái media trên máy điều hành. Các máy lớp tự tải/cache video khi giáo viên mở trang.
                </p>
              </div>

              <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/50 dark:bg-slate-900">
                <div className="text-xs font-black uppercase tracking-wider text-red-600">Điều khiển cục bộ</div>
                <button
                  type="button"
                  onClick={() => {
                    setSignal(null);
                    setMediaPhase('idle');
                    startedSignalRef.current = null;
                  }}
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Trở về màn hình chờ trên máy này
                </button>
              </div>
            </aside>
          )}

          {!canControl && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <Wifi className="h-5 w-5 text-emerald-600" /> Trạng thái máy lớp
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  Realtime: Sẵn sàng
                </div>
                <div
                  className={`rounded-xl px-3 py-3 text-xs font-bold ${
                    nationalAnthemUrl && nationalLoadState === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                  }`}
                >
                  Quốc ca: {nationalAnthemUrl && nationalLoadState === 'ready' ? 'Sẵn sàng' : nationalAnthemUrl ? 'Đang tải' : 'Chưa cài'}
                </div>
                <div
                  className={`rounded-xl px-3 py-3 text-xs font-bold ${
                    teamSongUrl && teamLoadState === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                  }`}
                >
                  Đội ca: {teamSongUrl && teamLoadState === 'ready' ? 'Sẵn sàng' : teamSongUrl ? 'Đang tải' : 'Chưa cài'}
                </div>
                <div className={`rounded-xl px-3 py-3 text-xs font-bold ${isFullscreen ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  Toàn màn hình: {isFullscreen ? 'Đã bật' : 'Chưa bật'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showTeacherStageOverlay && (
        <div className="fixed inset-0 z-[100] bg-black text-white">
          {view === 'countdown' && (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black px-6 text-center">
              <VietnamFlagBackdrop className="absolute inset-0 h-full w-full opacity-20" />
              <div className="relative z-10 rounded-full bg-white/10 px-4 py-2 text-sm font-black tracking-[0.18em] text-white backdrop-blur">
                TOÀN TRƯỜNG CHUẨN BỊ
              </div>
              <div className="relative z-10 mt-6 text-[10rem] font-black leading-none text-yellow-300 drop-shadow-[0_0_24px_rgba(253,224,71,0.35)] sm:text-[14rem]">
                {countdown}
              </div>
              <h2 className="relative z-10 mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Đứng dậy – chỉnh đốn trang phục
              </h2>
              <p className="relative z-10 mt-4 max-w-2xl text-base text-blue-100 sm:text-lg">
                Màn hình lớp đang ở chế độ trình chiếu. Khi đếm ngược kết thúc sẽ tự phát nghi lễ.
              </p>
            </div>
          )}

          {view === 'salute' && mediaPhase === 'command' && (
            <div className="relative h-full w-full overflow-hidden">
              <VietnamFlagBackdrop className="absolute inset-0 h-full w-full" />
              {saluteCommand.trim() && (
                <div className="absolute inset-x-0 bottom-0 z-10 bg-black/45 px-6 py-5 text-center backdrop-blur-sm">
                  <div className="text-2xl font-black tracking-tight text-white sm:text-4xl">{saluteCommand}</div>
                </div>
              )}
            </div>
          )}

          {view === 'salute' && mediaPhase === 'national' && (
            <div className="relative h-full w-full bg-black">
              <video
                ref={nationalRef}
                src={nationalPlaybackUrl || nationalAnthemUrl}
                preload="auto"
                playsInline
                onEnded={handleNationalEnded}
                className="h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-5 py-4">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-white/95">NGHIÊM! — CHÀO CỜ, CHÀO!</div>
                <div className="mt-1 text-xl font-black text-yellow-300 sm:text-2xl">QUỐC CA</div>
              </div>
            </div>
          )}

          {view === 'salute' && mediaPhase === 'team' && (
            <div className="relative h-full w-full bg-black">
              <video
                ref={teamRef}
                src={teamPlaybackUrl || teamSongUrl}
                preload="auto"
                playsInline
                onEnded={handleTeamEnded}
                className="h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/25 to-transparent px-5 py-4">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-white/95">TIẾP TỤC NGHI LỄ</div>
                <div className="mt-1 text-xl font-black text-blue-200 sm:text-2xl">ĐỘI CA</div>
              </div>
            </div>
          )}

          {view === 'salute' && mediaPhase === 'motto' && (
            <div className="relative h-full w-full overflow-hidden">
              <VietnamFlagBackdrop className="absolute inset-0 h-full w-full" />
              {readinessMotto.trim() && (
                <div className="absolute inset-x-0 bottom-0 z-10 bg-black/45 px-6 py-5 text-center backdrop-blur-sm">
                  <div className="mx-auto max-w-6xl text-xl font-black leading-snug text-white sm:text-3xl">{readinessMotto}</div>
                </div>
              )}
            </div>
          )}

          {view === 'salute' && (mediaPhase === 'done' || (!hasCeremonyMedia && !saluteCommand.trim() && !readinessMotto.trim() && mediaPhase !== 'national' && mediaPhase !== 'team')) && (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <VietnamFlagBackdrop className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10 px-6 text-center">
                <div className="text-5xl font-black tracking-tight text-white drop-shadow sm:text-7xl">NGHIÊM!</div>
                <div className="mt-5 text-4xl font-black text-yellow-200 drop-shadow sm:text-6xl">CHÀO CỜ – CHÀO!</div>
                {mediaPhase === 'done' && hasCeremonyMedia && (
                  <p className="mt-6 text-base font-bold text-white/90 sm:text-lg">Đã hoàn tất Quốc ca và Đội ca.</p>
                )}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-4 top-4 z-[110] rounded-full bg-black/45 px-4 py-2 text-xs font-black tracking-[0.18em] text-white backdrop-blur">
            MÀN HÌNH LỚP
          </div>

          <div className="absolute right-4 top-4 z-[110] flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="rounded-full bg-black/55 px-4 py-2 text-xs font-black tracking-wide text-white backdrop-blur hover:bg-black/70"
            >
              {isFullscreen ? 'Thoát toàn màn hình' : 'Mở toàn màn hình'}
            </button>
          </div>

          {mediaBlocked && (
            <div className="absolute inset-x-0 bottom-6 z-[110] flex justify-center px-4">
              <button
                onClick={retryCurrentMedia}
                className="rounded-2xl bg-red-600 px-6 py-4 text-sm font-extrabold text-white shadow-xl"
              >
                <Volume2 className="mr-2 inline h-5 w-5" /> NHẤN ĐỂ PHÁT ÂM THANH
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
