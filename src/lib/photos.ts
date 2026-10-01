import { supabase } from './supabase';
import { uid } from './utils';

export type Crop = { zoom: number; x: number; y: number };
export function cropRect(width: number, height: number, crop: Crop) {
  const size = Math.min(width, height) / Math.max(1, Math.min(3, crop.zoom));
  return {
    x: (width - size) * Math.max(0, Math.min(1, crop.x)),
    y: (height - size) * Math.max(0, Math.min(1, crop.y)),
    size,
  };
}
export async function readPhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Selecciona una foto JPG, PNG o WebP.');
  if (file.size > 12 * 1024 * 1024) throw new Error('La foto debe pesar menos de 12 MB.');
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 48000000) {
      bitmap.close();
      throw new Error();
    }
    return bitmap;
  } catch {
    throw new Error('No pudimos abrir esa imagen. Prueba una foto más pequeña.');
  }
}
export async function photoBlob(image: ImageBitmap, crop?: Crop) {
  const canvas = document.createElement('canvas');
  if (crop) {
    const r = cropRect(image.width, image.height, crop);
    canvas.width = canvas.height = 512;
    canvas.getContext('2d')!.drawImage(image, r.x, r.y, r.size, r.size, 0, 0, 512, 512);
  } else {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No pudimos preparar la foto.'))),
      'image/webp',
      0.84,
    ),
  );
  if (blob.size > 2 * 1024 * 1024)
    throw new Error('La foto procesada supera 2 MB. Elige una imagen más pequeña.');
  return blob;
}
export async function uploadPhoto(blob: Blob, bucket: 'avatars' | 'gallery', userId: string) {
  if (!supabase) {
    // Demo photos stay local; no upload to the ministry happens in demo mode.
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer la foto.'));
      reader.readAsDataURL(blob);
    });
  }
  const path = `${userId}/${uid()}.webp`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error('No pudimos subir la foto. Revisa tu conexión y vuelve a intentarlo.');
  return `storage://${bucket}/${path}`;
}
export async function removePhoto(value: string | null) {
  const match = value?.match(/^storage:\/\/(avatars|gallery)\/(.+)$/);
  if (!supabase || !match) return;
  const { error } = await supabase.storage.from(match[1]).remove([match[2]]);
  if (error) throw new Error('No pudimos eliminar el archivo anterior.');
}
