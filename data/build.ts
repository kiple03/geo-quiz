/**
 * Generates the static country dataset for the frontend (ADR 0001, ADR 0002).
 *
 * Inputs (pinned, downloaded once into .cache/):
 *   - Natural Earth 1:50m admin-0 countries (geometry, public domain)
 *   - mledoze/countries (metadata, ODbL)
 *
 * Outputs (committed):
 *   - frontend/public/data/countries.json  — metadata, one entry per country on the map
 *   - frontend/public/data/world.topo.json — simplified TopoJSON, geometry id = country id
 *
 * Run with: npm run build (from data/)
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import mapshaper from 'mapshaper';
// Shared with the frontend, so the output and the app agree on one schema.
import type { Country } from '../frontend/src/data/types.ts';
import { parseCountries } from '../frontend/src/data/validate.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const NATURAL_EARTH_VERSION = 'v5.1.2';
const MLEDOZE_COMMIT = 'fa4f62182d19ff4f8b325cde6387c9cd9d80955a';

const SOURCES = {
  naturalEarth: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_VERSION}/geojson/ne_50m_admin_0_countries.geojson`,
  mledoze: `https://raw.githubusercontent.com/mledoze/countries/${MLEDOZE_COMMIT}/countries.json`,
};

/** Natural Earth ADM0_A3 codes that differ from mledoze's cca3. */
const NE_TO_CCA3: Record<string, string> = {
  SDS: 'SSD', // South Sudan
  SAH: 'ESH', // Western Sahara
  KOS: 'UNK', // Kosovo
  PSX: 'PSE', // Palestine
  ALD: 'ALA', // Åland Islands
};

/** Shapes with no metadata. Drawn as neutral land, never asked about (ADR 0002). */
const NEUTRAL_LAND = new Set([
  'SOL', // Somaliland
  'CYN', // Northern Cyprus
  'KAS', // Siachen Glacier
  'IOA', // Indian Ocean Territories
  'ATC', // Ashmore and Cartier Islands
]);

/** Percentage of vertices mapshaper keeps. Lower = smaller file, coarser borders. */
const SIMPLIFY_PERCENT = 10;

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE_DIR = path.join(import.meta.dirname, '.cache');
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'data');

// ---------------------------------------------------------------------------
// Source types (only the fields we use)
// ---------------------------------------------------------------------------

interface MledozeCountry {
  cca2: string;
  cca3: string;
  name: { common: string; official: string };
  capital?: string[];
  region: string;
  subregion?: string;
  independent?: boolean | null;
  unMember: boolean;
  area: number;
  latlng: [number, number];
}

interface GeoFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: unknown;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * Returns the parsed JSON at `url`, cached in .cache/. A download is only cached once it
 * parses, and is written via a temp file, so a failed or partial download is never
 * cached.
 */
async function download<T>(name: string, url: string): Promise<T> {
  const file = path.join(CACHE_DIR, name);
  if (existsSync(file)) {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  }

  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`Download is not valid JSON: ${url}`);
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(`${file}.tmp`, text);
  await rename(`${file}.tmp`, file);
  return data;
}

function toCountry(c: MledozeCountry): Country {
  return {
    id: c.cca3,
    iso2: c.cca2,
    name: c.name.common,
    officialName: c.name.official,
    capitals: c.capital ?? [],
    region: c.region,
    subregion: c.subregion ?? '',
    unMember: c.unMember,
    independent: c.independent ?? false,
    area: c.area,
    latlng: c.latlng,
  };
}

/**
 * Matches shapes to metadata. Returns the countries, plus a new collection whose
 * features carry only an `id` (the country's cca3, or the NE code for neutral land).
 * Fails loudly if a shape or a UN member can't be matched. Does not modify `world`.
 */
function join(world: FeatureCollection, metadata: MledozeCountry[]) {
  const byCca3 = new Map(metadata.map((c) => [c.cca3, c]));
  const countries: Country[] = [];
  const shapes: GeoFeature[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];

  for (const feature of world.features) {
    const neCode = String(feature.properties.ADM0_A3);
    const neName = String(feature.properties.NAME);
    const withId = (id: string): GeoFeature => ({ ...feature, properties: { id } });

    if (NEUTRAL_LAND.has(neCode)) {
      shapes.push(withId(neCode));
      continue;
    }

    const cca3 = NE_TO_CCA3[neCode] ?? neCode;
    const meta = byCca3.get(cca3);
    if (!meta) {
      errors.push(`Shape ${neCode} (${neName}) has no metadata. Add an alias or mark it neutral.`);
      continue;
    }
    if (seen.has(cca3)) {
      errors.push(`Country ${cca3} matched more than one shape (again at ${neCode}).`);
      continue;
    }
    seen.add(cca3);
    shapes.push(withId(cca3));
    countries.push(toCountry(meta));
  }

  for (const c of metadata) {
    if (c.unMember && !seen.has(c.cca3)) {
      errors.push(`UN member ${c.cca3} (${c.name.common}) has no shape.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Join failed:\n  ${errors.join('\n  ')}`);
  }

  countries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const shapesCollection: FeatureCollection = { type: 'FeatureCollection', features: shapes };
  return { countries, shapes: shapesCollection };
}

/** Simplifies the shapes and returns TopoJSON with each geometry's id at top level only. */
async function toTopoJson(world: FeatureCollection): Promise<string> {
  const output = await mapshaper.applyCommands(
    [
      '-i world.geojson',
      `-simplify ${SIMPLIFY_PERCENT}% keep-shapes`,
      '-o world.topo.json format=topojson id-field=id quantization=100000',
    ].join(' '),
    { 'world.geojson': world },
  );
  const raw = output['world.topo.json'];
  const topo = JSON.parse(typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8'));

  // id-field copies `id` to the top level; drop the now-redundant properties.
  for (const geometry of topo.objects.world.geometries) delete geometry.properties;
  return JSON.stringify(topo);
}

function sizeReport(name: string, content: string): string {
  const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
  return `${name}: ${kb(Buffer.byteLength(content))} (${kb(gzipSync(content).length)} gzipped)`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const world = await download<FeatureCollection>(
  `ne_50m_admin_0_countries.${NATURAL_EARTH_VERSION}.geojson`,
  SOURCES.naturalEarth,
);
const metadata = await download<MledozeCountry[]>(
  `mledoze-countries.${MLEDOZE_COMMIT.slice(0, 7)}.json`,
  SOURCES.mledoze,
);

const { countries, shapes } = join(world, metadata);
parseCountries(countries); // the same check the frontend applies; throws if invalid
const countriesJson = JSON.stringify(countries, null, 2) + '\n';
const topoJson = await toTopoJson(shapes);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, 'countries.json'), countriesJson);
await writeFile(path.join(OUT_DIR, 'world.topo.json'), topoJson);

console.log(
  `Countries: ${countries.length} (${countries.filter((c) => c.unMember).length} UN members)`,
);
console.log(`Neutral land shapes: ${NEUTRAL_LAND.size}`);
console.log(sizeReport('countries.json', countriesJson));
console.log(sizeReport('world.topo.json', topoJson));
