import { describe, expect, it } from 'vitest';
import {
  csv,
  calendarFile,
  safeUrl,
  youtubeId,
  fromLocalInput,
  localInput,
  safeNext,
} from '../src/lib/utils';
describe('exports and links', () => {
  it('keeps login redirects within approved application routes', () => {
    expect(safeNext('//evil.example')).toBe('/app');
    expect(safeNext('/%5cevil.example')).toBe('/app');
    expect(safeNext('/eventos/123')).toBe('/eventos/123');
  });
  it('neutralizes CSV formulas and quotes fields', () => {
    expect(csv([['=1+1', 'A "quote"', 'a,b']])).toContain('"\'=1+1","A ""quote""","a,b"');
  });
  it('rejects executable links and extracts only supported video IDs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('//evil.example')).toBe('');
    expect(youtubeId('https://evil.example/watch?v=abcdefghijk')).toBeNull();
    expect(youtubeId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk');
  });
  it('round-trips Santo Domingo times independently of host timezone', () => {
    expect(fromLocalInput('2026-10-02T19:00')).toBe('2026-10-02T23:00:00.000Z');
    expect(localInput('2026-10-02T23:00:00Z')).toBe('2026-10-02T19:00');
  });
  it('escapes calendar text', () => {
    const result = calendarFile({
      id: 'test',
      title: 'Test\nBEGIN:EVIL',
      description: 'Uno,dos;',
      starts_at: '2026-10-02T23:00:00Z',
      ends_at: '2026-10-03T01:00:00Z',
      location: 'Auditorio',
    });
    expect(result).toContain('SUMMARY:Test\\nBEGIN:EVIL');
    expect(result).toContain('DTSTART:20261002T230000Z');
    expect(result).toContain('DESCRIPTION:Uno\\,dos\\;');
  });
});
