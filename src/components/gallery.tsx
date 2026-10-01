import { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useMe, useStore } from '../lib/store';
import { photoBlob, readPhoto, removePhoto, uploadPhoto } from '../lib/photos';
import { uid } from '../lib/utils';
import { Photo } from './photo';
import { Empty, ErrorText, Modal, SectionHeading, Tag, useAction } from './ui';
import type { GalleryPhoto } from '../types';

export function Gallery({ eventId, limit = 6 }: { eventId?: string; limit?: number }) {
  const { data } = useStore();
  const { membership } = useMe();
  const [selected, setSelected] = useState<string | null>(null);
  const photos = data.gallery_photos
    .filter(
      (p) =>
        p.published &&
        p.consent &&
        (!eventId || p.event_id === eventId) &&
        data.events.some(
          (e) =>
            e.id === p.event_id &&
            ['published', 'finished'].includes(e.status) &&
            (e.visibility === 'public' || membership?.status === 'approved'),
        ),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  const index = photos.findIndex((p) => p.id === selected);
  const current = photos[index];
  if (!photos.length) return null;
  return (
    <section className="moments-section">
      <SectionHeading title="Momentos que nos unen." />
      <p className="muted">Historias compartidas, recuerdos de nuestra comunidad.</p>
      <div className="moments-grid">
        {photos.map((p) => (
          <button
            key={p.id}
            className="moment-card"
            onClick={() => setSelected(p.id)}
            aria-label={`Ampliar: ${p.caption}`}
          >
            <Photo value={p.image_url} alt={p.caption} />
            <span>{p.caption}</span>
          </button>
        ))}
      </div>
      {current && (
        <Modal title={current.caption} wide close={() => setSelected(null)}>
          <Photo value={current.image_url} alt={current.caption} className="moment-full" />
          <div className="gallery-navigation">
            <button
              className="icon-button"
              aria-label="Foto anterior"
              disabled={index === 0}
              onClick={() => setSelected(photos[index - 1].id)}
            >
              <ChevronLeft />
            </button>
            <span aria-live="polite">
              {index + 1} de {photos.length}
            </span>
            <button
              className="icon-button"
              aria-label="Foto siguiente"
              disabled={index === photos.length - 1}
              onClick={() => setSelected(photos[index + 1].id)}
            >
              <ChevronRight />
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
export function GalleryManager() {
  const { data, userId, save, remove, toast } = useStore();
  const { membership } = useMe();
  const { act, pending, error } = useAction();
  const [adding, setAdding] = useState(false);
  const [eventId, setEventId] = useState('');
  const [caption, setCaption] = useState('');
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<GalleryPhoto | null>(null);
  const events = data.events.filter((e) => membership?.role === 'admin' || e.owner_id === userId);
  const photos = data.gallery_photos
    .filter((p) => events.some((e) => e.id === p.event_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <section>
      <div className="gallery-heading">
        <div>
          <h2>Los recuerdos también cuentan.</h2>
          <p className="muted">Publica fotos autorizadas de cada encuentro.</p>
        </div>
        <button
          className="button button-primary"
          disabled={!events.length}
          onClick={() => {
            setAdding(true);
            setEventId(events[0]?.id || '');
            setCaption('');
            setConsent(false);
            setFile(null);
          }}
        >
          <Plus size={18} /> Añadir foto
        </button>
      </div>
      <ErrorText error={error} />
      {!photos.length ? (
        <Empty title="Aquí comienza el álbum de Shakers">
          {events.length
            ? 'Añade una foto y una descripción para recordar lo que compartieron.'
            : 'Crea primero un encuentro para organizar sus fotos.'}
        </Empty>
      ) : (
        <div className="moments-grid">
          {photos.map((p) => (
            <article className="moment-admin" key={p.id}>
              <Photo value={p.image_url} alt={p.caption} />
              <div>
                <h3>{p.caption}</h3>
                <p className="muted">{data.events.find((e) => e.id === p.event_id)?.title}</p>
                <Tag color={p.published ? 'teal' : 'orange'}>
                  {p.published ? 'Publicada' : 'Oculta'}
                </Tag>
                <div className="row-actions">
                  <button
                    className="button button-small button-outline"
                    disabled={pending || (!p.consent && !p.published)}
                    onClick={() =>
                      void act(
                        () => save('gallery_photos', { ...p, published: !p.published }),
                        p.published ? 'Foto ocultada.' : 'Foto publicada.',
                      )
                    }
                  >
                    {p.published ? 'Ocultar' : 'Publicar'}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Eliminar foto: ${p.caption}`}
                    disabled={pending}
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {adding && (
        <Modal
          title="Añadir un recuerdo"
          close={() => {
            if (!pending) setAdding(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                if (!file || !consent)
                  throw new Error('Selecciona una foto y confirma la autorización.');
                const image = await readPhoto(file);
                let blob: Blob;
                try {
                  blob = await photoBlob(image);
                } finally {
                  image.close();
                }
                const url = await uploadPhoto(blob, 'gallery', userId!);
                try {
                  await save('gallery_photos', {
                    id: uid(),
                    event_id: eventId,
                    owner_id: userId!,
                    caption: caption.trim(),
                    consent,
                    published: true,
                    image_url: url,
                    created_at: new Date().toISOString(),
                  });
                } catch (e) {
                  await removePhoto(url).catch(() => {});
                  throw e;
                }
              }, 'Recuerdo publicado.').then((ok) => {
                if (ok) setAdding(false);
              });
            }}
          >
            <fieldset disabled={pending} className="plain-fieldset">
              <label>
                Encuentro
                <select required value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="notice">
                {events.find((e) => e.id === eventId)?.visibility === 'public'
                  ? 'Esta foto será visible para cualquier visitante cuando el encuentro esté publicado o finalizado.'
                  : 'Esta foto solo será visible para miembros aprobados cuando el encuentro esté publicado o finalizado.'}
              </p>
              <label>
                Fotografía
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              <small className="muted">Hasta 12 MB. La imagen se optimiza automáticamente.</small>
              <label>
                Descripción de la foto
                <input
                  required
                  minLength={3}
                  maxLength={180}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Qué momento compartieron y quiénes aparecen"
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Tengo autorización de las personas que aparecen y de los responsables de menores
                para publicar esta fotografía.
              </label>
              <ErrorText error={error} />
              <button className="button button-primary" disabled={pending}>
                <Camera size={18} />
                {pending ? 'Publicando…' : 'Publicar foto'}
              </button>
            </fieldset>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="¿Eliminar esta foto?"
          close={() => {
            if (!pending) setDeleting(null);
          }}
        >
          <p>Se retirará del álbum. Esta acción no se puede deshacer.</p>
          <button
            className="button button-primary"
            disabled={pending}
            onClick={() =>
              void act(async () => {
                await remove('gallery_photos', deleting.id);
                await removePhoto(deleting.image_url).catch(() =>
                  toast('Foto retirada. No se pudo limpiar el archivo almacenado.'),
                );
              }, 'Foto retirada del álbum.').then((ok) => {
                if (ok) setDeleting(null);
              })
            }
          >
            Eliminar foto
          </button>
        </Modal>
      )}
    </section>
  );
}
