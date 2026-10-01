import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { date } from '../lib/utils';
import { Empty, ErrorText, Modal, useAction } from './ui';
export function Notifications() {
  const { data, userId, rpc } = useStore();
  const [open, setOpen] = useState(false);
  const { act, error, pending } = useAction();
  const notices = data.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const unread = notices.filter((n) => !n.read_at).length;
  return (
    <>
      <button
        className="icon-button notification-button"
        aria-label={'Avisos personales (' + unread + ' sin leer)'}
        onClick={() => setOpen(true)}
      >
        <Bell size={19} />
        {unread > 0 && <span className="notification-dot" />}
      </button>
      {open && (
        <Modal title="Para que no se te pase" close={() => setOpen(false)}>
          <ErrorText error={error} />
          {notices.length ? (
            notices.map((n) => (
              <article className={'notification-item ' + (!n.read_at ? 'unread' : '')} key={n.id}>
                <p>{n.body}</p>
                <small>
                  {date(n.created_at, {
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </small>
                <div>
                  {n.event_id && (
                    <Link
                      className="text-link"
                      to={'/eventos/' + n.event_id}
                      onClick={() => setOpen(false)}
                    >
                      Ver encuentro →
                    </Link>
                  )}
                  {!n.read_at && (
                    <button
                      className="text-link"
                      disabled={pending}
                      onClick={() => void act(() => rpc('mark_notification', { p_id: n.id }))}
                    >
                      <Check size={15} />
                      Marcar leído
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <Empty title="Todo al día">
              Aquí verás cambios en tus encuentros y nuevas responsabilidades. No necesitas activar
              notificaciones del dispositivo.
            </Empty>
          )}
        </Modal>
      )}
    </>
  );
}
