import { createReadStream, createWriteStream } from 'node:fs';
import { open, stat, rm } from 'node:fs/promises';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
const magic = Buffer.from('SHAKERS1');
export async function encryptArchive(source, destination, password) {
  if (!password || password.length < 16)
    throw new Error('La frase de cifrado debe tener al menos 16 caracteres.');
  const salt = randomBytes(32),
    iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', scryptSync(password, salt, 32), iv);
  const handle = await open(destination, 'wx', 0o600);
  const output = handle.createWriteStream();
  output.write(Buffer.concat([magic, salt, iv]));
  try {
    await pipeline(createReadStream(source), cipher, output);
    const file = await open(destination, 'a');
    try {
      await file.write(cipher.getAuthTag());
    } finally {
      await file.close();
    }
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
}
export async function decryptArchive(source, destination, password) {
  const size = (await stat(source)).size;
  if (size < 68) throw new Error('Archivo de respaldo inválido.');
  const file = await open(source, 'r');
  const header = Buffer.alloc(52),
    tag = Buffer.alloc(16);
  try {
    await file.read(header, 0, 52, 0);
    await file.read(tag, 0, 16, size - 16);
  } finally {
    await file.close();
  }
  if (!header.subarray(0, 8).equals(magic)) throw new Error('Formato de respaldo desconocido.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    scryptSync(password, header.subarray(8, 40), 32),
    header.subarray(40, 52),
  );
  decipher.setAuthTag(tag);
  const handle = await open(destination, 'wx', 0o600);
  try {
    await pipeline(
      createReadStream(source, { start: 52, end: size - 17 }),
      decipher,
      handle.createWriteStream(),
    );
  } catch (error) {
    await rm(destination, { force: true });
    throw new Error('La frase no coincide o el respaldo está dañado.');
  }
}
