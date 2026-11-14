import { select } from 'd3-selection';
import 'd3-transition'; // adds selection.transition(), used for animated zooms
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import type { MapBounds } from './geometry';

/**
 * How far in the map can be zoomed on a desktop-sized map, as a multiple of the
 * full-map view (ADR 0004). Deep enough that the tiniest neighbours (the two halves of
 * Saint Martin) can be told apart.
 */
export const MAX_ZOOM = 32;

/**
 * Screen pixels per map unit that `MAX_ZOOM` is meant for: a map about 1150 px wide.
 * Smaller maps (phones) may zoom further, so the deepest zoom shows the same detail on
 * every screen.
 */
const REFERENCE_PIXELS_PER_UNIT = 1.15;

/** The deepest zoom for a map drawn at `pixelsPerUnit`; 0 means "size unknown". */
export function maxZoomFor(pixelsPerUnit: number): number {
  if (pixelsPerUnit <= 0) return MAX_ZOOM;
  return MAX_ZOOM * Math.max(1, REFERENCE_PIXELS_PER_UNIT / pixelsPerUnit);
}

/** How much one press of the +/− buttons zooms. */
const BUTTON_ZOOM_STEP = 2;

/** Pointer movement (in px) after which a press counts as a drag, not a click. */
const CLICK_DISTANCE = 4;
const TAP_DISTANCE = 10;

/** Space kept around bounds that are moved into view, as a share of their size. */
const REVEAL_PADDING = 0.25;

const ANIMATION_MS = 300;

/**
 * Where the map was last looking. Modes remount their map for every question, so the
 * view is kept here and restored with `initialView: 'previous'`. Only one map is shown
 * at a time, so one remembered view is enough.
 */
let rememberedView: ZoomTransform = zoomIdentity;

export interface MapZoomControls {
  zoomIn(): void;
  zoomOut(): void;
  /** Back to the whole map. */
  reset(): void;
  /**
   * Pans, and zooms out if needed, so the bounds are in view. Does nothing if they
   * already are, and never zooms in further than the current view.
   */
  reveal(bounds: MapBounds): void;
}

/** What the map shows right now. */
export interface MapView {
  /** Zoom level, 1 = the whole map. */
  k: number;
  /** Screen pixels per map unit at zoom 1; 0 when the size is unknown (e.g. in jsdom). */
  pixelsPerUnit: number;
}

export interface MapZoomOptions {
  /** Size of the map's viewBox. */
  width: number;
  height: number;
  /** `'previous'` restores the last view of any map; `'full'` shows the whole map. */
  initialView: 'full' | 'previous';
  /** Called on every change (including each animation frame) and on resize. */
  onZoom?: (view: MapView) => void;
}

type Behavior = ZoomBehavior<SVGSVGElement, unknown>;

/** The view at zoom `k`, with map point `[x, y]` in the middle of the viewBox. */
function centeredOn([x, y]: [number, number], k: number, width: number, height: number) {
  return zoomIdentity
    .translate(width / 2, height / 2)
    .scale(k)
    .translate(-x, -y);
}

/**
 * d3-zoom's default filter (no right-click, no ctrl+drag), plus: ignore events without a
 * window. Browsers always set `view`; synthetic events (e.g. user-event in jsdom) may
 * not, and d3-zoom needs it on mousedown.
 */
function acceptsGesture(event: MouseEvent | WheelEvent | TouchEvent): boolean {
  const isWheel = event.type === 'wheel';
  const button = 'button' in event ? event.button : 0;
  return (!event.ctrlKey || isWheel) && !button && event.view != null;
}

