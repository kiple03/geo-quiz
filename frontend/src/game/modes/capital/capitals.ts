import type { GameData } from '../../../data/load';
import type { Country } from '../../../data/types';

/**
 * Countries that can be asked about: those with a capital. Not Antarctica, Heard Island
 * and McDonald Islands, or Macau.
 */
export const hasCapital = (country: Country) => country.capitals.length > 0;

/**
 * The capital an option shows. For South Africa that is Pretoria, the first of its three:
 * an option listing all three would stand out and give the answer away.
 */
export const mainCapital = (country: Country) => country.capitals[0] ?? '';

/** All of a country's capitals, e.g. "Pretoria (also Bloemfontein and Cape Town)". */
export function capitalsText(country: Country): string {
  const [first, ...others] = country.capitals;
  if (others.length === 0) return first ?? '';
  const rest =
    others.length === 1 ? others[0] : `${others.slice(0, -1).join(', ')} and ${others.at(-1)}`;
  return `${first} (also ${rest})`;
}

/** The capital shown for a country id, as in the options; the id itself if unknown. */
export function capitalOf(data: GameData, id: string): string {
  const country = data.countriesById.get(id);
  return country ? mainCapital(country) : id;
}
