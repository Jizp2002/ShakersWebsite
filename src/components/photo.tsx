import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { initials, safeUrl } from '../lib/utils';
import { cropRect, readPhoto, type Crop } from '../lib/photos';

export function Photo({
  value,
  alt,
  className = '',
}: {
  value: string | null;
  alt: string;
  className?: string;
}) {
  const [resolved, setResolved] = useState<{ value: string; url: string } | null>(null);
  const [failed, setFailed] = useState('');
  useEffect(() => {
    let active = true;
    const match = value?.match(/^storage:\/\/(avatars|gallery)\/(.+)$/);
    if (!match || !supabase) return;
    const resolve = async () => {
      const { data, error } = await supabase!.storage.from(match[1]).createSignedUrl(match[2], 600);
      if (active && !error && data) {
        setResolved({ value: value!, url: data.signedUrl });
        setFailed('');
      }
    };
    void resolve();
    const timer = setInterval(() => void resolve(), 480000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [value]);
  const url = value?.startsWith('storage://')
    ? resolved?.value === value
      ? resolved.url
      : ''
    : value?.startsWith('data:image/webp;base64,') && !supabase
      ? value
      : safeUrl(value || '');
  return url && failed !== url ? (
    <img
      className={className}
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(url)}
    />
  ) : (
    <span className={`photo-fallback ${className}`} role="img" aria-label={alt}>
      {initials(alt)}
    </span>
  );
}
export function Avatar({
  value,
  name,
  large = false,
}: {
  value: string | null;
  name: string;
  large?: boolean;
}) {
  return (
    <span className={large ? 'profile-avatar avatar-photo' : 'avatar avatar-photo'}>
      <Photo value={value} alt={name} />
    </span>
  );
}
export function PhotoCropper({
  onChange,
  onBusy,
}: {
  onChange: (image: ImageBitmap | null, crop: Crop) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0.5, y: 0.5 });
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const ticket = useRef(0);
  useEffect(
    () => () => {
      ticket.current++;
    },
    [],
  );
  useEffect(() => () => image?.close(), [image]);
  useEffect(() => {
    onChange(image, crop);
    if (!image || !canvas.current) return;
    const r = cropRect(image.width, image.height, crop);
    canvas.current.getContext('2d')!.clearRect(0, 0, 256, 256);
    canvas.current.getContext('2d')!.drawImage(image, r.x, r.y, r.size, r.size, 0, 0, 256, 256);
  }, [image, crop]);
  return (
    <div className="photo-editor">
      <label>
        Elegir foto
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const current = ++ticket.current;
            setError('');
            onBusy(true);
            try {
              const next = await readPhoto(file);
              if (current !== ticket.current) {
                next.close();
                return;
              }
              setCrop({ zoom: 1, x: 0.5, y: 0.5 });
              setImage(next);
            } catch (e) {
              if (current === ticket.current) setError((e as Error).message);
            }
            if (current === ticket.current) onBusy(false);
            e.target.value = '';
          }}
        />
      </label>
      {image && (
        <>
          <canvas
            ref={canvas}
            width={256}
            height={256}
            className="crop-preview"
            aria-label="Vista previa de tu foto"
          />
          {(
            [
              { key: 'zoom', label: 'Acercar', min: 1, max: 3 },
              { key: 'x', label: 'Posición horizontal', min: 0, max: 1 },
              { key: 'y', label: 'Posición vertical', min: 0, max: 1 },
            ] as const
          ).map((control) => (
            <label key={control.key}>
              {control.label}
              <input
                type="range"
                min={control.min}
                max={control.max}
                step="0.01"
                value={crop[control.key]}
                onChange={(e) => setCrop({ ...crop, [control.key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <small className="muted">
        JPG, PNG o WebP · hasta 12 MB. Ajusta el encuadre antes de guardar.
      </small>
    </div>
  );
}
