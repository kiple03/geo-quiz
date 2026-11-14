import type { GeoBox } from '../map/geometry';

/** A region the player can limit a round to (ADR 0006). */
export interface Region {
  /** The `Country.region` value it stands for, as stored in `RoundConfig.regions`. */
  name: string;
  /** Used in the URL, e.g. `?region=europe`. */
  slug: string;
  /** What the menu and the game screen show. */
  label: string;
  /**
   * Where the map starts, in degrees. Picked by hand rather than computed from the
   * countries: Russia (Europe) reaches the Pacific, France and Norway have far-off
   * parts, and Oceania crosses the antimeridian.
   */
  frame: GeoBox;
}

/**
 * The regions offered in the menu, in menu order. Antarctic (4 entries) is left out: a
 * 4-question round would feel broken, so those entries are only asked in world rounds.
 */
export const REGIONS: readonly Region[] = [
  // Reaches 75°E for the British Indian Ocean Territory.
  {
    name: 'Africa',
    slug: 'africa',
    label: 'Africa',
    frame: [
      [-26, -36],
      [75, 38],
    ],
  },
  {
    name: 'Americas',
    slug: 'americas',
    label: 'Americas',
    frame: [
      [-170, -56],
      [-30, 84],
    ],
  },
  {
    name: 'Asia',
    slug: 'asia',
    label: 'Asia',
    frame: [
      [25, -11],
      [150, 56],
    ],
  },
  // Russia's main part goes on to the Pacific; the frame shows its European side.
  {
    name: 'Europe',
    slug: 'europe',
    label: 'Europe',
    frame: [
      [-25, 34],
      [50, 72],
    ],
  },
  // Stops at 180°: the islands east of it (Samoa, Tonga, French Polynesia, ...) are at
  // the far left of the map. A projection centred on the Pacific is backlog item 2.
  {
    name: 'Oceania',
    slug: 'oceania',
    label: 'Oceania',
    frame: [
      [110, -48],
      [180, 22],
    ],
  },
];

export function findRegionBySlug(slug: string): Region | undefined {
  const wanted = slug.trim().toLowerCase();
  return REGIONS.find((region) => region.slug === wanted);
}

export function findRegionByName(name: string): Region | undefined {
  return REGIONS.find((region) => region.name === name);
}

/** How a round's regions read, e.g. "Europe" or "Africa, Asia"; null for the world. */
export function regionsLabel(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  return names.map((name) => findRegionByName(name)?.label ?? name).join(', ');
}

/**
 * The area the map starts on for these regions: one frame, or the box around several.
 * Undefined for the whole world, or if a region has no frame.
 */
export function regionsFrame(names: readonly string[]): GeoBox | undefined {
  const frames = names.map((name) => findRegionByName(name)?.frame);
  if (frames.length === 0 || frames.some((frame) => !frame)) return undefined;
  return (frames as GeoBox[]).reduce(([[w0, s0], [e0, n0]], [[w1, s1], [e1, n1]]): GeoBox => [
    [Math.min(w0, w1), Math.min(s0, s1)],
    [Math.max(e0, e1), Math.max(n0, n1)],
  ]);
}
