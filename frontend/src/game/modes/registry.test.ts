import { findGameMode, gameModes } from './registry';

describe('game mode registry', () => {
  it('has unique, URL-safe mode ids', () => {
    const ids = gameModes.map((mode) => mode.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('finds a mode by id', () => {
    expect(findGameMode('map-click')?.id).toBe('map-click');
  });

  it('returns undefined for an unknown or missing id', () => {
    expect(findGameMode('nope')).toBeUndefined();
    expect(findGameMode(undefined)).toBeUndefined();
  });
});
