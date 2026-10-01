import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, LogOut, Pencil, Users, X } from 'lucide-react';
import { useMe, useStore } from '../lib/store';
import { date, initials } from '../lib/utils';
import {
  Empty,
  ErrorText,
  Modal,
  PageHeading,
  SectionHeading,
  Tag,
  useAction,
} from '../components/ui';
import { Avatar, PhotoCropper } from '../components/photo';
import { photoBlob, removePhoto, uploadPhoto, type Crop } from '../lib/photos';
import type { Profile } from '../types';
import { InstallButton } from '../components/pwa';

export function ProfilePage() {
  const { data, userId, rpc, logout } = useStore();
  const { profile, membership } = useMe();
  const { act, error, pending } = useAction();
  const [editing, setEditing] = useState(false);
  const teams = data.teams.filter((t) =>
    data.team_members.some((m) => m.team_id === t.id && m.user_id === userId),
  );
  const assignments = data.assignments.filter((a) => a.user_id === userId);
  const registrations = data.registrations.filter((r) => r.user_id === userId);
  return (
    <>
      <PageHeading
        eyebrow="TU CAMINO EN SHAKERS"
        title="Mi espacio."
        description="Tus encuentros, tus equipos y los pequeños pasos que compartimos."
      />
      <section className="profile-card">
        <Avatar value={profile?.avatar_url || null} name={profile?.name || 'Mi perfil'} large />
        <div>
          <Tag color="teal">
            {membership?.role === 'admin'
              ? 'Coordinación'
              : membership?.role === 'leader'
                ? 'Líder'
                : 'Parte de la comunidad'}
          </Tag>
          <h2>{profile?.name}</h2>
          <p>{profile?.interests || 'Aquí empieza tu próxima historia.'}</p>
        </div>
        <button className="button button-outline" onClick={() => setEditing(true)}>
          <Pencil size={16} /> Editar perfil
        </button>
      </section>
      <ErrorText error={error} />
      <SectionHeading title="Cuentan contigo." />
      <div className="assignment-list">
        {assignments.length ? (
          assignments.map((a) => {
            const event = data.events.find((e) => e.id === a.event_id);
            const active = event?.status === 'published' && new Date(event.ends_at) > new Date();
            return (
              <article className="assignment-card" key={a.id}>
                <span className="quick-icon purple">
                  <Users size={22} />
                </span>
                <div>
                  <small className="eyebrow">
                    {data.teams.find((t) => t.id === a.team_id)?.name || 'Tu equipo'}
                  </small>
                  <h3>{a.task}</h3>
                  <p>
                    {event?.title} · {event ? date(event.starts_at) : ''}
                  </p>
                  <Tag
                    color={
                      a.status === 'confirmed'
                        ? 'teal'
                        : a.status === 'declined'
                          ? 'pink'
                          : 'orange'
                    }
                  >
                    {a.status === 'confirmed'
                      ? 'Confirmado'
                      : a.status === 'declined'
                        ? 'No disponible'
                        : 'Por confirmar'}
                  </Tag>
                </div>
                {active && (
                  <div className="assignment-buttons">
                    <button
                      className="button button-small button-primary"
                      disabled={pending || a.status === 'confirmed'}
                      onClick={() =>
                        void act(
                          () =>
                            rpc('respond_assignment', {
                              p_assignment_id: a.id,
                              p_status: 'confirmed',
                            }),
                          'Disponibilidad confirmada.',
                        )
                      }
                    >
                      <Check size={16} /> Cuenten conmigo
                    </button>
                    <button
                      className="button button-small button-quiet"
                      disabled={pending || a.status === 'declined'}
                      onClick={() =>
                        void act(
                          () =>
                            rpc('respond_assignment', {
                              p_assignment_id: a.id,
                              p_status: 'declined',
                            }),
                          'Tu líder verá que no estás disponible.',
                        )
                      }
                    >
                      Esta vez no puedo
                    </button>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <Empty title="Todo al día">
            Las responsabilidades que te asigne tu líder aparecerán aquí.
          </Empty>
        )}
      </div>
      <div className="profile-columns">
        <section>
          <SectionHeading title="Mis equipos." />
          {teams.length ? (
            teams.map((t) => (
              <article className="simple-card" key={t.id}>
                <Users size={22} />
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <small className="muted">
                  Líder:{' '}
                  {data.profiles.find((p) => p.id === t.leader_id)?.name ||
                    'Consulta con coordinación'}
                </small>
              </article>
            ))
          ) : (
            <Empty title="Encuentra tu lugar para servir">
              Conversa con un líder para unirte a un equipo.
            </Empty>
          )}
        </section>
        <section>
          <SectionHeading title="Mis encuentros." />
          {registrations.length ? (
            registrations.map((r) => {
              const e = data.events.find((e) => e.id === r.event_id);
              return (
                e && (
                  <Link className="my-event" key={r.id} to={`/eventos/${e.id}`}>
                    <span className="date-tile inline">
                      <b>{date(e.starts_at, { day: '2-digit' })}</b>
                      <span>{date(e.starts_at, { month: 'short' })}</span>
                    </span>
                    <div>
                      <h3>{e.title}</h3>
                      <span className="muted">
                        {data.attendance.some(
                          (a) => a.event_id === e.id && a.user_id === userId && a.present,
                        )
                          ? 'Asistencia registrada'
                          : e.status === 'cancelled'
                            ? 'Cancelado'
                            : 'Inscripción confirmada'}
                      </span>
                    </div>
                  </Link>
                )
              );
            })
          ) : (
            <Empty
              title="Tu próximo encuentro te espera"
              action={
                <Link className="text-link" to="/app/agenda">
                  Explorar agenda →
                </Link>
              }
            >
              Inscríbete para compartir con la comunidad.
            </Empty>
          )}
        </section>
      </div>
      <section className="profile-settings">
        <div>
          <h3>Lleva Shakers contigo.</h3>
          <p>Instala un acceso en tu dispositivo para volver fácilmente.</p>
        </div>
        <InstallButton />
      </section>
      <button className="text-link logout" onClick={() => void act(logout)}>
        <LogOut size={17} /> Cerrar sesión
      </button>
      {editing && profile && <ProfileEditor profile={profile} close={() => setEditing(false)} />}
    </>
  );
}

function ProfileEditor({ profile, close }: { profile: Profile; close: () => void }) {
  const { rpc, toast } = useStore();
  const { act, error, pending } = useAction();
  const [name, setName] = useState(profile.name);
  const [interests, setInterests] = useState(profile.interests);
  const [removed, setRemoved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cropVersion, setCropVersion] = useState(0);
  const selection = useRef<{ image: ImageBitmap | null; crop: Crop }>({
    image: null,
    crop: { zoom: 1, x: 0.5, y: 0.5 },
  });
  return (
    <Modal
      title="Un poco sobre ti"
      close={() => {
        if (!pending) close();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            let avatar = removed ? null : profile.avatar_url;
            let uploaded: string | null = null;
            if (selection.current.image) {
              uploaded = await uploadPhoto(
                await photoBlob(selection.current.image, selection.current.crop),
                'avatars',
                profile.id,
              );
              avatar = uploaded;
            }
            try {
              await rpc('save_profile', {
                p_name: name,
                p_interests: interests,
                p_avatar_url: avatar,
              });
            } catch (e) {
              if (uploaded) await removePhoto(uploaded).catch(() => {});
              throw e;
            }
            if (profile.avatar_url && profile.avatar_url !== avatar)
              await removePhoto(profile.avatar_url).catch(() =>
                toast('Perfil guardado. No se pudo limpiar el archivo anterior.'),
              );
          }, 'Perfil actualizado.').then((ok) => {
            if (ok) close();
          });
        }}
      >
        <fieldset disabled={pending} className="plain-fieldset">
          <Avatar value={removed ? null : profile.avatar_url} name={name || 'Mi perfil'} large />
          <PhotoCropper
            key={cropVersion}
            onBusy={setPhotoBusy}
            onChange={(image, crop) => {
              selection.current = { image, crop };
            }}
          />
          {profile.avatar_url && (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setRemoved(!removed);
                setPhotoBusy(false);
                selection.current.image = null;
                setCropVersion((v) => v + 1);
              }}
            >
              {removed ? 'Conservar foto actual' : 'Quitar foto actual'}
            </button>
          )}
          <p className="muted">
            La foto es opcional y acompaña tu perfil dentro de la comunidad. No se publica en la
            portada.
          </p>
          <label>
            Nombre
            <input
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Intereses
            <textarea
              maxLength={300}
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          </label>
          <p className="muted">Para corregir tu franja de edad, contacta a la coordinación.</p>
          <ErrorText error={error} />
          <button className="button button-primary" disabled={pending || photoBusy}>
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </fieldset>
      </form>
    </Modal>
  );
}
