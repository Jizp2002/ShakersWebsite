import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Empty } from '../../components/ui';
import { csv, download, initials } from '../../lib/utils';
import type { Data, Event } from '../../types';
import { AdminSection } from './components';

export function AdminAttendance({
  events,
  selectedEventId,
  onSelectEvent,
  registrations,
  attendance,
  memberName,
  onToggleAttendance,
  pending,
}: {
  events: Event[];
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
  registrations: Data['registrations'];
  attendance: Data['attendance'];
  memberName: (id: string) => string;
  onToggleAttendance: (eventId: string, userId: string, present: boolean) => void;
  pending: boolean;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const eventRegistrations = registrations.filter((r) => r.event_id === selectedEventId);

  const presentCount = attendance.filter(
    (a) => a.event_id === selectedEventId && a.present,
  ).length;

  const filteredRegistrations = eventRegistrations.filter((r) => {
    const name = memberName(r.user_id).toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    const isPresent = attendance.some(
      (a) => a.event_id === selectedEventId && a.user_id === r.user_id && a.present,
    );

    if (!matchesSearch) return false;
    if (filter === 'present') return isPresent;
    if (filter === 'absent') return !isPresent;
    return true;
  });

  const exportCsv = () => {
    download(
      'asistencia-shakers.csv',
      csv([
        ['Nombre', 'Encuentro', 'Asistió'],
        ...eventRegistrations.map((r) => [
          memberName(r.user_id),
          selectedEvent?.title || '',
          attendance.some(
            (a) => a.event_id === r.event_id && a.user_id === r.user_id && a.present,
          )
            ? 'Sí'
            : 'No',
        ]),
      ]),
      'text/csv;charset=utf-8',
    );
  };

  return (
    <>
      <AdminSection title="¿Quién nos acompaña?" />
      <div className="filter-bar">
        <label className="select-inline">
          Encuentro
          <select
            value={selectedEventId || ''}
            onChange={(e) => onSelectEvent(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-outline"
          disabled={!eventRegistrations.length}
          onClick={exportCsv}
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <p className="muted" style={{ margin: 0 }}>
            {eventRegistrations.length} inscritos · {presentCount} asistencias registradas
          </p>
          {eventRegistrations.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="search" style={{ margin: 0 }}>
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Buscar en la lista…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                />
              </label>
              <div className="chips" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`chip ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Todos ({eventRegistrations.length})
                </button>
                <button
                  type="button"
                  className={`chip ${filter === 'present' ? 'active' : ''}`}
                  onClick={() => setFilter('present')}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Presentes ({presentCount})
                </button>
                <button
                  type="button"
                  className={`chip ${filter === 'absent' ? 'active' : ''}`}
                  onClick={() => setFilter('absent')}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Pendientes ({eventRegistrations.length - presentCount})
                </button>
              </div>
            </div>
          )}
        </div>

        {filteredRegistrations.map((r) => {
          const present = attendance.some(
            (a) => a.event_id === selectedEventId && a.user_id === r.user_id && a.present,
          );
          const name = memberName(r.user_id);
          return (
            <label className="attendance-row" key={r.id}>
              <span className="avatar small">{initials(name)}</span>
              <span>{name}</span>
              <span className="attendance-check">
                <input
                  type="checkbox"
                  checked={present}
                  disabled={pending}
                  onChange={(e) => onToggleAttendance(selectedEventId, r.user_id, e.target.checked)}
                />
                {present ? 'Presente' : 'Marcar asistencia'}
              </span>
            </label>
          );
        })}

        {!eventRegistrations.length ? (
          <Empty title="Todavía no hay inscripciones">
            Las personas inscritas aparecerán aquí para registrar su asistencia.
          </Empty>
        ) : filteredRegistrations.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
            No se encontraron miembros con el filtro actual.
          </p>
        ) : null}
      </div>
    </>
  );
}
