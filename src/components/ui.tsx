import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Moon,
  Sun,
  X,
  Zap,
  LoaderCircle,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { date, safeUrl, time } from '../lib/utils';
import type { Event } from '../types';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link className={`brand ${small ? 'small' : ''}`} to="/" aria-label="Shakers, ir al inicio">
      <span className="brand-mark">
        <Zap size={24} fill="currentColor" strokeWidth={1.5} />
      </span>
      <span>
        shakers<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function ThemeToggle() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'dark');
  return (
    <button
      className="icon-button"
      aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
      onClick={() => {
        const t = theme === 'dark' ? 'light' : 'dark';
        setTheme(t);
        document.documentElement.dataset.theme = t;
        localStorage.setItem('shakers-theme', t);
      }}
    >
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
export function Tag({ children, color = 'purple' }: { children: ReactNode; color?: string }) {
  return <span className={`tag ${color}`}>{children}</span>;
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Zap size={25} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement as HTMLElement;
    el.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      el.close();
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button onClick={close} className="icon-button" aria-label="Cerrar ventana">
            <X />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  link,
  to,
}: {
  eyebrow?: string;
  title: string;
  link?: string;
  to?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {link && to && (
        <Link className="text-link" to={to}>
          {link} <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function EventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const { data, userId } = useStore();
  const registered = data.registrations.some(
    (r) => r.event_id === event.id && r.user_id === userId,
  );
  return (
    <Link to={`/eventos/${event.id}`} className={`event-card ${compact ? 'compact' : ''}`}>
      <div className="event-image">
        <img src={safeUrl(event.image_url) || '/images/worship.jpg'} alt="" loading="lazy" />
        <div className="event-image-shade" />
        <Tag
          color={
            event.category === 'Servicio'
              ? 'teal'
              : event.category === 'Estudio'
                ? 'orange'
                : 'purple'
          }
        >
          {event.category}
        </Tag>
        <span className="date-tile">
          <b>{date(event.starts_at, { day: '2-digit' })}</b>
          <span>{date(event.starts_at, { month: 'short' }).replace('.', '')}</span>
        </span>
      </div>
      <div className="event-body">
        <div className="event-kicker">
          {registered ? (
            <span className="success-inline">
              <Check size={14} /> Ya estás inscrito
            </span>
          ) : event.visibility === 'private' ? (
            'PARA NUESTRA COMUNIDAD'
          ) : (
            'UN LUGAR PARA TI'
          )}
        </div>
        <h3>{event.title}</h3>
        <div className="meta">
          <Clock3 size={14} />
          {date(event.starts_at, { weekday: 'long' })} · {time(event.starts_at)}
        </div>
        <div className="meta">
          <MapPin size={14} />
          <span>{event.location}</span>
        </div>
        <div className="event-footer">
          <span>
            {event.status === 'cancelled' ? 'Encuentro cancelado' : 'Conocer el encuentro'}
          </span>
          <ArrowUpRight size={18} />
        </div>
      </div>
    </Link>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <p>Preparando tu espacio…</p>
    </div>
  );
}
export function useAction() {
  const { toast } = useStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(false);
  const act = async (fn: () => Promise<unknown>, success?: string) => {
    if (ref.current) return false;
    ref.current = true;
    setPending(true);
    setError('');
    try {
      await fn();
      if (success) toast(success);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo completar la acción. Inténtalo de nuevo.',
      );
      return false;
    } finally {
      setPending(false);
      ref.current = false;
    }
  };
  return { act, pending, error, clear: () => setError('') };
}
export function ErrorText({ error }: { error: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
export function DateLine({ value }: { value: string }) {
  return (
    <span className="meta">
      <CalendarDays size={15} />
      {date(value)}
      <ChevronRight size={12} />
      {time(value)}
    </span>
  );
}
