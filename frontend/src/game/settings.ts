import { defaultRoundConfig, type RoundConfig } from './engine/types';
import { findRegionByName, findRegionBySlug, REGIONS } from './regions';

/**
 * Round settings in the URL (ADR 0006), so a round can be linked, e.g.
 * `/play/map-click?region=europe`. Only settings that differ from the defaults are
 * written. New settings (question count, ...) are read and written here.
 */

const REGION_PARAM = 'region';

/**
 * The config for a round of `modeId`: the defaults, with whatever the URL sets. Bad
 * values are ignored, so a broken link still starts a round (on the whole world).
 */
export function roundConfigFromSearch(modeId: string, params: URLSearchParams): RoundConfig {
  const config = defaultRoundConfig(modeId);
  const chosen = new Set(
    params.getAll(REGION_PARAM).flatMap((slug) => findRegionBySlug(slug)?.name ?? []),
  );
  // In menu order, so `?region=asia&region=africa` is the same round as the reverse.
  const regions = REGIONS.map((region) => region.name).filter((name) => chosen.has(name));
  return { ...config, regions };
}

/** The search params that give `config` (without "?"); empty for the defaults. */
export function roundSearchFor(config: Pick<RoundConfig, 'regions'>): string {
  const params = new URLSearchParams();
  for (const name of config.regions) {
    const region = findRegionByName(name);
    if (region) params.append(REGION_PARAM, region.slug);
  }
  return params.toString();
}
