import { zoomTransform } from 'd3-zoom';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { WorldTopology } from '../data/types';
import { getMapGeometry, projectBox, type GeoBox, type MapBounds, type MapShape } from './geometry';
import { ARROW_KEYS, nearestTo, nextInDirection } from './keyboardNav';
import { useMapZoom, type MapView } from './useMapZoom';
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

/**
 * A marker is hidden once its shape is this wide on screen (px): big enough to click by
 * itself. This also separates neighbouring markers (Saint Martin's two halves) when
 * zoomed in far enough.
 */
const MARKER_HIDE_SIZE = 5;

/** Rings are this many times a marker's radius, so a ring fits around a marker. */
const RING_SCALE = 2.5;

/** A ring is hidden once its shape is this wide on screen (px): easy to spot by itself. */
const RING_HIDE_SIZE = 24;

/** Read out by screen readers after the map's name (ADR 0005). */
const KEYBOARD_HELP =
  'Use the arrow keys to move between countries and Enter to choose one. Plus and minus zoom.';

/**
 * The country the keyboard cursor was last on. Like the zoom, it carries over to the next
 * question's map (`initialView: 'previous'`), so arrow keys continue from there.
 */
let rememberedCursor: string | null = null;

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
  /**
   * Shapes to circle, so they can be found even when tiny (e.g. the right answer after a
   * wrong click). A ring is hidden while its shape is big enough on screen to see.
   */
  ringIds?: readonly string[];
  /**
   * `'previous'` keeps the view of the last map shown (e.g. the previous question);
   * `'home'` starts on `homeArea`, or the whole map.
   */
  initialView?: 'home' | 'previous';
  /**
   * The area the map starts on (with `initialView: 'home'`) and the reset button and
   * the 0 key return to, e.g. a region. The whole map if omitted.
   */
  homeArea?: GeoBox;
  /** What to do on the map, e.g. "Find Norway". Screen readers read it with the map. */
  description?: string;
  /** How a shape is announced when the keyboard cursor moves onto it. Defaults to its id. */
  nameOf?: (id: string) => string;
  /**
   * Marks the map as where focus goes when a new question starts (`data-autofocus`,
   * see RoundView), so keyboard players can keep using the arrow keys.
   */
  focusTarget?: boolean;
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
  ringIds = [],
  initialView = 'home',
  homeArea,
  description,
  nameOf = (id) => id,
  focusTarget = false,
}: WorldMapProps) {
  const { width, height, sphere, shapes } = getMapGeometry(world);
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const descriptionId = useId();

  const shapeById = useMemo(() => new Map(shapes.map((s) => [s.id, s])), [shapes]);

  // The keyboard cursor: null until the player first presses an arrow key, so mouse
  // and touch players never see it. A remembered cursor from another map (e.g. with
  // other clickable shapes) is ignored.
  const [cursorId, setCursorId] = useState<string | null>(() =>
    initialView === 'previous' && rememberedCursor && clickableIds.has(rememberedCursor)
      ? rememberedCursor
      : null,
  );
  const [announcement, setAnnouncement] = useState('');
  // Enter or Space pressed down on the map; the answer is sent when it is released.
  const answerKeyRef = useRef<string | null>(null);
  const viewRef = useRef<MapView>({ k: 1, pixelsPerUnit: 0 });

  /**
   * Sizes markers and rings for the current view (ADR 0004). They keep the same size on
   * screen, so their radius shrinks as the map zooms in, and they are hidden once their
   * shape is big enough on screen to see and click by itself. Done here rather than in
   * CSS, because Safari does not support the CSS `r` property.
   */
  const updateOverlays = useCallback(
    (view: MapView) => {
      viewRef.current = view;
      const svg = svgRef.current;
      if (!svg) return;
      const { k, pixelsPerUnit } = view;
      // Size unknown (jsdom): treat one map unit as one pixel.
      const scale = k * (pixelsPerUnit || 1);
      const radius =
        parseFloat(getComputedStyle(svg).getPropertyValue('--marker-radius')) ||
        DEFAULT_MARKER_RADIUS;

      const overlays = [
        { selector: '.world-map__marker', idAttr: 'data-id', r: radius, hideAt: MARKER_HIDE_SIZE },
        {
          selector: '.world-map__ring',
          idAttr: 'data-ring-for',
          r: radius * RING_SCALE,
          hideAt: RING_HIDE_SIZE,
        },
      ];
      for (const { selector, idAttr, r, hideAt } of overlays) {
        for (const el of svg.querySelectorAll(selector)) {
          // How wide the shape is on screen, in px (as if it were a square).
          const area = shapeById.get(el.getAttribute(idAttr) ?? '')?.area ?? 0;
          const size = Math.sqrt(area) * scale;
          el.setAttribute('r', String(r / k));
          if (size >= hideAt) el.setAttribute('display', 'none');
          else el.removeAttribute('display');
        }
      }
    },
    [shapeById],
  );
  const zoom = useMapZoom(svgRef, layerRef, {
    width,
    height,
    initialView,
    home: homeArea && projectBox(world, homeArea),
    onZoom: updateOverlays,
  });
  // Also after every render, in case React has just added markers or rings.
  useLayoutEffect(() => updateOverlays(viewRef.current));

  // A string, so a new array with the same ids does not move the map again.
  const revealKey = revealIds?.join(',');
  useEffect(() => {
    if (!revealKey) return;
    const ids = new Set(revealKey.split(','));
    const bounds = unionBounds(shapes.filter((s) => ids.has(s.id)));
    if (bounds) zoom.reveal(bounds);
  }, [revealKey, shapes, zoom]);

  // Countries the cursor can visit: every clickable shape, at its label point.
  const navPoints = useMemo(
    () =>
      shapes
        .filter((s) => clickableIds.has(s.id))
        .map(({ id, labelPoint: [x, y] }) => ({ id, x, y })),
    [shapes, clickableIds],
  );

  const moveCursor = (id: string) => {
    setCursorId(id);
    rememberedCursor = id;
    setAnnouncement(nameOf(id));
    // The main part only: revealing all of France would zoom out to French Guiana.
    const shape = shapeById.get(id);
    if (shape) zoom.reveal(shape.labelBounds);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    // Leave browser shortcuts alone: Ctrl/Cmd with +, - or 0 zooms the page, and
    // Alt/Cmd with an arrow goes back or forward.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = ARROW_KEYS[event.key];
    if (direction) {
      event.preventDefault(); // no page scrolling
      const from = navPoints.find((p) => p.id === cursorId);
      let next;
      if (from) {
        next = nextInDirection(navPoints, from, direction);
      } else {
        // First arrow press: start at the country nearest the middle of the view.
        const [x, y] = zoomTransform(event.currentTarget).invert([width / 2, height / 2]);
        next = nearestTo(navPoints, x, y);
      }
      if (next) moveCursor(next.id);
      return;
    }
    switch (event.key) {
      case 'Enter':
      case ' ':
        // Answer on release, not here: after the answer, focus moves to the "Next
        // question" button, which would then get the auto-repeat of a held key (or,
        // for Space, possibly its release) and skip the feedback.
        event.preventDefault();
        if (!event.repeat) answerKeyRef.current = event.key;
        return;
      case '+':
      case '=':
        zoom.zoomIn();
        break;
      case '-':
        zoom.zoomOut();
        break;
      case '0':
        zoom.reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const handleKeyUp = (event: KeyboardEvent<SVGSVGElement>) => {
    // Only a key that was also pressed down here: Enter on "Next question" brings
    // focus back to the map before the key is released, and must not answer.
    if (event.key !== answerKeyRef.current) return;
    answerKeyRef.current = null;
    if (cursorId && clickableIds.has(cursorId)) onCountryClick?.(cursorId);
  };

  // Highlighted shapes go last, so their outline is drawn on top of their neighbours'.
  const plain = shapes.filter((s) => !highlights[s.id]);
  const highlighted = shapes.filter((s) => highlights[s.id]);
  const markers = shapes.filter((s) => clickableIds.has(s.id) && s.area < MARKER_MAX_AREA);
  const rings = shapes.filter((s) => ringIds.includes(s.id));
  // The cursor is an outline on the shape, plus a ring while the shape is small.
  const cursorShape = cursorId ? shapeById.get(cursorId) : undefined;

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
      label: homeArea ? 'Show the whole region' : 'Show the whole map',
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
        // An "application": screen readers pass the arrow keys to it (ADR 0005).
        role="application"
        aria-label="World map"
        aria-describedby={descriptionId}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={() => (answerKeyRef.current = null)}
        data-autofocus={focusTarget || undefined}
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
          {cursorShape && (
            // Its own outline on top of everything, so neighbours do not cover it. It
            // keeps a wrong answer's dashes (ADR 0005).
            <path
              d={cursorShape.d}
              data-cursor-for={cursorShape.id}
              className={[
                'world-map__cursor',
                highlights[cursorShape.id] && `world-map__cursor--${highlights[cursorShape.id]}`,
              ]
                .filter(Boolean)
                .join(' ')}
            />
          )}
          {rings.map(({ id, centroid: [cx, cy] }) => (
            <circle
              key={`ring-${id}`}
              cx={cx}
              cy={cy}
              data-ring-for={id}
              className={['world-map__ring', highlights[id] && `world-map__ring--${highlights[id]}`]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
          {cursorShape && (
            <circle
              key={`cursor-${cursorShape.id}`}
              cx={cursorShape.labelPoint[0]}
              cy={cursorShape.labelPoint[1]}
              data-ring-for={cursorShape.id}
              className="world-map__ring world-map__ring--cursor"
            />
          )}
        </g>
      </svg>
      <p id={descriptionId} className="visually-hidden">
        {description ? `${description}. ` : ''}
        {KEYBOARD_HELP}
      </p>
      {/* Names the country under the keyboard cursor. */}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
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
