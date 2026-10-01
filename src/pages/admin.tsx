import { GalleryManager } from '../components/gallery';
import { Avatar } from '../components/photo';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileText,
  Heart,
  LayoutDashboard,
  Pencil,
  Plus,
  ShieldCheck,
  Users,
  X,
  Upload,
  Megaphone,
  BarChart3,
} from 'lucide-react';
import { useMe, useStore } from '../lib/store';
import {
  csv,
  date,
  download,
  fromLocalInput,
  initials,
  localInput,
  uid,
  youtubeId,
} from '../lib/utils';
import { upload } from '../lib/uploads';
import { isDemo } from '../lib/supabase';
import { Empty, ErrorText, Modal, PageHeading, Tag, useAction } from '../components/ui';
import type { Event, Row, Table } from '../types';

type Editable =
  | 'events'
  | 'teams'
  | 'team_members'
  | 'assignments'
  | 'announcements'
  | 'resources'
  | 'polls'
  | 'leader_profiles';
type Values = Record<string, unknown> & { id: string };
const names: Record<Editable, string> = {
  events: 'encuentro',
  teams: 'equipo',
  team_members: 'integrante',
  assignments: 'responsabilidad',
  announcements: 'aviso',
  resources: 'recurso',
  polls: 'encuesta',
  leader_profiles: 'perfil público',
};
export function Admin() {
  const { data, userId, rpc, save } = useStore();
  const { membership } = useMe();
  const [tab, setTab] = useState('Resumen');
  const [edit, setEdit] = useState<{ table: Editable; row?: Values } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [guardian, setGuardian] = useState<Record<string, boolean>>({});
  const { act, error, pending } = useAction();
  if (!membership || membership.status !== 'approved' || membership.role === 'member')
    return <Navigate to="/app" replace />;
  const admin = membership.role === 'admin';
  const ownedEvents = data.events.filter((e) => admin || e.owner_id === userId);
  const eventId = selectedEvent || ownedEvents[0]?.id;
  const eventRegistrations = data.registrations.filter((r) => r.event_id === eventId);
  const profile = (id: string) => data.profiles.find((p) => p.id === id);
  const memberName = (id: string) => profile(id)?.name || 'Miembro';
  const manageTeams = data.teams.filter((t) => admin || t.leader_id === userId);
  const pendingMembers = data.memberships.filter((m) => m.status === 'pending');
  const reviewPrayers = data.prayers.filter(
    (p) => (admin || p.visibility === 'community') && p.status === 'pending',
  );
  const staffTabs = [
    { label: 'Resumen', icon: LayoutDashboard },
    { label: 'Encuentros', icon: CalendarDays },
    { label: 'Asistencia', icon: ClipboardCheck },
    { label: 'Equipos', icon: Users },
    { label: 'Miembros', icon: ShieldCheck },
    { label: 'Contenido', icon: FileText },
    { label: 'Galería', icon: Camera },
    { label: 'Moderación', icon: Heart },
  ];
  const openNew = (table: Editable) => setEdit({ table });
  const openEdit = (table: Editable, row: object) => setEdit({ table, row: row as Values });
  return (
    <>
      <PageHeading
        eyebrow="CUIDAMOS LA COMUNIDAD"
        title="Todo en su lugar."
        description="Organiza lo importante y dedica más tiempo a las personas."
      />
      <nav className="admin-tabs" aria-label="Secciones de administración">
        {staffTabs.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={tab === label ? 'active' : ''}
            onClick={() => setTab(label)}
          >
            <Icon size={17} />
            {label}
            {label === 'Miembros' && pendingMembers.length > 0 && (
              <span>{pendingMembers.length}</span>
            )}
          </button>
        ))}
      </nav>
      <ErrorText error={error} />
      {tab === 'Galería' && <GalleryManager />}
      {tab === 'Resumen' && (
        <>
          <div className="stat-grid">
            <Stat
              label="Miembros aprobados"
              value={data.memberships.filter((m) => m.status === 'approved').length}
              icon={<Users />}
            />
            <Stat
              label="Solicitudes pendientes"
              value={pendingMembers.length}
              icon={<ShieldCheck />}
            />
            <Stat
              label="Próximos encuentros"
              value={
                ownedEvents.filter(
                  (e) => e.status === 'published' && new Date(e.starts_at) > new Date(),
                ).length
              }
              icon={<CalendarDays />}
            />
            <Stat label="Peticiones por revisar" value={reviewPrayers.length} icon={<Heart />} />
          </div>
          <div className="admin-overview">
            <section className="panel">
              <div className="panel-heading">
                <h2>Lo que necesita tu atención</h2>
                <Tag>HOY</Tag>
              </div>
              <button className="overview-row" onClick={() => setTab('Miembros')}>
                <ShieldCheck />
                <span>
                  <strong>Dar la bienvenida</strong>
                  <small>{pendingMembers.length} solicitudes de ingreso</small>
                </span>
                <ChevronRight />
              </button>
              <button className="overview-row" onClick={() => setTab('Moderación')}>
                <Heart />
                <span>
                  <strong>Acompañar y escuchar</strong>
                  <small>{reviewPrayers.length} peticiones pendientes</small>
                </span>
                <ChevronRight />
              </button>
              <button className="overview-row" onClick={() => setTab('Equipos')}>
                <Users />
                <span>
                  <strong>Preparar nuestros equipos</strong>
                  <small>
                    {
                      data.assignments.filter(
                        (a) =>
                          a.status === 'pending' && manageTeams.some((t) => t.id === a.team_id),
                      ).length
                    }{' '}
                    responsabilidades sin confirmar
                  </small>
                </span>
                <ChevronRight />
              </button>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Acciones rápidas</h2>
              </div>
              <button className="button button-primary full" onClick={() => openNew('events')}>
                <Plus size={18} /> Crear encuentro
              </button>
              <button
                className="button button-outline full mt"
                onClick={() => openNew('announcements')}
              >
                <Megaphone size={18} /> Escribir un aviso
              </button>
              <button className="button button-outline full mt" onClick={() => openNew('polls')}>
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
      )}
      {tab === 'Encuentros' && (
        <>
          <AdminSection
            title="Encuentros del ministerio"
            action="Nuevo encuentro"
            onClick={() => openNew('events')}
          />
          <div className="admin-list">
            {ownedEvents.map((e) => (
              <article key={e.id} className="admin-row">
                <div>
                  <Tag color={e.status === 'published' ? 'teal' : 'orange'}>
                    {statusLabel(e.status)}
                  </Tag>
                  <h3>{e.title}</h3>
                  <p>
                    {date(e.starts_at)} · {e.visibility === 'private' ? 'Privado' : 'Público'} ·{' '}
                    {e.capacity || 'Sin límite'} lugares
                  </p>
                </div>
                <div className="row-actions">
                  {e.status !== 'draft' && (
                    <Link
                      to={`/eventos/${e.id}`}
                      className="icon-button"
                      aria-label={`Ver ${e.title}`}
                    >
                      <Eye size={17} />
                    </Link>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Editar ${e.title}`}
                    onClick={() => openEdit('events', e)}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Duplicar ${e.title}`}
                    onClick={() =>
                      openEdit('events', {
                        ...e,
                        id: uid(),
                        title: `${e.title} (copia)`,
                        status: 'draft',
                        owner_id: userId,
                      })
                    }
                  >
                    <Copy size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!ownedEvents.length && (
            <Empty title="Preparemos el primer encuentro">
              Crea una actividad para que la comunidad pueda inscribirse.
            </Empty>
          )}
        </>
      )}
      {tab === 'Asistencia' && (
        <>
          <AdminSection title="¿Quién nos acompaña?" />
          <div className="filter-bar">
            <label className="select-inline">
              Encuentro
              <select value={eventId || ''} onChange={(e) => setSelectedEvent(e.target.value)}>
                {ownedEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-outline"
              disabled={!eventRegistrations.length}
              onClick={() =>
                download(
                  'asistencia-shakers.csv',
                  csv([
                    ['Nombre', 'Encuentro', 'Asistió'],
                    ...eventRegistrations.map((r) => [
                      memberName(r.user_id),
                      data.events.find((e) => e.id === r.event_id)?.title || '',
                      data.attendance.some(
                        (a) => a.event_id === r.event_id && a.user_id === r.user_id && a.present,
                      )
                        ? 'Sí'
                        : 'No',
                    ]),
                  ]),
                  'text/csv;charset=utf-8',
                )
              }
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>
          <div className="panel">
            <p className="muted">
              {eventRegistrations.length} inscritos ·{' '}
              {data.attendance.filter((a) => a.event_id === eventId && a.present).length}{' '}
              asistencias registradas
            </p>
            {eventRegistrations.map((r) => {
              const present = data.attendance.some(
                (a) => a.event_id === eventId && a.user_id === r.user_id && a.present,
              );
              return (
                <label className="attendance-row" key={r.id}>
                  <span className="avatar small">{initials(memberName(r.user_id))}</span>
                  <span>{memberName(r.user_id)}</span>
                  <span className="attendance-check">
                    <input
                      type="checkbox"
                      checked={present}
                      disabled={pending}
                      onChange={(e) =>
                        void act(
                          () =>
                            rpc('set_attendance', {
                              p_event_id: eventId,
                              p_user_id: r.user_id,
                              p_present: e.target.checked,
                            }),
                          'Asistencia actualizada.',
                        )
                      }
                    />
                    {present ? 'Presente' : 'Marcar asistencia'}
                  </span>
                </label>
              );
            })}
            {!eventRegistrations.length && (
              <Empty title="Todavía no hay inscripciones">
                Las personas inscritas aparecerán aquí para registrar su asistencia.
              </Empty>
            )}
          </div>
        </>
      )}
      {tab === 'Equipos' && (
        <>
          <AdminSection
            title="Cada persona tiene algo que aportar"
            action="Nuevo equipo"
            onClick={() => openNew('teams')}
          />
          <div className="team-grid">
            {manageTeams.map((t) => (
              <section className="panel" key={t.id}>
                <div className="panel-heading">
                  <h2>{t.name}</h2>
                  <button
                    className="icon-button"
                    aria-label={`Editar equipo ${t.name}`}
                    onClick={() => openEdit('teams', t)}
                  >
                    <Pencil size={17} />
                  </button>
                </div>
                <p className="muted">{t.description}</p>
                <small>Líder: {memberName(t.leader_id)}</small>
                <div className="team-members">
                  {data.team_members
                    .filter((m) => m.team_id === t.id)
                    .map((m) => (
                      <span key={m.id} className="member-pill">
                        {memberName(m.user_id)}
                      </span>
                    ))}
                </div>
                <button
                  className="text-link"
                  onClick={() =>
                    openEdit('team_members', { id: uid(), team_id: t.id, user_id: '' })
                  }
                >
                  <Plus size={16} /> Agregar integrante
                </button>
              </section>
            ))}
          </div>
          <AdminSection
            title="Responsabilidades"
            action="Asignar responsabilidad"
            onClick={() => openNew('assignments')}
          />
          <div className="admin-list">
            {data.assignments
              .filter((a) => manageTeams.some((t) => t.id === a.team_id))
              .map((a) => (
                <article className="admin-row" key={a.id}>
                  <div>
                    <h3>{a.task}</h3>
                    <p>
                      {memberName(a.user_id)} ·{' '}
                      {data.events.find((e) => e.id === a.event_id)?.title}
                    </p>
                    <Tag color={a.status === 'confirmed' ? 'teal' : 'orange'}>
                      {statusLabel(a.status)}
                    </Tag>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Editar responsabilidad ${a.task}`}
                    onClick={() => openEdit('assignments', a)}
                  >
                    <Pencil size={17} />
                  </button>
                </article>
              ))}
          </div>
        </>
      )}
      {tab === 'Miembros' && (
        <>
          <AdminSection title="Demos la bienvenida" />
          <div className="admin-list">
            {pendingMembers.map((m) => (
              <article className="member-request" key={m.id}>
                <div className="request-person">
                  <Avatar value={profile(m.id)?.avatar_url || null} name={memberName(m.id)} />
                  <div>
                    <h3>{memberName(m.id)}</h3>
                    <p>
                      {profile(m.id)?.age_group} años ·{' '}
                      {profile(m.id)?.interests || 'Sin intereses añadidos'}
                    </p>
                  </div>
                  <Tag color="orange">Pendiente</Tag>
                </div>
                {profile(m.id)?.age_group === '13-17' && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={guardian[m.id] || false}
                      onChange={(e) => setGuardian({ ...guardian, [m.id]: e.target.checked })}
                    />
                    He confirmado la autorización de su responsable.
                  </label>
                )}
                <div className="row-actions">
                  <button
                    className="button button-primary button-small"
                    disabled={pending || (profile(m.id)?.age_group === '13-17' && !guardian[m.id])}
                    onClick={() =>
                      void act(
                        () =>
                          rpc('review_member', {
                            p_user_id: m.id,
                            p_status: 'approved',
                            p_role: 'member',
                            p_guardian: guardian[m.id] || false,
                          }),
                        'Nuevo miembro aprobado.',
                      )
                    }
                  >
                    <Check size={16} /> Aprobar ingreso
                  </button>
                  <button
                    className="button button-quiet button-small"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`¿Rechazar la solicitud de ${memberName(m.id)}?`))
                        void act(
                          () =>
                            rpc('review_member', {
                              p_user_id: m.id,
                              p_status: 'rejected',
                              p_role: 'member',
                              p_guardian: false,
                            }),
                          'Solicitud revisada.',
                        );
                    }}
                  >
                    Rechazar
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!pendingMembers.length && (
            <Empty title="Solicitudes al día">
              Aquí aparecerán las personas que quieren ser parte.
            </Empty>
          )}
          <AdminSection title="Nuestra comunidad" />
          <div className="admin-list">
            {data.memberships
              .filter((m) => m.status !== 'pending')
              .map((m) => (
                <article className="admin-row" key={m.id}>
                  <div>
                    <h3>{memberName(m.id)}</h3>
                    <p>
                      {m.role === 'admin'
                        ? 'Coordinación'
                        : m.role === 'leader'
                          ? 'Líder'
                          : 'Miembro'}{' '}
                      · {statusLabel(m.status)}
                    </p>
                  </div>
                  {admin && m.id !== userId && (
                    <div className="row-actions">
                      <select
                        aria-label={`Rol de ${memberName(m.id)}`}
                        value={m.role}
                        disabled={pending}
                        onChange={(e) => {
                          if (window.confirm('¿Cambiar los permisos de esta persona?'))
                            void act(
                              () =>
                                rpc('review_member', {
                                  p_user_id: m.id,
                                  p_status: m.status,
                                  p_role: e.target.value,
                                  p_guardian: m.guardian_confirmed,
                                }),
                              'Permisos actualizados.',
                            );
                        }}
                      >
                        <option value="member">Miembro</option>
                        <option value="leader">Líder</option>
                        <option value="admin">Coordinador</option>
                      </select>
                      <button
                        className="button button-small button-outline"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              m.status === 'approved'
                                ? '¿Suspender el acceso de esta persona?'
                                : '¿Reactivar el acceso de esta persona?',
                            )
                          )
                            void act(
                              () =>
                                rpc('review_member', {
                                  p_user_id: m.id,
                                  p_status: m.status === 'approved' ? 'suspended' : 'approved',
                                  p_role: m.role,
                                  p_guardian: m.guardian_confirmed,
                                }),
                              'Estado de acceso actualizado.',
                            );
                        }}
                      >
                        {m.status === 'approved' ? 'Suspender' : 'Reactivar'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
          </div>
        </>
      )}
      {tab === 'Contenido' && (
        <>
          {(['announcements', 'resources', 'polls', 'leader_profiles'] as Editable[])
            .filter((t) => t !== 'leader_profiles' || admin)
            .map((t) => (
              <section key={t}>
                <AdminSection
                  title={
                    t === 'announcements'
                      ? 'Avisos'
                      : t === 'resources'
                        ? 'Recursos para crecer'
                        : t === 'polls'
                          ? 'Encuestas'
                          : 'Perfiles públicos'
                  }
                  action={`Crear ${names[t]}`}
                  onClick={() => openNew(t)}
                />
                <div className="admin-list">
                  {(data[t] as unknown as Values[])
                    .filter((r) => admin || r.owner_id === userId)
                    .map((r) => (
                      <article className="admin-row" key={r.id}>
                        <div>
                          <h3>{String(r.title || r.question || r.name)}</h3>
                          <p>
                            {r.status
                              ? statusLabel(String(r.status))
                              : r.published
                                ? 'Publicado'
                                : 'Borrador'}
                            {r.expires_at ? ` · Hasta ${date(String(r.expires_at))}` : ''}
                          </p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Editar ${String(r.title || r.question || r.name)}`}
                          onClick={() => openEdit(t, r)}
                        >
                          <Pencil size={17} />
                        </button>
                      </article>
                    ))}
                </div>
              </section>
            ))}
        </>
      )}
      {tab === 'Moderación' && (
        <>
          <AdminSection title="Escuchamos con cuidado" />
          <p className="muted">
            Las peticiones privadas solo son visibles para coordinación. Ocultar un nombre protege
            su identidad frente a los miembros, no frente al equipo autorizado.
          </p>
          <div className="admin-list">
            {reviewPrayers.map((p) => (
              <article className="prayer-card" key={p.id}>
                <Tag color={p.visibility === 'private' ? 'purple' : 'teal'}>
                  {p.visibility === 'private'
                    ? 'Privada · Solo coordinación'
                    : 'Solicita compartir con la comunidad'}
                </Tag>
                <h3>{memberName(p.user_id || '')}</h3>
                <p>{p.body}</p>
                <div className="row-actions">
                  <button
                    className="button button-primary button-small"
                    disabled={pending}
                    onClick={() =>
                      void act(
                        () => rpc('review_prayer', { p_prayer_id: p.id, p_status: 'approved' }),
                        p.visibility === 'private'
                          ? 'Petición marcada como revisada.'
                          : 'Petición publicada.',
                      )
                    }
                  >
                    <Check size={16} />
                    {p.visibility === 'private' ? 'Marcar revisada' : 'Publicar en el muro'}
                  </button>
                  {p.visibility === 'community' && (
                    <button
                      className="button button-outline button-small"
                      disabled={pending}
                      onClick={() =>
                        void act(
                          () => rpc('review_prayer', { p_prayer_id: p.id, p_status: 'rejected' }),
                          'Petición no publicada.',
                        )
                      }
                    >
                      No publicar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!reviewPrayers.length && (
            <Empty title="Todas las peticiones están revisadas">
              Gracias por cuidar de la comunidad.
            </Empty>
          )}
          <AdminSection title="Reportes de la comunidad" />
          {data.prayer_reports
            .filter((r) => !r.resolved)
            .map((r) => (
              <article className="prayer-card" key={r.id}>
                <p>{r.reason}</p>
                <blockquote>{data.prayers.find((p) => p.id === r.prayer_id)?.body}</blockquote>
                <div className="row-actions">
                  <button
                    className="button button-small button-outline"
                    disabled={pending}
                    onClick={() =>
                      void act(
                        () =>
                          rpc('review_prayer', { p_prayer_id: r.prayer_id, p_status: 'rejected' }),
                        'Petición retirada del muro.',
                      )
                    }
                  >
                    Retirar publicación
                  </button>
                  <button
                    className="button button-small button-primary"
                    disabled={pending}
                    onClick={() =>
                      void act(
                        () => save('prayer_reports', { ...r, resolved: true }),
                        'Reporte resuelto.',
                      )
                    }
                  >
                    Marcar resuelto
                  </button>
                </div>
              </article>
            ))}
        </>
      )}
      {edit && <Editor table={edit.table} row={edit.row} close={() => setEdit(null)} />}
    </>
  );
}
function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <article className="stat-card">
      <span>{icon}</span>
      <strong>{value}</strong>
      <p>{label}</p>
    </article>
  );
}
function AdminSection({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="admin-section-heading">
      <h2>{title}</h2>
      {action && (
        <button className="button button-small button-primary" onClick={onClick}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
function statusLabel(s: string) {
  return (
    (
      {
        published: 'Publicado',
        draft: 'Borrador',
        cancelled: 'Cancelado',
        finished: 'Finalizado',
        pending: 'Pendiente',
        approved: 'Aprobado',
        suspended: 'Suspendido',
        rejected: 'Rechazado',
        confirmed: 'Confirmado',
        declined: 'No disponible',
      } as Record<string, string>
    )[s] || s
  );
}
interface Field {
  key: string;
  label: string;
  type?: string;
  optional?: boolean;
  options?: { value: string; label: string }[];
}
function Editor({ table, row, close }: { table: Editable; row?: Values; close: () => void }) {
  const { data, userId, save } = useStore();
  const { membership } = useMe();
  const { act, error, pending } = useAction();
  const [preview, setPreview] = useState(false);
  const nextDay = new Date(Date.now() + 86400000).toISOString();
  const defaults: Record<Editable, Values> = {
    events: {
      id: uid(),
      title: '',
      description: '',
      starts_at: nextDay,
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      location: '',
      category: 'Encuentro',
      capacity: null,
      visibility: 'public',
      status: 'draft',
      image_url: '/images/worship.jpg',
      owner_id: userId,
    },
    teams: { id: uid(), name: '', description: '', leader_id: userId },
    team_members: { id: uid(), team_id: '', user_id: '' },
    assignments: { id: uid(), team_id: '', event_id: '', user_id: '', task: '', status: 'pending' },
    announcements: {
      id: uid(),
      title: '',
      body: '',
      team_id: null,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      featured: false,
      status: 'draft',
      owner_id: userId,
    },
    resources: {
      id: uid(),
      title: '',
      description: '',
      kind: 'article',
      category: 'Devocionales',
      url: '',
      body: '',
      image_url: '/images/study.jpg',
      status: 'draft',
      visibility: 'public',
      owner_id: userId,
    },
    polls: {
      id: uid(),
      question: '',
      options: ['Adoración', 'Servicio'],
      closes_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'draft',
      owner_id: userId,
    },
    leader_profiles: {
      id: uid(),
      name: '',
      function: '',
      bio: '',
      image_url: '',
      published: false,
      consent: false,
    },
  };
  const [v, setV] = useState<Values>(row || defaults[table]);
  const change = (key: string, value: unknown) => setV((old) => ({ ...old, [key]: value }));
  const options = (...values: string[]) =>
    values.map((value) => ({
      value,
      label:
        (
          {
            public: 'Público',
            private: 'Solo miembros',
            article: 'Devocional / artículo',
            video: 'Video de YouTube',
            pdf: 'Documento PDF',
            pending: 'Por confirmar',
            published: 'Publicado',
            draft: 'Borrador',
            cancelled: 'Cancelado',
            finished: 'Finalizado',
          } as Record<string, string>
        )[value] || value,
    }));
  const teamOptions = data.teams
    .filter((t) => membership?.role === 'admin' || t.leader_id === userId)
    .map((t) => ({ value: t.id, label: t.name }));
  const memberOptions = data.profiles
    .filter((p) => data.memberships.some((m) => m.id === p.id && m.status === 'approved'))
    .map((p) => ({ value: p.id, label: p.name }));
  const fields: Record<Editable, Field[]> = {
    events: [
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'starts_at', label: 'Inicio · hora de República Dominicana', type: 'datetime' },
      { key: 'ends_at', label: 'Fin · hora de República Dominicana', type: 'datetime' },
      { key: 'location', label: 'Ubicación' },
      { key: 'category', label: 'Categoría', options: options('Encuentro', 'Servicio', 'Estudio') },
      { key: 'capacity', label: 'Cupo (vacío = sin límite)', type: 'number', optional: true },
      { key: 'visibility', label: 'Visibilidad', options: options('public', 'private') },
      { key: 'image_url', label: 'Imagen de portada', type: 'image' },
      {
        key: 'owner_id',
        label: 'Responsable',
        options: data.profiles
          .filter(
            (p) =>
              data.memberships.some(
                (m) => m.id === p.id && m.status === 'approved' && m.role !== 'member',
              ) &&
              (membership?.role === 'admin' || p.id === userId),
          )
          .map((p) => ({ value: p.id, label: p.name })),
      },
      {
        key: 'status',
        label: 'Estado',
        options: options('draft', 'published', 'cancelled', 'finished'),
      },
    ],
    teams: [
      { key: 'name', label: 'Nombre del equipo' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      {
        key: 'leader_id',
        label: 'Líder',
        options: data.profiles
          .filter(
            (p) =>
              data.memberships.some(
                (m) => m.id === p.id && m.status === 'approved' && m.role !== 'member',
              ) &&
              (membership?.role === 'admin' || p.id === userId),
          )
          .map((p) => ({ value: p.id, label: p.name })),
      },
    ],
    team_members: [
      { key: 'team_id', label: 'Equipo', options: teamOptions },
      { key: 'user_id', label: 'Miembro', options: memberOptions },
    ],
    assignments: [
      { key: 'team_id', label: 'Equipo', options: teamOptions },
      {
        key: 'event_id',
        label: 'Encuentro',
        options: data.events
          .filter((e) => e.status === 'published')
          .map((e) => ({ value: e.id, label: e.title })),
      },
      {
        key: 'user_id',
        label: 'Integrante del equipo',
        options: memberOptions.filter((p) =>
          data.team_members.some((m) => m.user_id === p.value && m.team_id === v.team_id),
        ),
      },
      { key: 'task', label: 'Responsabilidad', type: 'textarea' },
    ],
    announcements: [
      { key: 'title', label: 'Título' },
      { key: 'body', label: 'Mensaje', type: 'textarea' },
      {
        key: 'team_id',
        label: 'Destinatarios',
        optional: true,
        options: [{ value: '', label: 'Toda la comunidad' }, ...teamOptions],
      },
      { key: 'expires_at', label: 'Vigente hasta', type: 'datetime' },
      { key: 'featured', label: 'Destacar en Inicio', type: 'checkbox' },
    ],
    resources: [
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descripción breve', type: 'textarea' },
      { key: 'kind', label: 'Tipo de recurso', options: options('article', 'video', 'pdf') },
      { key: 'category', label: 'Categoría' },
      ...(v.kind === 'article'
        ? [{ key: 'body', label: 'Contenido', type: 'textarea' }]
        : [
            {
              key: 'url',
              label:
                v.kind === 'pdf' ? 'Documento PDF o enlace HTTPS' : 'Enlace del video en YouTube',
              type: v.kind === 'pdf' ? 'pdf' : 'url',
            },
          ]),
      { key: 'image_url', label: 'Imagen', type: 'image' },
      { key: 'visibility', label: 'Visibilidad', options: options('public', 'private') },
    ],
    polls: [
      { key: 'question', label: 'Pregunta' },
      { key: 'options', label: 'Opciones (una por línea, de 2 a 5)', type: 'options' },
      { key: 'closes_at', label: 'Cierre', type: 'datetime' },
    ],
    leader_profiles: [
      { key: 'name', label: 'Nombre' },
      { key: 'function', label: 'Función en el ministerio' },
      { key: 'bio', label: 'Biografía breve', type: 'textarea' },
      { key: 'image_url', label: 'Fotografía (opcional)', type: 'image', optional: true },
      {
        key: 'consent',
        label: 'Tengo autorización para publicar este perfil y fotografía',
        type: 'checkbox',
      },
    ],
  };
  const submit = async (publish: boolean) => {
    const payload = { ...v };
    if (table === 'polls') {
      const arr = Array.isArray(v.options) ? v.options : String(v.options).split('\n');
      payload.options = arr.map((o) => String(o).trim()).filter(Boolean);
      if (
        (payload.options as string[]).length < 2 ||
        (payload.options as string[]).length > 5 ||
        new Set(payload.options as string[]).size !== (payload.options as string[]).length
      )
        throw new Error('La encuesta necesita de 2 a 5 opciones distintas.');
    }
    if (table === 'resources' && v.kind === 'video' && !youtubeId(String(v.url)))
      throw new Error('Introduce un enlace válido de YouTube.');
    if (['resources', 'announcements', 'polls'].includes(table))
      payload.status = publish ? 'published' : 'draft';
    if (table === 'leader_profiles') {
      if (publish && !v.consent)
        throw new Error('Confirma la autorización antes de publicar el perfil.');
      payload.published = publish;
    }
    if (table === 'assignments') payload.status = 'pending';
    if (table === 'events' && new Date(String(v.ends_at)) <= new Date(String(v.starts_at)))
      throw new Error('El final debe ser posterior al inicio.');
    await save(table, payload as unknown as Row<typeof table>);
  };
  return (
    <Modal title={`${row ? 'Editar' : 'Crear'} ${names[table]}`} close={close} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const publish =
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-publish') === 'true';
          void act(() => submit(publish), 'Cambios guardados.').then((ok) => {
            if (ok) close();
          });
        }}
      >
        <div className={preview ? 'editor-preview' : 'editor-fields'}>
          {preview ? (
            <>
              <Tag>VISTA PREVIA · SIN PUBLICAR</Tag>
              {v.image_url && <img className="preview-image" src={String(v.image_url)} alt="" />}
              <h2>{String(v.title || v.question || v.name || v.task || '')}</h2>
              <p className="article-content">{String(v.description || v.bio || '')}</p>
              <p className="article-content">{String(v.body || '')}</p>
              {v.starts_at && (
                <p>
                  {date(String(v.starts_at))} · {String(v.location)}
                </p>
              )}
              {v.options && (
                <ul>
                  {(Array.isArray(v.options) ? v.options : String(v.options).split('\n')).map(
                    (o, i) => (
                      <li key={i}>{String(o)}</li>
                    ),
                  )}
                </ul>
              )}
            </>
          ) : (
            fields[table].map((f) => (
              <label key={f.key} className={f.type === 'checkbox' ? 'check-label' : ''}>
                {f.type !== 'checkbox' && f.label}
                {f.type === 'checkbox' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={Boolean(v[f.key])}
                      onChange={(e) => change(f.key, e.target.checked)}
                    />
                    {f.label}
                  </>
                ) : f.options ? (
                  <select
                    aria-label={f.label}
                    required={!f.optional}
                    value={String(v[f.key] ?? '')}
                    onChange={(e) => change(f.key, e.target.value || (f.optional ? null : ''))}
                  >
                    {!f.optional && !v[f.key] && <option value="">Seleccionar…</option>}
                    {f.options.map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' || f.type === 'options' ? (
                  <textarea
                    aria-label={f.label}
                    required={!f.optional}
                    maxLength={f.key === 'body' ? 20000 : 3000}
                    rows={f.type === 'options' ? 4 : 3}
                    value={
                      Array.isArray(v[f.key])
                        ? (v[f.key] as string[]).join('\n')
                        : String(v[f.key] || '')
                    }
                    onChange={(e) => change(f.key, e.target.value)}
                  />
                ) : f.type === 'datetime' ? (
                  <input
                    aria-label={f.label}
                    required
                    type="datetime-local"
                    value={v[f.key] ? localInput(String(v[f.key])) : ''}
                    onChange={(e) => {
                      if (e.target.value) change(f.key, fromLocalInput(e.target.value));
                    }}
                  />
                ) : f.type === 'image' || f.type === 'pdf' ? (
                  <>
                    <input
                      aria-label={f.label}
                      required={!f.optional}
                      value={String(v[f.key] || '')}
                      onChange={(e) => change(f.key, e.target.value)}
                      placeholder={
                        f.type === 'image' ? '/images/worship.jpg o https://…' : 'https://…'
                      }
                    />
                    <span className="upload-control">
                      <Upload size={15} />
                      <span>
                        {f.type === 'pdf' ? 'Subir PDF (máx. 10 MB)' : 'Subir y optimizar imagen'}
                      </span>
                      <input
                        type="file"
                        aria-label={`Subir ${f.label}`}
                        accept={
                          f.type === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp'
                        }
                        disabled={pending || isDemo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            void act(async () => {
                              const url = await upload(file, userId!, f.type === 'pdf');
                              change(f.key, url);
                            }, 'Archivo preparado. Guarda el formulario para vincularlo.');
                        }}
                      />
                    </span>
                    {isDemo && (
                      <small className="muted">
                        La carga de archivos estará disponible al conectar Supabase.
                      </small>
                    )}
                  </>
                ) : (
                  <input
                    aria-label={f.label}
                    required={!f.optional}
                    maxLength={300}
                    type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'}
                    min={f.type === 'number' ? 1 : undefined}
                    step={f.type === 'number' ? 1 : undefined}
                    value={String(v[f.key] ?? '')}
                    onChange={(e) =>
                      change(
                        f.key,
                        f.type === 'number'
                          ? e.target.value === ''
                            ? null
                            : Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                )}
              </label>
            ))
          )}
        </div>
        <ErrorText error={error} />
        <div className="editor-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={() => setPreview(!preview)}
          >
            <Eye size={16} />
            {preview ? 'Volver a editar' : 'Vista previa'}
          </button>
          {!preview && (
            <>
              {['resources', 'announcements', 'polls', 'leader_profiles'].includes(table) && (
                <button className="button button-outline" data-publish="false" disabled={pending}>
                  Guardar borrador
                </button>
              )}
              <button className="button button-primary" data-publish="true" disabled={pending}>
                {pending
                  ? 'Guardando…'
                  : ['resources', 'announcements', 'polls', 'leader_profiles'].includes(table)
                    ? 'Publicar'
                    : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
