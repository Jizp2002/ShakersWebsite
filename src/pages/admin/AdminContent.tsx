import { Pencil } from 'lucide-react';
import { date } from '../../lib/utils';
import type { Data } from '../../types';
import { AdminSection } from './components';
import { names, statusLabel, type Editable, type Values } from './types';

export function AdminContent({
  data,
  admin,
  userId,
  onOpenNew,
  onOpenEdit,
}: {
  data: Data;
  admin: boolean;
  userId: string | null;
  onOpenNew: (table: Editable) => void;
  onOpenEdit: (table: Editable, row: Values) => void;
}) {
  const contentTables: Editable[] = (
    ['announcements', 'resources', 'polls', 'leader_profiles'] as Editable[]
  ).filter((t) => t !== 'leader_profiles' || admin);

  return (
    <>
      {contentTables.map((t) => (
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
            onClick={() => onOpenNew(t)}
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
                    onClick={() => onOpenEdit(t, r)}
                  >
                    <Pencil size={17} />
                  </button>
                </article>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
