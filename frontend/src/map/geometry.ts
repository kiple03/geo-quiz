import { geoEqualEarth, geoPath, type GeoPath, type GeoProjection } from 'd3-geo';
import type { Feature, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { WorldTopology } from '../data/types';

/** Width of the map's coordinate system (the SVG viewBox); the height follows from it. */
export const MAP_WIDTH = 1000;

/** `[[left, top], [right, bottom]]` in viewBox units. */
export type MapBounds = [[number, number], [number, number]];

/**
 * An area in degrees, `[[west, south], [east, north]]`, e.g. a region's frame. West is
 * less than east: it must not cross the antimeridian (180°).
 */
export type GeoBox = [[number, number], [number, number]];

export interface MapShape {
  /** A `Country.id`, or a neutral-land code (ADR 0002). */
  id: string;
  /** SVG path data in viewBox units. */
  d: string;
  /** Projected area in viewBox units², i.e. how big the shape looks on the map. */
  area: number;
  /** Area-weighted center, in viewBox units; where a marker for a tiny shape goes. */
  centroid: [number, number];
  /**
   * Center of the shape's largest part, in viewBox units: where the country "is" for
   * keyboard navigation (ADR 0005). Unlike `centroid`, it is not pulled away by
   * far-off parts (Alaska and Hawaii for the US, French Guiana for France).
   */
  labelPoint: [number, number];
  /** Bounds of the shape's largest part; what the map moves into view for the cursor. */
  labelBounds: MapBounds;
  bounds: MapBounds;
}

export interface MapGeometry {
  width: number;
  height: number;
  /** Outline of the whole globe, drawn as the ocean. */
  sphere: string;
  shapes: MapShape[];
}

/** Degrees between the sample points along a box edge in `projectBox`. */
const BOX_SAMPLE_STEP = 5;

/** Evenly spaced values from `a` to `b`, both included, at most `step` apart. */
function steps(a: number, b: number, step: number): number[] {
  const n = Math.max(1, Math.ceil((b - a) / step));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

interface Cached {
  geometry: MapGeometry;
  projection: GeoProjection;
}

const cache = new WeakMap<WorldTopology, Cached>();

/** A feature's largest polygon, or the feature itself if it has only one part. */
function largestPart(feature: Feature, path: GeoPath): Feature | Polygon {
  const { geometry } = feature;
  if (geometry?.type !== 'MultiPolygon') return feature;
  let largest: Polygon | null = null;
  let largestArea = -1;
  for (const coordinates of geometry.coordinates) {
    const part: Polygon = { type: 'Polygon', coordinates };
    const area = path.area(part);
    if (area > largestArea) {
      largest = part;
      largestArea = area;
    }
  }
  return largest ?? feature;
}

/**
 * Projects the world to SVG paths (Equal Earth, so countries keep their relative size).
 * The result is cached per topology, so the map and the game modes share one computation.
 */
export function getMapGeometry(world: WorldTopology): MapGeometry {
  return compute(world).geometry;
}

/**
 * The smallest viewBox bounds that contain the whole of a lon/lat box, in the same
 * projection as `getMapGeometry(world)`.
 */
export function projectBox(
  world: WorldTopology,
  [[west, south], [east, north]]: GeoBox,
): MapBounds {
  const { projection } = compute(world);
  // Meridians are curved in Equal Earth, so the corners alone are not enough: the
  // edges are sampled. Parallels are straight, so this is exact up to the step.
  const points: [number, number][] = [];
  for (const lat of steps(south, north, BOX_SAMPLE_STEP)) points.push([west, lat], [east, lat]);
  for (const lon of steps(west, east, BOX_SAMPLE_STEP)) points.push([lon, south], [lon, north]);
  const projected = points.map((p) => projection(p) ?? [0, 0]);
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
}

function compute(world: WorldTopology): Cached {
  const cached = cache.get(world);
  if (cached) return cached;

  const topology = world as unknown as Topology<{ world: GeometryCollection }>;
  const collection = feature(topology, topology.objects.world);

  const projection = geoEqualEarth().fitWidth(MAP_WIDTH, { type: 'Sphere' });
  const path = geoPath(projection);
  const [, [, bottom]] = path.bounds({ type: 'Sphere' });

  const geometry: MapGeometry = {
    width: MAP_WIDTH,
    height: Math.ceil(bottom),
    sphere: path({ type: 'Sphere' }) ?? '',
    shapes: collection.features.map((f) => {
      const main = largestPart(f, path);
      return {
        id: String(f.id),
        d: path(f) ?? '',
        area: path.area(f),
        centroid: path.centroid(f),
        labelPoint: path.centroid(main),
        labelBounds: path.bounds(main),
        bounds: path.bounds(f),
      };
    }),
  };
  const result = { geometry, projection };
  cache.set(world, result);
  return result;
}
