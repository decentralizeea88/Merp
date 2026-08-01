import { describe, expect, it } from 'vitest';
import { runMigrations, SCHEMA_VERSION } from '../src/core/storage';

describe('storage migrations', () => {
  it('carries a current-version save through unchanged', () => {
    const save = {
      version: SCHEMA_VERSION,
      records: { 'sliding:harag:4': { completed: true, bestTimeMs: 61000, bestMoves: 80, mastery: false } },
      unlocked: ['harag'],
      current: null,
      settings: { theme: 'dark', sound: false, reduceMotion: true },
      daily: { lastPlayedKey: '2017-01-01', streak: 3 },
    };
    const out = runMigrations(save as unknown as Record<string, unknown>);
    expect(out.unlocked).toEqual(['harag']);
    expect(out.settings.theme).toBe('dark');
    expect(out.records['sliding:harag:4']?.bestMoves).toBe(80);
  });

  it('resets an unknown or future version to defaults instead of corrupting', () => {
    const out = runMigrations({ version: 999, unlocked: ['x'] });
    expect(out.version).toBe(SCHEMA_VERSION);
  });

  it('resets a versionless blob to defaults', () => {
    const out = runMigrations({ junk: true });
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.unlocked).toEqual([]);
    expect(out.settings.theme).toBe('system');
  });
});
