import { useState } from 'react';
import { Eye, Upload } from 'lucide-react';
import { useMe, useStore } from '../../lib/store';
import { useAction, Modal, Tag, ErrorText } from '../../components/ui';
import { date, fromLocalInput, localInput, uid, youtubeId } from '../../lib/utils';
import { upload } from '../../lib/uploads';
import { isDemo } from '../../lib/supabase';
import type { Row } from '../../types';
import { names, type Editable, type Field, type Values } from './types';

export function Editor({
  table,
  row,
  close,
}: {
  table: Editable;
  row?: Values;
  close: () => void;
}) {
  const { data, userId, save } = useStore();
  const { membership } = useMe();
  const { act, error, pending } = useAction();
  const [preview, setPreview] = useState(false);
  const nextDay = new Date(Date.now() + 86400000).toISOString();

  const defaults: Record<Editable, Values> = {
    events: {
      id: uid(),
      title: '',
      description: '',
      starts_at: nextDay,
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      location: '',
      category: 'Encuentro',
      capacity: null,
      visibility: 'public',
      status: 'draft',
      image_url: '/images/worship.jpg',
      owner_id: userId,
    },
    teams: { id: uid(), name: '', description: '', leader_id: userId },
    team_members: { id: uid(), team_id: '', user_id: '' },
    assignments: { id: uid(), team_id: '', event_id: '', user_id: '', task: '', status: 'pending' },
    announcements: {
      id: uid(),
      title: '',
      body: '',
      team_id: null,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      featured: false,
      status: 'draft',
      owner_id: userId,
    },
    resources: {
      id: uid(),
      title: '',
      description: '',
      kind: 'article',
      category: 'Devocionales',
      url: '',
      body: '',
      image_url: '/images/study.jpg',
      status: 'draft',
      visibility: 'public',
      owner_id: userId,
    },
    polls: {
      id: uid(),
      question: '',
      options: ['Adoración', 'Servicio'],
      closes_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'draft',
      owner_id: userId,
    },
    leader_profiles: {
      id: uid(),
      name: '',
      function: '',
      bio: '',
      image_url: '',
      published: false,
      consent: false,
    },
  };

  const [v, setV] = useState<Values>(row || defaults[table]);
  const change = (key: string, value: unknown) => setV((old) => ({ ...old, [key]: value }));

  const options = (...values: string[]) =>
    values.map((value) => ({
      value,
      label:
        (
          {
            public: 'Público',
            private: 'Solo miembros',
            article: 'Devocional / artículo',
            video: 'Video de YouTube',
            pdf: 'Documento PDF',
            pending: 'Por confirmar',
            published: 'Publicado',
            draft: 'Borrador',
            cancelled: 'Cancelado',
            finished: 'Finalizado',
          } as Record<string, string>
        )[value] || value,
    }));

  const teamOptions = data.teams
    .filter((t) => membership?.role === 'admin' || t.leader_id === userId)
    .map((t) => ({ value: t.id, label: t.name }));

  const memberOptions = data.profiles
    .filter((p) => data.memberships.some((m) => m.id === p.id && m.status === 'approved'))
    .map((p) => ({ value: p.id, label: p.name }));

  const fields: Record<Editable, Field[]> = {
    events: [
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'starts_at', label: 'Inicio · hora de República Dominicana', type: 'datetime' },
      { key: 'ends_at', label: 'Fin · hora de República Dominicana', type: 'datetime' },
      { key: 'location', label: 'Ubicación' },
      { key: 'category', label: 'Categoría', options: options('Encuentro', 'Servicio', 'Estudio') },
      { key: 'capacity', label: 'Cupo (vacío = sin límite)', type: 'number', optional: true },
      { key: 'visibility', label: 'Visibilidad', options: options('public', 'private') },
      { key: 'image_url', label: 'Imagen de portada', type: 'image' },
      {
        key: 'owner_id',
        label: 'Responsable',
        options: data.profiles
          .filter(
            (p) =>
              data.memberships.some(
                (m) => m.id === p.id && m.status === 'approved' && m.role !== 'member',
              ) &&
              (membership?.role === 'admin' || p.id === userId),
          )
          .map((p) => ({ value: p.id, label: p.name })),
      },
      {
        key: 'status',
        label: 'Estado',
        options: options('draft', 'published', 'cancelled', 'finished'),
      },
    ],
    teams: [
      { key: 'name', label: 'Nombre del equipo' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      {
        key: 'leader_id',
        label: 'Líder',
        options: data.profiles
          .filter(
            (p) =>
              data.memberships.some(
                (m) => m.id === p.id && m.status === 'approved' && m.role !== 'member',
              ) &&
              (membership?.role === 'admin' || p.id === userId),
          )
          .map((p) => ({ value: p.id, label: p.name })),
      },
    ],
    team_members: [
      { key: 'team_id', label: 'Equipo', options: teamOptions },
      { key: 'user_id', label: 'Miembro', options: memberOptions },
    ],
    assignments: [
      { key: 'team_id', label: 'Equipo', options: teamOptions },
      {
        key: 'event_id',
        label: 'Encuentro',
        options: data.events
          .filter((e) => e.status === 'published')
          .map((e) => ({ value: e.id, label: e.title })),
      },
      {
        key: 'user_id',
        label: 'Integrante del equipo',
        options: memberOptions.filter((p) =>
          data.team_members.some((m) => m.user_id === p.value && m.team_id === v.team_id),
        ),
      },
      { key: 'task', label: 'Responsabilidad', type: 'textarea' },
    ],
    announcements: [
      { key: 'title', label: 'Título' },
      { key: 'body', label: 'Mensaje', type: 'textarea' },
      {
        key: 'team_id',
        label: 'Destinatarios',
        optional: true,
        options: [{ value: '', label: 'Toda la comunidad' }, ...teamOptions],
      },
      { key: 'expires_at', label: 'Vigente hasta', type: 'datetime' },
      { key: 'featured', label: 'Destacar en Inicio', type: 'checkbox' },
    ],
    resources: [
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descripción breve', type: 'textarea' },
      { key: 'kind', label: 'Tipo de recurso', options: options('article', 'video', 'pdf') },
      { key: 'category', label: 'Categoría' },
      ...(v.kind === 'article'
        ? [{ key: 'body', label: 'Contenido', type: 'textarea' }]
        : [
            {
              key: 'url',
              label:
                v.kind === 'pdf' ? 'Documento PDF o enlace HTTPS' : 'Enlace del video en YouTube',
              type: v.kind === 'pdf' ? 'pdf' : 'url',
            },
          ]),
      { key: 'image_url', label: 'Imagen', type: 'image' },
      { key: 'visibility', label: 'Visibilidad', options: options('public', 'private') },
    ],
    polls: [
      { key: 'question', label: 'Pregunta' },
      { key: 'options', label: 'Opciones (una por línea, de 2 a 5)', type: 'options' },
      { key: 'closes_at', label: 'Cierre', type: 'datetime' },
    ],
    leader_profiles: [
      { key: 'name', label: 'Nombre' },
      { key: 'function', label: 'Función en el ministerio' },
      { key: 'bio', label: 'Biografía breve', type: 'textarea' },
      { key: 'image_url', label: 'Fotografía (opcional)', type: 'image', optional: true },
      {
        key: 'consent',
        label: 'Tengo autorización para publicar este perfil y fotografía',
        type: 'checkbox',
      },
    ],
  };

  const submit = async (publish: boolean) => {
    const payload = { ...v };
    if (table === 'polls') {
      const arr = Array.isArray(v.options) ? v.options : String(v.options).split('\n');
      payload.options = arr.map((o) => String(o).trim()).filter(Boolean);
      if (
        (payload.options as string[]).length < 2 ||
        (payload.options as string[]).length > 5 ||
        new Set(payload.options as string[]).size !== (payload.options as string[]).length
      )
        throw new Error('La encuesta necesita de 2 a 5 opciones distintas.');
    }
    if (table === 'resources' && v.kind === 'video' && !youtubeId(String(v.url)))
      throw new Error('Introduce un enlace válido de YouTube.');
    if (['resources', 'announcements', 'polls'].includes(table))
      payload.status = publish ? 'published' : 'draft';
    if (table === 'leader_profiles') {
      if (publish && !v.consent)
        throw new Error('Confirma la autorización antes de publicar el perfil.');
      payload.published = publish;
    }
    if (table === 'assignments') payload.status = 'pending';
    if (table === 'events' && new Date(String(v.ends_at)) <= new Date(String(v.starts_at)))
      throw new Error('El final debe ser posterior al inicio.');
    await save(table, payload as unknown as Row<typeof table>);
  };

  return (
    <Modal title={`${row ? 'Editar' : 'Crear'} ${names[table]}`} close={close} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const publish =
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-publish') === 'true';
          void act(() => submit(publish), 'Cambios guardados.').then((ok) => {
            if (ok) close();
          });
        }}
      >
        <div className={preview ? 'editor-preview' : 'editor-fields'}>
          {preview ? (
            <>
              <Tag>VISTA PREVIA · SIN PUBLICAR</Tag>
              {v.image_url && <img className="preview-image" src={String(v.image_url)} alt="" />}
              <h2>{String(v.title || v.question || v.name || v.task || '')}</h2>
              <p className="article-content">{String(v.description || v.bio || '')}</p>
              <p className="article-content">{String(v.body || '')}</p>
              {v.starts_at && (
                <p>
                  {date(String(v.starts_at))} · {String(v.location)}
                </p>
              )}
              {v.options && (
                <ul>
                  {(Array.isArray(v.options) ? v.options : String(v.options).split('\n')).map(
                    (o, i) => (
                      <li key={i}>{String(o)}</li>
                    ),
                  )}
                </ul>
              )}
            </>
          ) : (
            fields[table].map((f) => (
              <label key={f.key} className={f.type === 'checkbox' ? 'check-label' : ''}>
                {f.type !== 'checkbox' && f.label}
                {f.type === 'checkbox' ? (
                  <>
                    <input
                      type="checkbox"
                      checked={Boolean(v[f.key])}
                      onChange={(e) => change(f.key, e.target.checked)}
                    />
                    {f.label}
                  </>
                ) : f.options ? (
                  <select
                    aria-label={f.label}
                    required={!f.optional}
                    value={String(v[f.key] ?? '')}
                    onChange={(e) => change(f.key, e.target.value || (f.optional ? null : ''))}
                  >
                    {!f.optional && !v[f.key] && <option value="">Seleccionar…</option>}
                    {f.options.map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' || f.type === 'options' ? (
                  <textarea
                    aria-label={f.label}
                    required={!f.optional}
                    maxLength={f.key === 'body' ? 20000 : 3000}
                    rows={f.type === 'options' ? 4 : 3}
                    value={
                      Array.isArray(v[f.key])
                        ? (v[f.key] as string[]).join('\n')
                        : String(v[f.key] || '')
                    }
                    onChange={(e) => change(f.key, e.target.value)}
                  />
                ) : f.type === 'datetime' ? (
                  <input
                    aria-label={f.label}
                    required
                    type="datetime-local"
                    value={v[f.key] ? localInput(String(v[f.key])) : ''}
                    onChange={(e) => {
                      if (e.target.value) change(f.key, fromLocalInput(e.target.value));
                    }}
                  />
                ) : f.type === 'image' || f.type === 'pdf' ? (
                  <>
                    <input
                      aria-label={f.label}
                      required={!f.optional}
                      value={String(v[f.key] || '')}
                      onChange={(e) => change(f.key, e.target.value)}
                      placeholder={
                        f.type === 'image' ? '/images/worship.jpg o https://…' : 'https://…'
                      }
                    />
                    <span className="upload-control">
                      <Upload size={15} />
                      <span>
                        {f.type === 'pdf' ? 'Subir PDF (máx. 10 MB)' : 'Subir y optimizar imagen'}
                      </span>
                      <input
                        type="file"
                        aria-label={`Subir ${f.label}`}
                        accept={
                          f.type === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp'
                        }
                        disabled={pending || isDemo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            void act(async () => {
                              const url = await upload(file, userId!, f.type === 'pdf');
                              change(f.key, url);
                            }, 'Archivo preparado. Guarda el formulario para vincularlo.');
                        }}
                      />
                    </span>
                    {isDemo && (
                      <small className="muted">
                        La carga de archivos estará disponible al conectar Supabase.
                      </small>
                    )}
                  </>
                ) : (
                  <input
                    aria-label={f.label}
                    required={!f.optional}
                    maxLength={300}
                    type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'}
                    min={f.type === 'number' ? 1 : undefined}
                    step={f.type === 'number' ? 1 : undefined}
                    value={String(v[f.key] ?? '')}
                    onChange={(e) =>
                      change(
                        f.key,
                        f.type === 'number'
                          ? e.target.value === ''
                            ? null
                            : Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                )}
              </label>
            ))
          )}
        </div>
        <ErrorText error={error} />
        <div className="editor-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={() => setPreview(!preview)}
          >
            <Eye size={16} />
            {preview ? 'Volver a editar' : 'Vista previa'}
          </button>
          {!preview && (
            <>
              {['resources', 'announcements', 'polls', 'leader_profiles'].includes(table) && (
                <button className="button button-outline" data-publish="false" disabled={pending}>
                  Guardar borrador
                </button>
              )}
              <button className="button button-primary" data-publish="true" disabled={pending}>
                {pending
                  ? 'Guardando…'
                  : ['resources', 'announcements', 'polls', 'leader_profiles'].includes(table)
                    ? 'Publicar'
                    : 'Guardar cambios'}
              </button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
