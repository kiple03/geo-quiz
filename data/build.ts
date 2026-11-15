/**
 * Generates the static country dataset for the frontend (ADR 0001, ADR 0002).
 *
 * Inputs (pinned, downloaded once into .cache/):
 *   - Natural Earth 1:50m admin-0 countries (geometry, public domain)
 *   - mledoze/countries (metadata, ODbL)
 *   - flag-icons, an exact npm devDependency (flag SVGs, MIT; ADR 0008)
 *
 * Outputs (committed):
 *   - frontend/public/data/countries.json  — metadata, one entry per country on the map
 *   - frontend/public/data/world.topo.json — simplified TopoJSON, geometry id = country id
 *   - frontend/public/data/flags/<id>.svg  — one 4:3 flag per country, plus LICENSE.txt
 *
 * Run with: npm run build (from data/)
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import mapshaper from 'mapshaper';
// Shared with the frontend, so the output and the app agree on one schema.
import type { Country } from '../frontend/src/data/types.ts';
import { parseCountries, parseWorld } from '../frontend/src/data/validate.ts';
import { LOOK_ALIKE_FLAGS, NO_FLAG, SHARED_FLAGS } from '../frontend/src/data/flags.ts';

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

/**
 * Percentage of vertices mapshaper keeps. Lower = smaller file, coarser borders. 30 keeps
 * borders sharp up to about 16x zoom (ADR 0004) at ~90 KB gzipped.
 */
const SIMPLIFY_PERCENT = 30;

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE_DIR = path.join(import.meta.dirname, '.cache');
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'data');
const FLAGS_OUT_DIR = path.join(OUT_DIR, 'flags');
/** flag-icons' 4:3 SVGs, named by lower-case ISO alpha-2 code (the version is in package.json). */
const FLAG_ICONS_DIR = path.join(import.meta.dirname, 'node_modules', 'flag-icons');

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

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

function sizeReport(name: string, content: string): string {
  return `${name}: ${kb(Buffer.byteLength(content))} (${kb(gzipSync(content).length)} gzipped)`;
}

/** Problems with the rules in flags.ts: unknown ids, or rules that contradict each other. */
function flagRuleProblems(ids: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const ruleIds = [
    ...NO_FLAG,
    ...Object.keys(SHARED_FLAGS),
    ...Object.values(SHARED_FLAGS),
    ...LOOK_ALIKE_FLAGS.flat(),
  ];
  for (const id of new Set(ruleIds)) {
    if (!ids.has(id)) errors.push(`The flag rules in flags.ts name ${id}, which is not a country.`);
  }
  for (const [id, source] of Object.entries(SHARED_FLAGS)) {
    if (NO_FLAG.has(id)) errors.push(`${id} is in both NO_FLAG and SHARED_FLAGS.`);
    // The flag is someone's own: the source must be asked in flag rounds itself.
    if (NO_FLAG.has(source) || source in SHARED_FLAGS) {
      errors.push(`SHARED_FLAGS: ${id} points at ${source}, which has no flag of its own.`);
    }
  }
  for (const id of LOOK_ALIKE_FLAGS.flat()) {
    if (NO_FLAG.has(id) || id in SHARED_FLAGS) {
      errors.push(`LOOK_ALIKE_FLAGS names ${id}, which is never in a flag round.`);
    }
  }
  return errors;
}

/**
 * One flag per country, by `Country.id`, except NO_FLAG (ADR 0008). Fails if a country
 * has no flag, if the flag rules are inconsistent, or if two flags are identical and
 * not in SHARED_FLAGS (a flag round could not tell them apart). Only byte-identical
 * files are caught: flags drawn with different markup (France and its territories)
 * must be listed by hand. Returns the files to write.
 */
async function buildFlags(countries: Country[]): Promise<Map<string, string>> {
  const errors = flagRuleProblems(new Set(countries.map((c) => c.id)));

  const files = new Map<string, string>();
  const byContent = new Map<string, string[]>();
  for (const country of countries) {
    if (NO_FLAG.has(country.id)) continue;
    const source = path.join(FLAG_ICONS_DIR, 'flags', '4x3', `${country.iso2.toLowerCase()}.svg`);
    if (!existsSync(source)) {
      errors.push(`${country.id} (${country.name}) has no flag. Add it to NO_FLAG in flags.ts.`);
      continue;
    }
    // Each file's root has its own id (`flag-icons-no`); without it, flags that are the
    // same picture compare equal. Not to hide the country: the file name and some
    // internal ids (`ar-a`) still name it.
    const raw = await readFile(source, 'utf8');
    const svg = raw.replace(/ id="flag-icons-[a-z-]+"/, '');
    if (svg === raw) {
      errors.push(`${source} has no flag-icons root id. Did its format change?`);
      continue;
    }
    files.set(`${country.id}.svg`, svg);
    byContent.set(svg, [...(byContent.get(svg) ?? []), country.id]);
  }

  for (const same of byContent.values()) {
    const own = same.filter((id) => !(id in SHARED_FLAGS));
    if (same.length > 1 && own.length > 1) {
      errors.push(`Identical flags: ${same.join(', ')}. List all but one in SHARED_FLAGS.`);
    }
  }

  if (errors.length > 0) throw new Error(`Flags failed:\n  ${errors.join('\n  ')}`);
  // MIT: the licence goes with the copies.
  files.set('LICENSE.txt', await readFile(path.join(FLAG_ICONS_DIR, 'LICENSE'), 'utf8'));
  return files;
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
parseWorld(JSON.parse(topoJson)); // likewise for the map; throws if invalid
const flags = await buildFlags(countries);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, 'countries.json'), countriesJson);
await writeFile(path.join(OUT_DIR, 'world.topo.json'), topoJson);
// Rewritten from scratch, so a flag that is no longer needed does not linger.
await rm(FLAGS_OUT_DIR, { recursive: true, force: true });
await mkdir(FLAGS_OUT_DIR);
for (const [name, content] of flags) await writeFile(path.join(FLAGS_OUT_DIR, name), content);

console.log(
  `Countries: ${countries.length} (${countries.filter((c) => c.unMember).length} UN members)`,
);
console.log(`Neutral land shapes: ${NEUTRAL_LAND.size}`);
console.log(sizeReport('countries.json', countriesJson));
console.log(sizeReport('world.topo.json', topoJson));
const svgs = [...flags].filter(([name]) => name.endsWith('.svg')).map(([, svg]) => svg);
const largest = Math.max(...svgs.map((svg) => gzipSync(svg).length));
console.log(
  `flags/: ${svgs.length} SVGs, ${kb(svgs.reduce((sum, svg) => sum + Buffer.byteLength(svg), 0))}` +
    ` (largest ${kb(largest)} gzipped; loaded one by one, when shown)`,
);
