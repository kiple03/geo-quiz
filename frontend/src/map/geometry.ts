import { geoEqualEarth, geoPath, type GeoPath } from 'd3-geo';
import type { Feature, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { WorldTopology } from '../data/types';

/** Width of the map's coordinate system (the SVG viewBox); the height follows from it. */
export const MAP_WIDTH = 1000;

/** `[[left, top], [right, bottom]]` in viewBox units. */
export type MapBounds = [[number, number], [number, number]];

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

const cache = new WeakMap<WorldTopology, MapGeometry>();

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
  cache.set(world, geometry);
  return geometry;
}
