import { EventShare } from '../components/event-share';
import { Gallery } from '../components/gallery';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useMe, useStore } from '../lib/store';
import { calendarFile, date, download, safeUrl, time } from '../lib/utils';
import { Empty, ErrorText, EventCard, PageHeading, Tag, useAction } from '../components/ui';

export function Agenda({ publicOnly = false }: { publicOnly?: boolean }) {
  const { data } = useStore();
  const { membership } = useMe();
  const staff = !publicOnly && (membership?.role === 'admin' || membership?.role === 'leader');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(() =>
    new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santo_Domingo' })).getMonth(),
  );
  const [year, setYear] = useState(new Date().getFullYear());
  const events = data.events
    .filter((e) => e.status !== 'draft' && (!publicOnly || e.visibility === 'public'))
    .filter(
      (e) =>
        `${e.title} ${e.location}`.toLowerCase().includes(query.toLowerCase()) &&
        (category === 'Todos' || e.category === category),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = events.filter(
    (e) => e.status !== 'finished' && new Date(e.ends_at) >= new Date(),
  );
  const changeMonth = (n: number) => {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  return (
    <div className={publicOnly ? 'public-container page-pad' : ''}>
      <PageHeading
        eyebrow="HAY ALGO BUENO POR VIVIR"
        title="Hagamos espacio para encontrarnos."
        description="Encuentra tu próximo plan. Nos encantará verte ahí."
        action={
          staff ? (
            <Link to="/admin?tab=Encuentros&action=new" className="button button-primary">
              <Plus size={16} /> Crear encuentro
            </Link>
          ) : undefined
        }
      />
      <div className="filter-bar">
        <div className="chips">
          {['Todos', 'Encuentro', 'Servicio', 'Estudio'].map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <label className="search">
            <Search size={17} />
            <input
              placeholder="Buscar encuentros…"
              aria-label="Buscar encuentros"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="view-switch">
            <button
              aria-label="Vista de lista"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={view === 'list' ? 'selected' : ''}
            >
              <List size={20} />
            </button>
            <button
              aria-label="Vista de calendario"
              aria-pressed={view === 'calendar'}
              onClick={() => setView('calendar')}
              className={view === 'calendar' ? 'selected' : ''}
            >
              <CalendarDays size={20} />
            </button>
          </div>
        </div>
      </div>
      {view === 'list' ? (
        upcoming.length ? (
          <div className="event-grid">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <Empty title="Tu próxima experiencia está en camino">
            Prueba otro filtro o vuelve pronto para conocer las próximas actividades.
          </Empty>
        )
      ) : (
        <div className="calendar">
          <div className="calendar-heading">
            <h2>
              {new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(
                new Date(year, month, 1),
              )}
            </h2>
            <div>
              <button
                className="icon-button"
                aria-label="Mes anterior"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft />
              </button>
              <button
                className="icon-button"
                aria-label="Mes siguiente"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="calendar-weekday">
                {d}
              </div>
            ))}
            {Array.from({ length: (new Date(year, month, 1).getDay() + 6) % 7 }, (_, i) => (
              <div className="calendar-day blank" key={`b${i}`} />
            ))}
            {Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
              const stamp = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
              return (
                <div className="calendar-day" key={i}>
                  <span>{i + 1}</span>
                  {events
                    .filter(
                      (e) =>
                        date(e.starts_at, { year: 'numeric', month: '2-digit', day: '2-digit' })
                          .split('/')
                          .reverse()
                          .join('-') === stamp,
                    )
                    .map((e) => (
                      <Link key={e.id} to={`/eventos/${e.id}`} title={e.title}>
                        {time(e.starts_at)}
                        <strong>{e.title}</strong>
                      </Link>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
export function EventDetail() {
  const { id } = useParams();
  const { data, userId, rpc, eventCount } = useStore();
  const { membership } = useMe();
  const { act, error, pending } = useAction();
  const [count, setCount] = useState<number | null>(null);
  const event = data.events.find((e) => e.id === id && e.status !== 'draft');
  const registered = data.registrations.some((r) => r.event_id === id && r.user_id === userId);
  const approved = membership?.status === 'approved';
  useEffect(() => {
    let cancelled = false;
    setCount(null);
    if (id)
      eventCount(id)
        .then((n) => {
          if (!cancelled) setCount(n);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, data.registrations]);
  if (!event)
    return (
      <div className="public-container page-pad">
        <Empty title="No encontramos este encuentro">
          Puede ser privado, haber cambiado o no estar publicado.
        </Empty>
        <Link to="/encuentros" className="text-link">
          <ArrowLeft size={16} /> Volver a encuentros
        </Link>
      </div>
    );
  const ended = new Date(event.starts_at) <= new Date() || event.status !== 'published';
  const full = count !== null && event.capacity !== null && count >= event.capacity;
  return (
    <div className="public-container page-pad">
      <Link to={approved ? '/app/agenda' : '/encuentros'} className="text-link back-link">
        <ArrowLeft size={16} /> Volver a la agenda
      </Link>
      <div className="event-detail-cover">
        <img src={safeUrl(event.image_url) || '/images/worship.jpg'} alt="" />
        <div />
        <Tag>{event.category}</Tag>
      </div>
      <div className="event-detail-grid">
        <article>
          <span className="eyebrow">HAY UN LUGAR PARA TI</span>
          <h1>{event.title}</h1>
          <div className="detail-meta">
            <span>
              <CalendarDays size={18} />
              {date(event.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span>
              <Clock3 size={18} />
              {time(event.starts_at)} – {time(event.ends_at)}
            </span>
          </div>
          <h2>Esto es lo que vamos a vivir</h2>
          <p className="article-content">{event.description}</p>
          <div className="location-card">
            <MapPin size={25} />
            <div>
              <strong>Nos encontramos aquí</strong>
              <p>{event.location}</p>
              <small>Horario de República Dominicana (UTC−4).</small>
            </div>
          </div>
          <EventShare event={event} />
          <Gallery eventId={event.id} limit={100} />
        </article>
        <aside className="registration-card">
          <span className="auth-symbol">
            {registered ? <Check size={26} /> : <Users size={26} />}
          </span>
          <h2>
            {registered
              ? '¡Nos vemos ahí!'
              : ended
                ? 'Encuentro cerrado'
                : 'Sé parte de este encuentro.'}
          </h2>
          <p>
            {registered
              ? 'Tu inscripción está confirmada. Ya tienes un lugar con nosotros.'
              : ended
                ? 'Las inscripciones para esta actividad han terminado.'
                : 'Confirma tu participación y prepárate para compartir algo especial.'}
          </p>
          {event.capacity !== null && count !== null && (
            <>
              <div className="capacity-label">
                <span>{Math.max(0, event.capacity - count)} lugares disponibles</span>
                <span>{event.capacity} en total</span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${Math.min(100, (count / event.capacity) * 100)}%` }} />
              </div>
            </>
          )}
          <ErrorText error={error} />
          {!approved ? (
            <Link
              className="button button-primary full"
              to={userId ? '/app' : `/entrar?next=${encodeURIComponent(`/eventos/${event.id}`)}`}
            >
              {userId ? 'Ver mi solicitud de acceso' : 'Entrar para participar'}
              <ArrowRight size={17} />
            </Link>
          ) : (
            <button
              className={`button full ${registered ? 'button-outline' : 'button-primary'}`}
              disabled={pending || ended || (full && !registered)}
              onClick={() =>
                void act(
                  () => rpc('set_registration', { p_event_id: event.id, p_register: !registered }),
                  registered ? 'Inscripción cancelada.' : '¡Tu lugar está confirmado!',
                )
              }
            >
              {pending
                ? 'Guardando…'
                : registered
                  ? 'Cancelar mi inscripción'
                  : ended
                    ? 'Inscripciones cerradas'
                    : full
                      ? 'Cupo completo'
                      : 'Quiero participar'}
              {!registered && !full && <ArrowRight size={17} />}
            </button>
          )}
          <button
            className="button button-quiet full"
            onClick={() => download('encuentro-shakers.ics', calendarFile(event), 'text/calendar')}
          >
            <Download size={17} /> Añadir a mi calendario
          </button>
          <small className="muted">
            Si cambias de planes, cancela tu inscripción para que alguien más pueda participar.
          </small>
        </aside>
      </div>
    </div>
  );
}
