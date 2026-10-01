import { supabase } from './supabase';
import { uid } from './utils';
export async function upload(file: File, userId: string, pdf = false): Promise<string> {
  if (!supabase)
    throw new Error(
      'La carga de archivos requiere conectar Supabase. En demo usa una imagen del catálogo o una URL.',
    );
  if (file.size > (pdf ? 10 : 12) * 1024 * 1024)
    throw new Error('El archivo supera el tamaño permitido.');
  let blob: Blob = file;
  if (pdf) {
    if (file.type !== 'application/pdf' || !(await file.slice(0, 5).text()).startsWith('%PDF-'))
      throw new Error('Selecciona un documento PDF válido.');
  } else {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      throw new Error('Usa una imagen JPG, PNG o WebP.');
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close();
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('No pudimos procesar la imagen.'))),
        'image/webp',
        0.82,
      ),
    );
  }
  const path = `${userId}/${uid()}.${pdf ? 'pdf' : 'webp'}`;
  const bucket = pdf ? 'documents' : 'media';
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: pdf ? 'application/pdf' : 'image/webp', upsert: false });
  if (error)
    throw new Error(
      'No se pudo subir el archivo. Revisa la conexión y el límite de almacenamiento.',
    );
  return pdf
    ? `storage://documents/${path}`
    : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
export async function documentUrl(url: string): Promise<string> {
  if (!url.startsWith('storage://documents/')) return url;
  if (!supabase) throw new Error('Este documento requiere conexión al ministerio.');
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(url.slice('storage://documents/'.length), 60);
  if (error) throw new Error('No tienes acceso a este documento o ya no está disponible.');
  return data.signedUrl;
}
