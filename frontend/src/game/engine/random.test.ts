import { pickRandom, seededRng, shuffle } from './random';

describe('seededRng', () => {
  it('gives the same sequence for the same seed, in [0, 1)', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const values = Array.from({ length: 100 }, () => a());
    expect(Array.from({ length: 100 }, () => b())).toEqual(values);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gives different sequences for different seeds', () => {
    expect(seededRng(1)()).not.toBe(seededRng(2)());
  });
});

describe('shuffle', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('returns a permutation without changing the input', () => {
    const copy = [...items];
    const result = shuffle(items, seededRng(7));
    expect(items).toEqual(copy);
    expect([...result].sort((x, y) => x - y)).toEqual(items);
    expect(result).not.toEqual(items);
  });

  it('is repeatable with a seeded rng', () => {
    expect(shuffle(items, seededRng(7))).toEqual(shuffle(items, seededRng(7)));
  });
});

describe('pickRandom', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('picks the requested number of distinct items', () => {
    const picked = pickRandom(items, 3, seededRng(3));
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    for (const p of picked) expect(items).toContain(p);
  });

  it('returns at most all items, and none for a count below 1', () => {
    expect(pickRandom(items, 10, seededRng(3))).toHaveLength(5);
    expect(pickRandom(items, 0)).toEqual([]);
    expect(pickRandom(items, -1)).toEqual([]);
  });
});
