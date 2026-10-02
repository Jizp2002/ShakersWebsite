import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Brand, ErrorText, Tag, useAction } from '../components/ui';
import { useMe, useStore } from '../lib/store';
import { isDemo, supabase } from '../lib/supabase';
import { safeNext } from '../lib/utils';
import { PasswordAccess } from '../components/password-access';
import type { Role } from '../types';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}
function Captcha({ onToken, version }: { onToken: (v: string) => void; version: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!import.meta.env.VITE_TURNSTILE_SITE_KEY) return;
    let id: string | undefined;
    let stopped = false;
    const render = () => {
      if (!stopped && el.current && window.turnstile)
        id = window.turnstile.render(el.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
          theme: 'auto',
        });
    };
    let script = document.querySelector<HTMLScriptElement>('#turnstile-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      document.head.appendChild(script);
    }
    if (window.turnstile) render();
    else script.addEventListener('load', render);
    return () => {
      stopped = true;
      script?.removeEventListener('load', render);
      if (id) window.turnstile?.remove(id);
    };
  }, [onToken, version]);
  return <div ref={el} />;
}
const emailLinkMode = import.meta.env.VITE_AUTH_EMAIL_MODE === 'link';
const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED !== 'false';
export function Login() {
  const { userId, demoLogin } = useStore();
  const { membership } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = new URLSearchParams(location.search).get('next');
  const next = safeNext(requested);
  const recovery = new URLSearchParams(location.search).get('recovery') === '1';
  const [linkAccess, setLinkAccess] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [captcha, setCaptcha] = useState('');
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const { act, pending, error } = useAction();
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  if (userId && !recovery)
    return <Navigate to={membership?.status === 'approved' ? next : '/app'} replace />;
  const emailLogin = async () => {
    const ok = await act(async () => {
      const { error: e } = await supabase!.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${locationOrigin()}/entrar?next=${encodeURIComponent(next)}`,
          captchaToken: captcha || undefined,
        },
      });
      if (e)
        throw new Error(
          `No pudimos enviar el ${emailLinkMode ? 'enlace' : 'código'}. Revisa el correo, espera un momento y vuelve a intentarlo.`,
        );
    });
    setCaptcha('');
    setCaptchaVersion((v) => v + 1);
    if (ok) {
      setSent(true);
      setCooldown(60);
    }
  };
  return (
    <main id="main" className="auth-page">
      <div className="auth-art">
        <Brand />
        <div>
          <Tag color="teal">TU COMUNIDAD TE ESPERA</Tag>
          <h1>
            Un lugar para
            <br />
            ser tú.
            <br />
            <span>Y crecer juntos.</span>
          </h1>
          <p>
            Tu historia importa.
            <br />
            Nos encantará caminar contigo.
          </p>
        </div>
        <span>FE · PROPÓSITO · COMUNIDAD</span>
      </div>
      <div className="auth-panel">
        <Link to="/" className="text-link">
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
        <div className="auth-form">
          <span className="auth-symbol">
            <Users size={29} />
          </span>
          <h2>Qué bueno tenerte aquí.</h2>
          <p className="muted">Entra o crea tu cuenta para dar el siguiente paso.</p>
          {isDemo ? (
            <>
              <div className="notice">
                <strong>Explora la experiencia de ejemplo</strong>
                <p>
                  No necesitas una cuenta. Puedes probar cada rol; los cambios permanecen en este
                  navegador.
                </p>
              </div>
              <div className="demo-logins">
                {(
                  [
                    {
                      role: 'member',
                      label: 'Entrar como joven',
                      detail: 'Agenda, comunidad y mi equipo',
                    },
                    {
                      role: 'leader',
                      label: 'Entrar como líder',
                      detail: 'Encuentros, solicitudes y moderación',
                    },
                    {
                      role: 'admin',
                      label: 'Entrar como coordinador',
                      detail: 'Administración completa',
                    },
                    {
                      role: 'pending',
                      label: 'Ver solicitud pendiente',
                      detail: 'Experiencia antes de la aprobación',
                    },
                  ] as { role: Role | 'pending'; label: string; detail: string }[]
                ).map((r) => (
                  <button
                    key={r.role}
                    className="demo-login"
                    onClick={() => {
                      demoLogin(r.role);
                      navigate(r.role === 'pending' ? '/app' : next);
                    }}
                  >
                    <span>
                      <strong>{r.label}</strong>
                      <small>{r.detail}</small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
            </>
          ) : !linkAccess || recovery ? (
            <PasswordAccess
              next={next}
              recovery={recovery}
              captcha={captcha}
              captchaReady={!import.meta.env.VITE_TURNSTILE_SITE_KEY || Boolean(captcha)}
              resetCaptcha={() => {
                setCaptcha('');
                setCaptchaVersion((v) => v + 1);
              }}
              captchaElement={<Captcha onToken={setCaptcha} version={captchaVersion} />}
              onLink={() => setLinkAccess(true)}
            />
          ) : (
            <>
              <button className="text-link" onClick={() => setLinkAccess(false)}>
                Usar correo y contraseña
              </button>
              {googleEnabled && (
                <>
                  <button
                    className="button button-outline full"
                    disabled={pending}
                    onClick={() =>
                      void act(async () => {
                        const { error: e } = await supabase!.auth.signInWithOAuth({
                          provider: 'google',
                          options: {
                            redirectTo: `${locationOrigin()}/entrar?next=${encodeURIComponent(next)}`,
                          },
                        });
                        if (e)
                          throw new Error('No pudimos conectar con Google. Inténtalo nuevamente.');
                      })
                    }
                  >
                    <span className="google-g">G</span>Continuar con Google
                  </button>
                  <div className="separator">
                    <span>o usa tu correo</span>
                  </div>
                </>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (sent && !emailLinkMode)
                    void act(async () => {
                      const { error: err } = await supabase!.auth.verifyOtp({
                        email: email.trim(),
                        token: code.trim(),
                        type: 'email',
                      });
                      if (err)
                        throw new Error('El código no es válido o expiró. Solicita uno nuevo.');
                    });
                  else void emailLogin();
                }}
              >
                <label>
                  Correo electrónico
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    disabled={sent}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                  />
                </label>
                {sent && (
                  <>
                    <p className="notice">
                      {emailLinkMode
                        ? `Enviamos un enlace a ${email}. Ábrelo en este mismo navegador para entrar. Revisa también la carpeta de spam.`
                        : `Enviamos un código a ${email}. Revisa también la carpeta de spam.`}
                    </p>
                    {!emailLinkMode && (
                      <label>
                        Código de acceso
                        <input
                          required
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6,10}"
                          minLength={6}
                          maxLength={10}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                        />
                      </label>
                    )}
                  </>
                )}
                <Captcha onToken={setCaptcha} version={captchaVersion} />
                <ErrorText error={error} />
                <button
                  className="button button-primary full"
                  disabled={
                    pending ||
                    (sent && emailLinkMode) ||
                    (!sent && Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY) && !captcha)
                  }
                >
                  {pending
                    ? 'Un momento…'
                    : emailLinkMode
                      ? sent
                        ? 'Revisa tu correo'
                        : 'Recibir enlace de acceso'
                      : sent
                        ? 'Verificar y entrar'
                        : 'Recibir código'}
                  <ArrowRight size={17} />
                </button>
                {sent && (
                  <button
                    type="button"
                    className="text-link resend"
                    disabled={cooldown > 0 || pending}
                    onClick={() => {
                      setSent(false);
                      setCode('');
                    }}
                  >
                    {cooldown > 0
                      ? `Puedes reenviar en ${cooldown}s`
                      : `Cambiar correo o solicitar otro ${emailLinkMode ? 'enlace' : 'código'}`}
                  </button>
                )}
              </form>
            </>
          )}
          <div className="auth-note">
            <LockKeyhole size={15} />
            <span>El acceso a la comunidad requiere aprobación de un líder.</span>
          </div>
          <p className="legal-note">
            Al solicitar ingreso aceptas nuestras{' '}
            <Link to="/privacidad">pautas de privacidad y convivencia</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
const locationOrigin = () => window.location.origin;
export function MembershipGate() {
  const { data, userId, rpc, logout } = useStore();
  const { profile, membership } = useMe();
  const { act, error, pending } = useAction();
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState<'13-17' | '18+'>('18+');
  const [interests, setInterests] = useState('');
  const [requestedRole, setRequestedRole] = useState<'member' | 'leader'>('member');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user?.user_metadata.requested_role === 'leader')
        setRequestedRole('leader');
    });
    return () => {
      active = false;
    };
  }, []);
  if (!userId)
    return <Navigate to={`/entrar?next=${encodeURIComponent(window.location.pathname)}`} replace />;
  const blocked = membership && ['pending', 'suspended', 'rejected'].includes(membership.status);
  return (
    <div className="gate-page">
      <Brand />
      <div className="gate-card">
        {blocked ? (
          <>
            <span className="auth-symbol">
              {membership.status === 'pending' ? <Clock3 size={30} /> : <ShieldCheck size={30} />}
            </span>
            <Tag>
              {membership.status === 'pending' ? 'SOLICITUD RECIBIDA' : 'ESTADO DE TU CUENTA'}
            </Tag>
            <h1>
              {membership.status === 'pending'
                ? 'Ya diste el primer paso.'
                : membership.status === 'suspended'
                  ? 'Tu acceso está suspendido.'
                  : 'Tu solicitud no fue aprobada.'}
            </h1>
            <p>
              {membership.status === 'pending'
                ? 'Un líder revisará tu solicitud. Cuando esté aprobada podrás entrar a tu comunidad desde aquí.'
                : 'Conversa con la coordinación del ministerio para revisar tu situación.'}
            </p>
            {profile?.age_group === '13-17' && membership.status === 'pending' && (
              <div className="notice">
                Un líder confirmará la autorización de tu responsable antes de activar tu acceso.
              </div>
            )}
            <Link to="/encuentros" className="button button-primary">
              Explorar encuentros <ArrowRight size={18} />
            </Link>
          </>
        ) : (
          <>
            <Tag>EMPECEMOS POR CONOCERNOS</Tag>
            <h1>¿Cómo te llamas?</h1>
            <p>Completa estos datos para solicitar acceso al ministerio.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  () =>
                    rpc('submit_membership', {
                      p_name: name,
                      p_age_group: age,
                      p_interests: interests,
                      p_requested_role: requestedRole,
                    }),
                  'Solicitud enviada.',
                );
              }}
            >
              <label>
                Nombre
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Franja de edad
                <select
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value as typeof age);
                    if (e.target.value === '13-17') setRequestedRole('member');
                  }}
                >
                  <option value="18+">Tengo 18 años o más</option>
                  <option value="13-17">Tengo entre 13 y 17 años</option>
                </select>
              </label>
              <label>
                Quiero participar como
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value as 'member' | 'leader')}
                >
                  <option value="member">Joven</option>
                  <option value="leader" disabled={age === '13-17'}>
                    Líder (18 años o más)
                  </option>
                </select>
              </label>
              {requestedRole === 'leader' && (
                <p className="notice">
                  La coordinación revisará tu solicitud antes de conceder permisos de líder.
                </p>
              )}
              <label>
                Intereses <span className="muted">(opcional)</span>
                <textarea
                  maxLength={300}
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Música, fotografía, servicio…"
                />
              </label>
              <label className="check-label">
                <input required type="checkbox" />
                Tengo al menos 13 años y acepto las{' '}
                <Link to="/privacidad">pautas de convivencia</Link>.
              </label>
              <ErrorText error={error} />
              <button className="button button-primary full" disabled={pending}>
                Solicitar ingreso <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
        <button className="text-link resend" onClick={() => void act(logout)}>
          Cerrar sesión
        </button>
        <ErrorText error={error} />
      </div>
    </div>
  );
}
