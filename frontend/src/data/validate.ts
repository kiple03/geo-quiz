// Explicit .ts extension: data/build.ts runs this file directly in Node, which needs it.
import type { Country } from './types.ts';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isString = (v: unknown): v is string => typeof v === 'string';

const isInRange = (v: unknown, limit: number): boolean =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;

/** [latitude, longitude], both finite and within ±90 / ±180. */
const isLatLng = (v: unknown): boolean =>
  Array.isArray(v) && v.length === 2 && isInRange(v[0], 90) && isInRange(v[1], 180);

/** Returns a list of problems with one country entry; empty when it is valid. */
function countryProblems(v: unknown): string[] {
  if (!isRecord(v)) return ['not an object'];
  const problems: string[] = [];
  const expect = (ok: boolean, field: string) => {
    if (!ok) problems.push(`invalid ${field}`);
  };

  expect(isString(v.id) && /^[A-Z]{3}$/.test(v.id), 'id');
  expect(isString(v.iso2) && /^[A-Z]{2}$/.test(v.iso2), 'iso2');
  expect(isString(v.name) && v.name.length > 0, 'name');
  expect(isString(v.officialName), 'officialName');
  expect(Array.isArray(v.capitals) && v.capitals.every(isString), 'capitals');
  expect(isString(v.region) && v.region.length > 0, 'region');
  expect(isString(v.subregion), 'subregion');
  expect(typeof v.unMember === 'boolean', 'unMember');
  expect(typeof v.independent === 'boolean', 'independent');
  expect(typeof v.area === 'number' && v.area >= 0, 'area');
  expect(isLatLng(v.latlng), 'latlng');
  return problems;
}

/**
 * Checks that `data` is a valid countries.json array and returns it typed.
 * Throws with every problem listed, so a bad regeneration is easy to diagnose.
 */
export function parseCountries(data: unknown): Country[] {
  if (!Array.isArray(data)) throw new Error('countries.json: expected an array');

  const errors = data.flatMap((entry: unknown, i) => {
    const label = isRecord(entry) && isString(entry.id) ? entry.id : `#${i}`;
    return countryProblems(entry).map((p) => `${label}: ${p}`);
  });
  if (errors.length > 0) {
    throw new Error(`countries.json is invalid:\n  ${errors.join('\n  ')}`);
  }
  return data as Country[];
}
