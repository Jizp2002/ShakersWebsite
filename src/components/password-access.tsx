import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { ErrorText, useAction } from './ui';

export function PasswordField({
  label = 'Contraseña',
  value,
  onChange,
  fresh = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  fresh?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          aria-label={label}
          type={visible ? 'text' : 'password'}
          required
          minLength={fresh ? 8 : 1}
          maxLength={128}
          autoComplete={fresh ? 'new-password' : 'current-password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {fresh && (
        <small className="field-hint">Al menos 8 caracteres. Usa una contraseña única.</small>
      )}
    </label>
  );
}

type Mode = 'login' | 'register' | 'reset';
export function PasswordAccess({
  next,
  recovery,
  captcha,
  captchaReady,
  resetCaptcha,
  captchaElement,
  onLink,
}: {
  next: string;
  recovery: boolean;
  captcha: string;
  captchaReady: boolean;
  resetCaptcha: () => void;
  captchaElement: React.ReactNode;
  onLink: () => void;
}) {
  const { userId, toast } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [requestedRole, setRequestedRole] = useState('member');
  const [sent, setSent] = useState(false);
  const { act, pending, error } = useAction();
  const updating = recovery && Boolean(userId);
  const recovering = mode === 'reset' || (recovery && !userId);
  const fresh = mode === 'register' || updating;
  const changeMode = (value: Mode) => {
    setMode(value);
    setSent(false);
    setPassword('');
    setConfirm('');
  };
  const submit = async () => {
    const ok = await act(async () => {
      if (fresh && password !== confirm) throw new Error('Las contraseñas no coinciden.');
      if (updating) {
        const { error } = await supabase!.auth.updateUser({ password });
        if (error)
          throw new Error(
            'No pudimos guardar la contraseña. Usa una diferente de al menos 8 caracteres; si el enlace expiró, solicita otro.',
          );
        setPassword('');
        setConfirm('');
        toast('Contraseña guardada. Ya puedes entrar con tu correo y contraseña.');
        navigate(next, { replace: true });
      } else if (recovering) {
        const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/entrar?recovery=1`,
          captchaToken: captcha || undefined,
        });
        if (error)
          throw new Error('No pudimos enviar el correo. Espera un momento y vuelve a intentarlo.');
      } else if (mode === 'register') {
        const { error } = await supabase!.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/entrar?next=${encodeURIComponent(next)}`,
            captchaToken: captcha || undefined,
            data: { full_name: name.trim(), requested_role: requestedRole },
          },
        });
        if (error)
          throw new Error(
            'No pudimos crear la cuenta. Comprueba los datos y usa una contraseña de al menos 8 caracteres. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.',
          );
        setPassword('');
        setConfirm('');
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: { captchaToken: captcha || undefined },
        });
        if (error)
          throw new Error(
            error.code === 'email_not_confirmed'
              ? 'Confirma primero tu correo con el enlace de bienvenida.'
              : 'Correo o contraseña incorrectos. Si antes entrabas con un enlace, pulsa «Crear o recuperar contraseña».',
          );
      }
    });
    resetCaptcha();
    if (ok && (recovering || mode === 'register') && !updating) setSent(true);
  };
  return (
    <>
      {!recovery && (
        <div className="auth-tabs" aria-label="Opciones de acceso">
          <button type="button" aria-pressed={mode === 'login'} onClick={() => changeMode('login')}>
            Iniciar sesión
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => changeMode('register')}
          >
            Crear cuenta
          </button>
        </div>
      )}
      {updating ? (
        <h3>Elige tu nueva contraseña</h3>
      ) : recovering ? (
        <>
          <h3>Crear o recuperar contraseña</h3>
          <p className="muted">
            Si antes entrabas con un enlace, usa el mismo correo para conservar tu cuenta y tus
            permisos.
          </p>
        </>
      ) : (
        <p className="muted">
          {mode === 'register'
            ? 'Crea tu cuenta y confirma tu correo para solicitar ingreso.'
            : 'Tu sesión se mantiene en este dispositivo hasta que cierres sesión.'}
        </p>
      )}
      {sent ? (
        <div className="notice" role="status">
          <strong>Revisa tu correo</strong>
          <p>
            {recovering
              ? 'Si hay una cuenta con ese correo, recibirás un enlace para crear o recuperar tu contraseña.'
              : 'Si el registro es válido, recibirás un enlace para confirmar tu correo. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.'}{' '}
            Abre el enlace en este mismo navegador y revisa también spam.
          </p>
          <button
            className="text-link"
            onClick={() => {
              setSent(false);
              setMode('login');
            }}
          >
            Volver al acceso
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {!updating && (
            <label>
              Correo electrónico
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </label>
          )}
          {mode === 'register' && !recovery && (
            <>
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
                Quiero participar como
                <select value={requestedRole} onChange={(e) => setRequestedRole(e.target.value)}>
                  <option value="member">Joven</option>
                  <option value="leader">Líder</option>
                </select>
              </label>
              {requestedRole === 'leader' && (
                <p className="notice">
                  La coordinación revisará tu solicitud de líder. Elegir esta opción no otorga
                  permisos.
                </p>
              )}
            </>
          )}
          {!recovering && <PasswordField value={password} onChange={setPassword} fresh={fresh} />}
          {fresh && (
            <PasswordField
              label="Confirmar contraseña"
              value={confirm}
              onChange={setConfirm}
              fresh
            />
          )}
          {mode === 'register' && !recovery && (
            <label className="check-label">
              <input type="checkbox" required />
              <span>
                Tengo al menos 13 años y acepto las{' '}
                <Link to="/privacidad">pautas de convivencia</Link>.
              </span>
            </label>
          )}
          {!updating && captchaElement}
          <ErrorText error={error} />
          <button
            className="button button-primary full"
            disabled={pending || (!updating && !captchaReady)}
          >
            {pending
              ? 'Un momento…'
              : updating
                ? 'Guardar contraseña'
                : recovering
                  ? 'Enviar enlace de recuperación'
                  : mode === 'register'
                    ? 'Crear mi cuenta'
                    : 'Iniciar sesión'}
            <ArrowRight size={17} />
          </button>
        </form>
      )}
      {!updating && (
        <div className="auth-help">
          {!recovering && (
            <button className="text-link" onClick={() => changeMode('reset')}>
              Crear o recuperar contraseña
            </button>
          )}
          {!recovery && (
            <button className="text-link" onClick={onLink}>
              Entrar con un enlace de correo
            </button>
          )}
          {recovery && <Link to="/entrar">Volver a iniciar sesión</Link>}
        </div>
      )}
    </>
  );
}
