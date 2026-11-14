import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { WorldTopology } from '../data/types';

/** Width of the map's coordinate system (the SVG viewBox); the height follows from it. */
export const MAP_WIDTH = 1000;

export interface MapShape {
  /** A `Country.id`, or a neutral-land code (ADR 0002). */
  id: string;
  /** SVG path data in viewBox units. */
  d: string;
  /** Projected area in viewBox units², i.e. how big the shape looks on the map. */
  area: number;
}

export interface MapGeometry {
  width: number;
  height: number;
  /** Outline of the whole globe, drawn as the ocean. */
  sphere: string;
  shapes: MapShape[];
}

const cache = new WeakMap<WorldTopology, MapGeometry>();

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
    shapes: collection.features.map((f) => ({
      id: String(f.id),
      d: path(f) ?? '',
      area: path.area(f),
    })),
  };
  cache.set(world, geometry);
  return geometry;
}
