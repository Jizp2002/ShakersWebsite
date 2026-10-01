import { it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error The backup scripts run directly in Node as ES modules.
import { encryptArchive, decryptArchive } from '../scripts/archive.mjs';
it('round-trips an encrypted archive and rejects wrong passwords without leaving plaintext', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'shakers-crypto-test-'));
  try {
    const source = join(dir, 'source'),
      encrypted = join(dir, 'encrypted'),
      restored = join(dir, 'restored');
    await writeFile(source, 'Synthetic backup fixture, no real user data.');
    await encryptArchive(source, encrypted, 'test-passphrase-at-least-sixteen');
    expect((await readFile(encrypted)).includes(Buffer.from('Synthetic'))).toBe(false);
    await decryptArchive(encrypted, restored, 'test-passphrase-at-least-sixteen');
    expect(await readFile(restored, 'utf8')).toBe(await readFile(source, 'utf8'));
    await expect(
      decryptArchive(encrypted, join(dir, 'wrong'), 'incorrect-password'),
    ).rejects.toThrow();
    await expect(access(join(dir, 'wrong'))).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
