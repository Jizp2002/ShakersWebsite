import { describe, it, expect } from 'vitest';
import { connectionSettings } from '../src/lib/connection';
describe('production connection', () => {
  it('does not turn a missing or partial backend into demo access', () => {
    for (const [url, key] of [
      [undefined, undefined],
      ['https://example.supabase.co', undefined],
      [undefined, 'public-key'],
    ]) {
      expect(connectionSettings(url, key, 'false')).toEqual({
        connected: false,
        isDemo: false,
        configError: true,
      });
      expect(connectionSettings(url, key, undefined).isDemo).toBe(false);
    }
  });
  it('only allows intentionally isolated fixtures and prefers a real connection', () => {
    expect(connectionSettings('', '', 'true')).toEqual({
      connected: false,
      isDemo: true,
      configError: false,
    });
    expect(connectionSettings('https://example.supabase.co', 'public-key', 'true')).toEqual({
      connected: true,
      isDemo: false,
      configError: false,
    });
    expect(connectionSettings('https://example.supabase.co', '', 'true').configError).toBe(true);
  });
});
