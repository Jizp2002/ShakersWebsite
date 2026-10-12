import { Pencil, Plus } from 'lucide-react';
import { Tag } from '../../components/ui';
import { uid } from '../../lib/utils';
import type { Data } from '../../types';
import { AdminSection } from './components';
import { statusLabel, type Editable, type Values } from './types';

export function AdminTeams({
  data,
  manageTeams,
  memberName,
  onOpenNew,
  onOpenEdit,
}: {
  data: Data;
  manageTeams: Data['teams'];
  memberName: (id: string) => string;
  onOpenNew: (table: Editable) => void;
  onOpenEdit: (table: Editable, row: Values) => void;
}) {
  return (
    <>
      <AdminSection
        title="Cada persona tiene algo que aportar"
        action="Nuevo equipo"
        onClick={() => onOpenNew('teams')}
      />
      <div className="team-grid">
        {manageTeams.map((t) => (
          <section className="panel" key={t.id}>
            <div className="panel-heading">
              <h2>{t.name}</h2>
              <button
                className="icon-button"
                aria-label={`Editar equipo ${t.name}`}
                onClick={() => onOpenEdit('teams', t as unknown as Values)}
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
                onOpenEdit('team_members', { id: uid(), team_id: t.id, user_id: '' })
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
        onClick={() => onOpenNew('assignments')}
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
                onClick={() => onOpenEdit('assignments', a as unknown as Values)}
              >
                <Pencil size={17} />
              </button>
            </article>
          ))}
      </div>
    </>
  );
}
