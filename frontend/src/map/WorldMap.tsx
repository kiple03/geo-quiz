import { zoomTransform } from 'd3-zoom';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { WorldTopology } from '../data/types';
import { getMapGeometry, type MapBounds, type MapShape } from './geometry';
import { useMapZoom } from './useMapZoom';
import './WorldMap.css';

/**
 * How a shape is marked: `correct` = clicked and right, `wrong` = clicked and wrong,
 * `reveal` = the right answer, shown after a wrong click. `past-correct` and
 * `past-wrong` are softer versions for earlier answers that stay on the map.
 */
export type MapHighlight = 'correct' | 'wrong' | 'reveal' | 'past-correct' | 'past-wrong';

/** Smallest shape (viewBox units², about px² on a desktop screen) that is easy to hit. */
const MIN_CLICKABLE_AREA = 5;
/** Zoom level a player can be expected to reach without hunting for a country. */
const MARKER_ZOOM = 8;

/**
 * Clickable shapes smaller than this also get a round marker: even at `MARKER_ZOOM`
 * they would be under `MIN_CLICKABLE_AREA`. That covers microstates and small islands
 * such as Vatican City, Monaco and Tuvalu (ADR 0004).
 */
export const MARKER_MAX_AREA = MIN_CLICKABLE_AREA / MARKER_ZOOM ** 2;

/** Marker radius in viewBox units, unless CSS sets `--marker-radius` on the map. */
const DEFAULT_MARKER_RADIUS = 5;

interface WorldMapProps {
  world: WorldTopology;
  /** Shapes the player can click. All others are drawn as neutral land. */
  clickableIds: ReadonlySet<string>;
  highlights?: Readonly<Partial<Record<string, MapHighlight>>>;
  /** Omit to make the whole map read-only (e.g. while feedback is shown). */
  onCountryClick?: (id: string) => void;
  /**
   * Shapes to bring into view, e.g. the right answer after a wrong click. The map pans,
   * and zooms out if needed, whenever this list changes.
   */
  revealIds?: readonly string[];
  /** `'previous'` keeps the view of the last map shown (e.g. the previous question). */
  initialView?: 'full' | 'previous';
}

/** The smallest bounds that contain all the given shapes, or null if there are none. */
function unionBounds(shapes: readonly MapShape[]): MapBounds | null {
  if (shapes.length === 0) return null;
  return shapes.reduce<MapBounds>(
    ([[x0, y0], [x1, y1]], { bounds: [[a0, b0], [a1, b1]] }) => [
      [Math.min(x0, a0), Math.min(y0, b0)],
      [Math.max(x1, a1), Math.max(y1, b1)],
    ],
    shapes[0].bounds,
  );
}

/**
 * The world map as SVG, one `<path>` per shape (ADR 0002), with zoom and pan (ADR 0004).
 * It only draws and reports clicks; what a click means is up to the game mode using it.
 */
function WorldMap({
  world,
  clickableIds,
  highlights = {},
  onCountryClick,
  revealIds,
  initialView = 'full',
}: WorldMapProps) {
  const { width, height, sphere, shapes } = getMapGeometry(world);
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);

  // Markers keep the same size on screen: their radius shrinks as the map zooms in. Set
  // here rather than with the CSS `r` property, which Safari does not support.
  const sizeMarkers = useCallback((k: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const radius =
      parseFloat(getComputedStyle(svg).getPropertyValue('--marker-radius')) ||
      DEFAULT_MARKER_RADIUS;
    for (const marker of svg.querySelectorAll('.world-map__marker')) {
      marker.setAttribute('r', String(radius / k));
    }
  }, []);
  const zoom = useMapZoom(svgRef, layerRef, { width, height, initialView, onZoom: sizeMarkers });
  // Also after every render, in case React has just added markers.
  useLayoutEffect(() => {
    if (svgRef.current) sizeMarkers(zoomTransform(svgRef.current).k);
  });

  // A string, so a new array with the same ids does not move the map again.
  const revealKey = revealIds?.join(',');
  useEffect(() => {
    if (!revealKey) return;
    const ids = new Set(revealKey.split(','));
    const bounds = unionBounds(shapes.filter((s) => ids.has(s.id)));
    if (bounds) zoom.reveal(bounds);
  }, [revealKey, shapes, zoom]);

  // Highlighted shapes go last, so their outline is drawn on top of their neighbours'.
  const plain = shapes.filter((s) => !highlights[s.id]);
  const highlighted = shapes.filter((s) => highlights[s.id]);
  const markers = shapes.filter((s) => clickableIds.has(s.id) && s.area < MARKER_MAX_AREA);

  const classesFor = (id: string, base: string) => {
    const clickable = clickableIds.has(id);
    const highlight = highlights[id];
    return [
      base,
      clickable ? 'world-map__shape--country' : 'world-map__shape--neutral',
      clickable && onCountryClick ? 'world-map__shape--clickable' : '',
      highlight ? `world-map__shape--${highlight}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const controls = [
    { label: 'Zoom in', action: zoom.zoomIn, icon: 'M8 3v10M3 8h10' },
    { label: 'Zoom out', action: zoom.zoomOut, icon: 'M3 8h10' },
    {
      label: 'Show the whole map',
      action: zoom.reset,
      icon: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4',
    },
  ];

  const clickHandler = (id: string) =>
    clickableIds.has(id) && onCountryClick ? () => onCountryClick(id) : undefined;

  const renderShape = ({ id, d }: MapShape) => (
    <path
      key={id}
      d={d}
      data-id={id}
      className={classesFor(id, 'world-map__shape')}
      onClick={clickHandler(id)}
    />
  );

  return (
    <div className="world-map">
      <svg
        ref={svgRef}
        className="world-map__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="World map"
      >
        {/* d3-zoom sets this group's transform; React never does. */}
        <g ref={layerRef}>
          <path className="world-map__ocean" d={sphere} />
          {plain.map(renderShape)}
          {highlighted.map(renderShape)}
          {markers.map(({ id, centroid: [cx, cy] }) => (
            <circle
              key={id}
              cx={cx}
              cy={cy}
              data-id={id}
              className={classesFor(id, 'world-map__shape world-map__marker')}
              onClick={clickHandler(id)}
            />
          ))}
        </g>
      </svg>
      <div className="world-map__controls" role="group" aria-label="Map zoom">
        {controls.map(({ label, action, icon }) => (
          <button
            key={label}
            type="button"
            className="world-map__control"
            aria-label={label}
            title={label}
            onClick={action}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d={icon} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export default WorldMap;
