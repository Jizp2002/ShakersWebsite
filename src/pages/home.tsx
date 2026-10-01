import { WelcomeGuide } from '../components/welcome';
import { Gallery } from '../components/gallery';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Heart,
  Megaphone,
  Sparkles,
  Users,
} from 'lucide-react';
import { useMe, useStore } from '../lib/store';
import { date, time } from '../lib/utils';
import { Empty, EventCard, SectionHeading, Tag } from '../components/ui';
import { PollCard } from './community';
import { ResourceGrid } from './resources';

export function HomePage() {
  const { data, userId } = useStore();
  const { profile } = useMe();
  const events = data.events
    .filter((e) => e.status === 'published' && new Date(e.starts_at) > new Date())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const event =
    events.find((e) =>
      data.registrations.some((r) => r.event_id === e.id && r.user_id === userId),
    ) || events[0];
  const registered = data.registrations.some(
    (r) => r.event_id === event?.id && r.user_id === userId,
  );
  const mine = data.assignments.filter(
    (a) =>
      a.user_id === userId &&
      a.status === 'pending' &&
      data.events.some(
        (e) => e.id === a.event_id && e.status === 'published' && new Date(e.ends_at) > new Date(),
      ),
  );
  const announcement = data.announcements.find(
    (a) =>
      a.featured &&
      a.status === 'published' &&
      new Date(a.expires_at) > new Date() &&
      (!a.team_id ||
        data.team_members.some((m) => m.user_id === userId && m.team_id === a.team_id)),
  );
  const poll = data.polls.find(
    (p) => p.status === 'published' && new Date(p.closes_at) > new Date(),
  );
  return (
    <>
      <div className="home-greeting">
        <div>
          <span className="eyebrow">ESTE ES TU LUGAR</span>
          <h1>
            Hola, {profile?.name.split(' ')[0] || 'qué bueno verte'}{' '}
            <span className="greeting-spark">✳</span>
          </h1>
          <p>Qué bueno compartir otra semana contigo.</p>
        </div>
        <span className="today">
          <CalendarDays size={16} />
          {date(new Date().toISOString(), { day: 'numeric', month: 'long' })}
        </span>
      </div>
      <WelcomeGuide key={userId} />
      <div className="dashboard-grid">
        <div className="dashboard-primary">
          {event ? (
            <section
              className="home-feature"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(18,13,36,.94), rgba(18,13,36,.38)), url("${event.image_url.startsWith('https://') || event.image_url.startsWith('/') ? event.image_url.replace(/["\\\n]/g, '') : '/images/worship.jpg'}")`,
              }}
            >
              <Tag color="teal">TU PRÓXIMO ENCUENTRO</Tag>
              <h2>{event.title}</h2>
              <p>
                <CalendarDays size={16} />
                {date(event.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p>
                <Clock3 size={16} /> {time(event.starts_at)} · {event.location}
              </p>
              {registered && <Tag color="teal">TU LUGAR ESTÁ CONFIRMADO</Tag>}
              <Link to={`/eventos/${event.id}`} className="button button-white">
                {registered ? 'Ver mi encuentro' : 'Quiero participar'}
                {registered ? <Check size={17} /> : <ArrowUpRight size={18} />}
              </Link>
              <span className="feature-spark">✳</span>
            </section>
          ) : (
            <Empty title="Algo bueno viene en camino">
              Los próximos encuentros aparecerán aquí.
            </Empty>
          )}
          {announcement && (
            <Link to="/app/comunidad" className="announcement-banner">
              <span>
                <Megaphone size={22} />
              </span>
              <div>
                <small>PARA QUE NO SE TE PASE</small>
                <h3>{announcement.title}</h3>
                <p>{announcement.body}</p>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          )}
          <SectionHeading
            title="Tu semana, con propósito."
            link="Mi espacio"
            to="/app/mi-espacio"
          />
          <div className="quick-grid">
            <Link to="/app/mi-espacio" className="quick-card">
              <span className="quick-icon purple">
                <Users size={22} />
              </span>
              <div>
                <h3>Tu equipo cuenta contigo</h3>
                <p>
                  {mine.length
                    ? `${mine.length} responsabilidad${mine.length > 1 ? 'es' : ''} por confirmar`
                    : 'Descubre tu equipo y tus próximas responsabilidades'}
                </p>
              </div>
              <ArrowUpRight size={19} />
            </Link>
            <Link to="/app/comunidad" className="quick-card">
              <span className="quick-icon pink">
                <Heart size={22} />
              </span>
              <div>
                <h3>Oremos juntos</h3>
                <p>Comparte lo que tienes en el corazón</p>
              </div>
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <SectionHeading
            title="Una pausa para crecer."
            link="Todos los recursos"
            to="/app/recursos"
          />
          <ResourceGrid limit={2} />
          <Gallery />
        </div>
        <aside className="dashboard-aside">
          {poll && <PollCard poll={poll} />}
          <div className="verse-card">
            <span className="eyebrow">PARA RECORDAR HOY</span>
            <span className="quote-mark">“</span>
            <h3>Grandes cosas comienzan con pequeños pasos de fe.</h3>
            <p>Haz espacio para escuchar, compartir y acompañar a alguien esta semana.</p>
            <span className="verse-line" />
            <small>TU REFLEXIÓN DE LA SEMANA</small>
          </div>
          <Link to="/encuentros" className="invite-mini">
            <span>
              La comunidad crece
              <br />
              <strong>cuando la compartimos.</strong>
            </span>
            <ArrowUpRight size={24} />
          </Link>
        </aside>
      </div>
    </>
  );
}
