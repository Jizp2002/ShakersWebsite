import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase, isDemo, configError } from './supabase';
import { demoIds, demoSeed } from './demo';
import { emptyData, tables, type Data, type Role, type Row, type Table } from '../types';
import { uid } from './utils';

const DATA_KEY = 'shakers-demo-v1';
const USER_KEY = 'shakers-demo-user';
function loadDemo(): Data {
  try {
    const saved = localStorage.getItem(DATA_KEY);
    return saved ? { ...emptyData(), ...JSON.parse(saved) } : demoSeed();
  } catch {
    return demoSeed();
  }
}
type Args = Record<string, unknown>;
interface Store {
  data: Data;
  userId: string | null;
  loading: boolean;
  error: string;
  online: boolean;
  refresh: () => Promise<void>;
  demoLogin: (role: Role | 'pending') => void;
  logout: () => Promise<void>;
  save: <T extends Table>(table: T, row: Row<T>) => Promise<void>;
  remove: (table: Table, id: string) => Promise<void>;
  rpc: (name: string, args: Args) => Promise<void>;
  pollResults: (id: string) => Promise<number[]>;
  eventCount: (id: string) => Promise<number>;
  toast: (text: string) => void;
  message: string;
  busy: boolean;
  resetDemo: () => void;
}
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(emptyData);
  const [userId, setUserId] = useState<string | null>(
    isDemo ? sessionStorage.getItem(USER_KEY) : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const generation = useRef(0);
  const sessionUser = useRef<string | null | undefined>(undefined);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 6000);
  }, []);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      if (configError)
        throw new Error(
          'La configuración está incompleta. Debes definir la URL y la clave pública de Supabase.',
        );
      if (isDemo) {
        setData(loadDemo());
        setError('');
        return;
      }
      const responses = await Promise.all(
        tables.map(async (table) => {
          const all: unknown[] = [];
          for (let offset = 0; ; offset += 1000) {
            const { data: rows, error: e } = await supabase!
              .from(table)
              .select('*')
              .order('id')
              .range(offset, offset + 999);
            if (e)
              throw new Error(
                `No se pudo cargar ${table}. Comprueba la conexión y las migraciones.`,
              );
            all.push(...(rows || []));
            if (!rows || rows.length < 1000) break;
          }
          return [table, all];
        }),
      );
      if (ticket === generation.current) {
        setData(Object.fromEntries(responses) as unknown as Data);
        setError('');
      }
    } catch (e) {
      if (ticket === generation.current) {
        setData(emptyData());
        setError(e instanceof Error ? e.message : 'No pudimos cargar la comunidad.');
      }
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isDemo || configError) {
      void refresh();
      return;
    }
    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null;
      // Token refreshes and focus events must not destroy open forms or password recovery.
      if (
        sessionUser.current === id &&
        ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)
      )
        return;
      sessionUser.current = id;
      generation.current++;
      setData(emptyData());
      setUserId(session?.user.id ?? null);
      setLoading(true);
      // Do not await Supabase calls inside the authentication callback.
      setTimeout(() => {
        void refresh();
      }, 0);
    });
    return () => {
      generation.current++;
      subscription.unsubscribe();
    };
  }, [refresh]);
  useEffect(() => {
    const update = () => {
      if (navigator.onLine) {
        window.location.reload();
        return;
      }
      setOnline(false);
      generation.current++;
      setData(emptyData());
    };
    const sync = () => {
      if (navigator.onLine && document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', sync);
    const interval = setInterval(sync, 60000);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', sync);
      clearInterval(interval);
      clearTimeout(timer.current);
    };
  }, [refresh]);
  const commit = (d: Data) => {
    localStorage.setItem(DATA_KEY, JSON.stringify(d));
    setData(d);
  };
  const run = async (fn: () => Promise<void>) => {
    if (!navigator.onLine)
      throw new Error(
        'No hay conexión. Conéctate y vuelve a intentarlo; no se guardó ningún cambio.',
      );
    if (lock.current) throw new Error('Espera a que termine la operación anterior.');
    lock.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const rpc = async (name: string, args: Args) =>
    run(async () => {
      if (supabase) {
        const { error: e } = await supabase.rpc(name, args);
        if (e) throw new Error(e.message);
        await refresh();
        return;
      }
      const d = loadDemo();
      const me = d.memberships.find((m) => m.id === userId);
      const admin = me?.role === 'admin';
      const staff = admin || me?.role === 'leader';
      if (!userId) throw new Error('Inicia sesión para continuar.');
      const now = new Date().toISOString();
      if (name !== 'submit_membership' && name !== 'update_profile' && me?.status !== 'approved')
        throw new Error('Tu acceso todavía no está aprobado.');
      switch (name) {
        case 'mark_notification': {
          const n = d.notifications.find((n) => n.id === args.p_id && n.user_id === userId);
          if (n) n.read_at = now;
          break;
        }
        case 'set_registration': {
          const ev = d.events.find((e) => e.id === args.p_event_id);
          if (!ev || ev.status !== 'published' || new Date(ev.starts_at) <= new Date())
            throw new Error('Este encuentro no admite inscripciones.');
          const existing = d.registrations.find(
            (r) => r.event_id === ev.id && r.user_id === userId,
          );
          if (args.p_register && !existing) {
            if (
              ev.capacity !== null &&
              d.registrations.filter((r) => r.event_id === ev.id).length >= ev.capacity
            )
              throw new Error('El encuentro está completo.');
            d.registrations.push({ id: uid(), event_id: ev.id, user_id: userId, created_at: now });
          } else if (!args.p_register)
            d.registrations = d.registrations.filter((r) => r.id !== existing?.id);
          break;
        }
        case 'submit_membership': {
          if (me && ['approved', 'suspended'].includes(me.status))
            throw new Error('No puedes cambiar esta solicitud.');
          const p = d.profiles.find((p) => p.id === userId)!;
          p.name = String(args.p_name).trim();
          p.age_group = args.p_age_group as '13-17' | '18+';
          p.interests = String(args.p_interests || '');
          if (args.p_requested_role === 'leader' && p.age_group !== '18+')
            throw new Error('El liderazgo requiere ser adulto.');
          if (me) {
            me.status = 'pending';
            me.requested_role = args.p_requested_role === 'leader' ? 'leader' : 'member';
          } else
            d.memberships.push({
              id: userId,
              role: 'member',
              requested_role: args.p_requested_role === 'leader' ? 'leader' : 'member',
              status: 'pending',
              guardian_confirmed: false,
              created_at: now,
            });
          break;
        }
        case 'save_profile':
        case 'update_profile': {
          const p = d.profiles.find((p) => p.id === userId)!;
          p.name = String(args.p_name).trim();
          p.interests = String(args.p_interests || '');
          if (name === 'save_profile')
            p.avatar_url = args.p_avatar_url ? String(args.p_avatar_url) : null;
          break;
        }
        case 'review_member': {
          if (!staff) throw new Error('No tienes permiso.');
          const m = d.memberships.find((m) => m.id === args.p_user_id)!;
          if (args.p_role === 'admin' || m.role === 'admin')
            throw new Error('El acceso de coordinación está reservado.');
          if (!admin && m.requested_role === 'leader')
            throw new Error('Solo coordinación revisa solicitudes de líder.');
          if (m.id === userId || (!admin && (m.status !== 'pending' || args.p_role !== 'member')))
            throw new Error('Acción no permitida.');
          if (
            args.p_status === 'approved' &&
            d.profiles.find((p) => p.id === m.id)?.age_group === '13-17' &&
            !args.p_guardian
          )
            throw new Error('Confirma primero la autorización del responsable.');
          m.status = args.p_status as typeof m.status;
          m.role = args.p_role as Role;
          m.guardian_confirmed = Boolean(args.p_guardian);
          break;
        }
        case 'respond_assignment': {
          const a = d.assignments.find(
            (a) => a.id === args.p_assignment_id && a.user_id === userId,
          );
          if (!a) throw new Error('Asignación no encontrada.');
          a.status = args.p_status as typeof a.status;
          break;
        }
        case 'set_attendance': {
          const ev = d.events.find((e) => e.id === args.p_event_id);
          if (!staff || (!admin && ev?.owner_id !== userId)) throw new Error('No tienes permiso.');
          const a = d.attendance.find(
            (a) => a.event_id === args.p_event_id && a.user_id === args.p_user_id,
          );
          if (a) a.present = Boolean(args.p_present);
          else
            d.attendance.push({
              id: uid(),
              event_id: String(args.p_event_id),
              user_id: String(args.p_user_id),
              present: Boolean(args.p_present),
            });
          break;
        }
        case 'submit_prayer':
          d.prayers.push({
            id: uid(),
            user_id: userId,
            body: String(args.p_body).trim(),
            visibility: args.p_visibility as 'private' | 'community',
            anonymous: Boolean(args.p_anonymous),
            author_label: args.p_anonymous
              ? 'Alguien de la comunidad'
              : d.profiles.find((p) => p.id === userId)!.name.split(' ')[0],
            status: 'pending',
            created_at: now,
          });
          break;
        case 'review_prayer': {
          const p = d.prayers.find((p) => p.id === args.p_prayer_id)!;
          if (!staff || (p.visibility === 'private' && !admin))
            throw new Error('No tienes permiso.');
          p.status = args.p_status as typeof p.status;
          break;
        }
        case 'react_to_prayer': {
          const p = d.prayers.find(
            (p) =>
              p.id === args.p_prayer_id && p.status === 'approved' && p.visibility === 'community',
          );
          if (!p) throw new Error('Petición no disponible.');
          const r = d.prayer_reactions.find((r) => r.prayer_id === p.id && r.user_id === userId);
          if (r) d.prayer_reactions = d.prayer_reactions.filter((v) => v.id !== r.id);
          else d.prayer_reactions.push({ id: uid(), prayer_id: p.id, user_id: userId });
          break;
        }
        case 'report_prayer': {
          if (
            !d.prayer_reports.some((r) => r.prayer_id === args.p_prayer_id && r.user_id === userId)
          )
            d.prayer_reports.push({
              id: uid(),
              prayer_id: String(args.p_prayer_id),
              user_id: userId,
              reason: String(args.p_reason),
              resolved: false,
            });
          break;
        }
        case 'cast_vote': {
          const p = d.polls.find((p) => p.id === args.p_poll_id);
          if (!p || p.status !== 'published' || new Date(p.closes_at) <= new Date())
            throw new Error('La encuesta está cerrada.');
          const option = Number(args.p_option);
          if (!Number.isInteger(option) || option < 0 || option >= p.options.length)
            throw new Error('Opción inválida.');
          const v = d.votes.find((v) => v.poll_id === p.id && v.user_id === userId);
          if (v) v.option_index = option;
          else d.votes.push({ id: uid(), poll_id: p.id, user_id: userId, option_index: option });
          break;
        }
        default:
          throw new Error('Operación desconocida.');
      }
      d.audit_log.push({ id: uid(), actor_id: userId, action: name, created_at: now });
      commit(d);
    });
  const save = async <T extends Table>(table: T, row: Row<T>) =>
    run(async () => {
      if (supabase) {
        const result =
          table === 'prayer_reports'
            ? await supabase
                .from(table)
                .update({ resolved: (row as Row<'prayer_reports'>).resolved })
                .eq('id', row.id)
                .select('id')
                .single()
            : await supabase.from(table).upsert(row).select('id').single();
        if (result.error) throw new Error(result.error.message);
        await refresh();
        return;
      }
      const d = loadDemo();
      const m = d.memberships.find((m) => m.id === userId);
      if (m?.status !== 'approved' || m.role === 'member') throw new Error('No tienes permiso.');
      const writable: Table[] = [
        'events',
        'teams',
        'team_members',
        'assignments',
        'announcements',
        'resources',
        'polls',
        'leader_profiles',
        'prayer_reports',
        'gallery_photos',
      ];
      if (!writable.includes(table)) throw new Error('Usa la acción correspondiente.');
      if (table === 'events') {
        const ev = row as Row<'events'>;
        if (new Date(ev.ends_at) <= new Date(ev.starts_at))
          throw new Error('La hora final debe ser posterior al inicio.');
        if (
          ev.capacity !== null &&
          ev.capacity < d.registrations.filter((r) => r.event_id === ev.id).length
        )
          throw new Error('El cupo no puede ser menor a los inscritos.');
      }
      if (
        table === 'polls' &&
        (row as Row<'polls'>).status === 'published' &&
        new Date((row as Row<'polls'>).closes_at) > new Date() &&
        d.polls.some(
          (p) => p.id !== row.id && p.status === 'published' && new Date(p.closes_at) > new Date(),
        )
      )
        throw new Error('Cierra la encuesta activa antes de publicar otra.');
      if (table === 'events') {
        const ev = row as Row<'events'>;
        const previous = d.events.find((e) => e.id === ev.id);
        if (
          previous &&
          ['starts_at', 'ends_at', 'location', 'status'].some(
            (k) => previous[k as keyof typeof previous] !== ev[k as keyof typeof ev],
          )
        )
          for (const r of d.registrations.filter((r) => r.event_id === ev.id))
            d.notifications.push({
              id: uid(),
              user_id: r.user_id,
              event_id: ev.id,
              body:
                (ev.status === 'cancelled'
                  ? 'Se canceló el encuentro: '
                  : 'Hay cambios en tu encuentro: ') + ev.title,
              created_at: new Date().toISOString(),
              read_at: null,
            });
      }
      if (table === 'assignments') {
        const a = row as Row<'assignments'>;
        d.notifications.push({
          id: uid(),
          user_id: a.user_id,
          event_id: a.event_id,
          body: 'Tu equipo cuenta contigo: ' + a.task,
          created_at: new Date().toISOString(),
          read_at: null,
        });
      }
      const items = d[table] as { id: string }[];
      const index = items.findIndex((r) => r.id === row.id);
      if (index < 0) items.push(row);
      else items[index] = row;
      commit(d);
    });
  const remove = async (table: Table, id: string) =>
    run(async () => {
      if (supabase) {
        const { error: e } = await supabase.from(table).delete().eq('id', id);
        if (e) throw new Error(e.message);
        await refresh();
        return;
      }
      const d = loadDemo();
      if (
        !d.memberships.some(
          (m) => m.id === userId && m.status === 'approved' && m.role !== 'member',
        )
      )
        throw new Error('No tienes permiso.');
      (d[table] as { id: string }[]) = d[table].filter((r) => r.id !== id);
      commit(d);
    });
  const demoLogin = (role: Role | 'pending') => {
    if (!isDemo) return;
    sessionStorage.setItem(USER_KEY, demoIds[role]);
    setUserId(demoIds[role]);
    setData(loadDemo());
  };
  const logout = async () => {
    generation.current++;
    setData(emptyData());
    if (supabase) {
      const { error: e } = await supabase.auth.signOut();
      if (e) {
        await refresh();
        throw new Error('No se pudo cerrar la sesión. Intenta de nuevo con conexión.');
      }
    } else {
      sessionStorage.removeItem(USER_KEY);
      setUserId(null);
      setData(loadDemo());
    }
  };
  const pollResults = async (id: string) => {
    if (supabase) {
      const { data: r, error: e } = await supabase.rpc('poll_results', { p_poll_id: id });
      if (e) throw e;
      return r as number[];
    }
    const d = loadDemo();
    return (
      d.polls
        .find((p) => p.id === id)
        ?.options.map(
          (_, i) => d.votes.filter((v) => v.poll_id === id && v.option_index === i).length,
        ) || []
    );
  };
  const eventCount = async (id: string) => {
    if (supabase) {
      const { data: r, error: e } = await supabase.rpc('event_registration_count', {
        p_event_id: id,
      });
      if (e) throw e;
      return Number(r);
    }
    return loadDemo().registrations.filter((r) => r.event_id === id).length;
  };
  return (
    <Context.Provider
      value={{
        data,
        userId,
        loading,
        error,
        online,
        refresh,
        demoLogin,
        logout,
        save,
        remove,
        rpc,
        pollResults,
        eventCount,
        toast,
        message,
        busy,
        resetDemo: () => {
          if (isDemo) {
            commit(demoSeed());
            toast('Datos de ejemplo restaurados.');
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error('Provider requerido');
  return value;
}
export function useMe() {
  const { data, userId } = useStore();
  return {
    profile: data.profiles.find((p) => p.id === userId),
    membership: data.memberships.find((m) => m.id === userId),
  };
}
