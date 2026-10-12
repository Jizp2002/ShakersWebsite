import { Check } from 'lucide-react';
import { Empty, Tag } from '../../components/ui';
import type { Data, Prayer, PrayerReport } from '../../types';
import { AdminSection } from './components';

export function AdminModeration({
  reviewPrayers,
  prayerReports,
  prayers,
  memberName,
  onReviewPrayer,
  onResolveReport,
  onRejectReportedPrayer,
  pending,
}: {
  reviewPrayers: Prayer[];
  prayerReports: PrayerReport[];
  prayers: Prayer[];
  memberName: (id: string) => string;
  onReviewPrayer: (prayerId: string, status: 'approved' | 'rejected') => void;
  onResolveReport: (report: PrayerReport) => void;
  onRejectReportedPrayer: (prayerId: string) => void;
  pending: boolean;
}) {
  const unresolvedReports = prayerReports.filter((r) => !r.resolved);

  return (
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
                onClick={() => onReviewPrayer(p.id, 'approved')}
              >
                <Check size={16} />
                {p.visibility === 'private' ? 'Marcar revisada' : 'Publicar en el muro'}
              </button>
              {p.visibility === 'community' && (
                <button
                  className="button button-outline button-small"
                  disabled={pending}
                  onClick={() => onReviewPrayer(p.id, 'rejected')}
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
      {unresolvedReports.map((r) => (
        <article className="prayer-card" key={r.id}>
          <p>{r.reason}</p>
          <blockquote>{prayers.find((p) => p.id === r.prayer_id)?.body}</blockquote>
          <div className="row-actions">
            <button
              className="button button-small button-outline"
              disabled={pending}
              onClick={() => onRejectReportedPrayer(r.prayer_id)}
            >
              Retirar publicación
            </button>
            <button
              className="button button-small button-primary"
              disabled={pending}
              onClick={() => onResolveReport(r)}
            >
              Marcar resuelto
            </button>
          </div>
        </article>
      ))}
      {!unresolvedReports.length && (
        <p className="muted" style={{ padding: '12px 0' }}>
          No hay reportes de moderación pendientes.
        </p>
      )}
    </>
  );
}
