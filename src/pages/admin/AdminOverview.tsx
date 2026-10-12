import { BarChart3, CalendarDays, ChevronRight, Heart, Megaphone, Plus, ShieldCheck, Users } from 'lucide-react';
import { Tag } from '../../components/ui';
import { date } from '../../lib/utils';
import type { Data, Event } from '../../types';
import { Stat } from './components';
import type { Editable } from './types';

export function AdminOverview({
  data,
  admin,
  ownedEvents,
  pendingMembersCount,
  reviewPrayersCount,
  manageTeams,
  memberName,
  onNavigateTab,
  onOpenNew,
}: {
  data: Data;
  admin: boolean;
  ownedEvents: Event[];
  pendingMembersCount: number;
  reviewPrayersCount: number;
  manageTeams: Data['teams'];
  memberName: (id: string) => string;
  onNavigateTab: (tab: string) => void;
  onOpenNew: (table: Editable) => void;
}) {
  const pendingAssignmentsCount = data.assignments.filter(
    (a) => a.status === 'pending' && manageTeams.some((t) => t.id === a.team_id),
  ).length;

  const upcomingEventsCount = ownedEvents.filter(
    (e) => e.status === 'published' && new Date(e.starts_at) > new Date(),
  ).length;

  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Miembros aprobados"
          value={data.memberships.filter((m) => m.status === 'approved').length}
          icon={<Users />}
        />
        <Stat
          label="Solicitudes pendientes"
          value={pendingMembersCount}
          icon={<ShieldCheck />}
        />
        <Stat
          label="Próximos encuentros"
          value={upcomingEventsCount}
          icon={<CalendarDays />}
        />
        <Stat
          label="Peticiones por revisar"
          value={reviewPrayersCount}
          icon={<Heart />}
        />
      </div>

      <div className="admin-overview">
        <section className="panel">
          <div className="panel-heading">
            <h2>Lo que necesita tu atención</h2>
            <Tag>HOY</Tag>
          </div>
          <button className="overview-row" onClick={() => onNavigateTab('Miembros')}>
            <ShieldCheck />
            <span>
              <strong>Dar la bienvenida</strong>
              <small>{pendingMembersCount} solicitudes de ingreso</small>
            </span>
            <ChevronRight />
          </button>
          <button className="overview-row" onClick={() => onNavigateTab('Moderación')}>
            <Heart />
            <span>
              <strong>Acompañar y escuchar</strong>
              <small>{reviewPrayersCount} peticiones pendientes</small>
            </span>
            <ChevronRight />
          </button>
          <button className="overview-row" onClick={() => onNavigateTab('Equipos')}>
            <Users />
            <span>
              <strong>Preparar nuestros equipos</strong>
              <small>{pendingAssignmentsCount} responsabilidades sin confirmar</small>
            </span>
            <ChevronRight />
          </button>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Acciones rápidas</h2>
          </div>
          <button className="button button-primary full" onClick={() => onOpenNew('events')}>
            <Plus size={18} /> Crear encuentro
          </button>
          <button
            className="button button-outline full mt"
            onClick={() => onOpenNew('announcements')}
          >
            <Megaphone size={18} /> Escribir un aviso
          </button>
          <button
            className="button button-outline full mt"
            onClick={() => onOpenNew('polls')}
          >
            <BarChart3 size={18} /> Preparar una encuesta
          </button>
        </section>
      </div>

      {admin && (
        <section className="panel mt">
          <h2>Actividad administrativa reciente</h2>
          {data.audit_log.length ? (
            <div className="audit-list">
              {data.audit_log
                .slice(-8)
                .reverse()
                .map((a) => (
                  <div key={a.id}>
                    <span>{memberName(a.actor_id)}</span>
                    <code>{a.action}</code>
                    <small>
                      {date(a.created_at, {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </small>
                  </div>
                ))}
            </div>
          ) : (
            <p className="muted">Las acciones importantes quedarán registradas aquí.</p>
          )}
        </section>
      )}
    </>
  );
}
