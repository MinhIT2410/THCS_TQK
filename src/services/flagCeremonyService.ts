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

  subscribeState(callback: (state: FlagCeremonyState) => void) {
    if (!isSupabaseConfigured) {
      const listener = (event: Event) => callback((event as CustomEvent<FlagCeremonyState>).detail);
      window.addEventListener('tqk-flag-ceremony-state', listener);
      return () => window.removeEventListener('tqk-flag-ceremony-state', listener);
    }

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

    return () => {
      supabase.removeChannel(channel);
    };
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

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
