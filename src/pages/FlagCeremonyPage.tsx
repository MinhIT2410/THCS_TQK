import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  CircleStop,
  Clock3,
  Flag,
  MonitorUp,
  Play,
  Radio,
  RotateCcw,
  School,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  CeremonyPhase,
  CeremonySession,
  ConnectedClass,
  FlagCeremonyState,
  flagCeremonyService,
} from '../services/flagCeremonyService';

const MORNING_CLASSES = [
  '6/1','6/2','6/3','6/4','6/5','6/6','6/7','6/8','6/16','6/17','6/18','6/19',
  '7/1','7/2','7/3','7/4','7/5','7/6','7/7','7/8','7/9','7/16',
  '8/1','8/2','8/3','8/4','8/5','8/6','8/7','8/8',
  '9/1','9/2','9/3','9/4','9/5','9/6','9/7','9/8','9/9','9/10','9/11','9/12','9/13','9/14','9/15','9/16',
];

const AFTERNOON_CLASSES = [
  '6/9','6/10','6/11','6/12','6/13','6/14','6/15',
  '7/10','7/11','7/12','7/13','7/14','7/15',
  '8/9','8/10','8/11','8/12','8/13','8/14',
];

const YARD_BY_WEEK: Record<1 | 2 | 3, { morning: string[]; afternoon: string[] }> = {
  1: {
    morning: ['6/1','6/2','6/3','6/4','6/5','6/6','6/7','6/8','6/16','6/17','6/18','6/19'],
    afternoon: ['6/9','6/10','6/11','6/12','6/13','6/14','6/15'],
  },
  2: {
    morning: ['7/1','7/2','7/3','7/4','7/5','7/6','7/7','7/8','7/9','7/16','8/1','8/2','8/3','8/4','8/5','8/6','8/7','8/8'],
    afternoon: ['7/10','7/11','7/12','7/13','7/14','7/15','8/9','8/10','8/11','8/12','8/13','8/14'],
  },
  3: {
    morning: ['9/1','9/2','9/3','9/4','9/5','9/6','9/7','9/8','9/9','9/10','9/11','9/12','9/13','9/14','9/15','9/16'],
    afternoon: [],
  },
};

