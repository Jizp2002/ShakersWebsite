import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { Provider, useMe, useStore } from './lib/store';
import { PublicLayout, AppLayout, DemoBar } from './components/layout';
import { Loading, Empty } from './components/ui';
import { PwaUpdate } from './components/pwa';
import { Landing, Privacy } from './pages/public';
import { Login, MembershipGate } from './pages/auth';
import { Agenda, EventDetail } from './pages/events';
import { Resources } from './pages/resources';
const HomePage = lazy(() => import('./pages/home').then((m) => ({ default: m.HomePage })));
const Community = lazy(() => import('./pages/community').then((m) => ({ default: m.Community })));
const ProfilePage = lazy(() => import('./pages/profile').then((m) => ({ default: m.ProfilePage })));
const Admin = lazy(() => import('./pages/admin').then((m) => ({ default: m.Admin })));

function Guard() {
  const { userId } = useStore();
  const { membership } = useMe();
  if (!userId || membership?.status !== 'approved') return <MembershipGate />;
  return <AppLayout />;
}
function Scroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash)
      setTimeout(
        () =>
          document.getElementById(hash.slice(1))?.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          }),
        50,
      );
    else window.scrollTo(0, 0);
    document.title = `${pathname.startsWith('/admin') ? 'Administración' : pathname.startsWith('/app') ? 'Mi comunidad' : pathname.includes('encuentro') || pathname.includes('evento') ? 'Encuentros' : pathname.includes('recurso') ? 'Para crecer' : 'Hechos para algo más'} · Shakers`;
  }, [pathname, hash]);
  return null;
}
function Application() {
  const { loading, error, online, message, refresh } = useStore();
  return (
    <BrowserRouter>
      <Scroll />
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <DemoBar />
      {!online ? (
        <main id="main" className="offline-page">
          <WifiOff size={38} />
          <h1>Volvemos a conectar en un momento.</h1>
          <p>
            Necesitas conexión para consultar tu comunidad y guardar cambios. No se han enviado
            acciones sin conexión.
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              if (navigator.onLine) window.location.reload();
            }}
          >
            <RefreshCw size={17} /> Reintentar
          </button>
        </main>
      ) : loading ? (
        <Loading />
      ) : error ? (
        <main id="main" className="offline-page">
          <h1>No pudimos cargar este espacio.</h1>
          <p role="alert">{error}</p>
          <button className="button button-primary" onClick={() => void refresh()}>
            <RefreshCw size={17} /> Reintentar
          </button>
        </main>
      ) : (
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Landing />} />
              <Route path="encuentros" element={<Agenda publicOnly />} />
              <Route path="eventos/:id" element={<EventDetail />} />
              <Route path="recursos" element={<Resources publicOnly />} />
              <Route path="privacidad" element={<Privacy />} />
              <Route
                path="*"
                element={
                  <div className="public-container page-pad">
                    <Empty
                      title="Este camino todavía no existe"
                      action={
                        <Link to="/" className="button button-primary">
                          Volver al inicio
                        </Link>
                      }
                    >
                      Comprueba el enlace o regresa a la comunidad.
                    </Empty>
                  </div>
                }
              />
            </Route>
            <Route path="entrar" element={<Login />} />
            <Route element={<Guard />}>
              <Route path="app" element={<HomePage />} />
              <Route path="app/agenda" element={<Agenda />} />
              <Route path="app/comunidad" element={<Community />} />
              <Route path="app/recursos" element={<Resources />} />
              <Route path="app/mi-espacio" element={<ProfilePage />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Routes>
        </Suspense>
      )}
      {message && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}
      <PwaUpdate />
    </BrowserRouter>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  reconnect = () => {
    if (this.state.failed) window.location.reload();
  };
  componentDidMount() {
    window.addEventListener('online', this.reconnect);
  }
  componentWillUnmount() {
    window.removeEventListener('online', this.reconnect);
  }
  componentDidCatch(error: Error) {
    if (
      /dynamically imported|module script|Loading chunk/i.test(error.message) &&
      navigator.onLine
    ) {
      const previous = Number(sessionStorage.getItem('shakers-chunk-retry') || 0);
      if (Date.now() - previous > 60000) {
        sessionStorage.setItem('shakers-chunk-retry', String(Date.now()));
        window.location.reload();
      }
    }
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="offline-page">
        <h1>Necesitamos volver a abrir este espacio.</h1>
        <p>Ocurrió un error inesperado. Puedes recargar para intentarlo nuevamente.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <Boundary>
      <Provider>
        <Application />
      </Provider>
    </Boundary>
  );
}
