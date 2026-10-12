import { Link } from 'react-router-dom';
import { Copy, Eye, Pencil } from 'lucide-react';
import { Empty, Tag } from '../../components/ui';
import { date, uid } from '../../lib/utils';
import type { Event } from '../../types';
import { AdminSection } from './components';
import { statusLabel, type Editable, type Values } from './types';

export function AdminEvents({
  events,
  userId,
  onOpenNew,
  onOpenEdit,
}: {
  events: Event[];
  userId: string | null;
  onOpenNew: (table: Editable) => void;
  onOpenEdit: (table: Editable, row: Values) => void;
}) {
  return (
    <>
      <AdminSection
        title="Encuentros del ministerio"
        action="Nuevo encuentro"
        onClick={() => onOpenNew('events')}
      />
      <div className="admin-list">
        {events.map((e) => (
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
                onClick={() => onOpenEdit('events', e as unknown as Values)}
              >
                <Pencil size={17} />
              </button>
              <button
                className="icon-button"
                aria-label={`Duplicar ${e.title}`}
                onClick={() =>
                  onOpenEdit('events', {
                    ...(e as unknown as Values),
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
      {!events.length && (
        <Empty title="Preparemos el primer encuentro">
          Crea una actividad para que la comunidad pueda inscribirse.
        </Empty>
      )}
    </>
  );
}
