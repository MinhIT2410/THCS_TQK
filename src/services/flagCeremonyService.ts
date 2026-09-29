import { supabase, isSupabaseConfigured } from './supabaseClient';

export type CeremonyPhase = 'idle' | 'waiting' | 'countdown' | 'salute' | 'done';
export type CeremonySession = 'morning' | 'afternoon';

export interface FlagCeremonyState {
  id: string;
  phase: CeremonyPhase;
  session: CeremonySession;
  cycle_week: 1 | 2 | 3;
  starts_at: string | null;
  message: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface CeremonyStartSignal {
  id: string;
  startsAt: string;
  session: CeremonySession;
  cycleWeek: 1 | 2 | 3;
}

export interface FlagCeremonySchedule {
  id: string;
  day_of_week: number;
  session: CeremonySession;
  run_time: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConnectedClass {
  className: string;
  session: CeremonySession;
  joinedAt: string;
}

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

const LOCAL_STATE_KEY = 'tqk_flag_ceremony_state_v1';
const LOCAL_SCHEDULE_KEY = 'tqk_flag_ceremony_schedules_v1';

function getLocalState(): FlagCeremonyState {
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function setLocalState(state: FlagCeremonyState) {
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('tqk-flag-ceremony-state', { detail: state }));
}

function getLocalSchedules(): FlagCeremonySchedule[] {
  try {
    const raw = localStorage.getItem(LOCAL_SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalSchedules(schedules: FlagCeremonySchedule[]) {
  localStorage.setItem(LOCAL_SCHEDULE_KEY, JSON.stringify(schedules));
  window.dispatchEvent(new CustomEvent('tqk-flag-ceremony-schedules', { detail: schedules }));
}

function stateToSignal(state: FlagCeremonyState): CeremonyStartSignal | null {
  if (!state.starts_at || state.phase === 'idle' || state.phase === 'waiting') return null;
  return {
    id: `${state.id}:${state.updated_at}`,
    startsAt: state.starts_at,
    session: state.session,
    cycleWeek: state.cycle_week,
  };
}

export const flagCeremonyService = {
  async getState(): Promise<FlagCeremonyState> {
    if (!isSupabaseConfigured) return getLocalState();

    const { data, error } = await supabase
      .from('flag_ceremony_state')
      .select('*')
      .eq('id', 'school')
      .maybeSingle();

    if (error) throw error;
    return data ? (data as FlagCeremonyState) : DEFAULT_STATE;
  },

  async updateState(
    patch: Partial<Pick<FlagCeremonyState, 'phase' | 'session' | 'cycle_week' | 'starts_at' | 'message'>>,
    userId?: string | null,
  ): Promise<FlagCeremonyState> {
    if (!isSupabaseConfigured) {
      const next: FlagCeremonyState = {
        ...getLocalState(),
        ...patch,
        id: 'school',
        updated_at: new Date().toISOString(),
        updated_by: userId ?? null,
      };
      setLocalState(next);
      return next;
    }

    const current = await flagCeremonyService.getState();
    const next: FlagCeremonyState = {
      ...current,
      ...patch,
      id: 'school',
      updated_at: new Date().toISOString(),
      updated_by: userId ?? null,
    };

    const { data, error } = await supabase
      .from('flag_ceremony_state')
      .upsert(next, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;
    return data as FlagCeremonyState;
  },

  async startCountdown(seconds = 10): Promise<CeremonyStartSignal> {
    const state = await flagCeremonyService.updateState({
      phase: 'countdown',
      starts_at: new Date(Date.now() + seconds * 1000).toISOString(),
      message: 'Toàn trường chuẩn bị thực hiện nghi lễ chào cờ.',
    });
    const signal = stateToSignal(state);
    if (!signal) throw new Error('Không tạo được tín hiệu chào cờ.');
    return signal;
  },

  subscribe(callback: (signal: CeremonyStartSignal) => void) {
    let lastSignalId: string | null = null;

    const handle = (state: FlagCeremonyState) => {
      const signal = stateToSignal(state);
      if (!signal || signal.id === lastSignalId) return;
      lastSignalId = signal.id;
      callback(signal);
    };

    if (!isSupabaseConfigured) {
      const initial = getLocalState();
      handle(initial);
      const listener = (event: Event) => handle((event as CustomEvent<FlagCeremonyState>).detail);
      window.addEventListener('tqk-flag-ceremony-state', listener);
      return () => window.removeEventListener('tqk-flag-ceremony-state', listener);
    }

    void flagCeremonyService.getState().then(handle).catch(() => {});
    const channel = supabase
      .channel('flag-ceremony-state-signal')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flag_ceremony_state', filter: 'id=eq.school' },
        (payload: any) => {
          if (payload.new) handle(payload.new as FlagCeremonyState);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeState(callback: (state: FlagCeremonyState) => void) {
    if (!isSupabaseConfigured) {
      const initial = getLocalState();
      callback(initial);
      const listener = (event: Event) => callback((event as CustomEvent<FlagCeremonyState>).detail);
      window.addEventListener('tqk-flag-ceremony-state', listener);
      return () => window.removeEventListener('tqk-flag-ceremony-state', listener);
    }

    void flagCeremonyService.getState().then(callback).catch(() => {});
    const channel = supabase
      .channel('flag-ceremony-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flag_ceremony_state', filter: 'id=eq.school' },
        (payload: any) => {
          if (payload.new) callback(payload.new as FlagCeremonyState);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  async getSchedules(): Promise<FlagCeremonySchedule[]> {
    if (!isSupabaseConfigured) return getLocalSchedules();
    const { data, error } = await supabase
      .from('flag_ceremony_schedules')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('run_time', { ascending: true });
    if (error) throw error;
    return (data || []) as FlagCeremonySchedule[];
  },

  async saveSchedule(schedule: Partial<FlagCeremonySchedule>): Promise<FlagCeremonySchedule> {
    const payload = {
      day_of_week: Number(schedule.day_of_week),
      session: schedule.session as CeremonySession,
      run_time: schedule.run_time,
      enabled: schedule.enabled ?? true,
    };

    if (!isSupabaseConfigured) {
      const schedules = getLocalSchedules();
      const saved: FlagCeremonySchedule = {
        id: schedule.id || crypto.randomUUID(),
        ...payload,
      };
      setLocalSchedules(schedule.id ? schedules.map((item) => item.id === schedule.id ? saved : item) : [...schedules, saved]);
      return saved;
    }

    const query = schedule.id
      ? supabase.from('flag_ceremony_schedules').update(payload).eq('id', schedule.id)
      : supabase.from('flag_ceremony_schedules').insert(payload);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return data as FlagCeremonySchedule;
  },

  async deleteSchedule(id: string) {
    if (!isSupabaseConfigured) {
      setLocalSchedules(getLocalSchedules().filter((item) => item.id !== id));
      return;
    }
    const { error } = await supabase.from('flag_ceremony_schedules').delete().eq('id', id);
    if (error) throw error;
  },

  createPresenceChannel(
    room: string,
    presence: { className?: string; session?: CeremonySession; role: 'classroom' | 'controller' },
    onSync: (classes: ConnectedClass[]) => void,
  ) {
    if (!isSupabaseConfigured) return () => {};

    const key = `${presence.role}-${presence.className || 'controller'}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(`flag-ceremony-presence-${room}`, {
      config: { presence: { key } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const classes: ConnectedClass[] = [];
      Object.values(state).forEach((entries) => {
        entries.forEach((entry: any) => {
          if (entry.role === 'classroom' && entry.className) {
            classes.push({
              className: entry.className,
              session: entry.session || 'morning',
              joinedAt: entry.joinedAt || new Date().toISOString(),
            });
          }
        });
      });
      const deduped = Array.from(new Map(classes.map((item) => [item.className, item])).values());
      onSync(deduped);
    });

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ ...presence, joinedAt: new Date().toISOString() });
      }
    });

    return () => supabase.removeChannel(channel);
  },
};
