import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, RefreshCw, X } from 'lucide-react';
import { Modal } from './ui';
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function PwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  return needRefresh ? (
    <div className="update-banner" role="status">
      <span>Hay una nueva versión disponible.</span>
      <button
        className="button button-small button-primary"
        onClick={() => void updateServiceWorker(true)}
      >
        <RefreshCw size={16} /> Actualizar
      </button>
      <button
        className="icon-button"
        aria-label="Actualizar más tarde"
        onClick={() => setNeedRefresh(false)}
      >
        <X size={17} />
      </button>
    </div>
  ) : null;
}
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(matchMedia('(display-mode: standalone)').matches);
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', listener);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', listener);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  return (
    <>
      <button
        className="button button-outline"
        disabled={installed}
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          } else setHelp(true);
        }}
      >
        <Download size={17} />
        {installed ? 'Aplicación instalada' : 'Instalar Shakers'}
      </button>
      {help && (
        <Modal title="Shakers, a un toque" close={() => setHelp(false)}>
          <p>
            En iPhone, abre esta página en Safari, pulsa Compartir y elige «Añadir a pantalla de
            inicio».
          </p>
          <p>
            En Android o escritorio, busca «Instalar aplicación» o «Añadir a pantalla de inicio» en
            el menú del navegador.
          </p>
          <p className="muted">
            Si no aparece la opción, el navegador puede no admitir instalación o la app ya está
            instalada.
          </p>
        </Modal>
      )}
    </>
  );
}
