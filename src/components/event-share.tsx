import { useState } from 'react';
import { Copy, MessageCircle, Share2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { ErrorText } from './ui';
import type { Event } from '../types';

export function EventShare({ event }: { event: Event }) {
  const { toast } = useStore();
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const url = `${window.location.origin}/eventos/${encodeURIComponent(event.id)}`;
  const text =
    event.visibility === 'public'
      ? `¡Nos vemos en Shakers! ${event.title}`
      : 'Te comparto un encuentro de Shakers. Necesitas acceso aprobado para verlo.';
  return (
    <div className="event-share">
      <strong>Los buenos momentos se comparten.</strong>
      <div className="share-actions">
        <a
          className="button button-outline button-small"
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={17} /> WhatsApp
        </a>
        <button
          className="button button-outline button-small"
          onClick={async () => {
            setError('');
            try {
              await navigator.clipboard.writeText(url);
              toast('Enlace copiado.');
            } catch {
              setManual(true);
            }
          }}
        >
          <Copy size={17} /> Copiar enlace
        </button>
        {typeof navigator.share === 'function' && (
          <button
            className="button button-quiet button-small"
            onClick={async () => {
              setError('');
              try {
                await navigator.share({ title: 'Shakers', text, url });
              } catch (e) {
                if ((e as Error).name !== 'AbortError')
                  setError('No se pudo compartir. Puedes copiar el enlace.');
              }
            }}
          >
            <Share2 size={17} /> Más opciones
          </button>
        )}
      </div>
      {event.visibility === 'private' && (
        <small className="muted">Es privado: compartir el enlace no concede acceso.</small>
      )}
      {manual && (
        <label>
          Enlace para copiar
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <ErrorText error={error} />
    </div>
  );
}
