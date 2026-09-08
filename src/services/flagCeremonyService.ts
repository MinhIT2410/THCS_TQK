import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface CeremonyStartSignal {
  id: string;
  startsAt: string;
  sentAt: string;
}

type StartCallback = (signal: CeremonyStartSignal) => void;

const LOCAL_EVENT = 'tqk-flag-ceremony-start';
const CHANNEL_NAME = 'tqk-flag-ceremony-simple';

function emitLocal(signal: CeremonyStartSignal) {
  window.dispatchEvent(new CustomEvent<CeremonyStartSignal>(LOCAL_EVENT, { detail: signal }));
}

export const flagCeremonyService = {
  subscribe(onStart: StartCallback) {
    const localListener = (event: Event) => {
      onStart((event as CustomEvent<CeremonyStartSignal>).detail);
    };
    window.addEventListener(LOCAL_EVENT, localListener);

    if (!isSupabaseConfigured) {
      return () => window.removeEventListener(LOCAL_EVENT, localListener);
    }

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on('broadcast', { event: 'ceremony_start' }, ({ payload }) => {
        if (payload?.id && payload?.startsAt) {
          onStart(payload as CeremonyStartSignal);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener(LOCAL_EVENT, localListener);
      supabase.removeChannel(channel);
    };
  },

  async startCountdown(seconds = 10): Promise<CeremonyStartSignal> {
    const signal: CeremonyStartSignal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startsAt: new Date(Date.now() + seconds * 1000).toISOString(),
      sentAt: new Date().toISOString(),
    };

    emitLocal(signal);

    if (!isSupabaseConfigured) return signal;

    const channel = supabase.channel(CHANNEL_NAME);

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Không thể kết nối Realtime.')), 5000);

      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timeout);
          try {
            // Gửi lặp vài lần trong khoảng ngắn để lớp vừa mở trang vẫn nhận được lệnh.
            for (let i = 0; i < 3; i += 1) {
              await channel.send({
                type: 'broadcast',
                event: 'ceremony_start',
                payload: signal,
              });
              if (i < 2) await new Promise((r) => window.setTimeout(r, 700));
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          window.clearTimeout(timeout);
          reject(new Error('Không thể kết nối Realtime.'));
        }
      });
    }).finally(() => {
      supabase.removeChannel(channel);
    });

    return signal;
  },
};
