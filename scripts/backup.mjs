// Read-only production operation. Secrets come from environment, never CLI arguments or logs.
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { encryptArchive } from './archive.mjs';
const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BACKUP_PASSPHRASE'];
for (const key of required)
  if (!process.env[key]) {
    console.error('Falta la variable ' + key + '. Consulta docs/OPERATIONS.md.');
    process.exit(1);
  }
if (process.env.BACKUP_PASSPHRASE.length < 16) {
  console.error('Usa una frase de cifrado de al menos 16 caracteres.');
  process.exit(1);
}
const db = new URL(process.env.DATABASE_URL);
const pgEnv = {
  PATH: process.env.PATH,
  PGHOST: db.hostname,
  PGPORT: db.port || '5432',
  PGDATABASE: decodeURIComponent(db.pathname.slice(1)),
  PGUSER: decodeURIComponent(db.username),
  PGPASSWORD: decodeURIComponent(db.password),
  PGSSLMODE: 'require',
};
function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
    let details = '';
    child.stderr.on('data', (chunk) => (details += chunk.toString()));
    child.on('error', () =>
      reject(new Error('No se pudo iniciar ' + command + '. Comprueba que esté instalado.')),
    );
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              command +
                ' no pudo completar el respaldo. Comprueba conectividad, permisos y versión.',
            ),
          ),
    );
  });
}
const temporary = await mkdtemp(join(tmpdir(), 'shakers-backup-'));
const content = join(temporary, 'content');
await mkdir(content, { mode: 0o700 });
try {
  await run(
    'pg_dump',
    [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--schema=public',
      '--file',
      join(content, 'public.dump'),
    ],
    pgEnv,
  );
  await run(
    'pg_dump',
    [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--data-only',
      '--table=auth.users',
      '--table=auth.identities',
      '--file',
      join(content, 'auth-data.dump'),
    ],
    pgEnv,
  );
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let files = 0;
  for (const bucket of ['media', 'documents', 'avatars', 'gallery']) {
    async function walk(prefix = '') {
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await client.storage
          .from(bucket)
          .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw new Error('No se pudo listar el almacenamiento.');
        for (const entry of data || []) {
          const key = prefix ? prefix + '/' + entry.name : entry.name;
          if (!entry.id) {
            await walk(key);
            continue;
          }
          const root = resolve(content, 'storage', bucket),
            destination = resolve(root, key);
          if (!destination.startsWith(root + sep))
            throw new Error('Ruta de almacenamiento no válida.');
          const { data: blob, error: downloadError } = await client.storage
            .from(bucket)
            .download(key);
          if (downloadError) throw new Error('No se pudo descargar un archivo del respaldo.');
          await mkdir(resolve(destination, '..'), { recursive: true, mode: 0o700 });
          await writeFile(destination, Buffer.from(await blob.arrayBuffer()), { mode: 0o600 });
          files++;
        }
        if (!data || data.length < 100) break;
      }
    }
    await walk();
  }
  await writeFile(
    join(content, 'manifest.json'),
    JSON.stringify(
      {
        version: 1,
        created_at: new Date().toISOString(),
        files,
        buckets: ['media', 'documents', 'avatars', 'gallery'],
        note: 'Preservar UUID de usuarios al restaurar. No contiene sesiones ni configuración OAuth/SMTP.',
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  const tar = join(temporary, 'backup.tar');
  await run('tar', ['-cf', tar, '-C', content, '.']);
  await mkdir('backups', { recursive: true, mode: 0o700 });
  const destination = join(
    'backups',
    'shakers-' + new Date().toISOString().replaceAll(':', '-') + '.enc',
  );
  await encryptArchive(tar, destination, process.env.BACKUP_PASSPHRASE);
  console.log('Respaldo cifrado completado: ' + destination + ' (' + files + ' archivos).');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo completar el respaldo.');
  process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
