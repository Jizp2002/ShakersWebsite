import { decryptArchive } from './archive.mjs';
const [source, destination] = process.argv.slice(2);
if (!source || !destination || !process.env.BACKUP_PASSPHRASE) {
  console.error(
    'Uso: node scripts/decrypt-backup.mjs respaldo.enc nuevo-archivo.tar; establece BACKUP_PASSPHRASE en el entorno.',
  );
  process.exit(1);
}
try {
  await decryptArchive(source, destination, process.env.BACKUP_PASSPHRASE);
  console.log('Respaldo descifrado. No se ha modificado ninguna base de datos.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
