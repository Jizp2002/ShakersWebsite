import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CalendarDays, Check, Sparkles, UserRound, X } from 'lucide-react';
import { useMe, useStore } from '../lib/store';

export function WelcomeGuide() {
  const { userId, data } = useStore();
  const { profile } = useMe();
  const key = `shakers-welcome-${userId}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === 'dismissed';
    } catch {
      return false;
    }
  });
  const toggle = (value: boolean) => {
    setHidden(value);
    try {
      if (value) localStorage.setItem(key, 'dismissed');
      else localStorage.removeItem(key);
    } catch {
      /* Preferences are optional. */
    }
  };
  if (hidden)
    return (
      <button className="welcome-reopen text-link" onClick={() => toggle(false)}>
        <Sparkles size={16} /> Ver guía de bienvenida
      </button>
    );
  const steps = [
    {
      title: 'Hazlo tuyo',
      body: 'Añade tu foto y cuéntanos qué te gusta.',
      to: '/app/mi-espacio',
      icon: UserRound,
      done: Boolean(profile?.interests && profile?.avatar_url),
    },
    {
      title: 'Encuentra tu próximo plan',
      body: 'Mira la agenda y reserva tu lugar.',
      to: '/app/agenda',
      icon: CalendarDays,
      done: data.registrations.some(
        (r) =>
          r.user_id === userId &&
          data.events.some(
            (e) =>
              e.id === r.event_id && e.status === 'published' && new Date(e.ends_at) > new Date(),
          ),
      ),
    },
    {
      title: 'Un momento para crecer',
      body: 'Descubre mensajes y recursos para tu semana.',
      to: '/app/recursos',
      icon: BookOpen,
      done: false,
    },
  ];
  return (
    <section className="welcome-guide" aria-label="Primeros pasos">
      <div className="welcome-heading">
        <div>
          <span className="eyebrow">A TU RITMO</span>
          <h2>Tu lugar empieza contigo.</h2>
          <p>Tres ideas para sentirte en casa. Tú eliges por dónde comenzar.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Ocultar bienvenida"
          onClick={() => toggle(true)}
        >
          <X size={19} />
        </button>
      </div>
      <div className="welcome-steps">
        {steps.map(({ title, body, to, icon: Icon, done }, i) => (
          <Link key={to} to={to} className="welcome-step">
            <span className={`welcome-number step-${i}`}>
              {done ? <Check size={21} /> : <Icon size={21} />}
            </span>
            <div>
              <strong>{title}</strong>
              <p>{done ? 'Listo. Puedes volver cuando quieras.' : body}</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
    </section>
  );
}
