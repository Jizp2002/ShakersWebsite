import { Gallery } from '../components/gallery';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Heart, Sparkles, Users, Zap } from 'lucide-react';
import { EventCard, SectionHeading, Tag, Empty } from '../components/ui';
import { useStore } from '../lib/store';
import { initials, safeUrl } from '../lib/utils';
import { ResourceGrid } from './resources';

export function Landing() {
  const { data } = useStore();
  const events = data.events
    .filter(
      (e) =>
        e.visibility === 'public' && e.status === 'published' && new Date(e.starts_at) > new Date(),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return (
    <div className="editorial-landing">
      <section className="hero editorial-hero">
        <img
          className="hero-photo"
          src="/images/shakers-collage-v3.webp"
          alt="Collage ilustrativo de amistad, música y fe"
          fetchPriority="high"
        />

        <div className="hero-content">
          <span className="hero-eyebrow">
            <span /> UNA GENERACIÓN CON PROPÓSITO
          </span>
          <h1>
            Hechos para
            <br />
            algo{' '}
            <span>
              más
              <svg viewBox="0 0 280 22" aria-hidden="true">
                <path d="M4 14Q125 -4 270 10M28 20Q140 5 255 16" />
              </svg>
            </span>
            <span className="hero-period">.</span>
          </h1>
          <p>
            Más que un encuentro. Un espacio para ser tú,
            <br className="desktop-break" /> crecer en la fe y hacer la diferencia. Juntos.
          </p>
          <div className="hero-buttons">
            <Link to="/entrar" className="button button-primary">
              Quiero ser parte <ArrowUpRight size={21} />
            </Link>
            <Link to="/encuentros" className="button button-glass">
              Ver próximos encuentros <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-bottom">
            <span className="stacked-avatars">
              <span>A</span>
              <span>S</span>
              <span>M</span>
              <span>
                <Heart size={14} />
              </span>
            </span>
            <span>
              Hay un lugar para ti.
              <br />
              <strong>Ven como eres.</strong>
            </span>
          </div>
        </div>
        <div className="hero-sticker" aria-hidden="true">
          <Sparkles size={27} />
          <span>
            FE REAL.
            <br />
            GENTE REAL.
            <br />
            <b>TÚ TAMBIÉN.</b>
          </span>
          <span className="sticker-arrow">↗</span>
        </div>
        <div className="hero-caption">
          <span>ENCUENTRA TU GENTE</span>
          <span>VIVE TU PROPÓSITO ↗</span>
        </div>
      </section>
      <div className="values-strip">
        <span>CONÉCTATE</span>
        <span className="strip-star">✳</span>
        <span>CRECE EN TU FE</span>
        <span className="strip-star">✳</span>
        <span>HAZ LA DIFERENCIA</span>
        <span className="strip-star">✳</span>
        <span>SÉ PARTE</span>
        <span className="strip-star">✳</span>
      </div>
      <section className="belong-section" aria-label="Nuestra comunidad">
        <span className="eyebrow">TU FE. TU GENTE. TU HISTORIA.</span>
        <h2>
          No viniste a mirar.
          <br />
          <span>Viniste a ser parte.</span>
        </h2>
        <p>
          Hay conversaciones que te cambian el día, canciones que se quedan contigo y personas con
          las que puedes ser tú. Aquí queremos vivir todo eso, con Jesús en el centro.
        </p>
        <div className="belong-links">
          <Link to="/encuentros">
            <Users />
            <strong>Encuentra tu gente</strong>
            <span>Encuentros para compartir la vida.</span>
            <ArrowUpRight />
          </Link>
          <Link to="/recursos">
            <Sparkles />
            <strong>Haz espacio para tu fe</strong>
            <span>Ideas y recursos para tu día a día.</span>
            <ArrowUpRight />
          </Link>
          <Link to="/entrar">
            <Heart />
            <strong>Deja una huella</strong>
            <span>Tus dones también tienen un lugar.</span>
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <div className="public-container">
        <section className="section-space">
          <SectionHeading
            eyebrow="LO MEJOR SE VIVE JUNTOS"
            title="Nos vemos en el próximo."
            link="Todos los encuentros"
            to="/encuentros"
          />
          {events.length ? (
            <div className="event-grid">
              {events.slice(0, 3).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
              <Link className="invite-card" to="/entrar">
                <span className="invite-icon">
                  <Users size={32} />
                </span>
                <Tag color="teal">ESTE ES TU LUGAR</Tag>
                <h3>
                  Primera vez por aquí?<span>¡Qué bueno verte!</span>
                </h3>
                <p>No necesitas tenerlo todo resuelto. Solo ven con ganas de compartir.</p>
                <span className="text-link">
                  Conecta con nosotros <ArrowUpRight size={20} />
                </span>
              </Link>
            </div>
          ) : (
            <Empty title="Algo bueno se está preparando">
              Los próximos encuentros aparecerán aquí. Mientras tanto, puedes solicitar unirte a la
              comunidad.
            </Empty>
          )}
        </section>
        <section id="nosotros" className="about-section">
          <div className="about-image">
            <img
              src="/images/friends.jpg"
              alt="Un grupo de amigos compartiendo al aire libre"
              loading="lazy"
            />
            <span className="image-label">
              <Heart size={16} /> AQUÍ PUEDES SER TÚ
            </span>
            <span className="about-doodle">✳</span>
          </div>
          <div className="about-copy">
            <span className="eyebrow">SOMOS SHAKERS</span>
            <h2>
              La fe se vive.
              <br />
              La vida se comparte.
            </h2>
            <p>
              Somos jóvenes con preguntas, sueños y una misma esperanza. Creemos que seguir a Jesús
              transforma lo cotidiano y que caminar acompañados hace la diferencia.
            </p>
            <div className="about-points">
              <span>
                <Heart size={20} /> Un lugar donde pertenecer
              </span>
              <span>
                <Sparkles size={20} /> Espacio para crecer a tu ritmo
              </span>
              <span>
                <Users size={20} /> Oportunidades para servir
              </span>
            </div>
            <Link to="/entrar" className="text-link">
              Conoce tu comunidad <ArrowUpRight size={19} />
            </Link>
          </div>
        </section>
        <section className="section-space">
          <SectionHeading
            eyebrow="ALGO PARA LLEVAR CONTIGO"
            title="Una pausa. Una nueva perspectiva."
            link="Explorar recursos"
            to="/recursos"
          />
          <ResourceGrid publicOnly limit={2} />
        </section>
        {data.leader_profiles.some((l) => l.published && l.consent) && (
          <section className="leaders-section">
            <SectionHeading eyebrow="CAMINAMOS CONTIGO" title="Personas que acompañan." />
            <div className="leader-grid">
              {data.leader_profiles
                .filter((l) => l.published && l.consent)
                .map((l) => (
                  <article className="leader-card" key={l.id}>
                    <span className="leader-avatar">
                      {l.image_url ? (
                        <img src={safeUrl(l.image_url)} alt="" loading="lazy" />
                      ) : (
                        initials(l.name)
                      )}
                    </span>
                    <div>
                      <h3>{l.name}</h3>
                      <span className="purple-text">{l.function}</span>
                      <p>{l.bio}</p>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
        <Gallery />
        <section className="join-banner">
          <span className="join-symbol">✳</span>
          <div>
            <span className="eyebrow">EL SIGUIENTE PASO ES TUYO</span>
            <h2>
              Tu historia también
              <br />
              es parte de esta historia.
            </h2>
            <p>Conecta, participa y descubre lo que podemos vivir juntos.</p>
          </div>
          <Link to="/entrar" className="button button-white">
            Quiero ser parte <ArrowUpRight size={22} />
          </Link>
        </section>
      </div>
    </div>
  );
}
export function Privacy() {
  return (
    <article className="public-container prose-page">
      <Tag>UN ESPACIO DE CONFIANZA</Tag>
      <h1>Privacidad y convivencia</h1>
      <p>
        Shakers reúne al ministerio juvenil en un espacio de participación. Para consultas sobre tu
        información o solicitudes de eliminación, comunícate con la coordinación de tu ministerio o
        escribe a <a href="mailto:ijupiter226@gmail.com">ijupiter226@gmail.com</a>.
      </p>
      <h2>Tu información</h2>
      <p>
        Tu nombre, franja de edad y pertenencia a equipos se utilizan para gestionar el acceso y las
        actividades. Los registros de asistencia no son públicos. Puedes editar tu nombre e
        intereses en Mi espacio; para corregir tu franja de edad o solicitar eliminación de tu
        cuenta, habla con la coordinación del ministerio.
      </p>
      <h2>Fotografías</h2>
      <p>
        Tu foto de perfil es opcional y se muestra a quienes tienen permiso para consultar tu
        perfil. Puedes cambiarla o retirarla desde Mi espacio. Las fotografías de la galería se
        publican con autorización; las de encuentros públicos son visibles para cualquier visitante
        y las de encuentros privados requieren acceso aprobado. Para solicitar que retiremos una
        imagen, escribe al correo de coordinación.
      </p>
      <h2>Oración y acompañamiento</h2>
      <p>
        Las peticiones privadas solo pueden consultarlas su autor y la coordinación administradora.
        Si eliges compartir una petición con la comunidad, los líderes la revisan antes de
        publicarla. Ocultar tu nombre lo oculta a otros participantes; el equipo autorizado de
        moderación puede identificar al autor.
      </p>
      <h2>Participación de adolescentes</h2>
      <p>
        La plataforma admite participantes desde los 13 años. Para aprobar a una persona menor de
        18, los líderes deben confirmar la autorización de su responsable. No publicamos directorios
        de menores y no ofrecemos mensajes privados entre miembros.
      </p>
      <h2>Cómo convivimos</h2>
      <p>
        Escuchamos con respeto, cuidamos la privacidad ajena y evitamos compartir información de
        otras personas sin su permiso. Puedes reportar una petición a los líderes. La coordinación
        puede retirar contenido o suspender una cuenta que incumpla estas pautas.
      </p>
      <h2>Servicios y almacenamiento</h2>
      <p>
        Shakers utiliza Netlify para el website, Supabase para cuentas y datos, y Gmail como
        proveedor SMTP de los enlaces de acceso por correo. Los videos se cargan desde YouTube solo
        al abrirlos. La aplicación conserva la sesión y tu preferencia de tema en el dispositivo;
        los datos privados no se guardan en la caché sin conexión.
      </p>
      <Link to="/" className="text-link">
        Volver al inicio <ArrowRight size={18} />
      </Link>
    </article>
  );
}
