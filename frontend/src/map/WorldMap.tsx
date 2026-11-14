import type { WorldTopology } from '../data/types';
import { getMapGeometry, type MapShape } from './geometry';
import './WorldMap.css';

/**
 * How a shape is marked: `correct` = clicked and right, `wrong` = clicked and wrong,
 * `reveal` = the right answer, shown after a wrong click.
 */
export type MapHighlight = 'correct' | 'wrong' | 'reveal';

interface WorldMapProps {
  world: WorldTopology;
  /** Shapes the player can click. All others are drawn as neutral land. */
  clickableIds: ReadonlySet<string>;
  highlights?: Readonly<Partial<Record<string, MapHighlight>>>;
  /** Omit to make the whole map read-only (e.g. while feedback is shown). */
  onCountryClick?: (id: string) => void;
}

/**
 * The world map as SVG, one `<path>` per shape (ADR 0002). It only draws and reports
 * clicks; what a click means is up to the game mode using it.
 */
function WorldMap({ world, clickableIds, highlights = {}, onCountryClick }: WorldMapProps) {
  const { width, height, sphere, shapes } = getMapGeometry(world);

  // Highlighted shapes go last, so their outline is drawn on top of their neighbours'.
  const plain = shapes.filter((s) => !highlights[s.id]);
  const highlighted = shapes.filter((s) => highlights[s.id]);

  const renderShape = ({ id, d }: MapShape) => {
    const clickable = clickableIds.has(id);
    const highlight = highlights[id];
    const className = [
      'world-map__shape',
      clickable ? 'world-map__shape--country' : 'world-map__shape--neutral',
      clickable && onCountryClick ? 'world-map__shape--clickable' : '',
      highlight ? `world-map__shape--${highlight}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <path
        key={id}
        d={d}
        data-id={id}
        className={className}
        onClick={clickable && onCountryClick ? () => onCountryClick(id) : undefined}
      />
    );
  };

  return (
    <svg className="world-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="World map">
      <path className="world-map__ocean" d={sphere} />
      {plain.map(renderShape)}
      {highlighted.map(renderShape)}
    </svg>
  );
}

export default WorldMap;
