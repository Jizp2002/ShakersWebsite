import { Avatar } from './photo';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  HeartHandshake,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { Brand, ThemeToggle } from './ui';
import { isDemo } from '../lib/supabase';
import { useMe, useStore } from '../lib/store';
import { Notifications } from './notifications';
import { initials } from '../lib/utils';

export function PublicLayout() {
  const [menu, setMenu] = useState(false);
  const { userId } = useStore();
  const location = useLocation();
  useEffect(() => setMenu(false), [location]);
  return (
    <>
      <header className="public-header">
        <div className="header-inner">
          <Brand />
          <nav
            aria-label="Navegación principal"
            className={menu ? 'public-nav open' : 'public-nav'}
          >
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/encuentros">Encuentros</NavLink>
            <NavLink to="/recursos">Para crecer</NavLink>
            <a href="/#nosotros">Somos Shakers</a>
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <Link
              to={userId ? '/app' : '/entrar'}
              className="button button-small button-outline desktop-login"
            >
              {userId ? 'Mi comunidad' : 'Iniciar sesión'}
              <ArrowUpRight size={16} />
            </Link>
            <button
              className="icon-button menu-toggle"
              aria-expanded={menu}
              aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="public-footer">
        <div>
          <Brand />
          <p>
            Una comunidad. Muchas historias.
            <br />
            Un mismo propósito.
          </p>
        </div>
        <div>
          <span className="eyebrow">NOS VEMOS PRONTO</span>
          <Link className="text-link" to="/encuentros">
            Encuentra tu próximo encuentro <ArrowUpRight size={18} />
          </Link>
          <Link to="/privacidad" className="footer-privacy">
            Privacidad y convivencia
          </Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Shakers · Hechos para algo más.</span>
          <span>
            Con fe, propósito y comunidad <Zap size={13} />
          </span>
        </div>
      </footer>
    </>
  );
}
const navigation = [
  { to: '/app', label: 'Inicio', icon: Home },
  { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/comunidad', label: 'Comunidad', icon: HeartHandshake },
  { to: '/app/recursos', label: 'Recursos', icon: BookOpen },
  { to: '/app/mi-espacio', label: 'Mi espacio', icon: UserRound },
];
export function AppLayout() {
  const { profile, membership } = useMe();
  const { logout, toast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const signout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const staff = membership?.role === 'admin' || membership?.role === 'leader';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-title">TU COMUNIDAD</div>
        <nav aria-label="Mi comunidad">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/app'}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          {staff && (
            <NavLink to="/admin">
              <LayoutDashboard size={20} />
              <span>Administración</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-note">
          <span className="little-star">✳</span>
          <p>
            Tu historia importa.
            <br />
            <strong>Tu lugar está aquí.</strong>
          </p>
          <Link to="/encuentros">
            Invita a alguien <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link to="/" className="text-link">
            <ArrowLeft size={15} /> Website público
          </Link>
          <button className="text-link" onClick={signout}>
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div>
            <span className="app-header-label">SHakers / MI COMUNIDAD</span>
            <span className="mobile-brand">
              <Brand small />
            </span>
          </div>
          <div className="header-actions">
            <Notifications />
            {staff &&
              (location.pathname.startsWith('/admin') ? (
                <Link
                  className="button button-small button-outline admin-access"
                  to="/app"
                  aria-label="Volver a mi comunidad"
                >
                  <ArrowLeft size={17} />
                  <span>Mi comunidad</span>
                </Link>
              ) : (
                <Link
                  className="button button-small button-outline admin-access"
                  to="/admin"
                  aria-label="Administración"
                >
                  <ShieldCheck size={19} />
                  <span>Administrar</span>
                </Link>
              ))}
            <ThemeToggle />
            <Link to="/app/mi-espacio" className="profile-link" aria-label="Mi perfil">
              <Avatar value={profile?.avatar_url || null} name={profile?.name || 'Mi perfil'} />
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="app-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Hechos para algo más.</span>
          <Link to="/privacidad">Privacidad y convivencia</Link>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/app'}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export function DemoBar() {
  const { resetDemo } = useStore();
  return isDemo ? (
    <div className="demo-bar">
      <span>
        <span className="demo-dot" /> Modo demo · Personas, fotos y actividades ilustrativas. Los
        cambios se guardan solo en este navegador.
      </span>
      <button
        onClick={() => {
          if (
            window.confirm('¿Restaurar los datos de ejemplo? Se perderán los cambios de esta demo.')
          )
            resetDemo();
        }}
      >
        Restaurar demo
      </button>
    </div>
  ) : null;
}
