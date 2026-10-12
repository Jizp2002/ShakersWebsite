import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Avatar } from '../../components/photo';
import { Empty } from '../../components/ui';
import type { Data, Membership, Profile, Role, Status } from '../../types';
import { AdminSection } from './components';
import { statusLabel } from './types';

export function AdminMembers({
  pendingMembers,
  approvedMembers,
  profiles,
  admin,
  userId,
  memberName,
  guardian,
  onGuardianChange,
  onReviewMember,
  pending,
}: {
  pendingMembers: Membership[];
  approvedMembers: Membership[];
  profiles: Profile[];
  admin: boolean;
  userId: string | null;
  memberName: (id: string) => string;
  guardian: Record<string, boolean>;
  onGuardianChange: (id: string, value: boolean) => void;
  onReviewMember: (
    memberId: string,
    status: Status,
    role?: Role,
    guardianConsent?: boolean,
    guardianName?: string,
    guardianPhone?: string,
  ) => void;
  pending: boolean;
}) {
  const [guardianNames, setGuardianNames] = useState<Record<string, string>>({});
  const [guardianPhones, setGuardianPhones] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const profile = (id: string) => profiles.find((p) => p.id === id);

  const filteredMembers = approvedMembers.filter((m) =>
    memberName(m.id).toLowerCase().includes(memberSearch.toLowerCase()),
  );

  return (
    <>
      <AdminSection title="Demos la bienvenida" />
      <div className="admin-list">
        {pendingMembers.map((m) => {
          const prof = profile(m.id);
          const name = memberName(m.id);
          const isMinor = prof?.age_group === '13-17';
          return (
            <article className="member-request" key={m.id}>
              <div className="request-person">
                <Avatar value={prof?.avatar_url || null} name={name} />
                <div>
                  <h3>{name}</h3>
                  <p>
                    {prof?.age_group} años · {prof?.interests || 'Sin intereses añadidos'}
                  </p>
                </div>
                <span className="tag orange">
                  {m.requested_role === 'leader' ? 'Solicita ser líder' : 'Joven · Pendiente'}
                </span>
              </div>
              {isMinor && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={guardian[m.id] || false}
                      onChange={(e) => onGuardianChange(m.id, e.target.checked)}
                    />
                    He confirmado la autorización de su responsable o tutor legal.
                  </label>
                  {guardian[m.id] && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', paddingLeft: '24px' }}>
                      <input
                        type="text"
                        placeholder="Nombre del padre/tutor legal"
                        value={guardianNames[m.id] || ''}
                        onChange={(e) => setGuardianNames({ ...guardianNames, [m.id]: e.target.value })}
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono del tutor"
                        value={guardianPhones[m.id] || ''}
                        onChange={(e) => setGuardianPhones({ ...guardianPhones, [m.id]: e.target.value })}
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="row-actions">
                <button
                  className="button button-primary button-small"
                  disabled={pending || (isMinor && !guardian[m.id])}
                  onClick={() =>
                    onReviewMember(
                      m.id,
                      'approved',
                      admin && m.requested_role === 'leader' ? 'leader' : 'member',
                      guardian[m.id] || false,
                      guardianNames[m.id] || '',
                      guardianPhones[m.id] || '',
                    )
                  }
                >
                  <Check size={16} />{' '}
                  {m.requested_role === 'leader' ? 'Aprobar como líder' : 'Aprobar ingreso'}
                </button>
                <button
                  className="button button-quiet button-small"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`¿Rechazar la solicitud de ${name}?`))
                      onReviewMember(m.id, 'rejected', 'member', false);
                  }}
                >
                  Rechazar
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!pendingMembers.length && (
        <Empty title="Solicitudes al día">
          Aquí aparecerán las personas que quieren ser parte.
        </Empty>
      )}

      <AdminSection title="Nuestra comunidad" />
      {approvedMembers.length > 5 && (
        <div style={{ marginBottom: '16px' }}>
          <label className="search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Buscar por nombre…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px' }}
            />
          </label>
        </div>
      )}

      <div className="admin-list">
        {filteredMembers.map((m) => {
          const name = memberName(m.id);
          return (
            <article className="admin-row" key={m.id}>
              <div>
                <h3>{name}</h3>
                <p>
                  {m.role === 'admin'
                    ? 'Coordinación'
                    : m.role === 'leader'
                      ? 'Líder'
                      : 'Miembro'}{' '}
                  · {statusLabel(m.status)}
                </p>
              </div>
              {admin && m.id !== userId && m.role !== 'admin' && (
                <div className="row-actions">
                  <select
                    aria-label={`Rol de ${name}`}
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => {
                      if (window.confirm('¿Cambiar los permisos de esta persona?'))
                        onReviewMember(
                          m.id,
                          m.status,
                          e.target.value as Membership['role'],
                          m.guardian_confirmed,
                        );
                    }}
                  >
                    <option value="member">Miembro</option>
                    <option value="leader">Líder</option>
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
                        onReviewMember(
                          m.id,
                          m.status === 'approved' ? 'suspended' : 'approved',
                          m.role,
                          m.guardian_confirmed,
                        );
                    }}
                  >
                    {m.status === 'approved' ? 'Suspender' : 'Reactivar'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {approvedMembers.length > 0 && filteredMembers.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', padding: '16px 0' }}>
          No se encontraron miembros con el nombre buscado.
        </p>
      )}
    </>
  );
}
