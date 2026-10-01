import { Gallery } from '../components/gallery';
import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Plus, ShieldCheck, Flag, Check, Sparkles } from 'lucide-react';
import { useMe, useStore } from '../lib/store';
import { date, initials } from '../lib/utils';
import { Empty, ErrorText, Modal, PageHeading, Tag, useAction } from '../components/ui';
import type { Poll } from '../types';

export function PollCard({ poll }: { poll: Poll }) {
  const { userId, data, rpc, pollResults } = useStore();
  const { act, error, pending } = useAction();
  const [counts, setCounts] = useState<number[]>([]);
  const vote = data.votes.find((v) => v.poll_id === poll.id && v.user_id === userId);
  const closed = new Date(poll.closes_at) <= new Date();
  useEffect(() => {
    let live = true;
    pollResults(poll.id)
      .then((r) => {
        if (live) setCounts(r);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [data.votes, poll.id]);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <article className="poll-card">
      <div className="card-eyebrow">
        <Sparkles size={17} /> TU VOZ CUENTA
      </div>
      <h3>{poll.question}</h3>
      <p className="muted">
        {closed ? 'Encuesta cerrada' : `Participa hasta el ${date(poll.closes_at)}`}
      </p>
      <div className="poll-options">
        {poll.options.map((option, i) => (
          <button
            key={i}
            disabled={pending || closed}
            className={`poll-option ${vote?.option_index === i ? 'chosen' : ''}`}
            aria-pressed={vote?.option_index === i}
            onClick={() =>
              void act(
                () => rpc('cast_vote', { p_poll_id: poll.id, p_option: i }),
                '¡Gracias por compartir tu opinión!',
              )
            }
          >
            <span
              className="poll-fill"
              style={{ width: `${vote || closed ? (total ? (counts[i] / total) * 100 : 0) : 0}%` }}
            />
            <span className="poll-label">
              {vote?.option_index === i ? <Check size={16} /> : <span className="radio-dot" />}
              {option}
            </span>
            {(vote || closed) && (
              <strong>{total ? Math.round((counts[i] / total) * 100) : 0}%</strong>
            )}
          </button>
        ))}
      </div>
      <small className="muted">
        {vote
          ? 'Puedes cambiar tu respuesta hasta el cierre.'
          : 'Elige una opción. Los resultados son anónimos.'}
      </small>
      <ErrorText error={error} />
    </article>
  );
}
export function Community() {
  const { data, userId, rpc } = useStore();
  const { profile } = useMe();
  const [tab, setTab] = useState('Muro de oración');
  const [compose, setCompose] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const { act, error, pending } = useAction();
  const prayers = data.prayers.filter((p) =>
    tab === 'Mis peticiones'
      ? p.user_id === userId
      : p.visibility === 'community' && p.status === 'approved',
  );
  const poll = data.polls
    .filter((p) => p.status === 'published')
    .sort((a, b) => b.closes_at.localeCompare(a.closes_at))[0];
  return (
    <>
      <PageHeading
        eyebrow="CAMINAMOS JUNTOS"
        title="Aquí nadie camina solo."
        description="Comparte, acompaña y haz que tu voz sea parte de la comunidad."
        action={
          <button className="button button-primary" onClick={() => setCompose(true)}>
            <Plus size={18} /> Pedir oración
          </button>
        }
      />
      <div className="community-grid">
        <div>
          <div className="chips tabs">
            {['Muro de oración', 'Mis peticiones', 'Avisos'].map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                className={`chip ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <ErrorText error={error} />
          {tab === 'Avisos' ? (
            data.announcements
              .filter((a) => a.status === 'published' && new Date(a.expires_at) > new Date())
              .map((a) => (
                <article className="prayer-card" key={a.id}>
                  <Tag color="teal">
                    {a.team_id
                      ? data.teams.find((t) => t.id === a.team_id)?.name || 'Tu equipo'
                      : 'Toda la comunidad'}
                  </Tag>
                  <h3>{a.title}</h3>
                  <p>{a.body}</p>
                  <small className="muted">Vigente hasta el {date(a.expires_at)}</small>
                </article>
              ))
          ) : prayers.length ? (
            prayers.map((p) => {
              const reacted = data.prayer_reactions.some(
                (r) => r.prayer_id === p.id && r.user_id === userId,
              );
              return (
                <article className="prayer-card" key={p.id}>
                  <div className="prayer-heading">
                    <span className="avatar small">
                      {p.anonymous ? <Heart size={18} /> : initials(p.author_label)}
                    </span>
                    <div>
                      <strong>{p.author_label}</strong>
                      <small>{date(p.created_at)}</small>
                    </div>
                    {p.visibility === 'private' && <Tag>Solo coordinación</Tag>}
                    {tab === 'Mis peticiones' && (
                      <Tag color={p.status === 'approved' ? 'teal' : 'orange'}>
                        {p.status === 'pending'
                          ? 'En revisión'
                          : p.status === 'approved'
                            ? 'Revisada'
                            : 'No publicada'}
                      </Tag>
                    )}
                  </div>
                  <p>{p.body}</p>
                  {p.visibility === 'community' && p.status === 'approved' && (
                    <div className="prayer-actions">
                      <button
                        className={reacted ? 'prayer-react reacted' : 'prayer-react'}
                        aria-pressed={reacted}
                        disabled={pending}
                        onClick={() =>
                          void act(() => rpc('react_to_prayer', { p_prayer_id: p.id }))
                        }
                      >
                        <Heart size={17} fill={reacted ? 'currentColor' : 'none'} />
                        {reacted ? 'Estás orando' : 'Estoy orando'}
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Reportar petición"
                        onClick={() => {
                          setReport(p.id);
                          setReason('');
                        }}
                      >
                        <Flag size={16} />
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <Empty
              title={
                tab === 'Mis peticiones'
                  ? 'Este espacio también es para ti'
                  : 'Comencemos acompañándonos'
              }
            >
              Puedes compartir una petición de oración con la coordinación o con la comunidad.
            </Empty>
          )}
        </div>
        <aside>
          {poll && <PollCard poll={poll} />}
          <div className="care-card">
            <ShieldCheck size={27} />
            <h3>Lo que compartes importa.</h3>
            <p>
              Las peticiones de la comunidad se revisan antes de publicarse. También puedes escribir
              solo a coordinación.
            </p>
            <small>Aquí nos escuchamos con respeto y cuidamos la privacidad de los demás.</small>
          </div>
        </aside>
      </div>
      {compose && <PrayerForm close={() => setCompose(false)} />}
      {report && (
        <Modal title="Reportar esta petición" close={() => setReport(null)}>
          <p className="muted">Cuéntanos qué debemos revisar. Solo los líderes verán tu reporte.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                () => rpc('report_prayer', { p_prayer_id: report, p_reason: reason }),
                'Reporte enviado a los líderes.',
              ).then((ok) => {
                if (ok) setReport(null);
              });
            }}
          >
            <label>
              Motivo
              <textarea
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <ErrorText error={error} />
            <button className="button button-primary" disabled={pending}>
              Enviar reporte
            </button>
          </form>
        </Modal>
      )}
      <Gallery limit={100} />
    </>
  );
}
function PrayerForm({ close }: { close: () => void }) {
  const { rpc } = useStore();
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [anonymous, setAnonymous] = useState(false);
  const { act, error, pending } = useAction();
  return (
    <Modal title="¿Por qué podemos orar contigo?" close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(
            () =>
              rpc('submit_prayer', {
                p_body: body,
                p_visibility: visibility,
                p_anonymous: anonymous,
              }),
            'Tu petición fue enviada.',
          ).then((ok) => {
            if (ok) close();
          });
        }}
      >
        <label>
          Tu petición
          <textarea
            autoFocus
            required
            minLength={5}
            maxLength={1500}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Comparte hasta donde te sientas cómodo…"
          />
        </label>
        <label>
          ¿Quién puede leerla?
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="private">Solo la coordinación y yo</option>
            <option value="community">La comunidad, después de revisión</option>
          </select>
        </label>
        {visibility === 'community' && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Ocultar mi nombre a otros miembros
          </label>
        )}
        <p className="notice">
          {visibility === 'private'
            ? 'Tu petición no se publicará en el muro. Solo la coordinación administradora podrá verla.'
            : 'Un líder revisará tu petición antes de publicarla. El equipo autorizado puede identificar al autor aunque oculte su nombre.'}
        </p>
        <ErrorText error={error} />
        <button className="button button-primary full" disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar petición'}
          <Heart size={17} />
        </button>
      </form>
    </Modal>
  );
}