function prefersReducedMotion(): boolean {
  // jsdom has no matchMedia; skipping the animation there keeps tests synchronous.
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Zoom and pan for an SVG map (wheel, drag, pinch, plus the returned controls), using
 * d3-zoom (ADR 0004). The transform is written straight to `layerRef`'s `transform`
 * attribute, so React does not re-render while the player pans. A drag never fires
 * `click` on the shapes, so dragging across a country does not answer the question.
 */
export function useMapZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  layerRef: RefObject<SVGGElement | null>,
  { width, height, initialView, onZoom }: MapZoomOptions,
): MapZoomControls {
  const behaviorRef = useRef<Behavior | null>(null);
  // Only the view a map starts with; changing it later does nothing.
  const initialViewRef = useRef(initialView);
  // Where a running zoom animation is heading; null when none is running.
  const pendingRef = useRef<ZoomTransform | null>(null);
  const onZoomRef = useRef(onZoom);
  // Declared before the setup effect below, so it runs first.
  useLayoutEffect(() => {
    onZoomRef.current = onZoom;
  });

  // A layout effect: the restored view must be in place before the first paint, or the
  // whole world flashes up for a frame at the start of every question.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer) return;

    const extent: MapBounds = [
      [0, 0],
      [width, height],
    ];
    let pixelsPerUnit = 0;
    const behavior = zoom<SVGSVGElement, unknown>()
      .extent(extent)
      .translateExtent(extent)
      .scaleExtent([1, MAX_ZOOM])
      .clickDistance(CLICK_DISTANCE)
      .tapDistance(TAP_DISTANCE)
      .filter(acceptsGesture)
      .on('zoom', ({ transform }: { transform: ZoomTransform }) => {
        layer.setAttribute('transform', transform.toString());
        // During an animation, keep remembering its end view (set in moveTo), so a map
        // that unmounts halfway (the next question) does not restore an in-between view.
        if (!pendingRef.current) rememberedView = transform;
        onZoomRef.current?.({ k: transform.k, pixelsPerUnit });
      });

    // The SVG keeps its aspect ratio ("meet"), so the smaller of the two scales applies.
    const measure = () => {
      const { width: w, height: h } = svg.getBoundingClientRect();
      pixelsPerUnit = Math.min(w / width, h / height) || 0;
      behavior.scaleExtent([1, maxZoomFor(pixelsPerUnit)]);
    };
    measure();

    const selection = select(svg);
    // No double-click zoom: its first click would already have answered the question.
    selection.call(behavior).on('dblclick.zoom', null);
    behavior.transform(
      selection,
      initialViewRef.current === 'previous' ? rememberedView : zoomIdentity,
    );
    behaviorRef.current = behavior;

    // jsdom has no ResizeObserver; the map size is unknown there anyway.
    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            measure();
            onZoomRef.current?.({ k: zoomTransform(svg).k, pixelsPerUnit });
          })
        : null;
    observer?.observe(svg);

    return () => {
      observer?.disconnect();
      selection.interrupt().on('.zoom', null);
      behaviorRef.current = null;
    };
  }, [svgRef, layerRef, width, height]);

  return useMemo(() => {
    const extent: MapBounds = [
      [0, 0],
      [width, height],
    ];

    /** Moves to the view `next` computes from the current one, animated if allowed. */
    const moveTo = (next: (current: ZoomTransform) => ZoomTransform | null) => {
      const svg = svgRef.current;
      const behavior = behaviorRef.current;
      if (!svg || !behavior) return;
      // Start from where a running animation is going, so pressing + three times
      // quickly zooms 2 × 2 × 2, not by whatever the animation had reached.
      const target = next(pendingRef.current ?? zoomTransform(svg));
      if (!target) return;
      // zoom.transform() skips the pan limits that gestures get, so apply them here.
      const constrained = behavior.constrain()(target, extent, extent);
      const selection = select(svg);
      if (prefersReducedMotion()) {
        pendingRef.current = null;
        behavior.transform(selection, constrained);
        return;
      }
      pendingRef.current = constrained;
      rememberedView = constrained;
      // Ends, or is cut short by a gesture, a newer animation or unmounting.
      const settle = () => {
        if (pendingRef.current === constrained) pendingRef.current = null;
      };
      const transition = selection
        .transition()
        .duration(ANIMATION_MS)
        .on('end.pending', settle)
        .on('interrupt.pending', settle);
      behavior.transform(transition, constrained);
    };

    const clampZoom = (k: number) => {
      const [min, max] = behaviorRef.current?.scaleExtent() ?? [1, MAX_ZOOM];
      return Math.min(max, Math.max(min, k));
    };

    /** Zooms by `factor`, keeping the middle of the map where it is. */
    const zoomBy = (factor: number) =>
      moveTo((t) =>
        centeredOn(t.invert([width / 2, height / 2]), clampZoom(t.k * factor), width, height),
      );

    return {
      zoomIn: () => zoomBy(BUTTON_ZOOM_STEP),
      zoomOut: () => zoomBy(1 / BUTTON_ZOOM_STEP),
      reset: () => moveTo(() => zoomIdentity),
      reveal: ([[x0, y0], [x1, y1]]) =>
        moveTo((t) => {
          const [left, top] = t.invert([0, 0]);
          const [right, bottom] = t.invert([width, height]);
          if (x0 >= left && y0 >= top && x1 <= right && y1 <= bottom) return null;

          const padX = (x1 - x0) * REVEAL_PADDING;
          const padY = (y1 - y0) * REVEAL_PADDING;
          const fit = Math.min(width / (x1 - x0 + 2 * padX), height / (y1 - y0 + 2 * padY));
          const k = clampZoom(Math.min(t.k, fit));
          return centeredOn([(x0 + x1) / 2, (y0 + y1) / 2], k, width, height);
        }),
    };
  }, [svgRef, width, height]);
}
