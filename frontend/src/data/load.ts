import type { Country, WorldTopology } from './types';
import { parseCountries, parseWorld } from './validate';

/** Everything the games need, loaded once when the app starts. */
export interface GameData {
  countries: readonly Country[];
  countriesById: ReadonlyMap<string, Country>;
  /** Ids of all countries; map shapes not in here are neutral land (ADR 0002). */
  countryIds: ReadonlySet<string>;
  world: WorldTopology;
}

/**
 * Where the data comes from: static files next to the app (ADR 0001). When the Phase 4
 * API arrives, this URL and `fetchJson` are the only things that should need to change.
 */
const DATA_URL = `${import.meta.env.BASE_URL}data/`;

async function fetchJson(file: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(DATA_URL + file, { signal });
  if (!response.ok) throw new Error(`Could not load ${file} (HTTP ${response.status})`);
  return response.json();
}

/** The display name for a country id; falls back to the id itself if it is unknown. */
export function countryName(data: GameData, id: string): string {
  return data.countriesById.get(id)?.name ?? id;
}

export function createGameData(countries: readonly Country[], world: WorldTopology): GameData {
  return {
    countries,
    countriesById: new Map(countries.map((country) => [country.id, country])),
    countryIds: new Set(countries.map((country) => country.id)),
    world,
  };
}

/** Fetches and validates all game data. Rejects with a readable message on failure. */
export async function loadGameData(signal?: AbortSignal): Promise<GameData> {
  const [countriesJson, worldJson] = await Promise.all([
    fetchJson('countries.json', signal),
    fetchJson('world.topo.json', signal),
  ]);
  return createGameData(parseCountries(countriesJson), parseWorld(worldJson));
}
