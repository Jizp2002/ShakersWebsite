import { useState } from 'react';
import { BookOpen, FileText, Play, ArrowUpRight, Search } from 'lucide-react';
import { useStore } from '../lib/store';
import { safeUrl, youtubeId } from '../lib/utils';
import { Empty, ErrorText, Modal, PageHeading, Tag, useAction } from '../components/ui';
import { documentUrl } from '../lib/uploads';
import type { Resource } from '../types';

export function ResourceGrid({
  publicOnly = false,
  limit,
  query = '',
  category = 'Todos',
}: {
  publicOnly?: boolean;
  limit?: number;
  query?: string;
  category?: string;
}) {
  const { data } = useStore();
  const [selected, setSelected] = useState<Resource | null>(null);
  const resources = data.resources
    .filter(
      (r) =>
        r.status === 'published' &&
        (!publicOnly || r.visibility === 'public') &&
        (category === 'Todos' || r.category === category) &&
        `${r.title} ${r.description}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, limit);
  return (
    <>
      {resources.length ? (
        <div className="resource-grid">
          {resources.map((r) => (
            <button className="resource-card" key={r.id} onClick={() => setSelected(r)}>
              <div className="resource-image">
                <img src={safeUrl(r.image_url) || '/images/study.jpg'} alt="" loading="lazy" />
                <span className="resource-play">
                  {r.kind === 'video' ? (
                    <Play size={20} fill="currentColor" />
                  ) : r.kind === 'pdf' ? (
                    <FileText size={23} />
                  ) : (
                    <BookOpen size={23} />
                  )}
                </span>
              </div>
              <div>
                <span className="resource-type">
                  {r.category} <span>·</span>{' '}
                  {r.kind === 'article' ? 'Lectura' : r.kind === 'video' ? 'Video' : 'Descargable'}
                </span>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
                <span className="text-link">
                  {r.kind === 'article' ? 'Tomar una pausa' : 'Abrir recurso'}{' '}
                  <ArrowUpRight size={17} />
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty title="No encontramos recursos">
          Prueba otra búsqueda o vuelve pronto para descubrir contenido nuevo.
        </Empty>
      )}
      {selected && (
        <Modal title={selected.title} close={() => setSelected(null)} wide>
          <Tag>{selected.category}</Tag>
          <p className="muted">{selected.description}</p>
          {selected.kind === 'article' ? (
            <div className="article-content">{selected.body}</div>
          ) : selected.kind === 'video' && youtubeId(selected.url) ? (
            <iframe
              className="video-frame"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId(selected.url)}`}
              title={selected.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <DocumentLink resource={selected} />
          )}
        </Modal>
      )}
    </>
  );
}
export function Resources({ publicOnly = false }: { publicOnly?: boolean }) {
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const categories = [
    'Todos',
    ...new Set(
      data.resources
        .filter((r) => r.status === 'published' && (!publicOnly || r.visibility === 'public'))
        .map((r) => r.category),
    ),
  ];
  return (
    <div className={publicOnly ? 'public-container page-pad' : ''}>
      <PageHeading
        eyebrow="PARA TU CAMINO"
        title="Un espacio para crecer."
        description="Palabras, historias y recursos para acompañar tu semana."
      />
      <div className="filter-bar">
        <div className="chips" aria-label="Categorías">
          {categories.map((c) => (
            <button
              className={category === c ? 'chip active' : 'chip'}
              aria-pressed={category === c}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar recursos"
            placeholder="Buscar un recurso…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <ResourceGrid publicOnly={publicOnly} query={query} category={category} />
    </div>
  );
}

function DocumentLink({ resource }: { resource: Resource }) {
  const [url, setUrl] = useState('');
  const { act, error, pending } = useAction();
  return (
    <div>
      <ErrorText error={error} />
      {url ? (
        <a
          className="button button-primary"
          href={safeUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setTimeout(() => setUrl(''), 30000)}
        >
          Abrir documento <ArrowUpRight size={18} />
        </a>
      ) : (
        <button
          className="button button-primary"
          disabled={pending}
          onClick={() => void act(async () => setUrl(await documentUrl(resource.url)))}
        >
          {pending ? 'Preparando…' : 'Preparar descarga'} <FileText size={18} />
        </button>
      )}
      <p className="muted">
        Los enlaces protegidos son temporales. Si expiran, vuelve a preparar la descarga.
      </p>
    </div>
  );
}
