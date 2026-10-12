import type { Row } from '../../types';

export type Editable =
  | 'events'
  | 'teams'
  | 'team_members'
  | 'assignments'
  | 'announcements'
  | 'resources'
  | 'polls'
  | 'leader_profiles';

export type Values = Record<string, unknown> & { id: string };

export const names: Record<Editable, string> = {
  events: 'encuentro',
  teams: 'equipo',
  team_members: 'integrante',
  assignments: 'responsabilidad',
  announcements: 'aviso',
  resources: 'recurso',
  polls: 'encuesta',
  leader_profiles: 'perfil público',
};

export function statusLabel(s: string) {
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

export interface Field {
  key: string;
  label: string;
  type?: string;
  optional?: boolean;
  options?: { value: string; label: string }[];
}