const DEFAULT_STATE: FlagCeremonyState = {
  id: 'school',
  phase: 'idle',
  session: 'morning',
  cycle_week: 1,
  starts_at: null,
  message: null,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

function formatSession(session: CeremonySession) {
  return session === 'morning' ? 'Buổi sáng' : 'Buổi chiều';
}

function phaseLabel(phase: CeremonyPhase) {
  if (phase === 'waiting') return 'Đang chờ nghi lễ';
  if (phase === 'countdown') return 'Chuẩn bị chào cờ';
  if (phase === 'salute') return 'Đang thực hiện nghi lễ';
  if (phase === 'done') return 'Nghi lễ đã kết thúc';
  return 'Chưa mở phiên';
}

export default function FlagCeremonyPage() {
  const { user, hasAnyRole } = useAuth();
  const canControl = hasAnyRole(['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF']);
  const [state, setState] = useState<FlagCeremonyState>(DEFAULT_STATE);
  const [mode, setMode] = useState<'classroom' | 'controller'>(canControl ? 'controller' : 'classroom');
  const [className, setClassName] = useState(() => localStorage.getItem('tqk_ceremony_class') || '');
  const [connectedClasses, setConnectedClasses] = useState<ConnectedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    flagCeremonyService.getState()
      .then((next) => active && setState(next))
      .catch((err) => active && setError(err?.message || 'Không thể tải trạng thái chào cờ.'))
      .finally(() => active && setLoading(false));

    const unsubscribe = flagCeremonyService.subscribeState((next) => setState(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!className) return;
    localStorage.setItem('tqk_ceremony_class', className);
  }, [className]);

  useEffect(() => {
    if (mode === 'classroom' && !className) return;
    const stop = flagCeremonyService.createPresenceChannel(
      'school',
      mode === 'controller'
        ? { role: 'controller' }
        : { role: 'classroom', className, session: state.session },
      setConnectedClasses,
    );
    return stop;
  }, [mode, className, state.session]);

  const allSessionClasses = state.session === 'morning' ? MORNING_CLASSES : AFTERNOON_CLASSES;
  const yardClasses = YARD_BY_WEEK[state.cycle_week][state.session];
  const classroomClasses = allSessionClasses.filter((name) => !yardClasses.includes(name));
  const classIsScheduled = !!className && allSessionClasses.includes(className);
  const classIsInYard = !!className && yardClasses.includes(className);

  const countdownSeconds = useMemo(() => {
    if (!state.starts_at || state.phase !== 'countdown') return null;
    return Math.max(0, Math.ceil((new Date(state.starts_at).getTime() - now) / 1000));
  }, [state.starts_at, state.phase, now]);

  useEffect(() => {
    if (state.phase === 'countdown' && countdownSeconds === 0 && canControl) {
      flagCeremonyService.updateState({ phase: 'salute' }, user?.id).catch(() => {});
    }
  }, [countdownSeconds, state.phase, canControl, user?.id]);

  const update = async (patch: Parameters<typeof flagCeremonyService.updateState>[0]) => {
    try {
      setSaving(true);
      setError(null);
      const next = await flagCeremonyService.updateState(patch, user?.id);
      setState(next);
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật phiên chào cờ.');
    } finally {
      setSaving(false);
    }
  };

  const startCountdown = () => {
    const startsAt = new Date(Date.now() + 10_000).toISOString();
    update({ phase: 'countdown', starts_at: startsAt, message: 'Toàn trường chuẩn bị thực hiện nghi lễ chào cờ.' });
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm font-semibold text-slate-500">Đang kết nối hệ thống chào cờ...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-20">
      <div className="rounded-3xl overflow-hidden border border-blue-100 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white shadow-xl">
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide">
              <Flag className="h-4 w-4" /> SINH HOẠT ĐẦU TUẦN
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">Điều hành nghi lễ chào cờ đồng bộ</h1>
            <p className="max-w-3xl text-sm sm:text-base text-blue-100 leading-relaxed">
              Các lớp có tiết HĐTN trong cùng buổi cùng đứng dậy thực hiện nghi lễ. Nhóm được phân công xuống sân tập trung, các lớp còn lại thực hiện tại lớp theo cùng một mốc thời gian.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="rounded-2xl bg-white/10 px-4 py-3 min-w-32">
              <div className="text-[11px] uppercase tracking-wider text-blue-200 font-bold">Chu kỳ</div>
              <div className="mt-1 text-2xl font-black">Tuần {state.cycle_week}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 min-w-32">
              <div className="text-[11px] uppercase tracking-wider text-blue-200 font-bold">Phiên</div>
              <div className="mt-1 text-lg font-black">{formatSession(state.session)}</div>
            </div>
          </div>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <WifiOff className="h-5 w-5 mt-0.5 shrink-0" />
          <div><strong>Chế độ thử nghiệm cục bộ.</strong> Chưa cấu hình Supabase nên các thiết bị khác chưa thể đồng bộ. Sau khi chạy SQL đi kèm và cấu hình biến môi trường, trang sẽ chuyển sang realtime.</div>
        </div>
      )}

      {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setMode('classroom')} className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${mode === 'classroom' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'}`}>
          <School className="h-4 w-4" /> Màn hình lớp
        </button>
        {canControl && (
          <button onClick={() => setMode('controller')} className={`rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 ${mode === 'controller' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'}`}>
            <ShieldCheck className="h-4 w-4" /> Điều hành
          </button>
        )}
      </div>

      {mode === 'classroom' ? (
        <div className="mt-6 grid lg:grid-cols-[340px_1fr] gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Chọn lớp</label>
              <select value={className} onChange={(e) => setClassName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="">-- Chọn lớp --</option>
                {[...MORNING_CLASSES, ...AFTERNOON_CLASSES].sort((a,b) => a.localeCompare(b, 'vi', { numeric: true })).map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Phiên hiện tại</span><strong>{formatSession(state.session)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Tuần chu kỳ</span><strong>Tuần {state.cycle_week}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Trạng thái</span><strong>{phaseLabel(state.phase)}</strong></div>
            </div>

            {className && (
              <div className={`rounded-2xl border p-4 ${classIsScheduled ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'}`}>
                <div className="flex items-center gap-2 font-extrabold text-sm">
                  {classIsScheduled ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Clock3 className="h-5 w-5 text-slate-400" />}
                  Lớp {className}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {classIsScheduled
                    ? classIsInYard
                      ? 'Lớp thuộc nhóm xuống sân trong tuần này. Thiết bị vẫn theo dõi tín hiệu đồng bộ.'
                      : 'Lớp có HĐTN cùng buổi và thực hiện nghi lễ tại lớp.'
                    : `Lớp không thuộc nhóm HĐTN ${state.session === 'morning' ? 'sáng' : 'chiều'} thứ Hai.`}
                </p>
              </div>
            )}
          </div>

          <CeremonyStage state={state} countdownSeconds={countdownSeconds} className={className} classIsScheduled={classIsScheduled} classIsInYard={classIsInYard} />
        </div>
      ) : (
        <div className="mt-6 grid xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Thiết lập phiên</div>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Chọn tuần và buổi sinh hoạt</h2>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isSupabaseConfigured ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700'}`}>
                  {isSupabaseConfigured ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  {isSupabaseConfigured ? 'Realtime đang hoạt động' : 'Chế độ cục bộ'}
                </div>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">Tuần chu kỳ</div>
                  <div className="grid grid-cols-3 gap-2">
                    {([1,2,3] as const).map((week) => (
                      <button key={week} disabled={saving} onClick={() => update({ cycle_week: week })} className={`rounded-xl py-3 text-sm font-extrabold ${state.cycle_week === week ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>Tuần {week}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">Buổi</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['morning','afternoon'] as const).map((session) => (
                      <button key={session} disabled={saving} onClick={() => update({ session, phase: 'idle', starts_at: null })} className={`rounded-xl py-3 text-sm font-extrabold ${state.session === session ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{session === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid sm:grid-cols-4 gap-3">
                <button disabled={saving} onClick={() => update({ phase: 'waiting', starts_at: null, message: 'Các lớp chuẩn bị ổn định đội hình.' })} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950/30">
                  <BellRing className="h-5 w-5 text-blue-600" /><div className="mt-2 text-sm font-extrabold">Mở phiên</div><div className="mt-1 text-[11px] text-slate-500">Thông báo các lớp chuẩn bị</div>
                </button>
                <button disabled={saving} onClick={startCountdown} className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30">
                  <Play className="h-5 w-5 text-red-600" /><div className="mt-2 text-sm font-extrabold">Bắt đầu sau 10 giây</div><div className="mt-1 text-[11px] text-slate-500">Đồng bộ mốc thời gian</div>
                </button>
                <button disabled={saving} onClick={() => update({ phase: 'done', starts_at: null, message: 'Nghi lễ chào cờ đã kết thúc.' })} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" /><div className="mt-2 text-sm font-extrabold">Kết thúc nghi lễ</div><div className="mt-1 text-[11px] text-slate-500">Các lớp tiếp tục HĐTN</div>
                </button>
                <button disabled={saving} onClick={() => update({ phase: 'idle', starts_at: null, message: null })} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <RotateCcw className="h-5 w-5 text-slate-500" /><div className="mt-2 text-sm font-extrabold">Đóng / đặt lại</div><div className="mt-1 text-[11px] text-slate-500">Trở về trạng thái chờ</div>
                </button>
              </div>
            </div>

            <CeremonyStage state={state} countdownSeconds={countdownSeconds} className="Bộ phận điều hành" classIsScheduled classIsInYard />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div><div className="text-xs uppercase tracking-wider font-bold text-slate-400">Kết nối lớp học</div><div className="mt-1 text-2xl font-black">{connectedClasses.filter(c => c.session === state.session).length}/{classroomClasses.length}</div></div>
                <MonitorUp className="h-8 w-8 text-blue-500" />
              </div>
              <p className="mt-2 text-xs text-slate-500">Số lớp thực hiện tại lớp đang mở màn hình trong phiên hiện tại.</p>
              <div className="mt-4 max-h-44 overflow-y-auto flex flex-wrap gap-2">
                {classroomClasses.map((name) => {
                  const online = connectedClasses.some((c) => c.className === name && c.session === state.session);
                  return <span key={name} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${online ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{name}</span>;
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2"><Users className="h-5 w-5 text-red-500" /><h3 className="font-extrabold">Phân công tuần {state.cycle_week}</h3></div>
              <div className="mt-4 space-y-4 text-sm">
                <div><div className="font-bold text-slate-500">Xuống sân · {formatSession(state.session)}</div><div className="mt-2 flex flex-wrap gap-1.5">{yardClasses.length ? yardClasses.map(name => <span key={name} className="rounded-lg bg-red-50 text-red-700 px-2 py-1 text-xs font-bold dark:bg-red-950/30 dark:text-red-300">{name}</span>) : <span className="text-xs text-slate-400">Không có nhóm xuống sân.</span>}</div></div>
                <div><div className="font-bold text-slate-500">Thực hiện tại lớp</div><div className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{classroomClasses.length} lớp có HĐTN cùng buổi thực hiện nghi lễ đồng thời tại lớp.</div></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CeremonyStage({
  state,
  countdownSeconds,
  className,
  classIsScheduled,
  classIsInYard,
}: {
  state: FlagCeremonyState;
  countdownSeconds: number | null;
  className: string;
  classIsScheduled: boolean;
  classIsInYard: boolean;
}) {
  const active = classIsScheduled || className === 'Bộ phận điều hành';
  return (
    <div className={`min-h-[420px] rounded-3xl border shadow-sm overflow-hidden flex flex-col ${active ? 'border-blue-200 bg-white dark:border-blue-900 dark:bg-slate-900' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'}`}>
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-extrabold"><Radio className={`h-5 w-5 ${state.phase === 'salute' ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} /> {phaseLabel(state.phase)}</div>
        <div className="text-xs font-bold text-slate-500">{className || 'Chưa chọn lớp'}{classIsInYard && className !== 'Bộ phận điều hành' ? ' · Xuống sân' : ''}</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 text-center">
        {!active ? (
          <div className="max-w-lg space-y-3"><Clock3 className="mx-auto h-14 w-14 text-slate-300" /><h2 className="text-2xl font-black text-slate-500">Không thuộc phiên HĐTN này</h2><p className="text-sm text-slate-400">Lớp không cần thực hiện nghi lễ theo phiên đang được điều hành.</p></div>
        ) : state.phase === 'countdown' ? (
          <div className="space-y-4"><div className="text-sm uppercase tracking-[0.25em] font-black text-red-600">TOÀN TRƯỜNG CHUẨN BỊ</div><div className="text-8xl sm:text-9xl font-black tabular-nums text-slate-950 dark:text-white">{countdownSeconds ?? 0}</div><p className="text-sm font-semibold text-slate-500">Đứng dậy · chỉnh trang phục · hướng về Quốc kỳ</p></div>
        ) : state.phase === 'salute' ? (
          <div className="space-y-5"><Flag className="mx-auto h-20 w-20 text-red-600" /><div className="text-sm uppercase tracking-[0.3em] font-black text-red-600">NGHIÊM</div><h2 className="text-4xl sm:text-6xl font-black text-slate-950 dark:text-white">CHÀO CỜ – CHÀO!</h2><p className="text-base font-bold text-slate-500">Tất cả học sinh thực hiện nghi lễ đồng thời.</p></div>
        ) : state.phase === 'waiting' ? (
          <div className="space-y-5"><BellRing className="mx-auto h-16 w-16 text-blue-600" /><h2 className="text-3xl font-black text-slate-950 dark:text-white">Ổn định đội hình</h2><p className="text-sm text-slate-500">Phiên đã mở. Chờ tín hiệu bắt đầu nghi lễ từ bộ phận điều hành.</p></div>
        ) : state.phase === 'done' ? (
          <div className="space-y-5"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><h2 className="text-3xl font-black text-slate-950 dark:text-white">Hoàn thành nghi lễ</h2><p className="text-sm text-slate-500">Các lớp tiếp tục nội dung Hoạt động trải nghiệm theo kế hoạch.</p></div>
        ) : (
          <div className="space-y-5"><CircleStop className="mx-auto h-16 w-16 text-slate-300" /><h2 className="text-3xl font-black text-slate-950 dark:text-white">Đang chờ mở phiên</h2><p className="text-sm text-slate-500">Giữ trang này mở. Khi phiên được kích hoạt, màn hình sẽ tự cập nhật.</p></div>
        )}
      </div>
    </div>
  );
}
