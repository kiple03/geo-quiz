import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import worldRaw from '../../public/data/world.topo.json?raw';
import { parseWorld } from '../data/validate';
import { fixtureGameData } from '../test/fixtures';
import { getMapGeometry } from './geometry';
import { MAX_ZOOM, maxZoomFor } from './useMapZoom';
import WorldMap from './WorldMap';

const world = fixtureGameData.world;
const countryIds = new Set(['AAA', 'BBB']);

function shape(container: HTMLElement, id: string) {
  const el = container.querySelector(`[data-id="${id}"]`);
  if (!el) throw new Error(`no shape ${id}`);
  return el;
}

describe('WorldMap', () => {
  it('draws one path per shape plus the ocean', () => {
    const { container } = render(<WorldMap world={world} clickableIds={countryIds} />);
    expect(screen.getByRole('application', { name: 'World map' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-id]')).toHaveLength(3);
    expect(container.querySelector('.world-map__ocean')).not.toBeNull();
  });

  it('reports clicks on countries but not on neutral land', async () => {
    const user = userEvent.setup();
    const onCountryClick = vi.fn();
    const { container } = render(
      <WorldMap world={world} clickableIds={countryIds} onCountryClick={onCountryClick} />,
    );

    await user.click(shape(container, 'BBB'));
    await user.click(shape(container, 'NEU'));

    expect(onCountryClick).toHaveBeenCalledTimes(1);
    expect(onCountryClick).toHaveBeenCalledWith('BBB');
    expect(shape(container, 'NEU')).toHaveClass('world-map__shape--neutral');
    expect(shape(container, 'BBB')).toHaveClass('world-map__shape--clickable');
  });

  it('is read-only without a click handler', () => {
    const { container } = render(<WorldMap world={world} clickableIds={countryIds} />);
    expect(shape(container, 'AAA')).not.toHaveClass('world-map__shape--clickable');
  });

  it('marks highlighted shapes and draws them on top', () => {
    const { container } = render(
      <WorldMap
        world={world}
        clickableIds={countryIds}
        highlights={{ AAA: 'reveal', BBB: 'wrong' }}
      />,
    );
    expect(shape(container, 'AAA')).toHaveClass('world-map__shape--reveal');
    expect(shape(container, 'BBB')).toHaveClass('world-map__shape--wrong');

    const order = [...container.querySelectorAll('[data-id]')].map((el) =>
      el.getAttribute('data-id'),
    );
    expect(order).toEqual(['NEU', 'AAA', 'BBB']);
  });

  it('puts a clickable marker on countries too small to click, and only on those', async () => {
    const user = userEvent.setup();
    const realWorld = parseWorld(JSON.parse(worldRaw));
    const ids = new Set(['VAT', 'MCO', 'NOR']);
    const onCountryClick = vi.fn();
    const { container } = render(
      <WorldMap world={realWorld} clickableIds={ids} onCountryClick={onCountryClick} />,
    );

    const markers = [...container.querySelectorAll('circle.world-map__marker')];
    expect(markers.map((m) => m.getAttribute('data-id')).sort()).toEqual(['MCO', 'VAT']);

    await user.click(markers.find((m) => m.getAttribute('data-id') === 'VAT')!);
    expect(onCountryClick).toHaveBeenCalledWith('VAT');
  });

  it('shrinks markers as the map zooms in, so they keep their size on screen', async () => {
    const user = userEvent.setup();
    const realWorld = parseWorld(JSON.parse(worldRaw));
    const { container } = render(<WorldMap world={realWorld} clickableIds={new Set(['VAT'])} />);
    const marker = container.querySelector('.world-map__marker')!;
    expect(marker.getAttribute('r')).toBe('5');

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(marker.getAttribute('r')).toBe('1.25');
  });

  it('hides a marker once its country is big enough on screen to click by itself', async () => {
    const user = userEvent.setup();
    const realWorld = parseWorld(JSON.parse(worldRaw));
    const { container } = render(
      <WorldMap world={realWorld} clickableIds={new Set(['JEY', 'VAT'])} />,
    );
    const marker = (id: string) => container.querySelector(`.world-map__marker[data-id="${id}"]`)!;
    expect(marker('JEY')).not.toHaveAttribute('display');

    // At full zoom Jersey is several pixels wide; Vatican City still is not.
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(marker('JEY')).toHaveAttribute('display', 'none');
    expect(marker('VAT')).not.toHaveAttribute('display');
  });

  it('circles small ring shapes, but not ones that are easy to see', () => {
    const realWorld = parseWorld(JSON.parse(worldRaw));
    const { container } = render(
      <WorldMap
        world={realWorld}
        clickableIds={new Set(['LUX', 'RUS'])}
        highlights={{ LUX: 'reveal' }}
        ringIds={['LUX', 'RUS']}
      />,
    );
    const ring = (id: string) => container.querySelector(`[data-ring-for="${id}"]`)!;
    expect(ring('LUX')).toHaveClass('world-map__ring--reveal');
    expect(ring('LUX')).not.toHaveAttribute('display');
    expect(ring('RUS')).toHaveAttribute('display', 'none');
    // Rings are decoration, not extra click targets.
    expect(ring('LUX')).not.toHaveAttribute('data-id');
  });
});

/** The zoom transform d3-zoom wrote to the map layer, as x/y offset and scale. */
function view(container: HTMLElement) {
  const transform = container.querySelector('.world-map__svg > g')?.getAttribute('transform');
  const match = /translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)/.exec(transform ?? '');
  if (!match) throw new Error(`no zoom transform: ${transform}`);
  const [x, y, k] = match.slice(1).map(Number);
  return { x, y, k };
}

describe('maxZoomFor', () => {
  it('lets smaller maps zoom further, so the deepest zoom shows the same detail', () => {
    expect(maxZoomFor(0)).toBe(MAX_ZOOM);
    expect(maxZoomFor(1.15)).toBe(MAX_ZOOM);
    expect(maxZoomFor(2.3)).toBe(MAX_ZOOM);
    expect(maxZoomFor(0.375)).toBeCloseTo(MAX_ZOOM * (1.15 / 0.375));
  });
});

describe('WorldMap zoom', () => {
  const { width, height, shapes } = getMapGeometry(world);

  it('starts with the whole map and zooms with the buttons', async () => {
    const user = userEvent.setup();
    const { container } = render(<WorldMap world={world} clickableIds={countryIds} />);
    expect(view(container).k).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(view(container).k).toBe(2);
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(view(container).k).toBe(1);
    // Never further out than the whole map.
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(view(container).k).toBe(1);

    for (let i = 0; i < 10; i++) await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(view(container).k).toBe(MAX_ZOOM);

    await user.click(screen.getByRole('button', { name: 'Show the whole map' }));
    expect(view(container)).toEqual({ x: 0, y: 0, k: 1 });
  });

  it('moves revealed shapes into view, but leaves the view alone if they are visible', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <WorldMap world={world} clickableIds={countryIds} revealIds={['AAA']} />,
    );
    expect(view(container)).toEqual({ x: 0, y: 0, k: 1 });

    // Zoomed far in on the middle of the map, NEU (40–50°E) is off-screen.
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    const neu = shapes.find((s) => s.id === 'NEU')!;
    const visible = () => {
      const { x, y, k } = view(container);
      const [[x0, y0], [x1, y1]] = neu.bounds;
      return x0 >= -x / k && y0 >= -y / k && x1 <= (width - x) / k && y1 <= (height - y) / k;
    };
    expect(visible()).toBe(false);

    rerender(<WorldMap world={world} clickableIds={countryIds} revealIds={['NEU']} />);
    expect(visible()).toBe(true);
    expect(view(container).k).toBeLessThanOrEqual(MAX_ZOOM);
  });

  it("keeps the last map's view when asked to, e.g. for the next question", async () => {
    const user = userEvent.setup();
    const first = render(<WorldMap world={world} clickableIds={countryIds} />);
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    first.unmount();

    const next = render(
      <WorldMap world={world} clickableIds={countryIds} initialView="previous" />,
    );
    expect(view(next.container).k).toBe(2);
    next.unmount();

    const fresh = render(<WorldMap world={world} clickableIds={countryIds} />);
    expect(view(fresh.container).k).toBe(1);
  });

  describe('with animations (no reduced-motion preference)', () => {
    beforeEach(() => {
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }));
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('adds up quick button presses instead of restarting from mid-animation', async () => {
      const user = userEvent.setup();
      const { container } = render(<WorldMap world={world} clickableIds={countryIds} />);
      const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
      await user.click(zoomIn);
      await user.click(zoomIn);
      await user.click(zoomIn);
      await waitFor(() => expect(view(container).k).toBe(8));
    });

    it('remembers where an animation was heading if the map unmounts halfway', async () => {
      const user = userEvent.setup();
      const first = render(<WorldMap world={world} clickableIds={countryIds} />);
      await user.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(view(first.container).k).toBeLessThan(2);
      first.unmount();

      const next = render(
        <WorldMap world={world} clickableIds={countryIds} initialView="previous" />,
      );
      expect(view(next.container).k).toBe(2);
    });
  });
});

describe('WorldMap keyboard play', () => {
  const names: Record<string, string> = { AAA: 'Alphaland', BBB: 'Betaland' };
  const nameOf = (id: string) => names[id] ?? id;
  const map = () => screen.getByRole('application', { name: 'World map' });
  const cursorIds = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-cursor-for]')].map((el) =>
      el.getAttribute('data-cursor-for'),
    );

  it('is a single tab stop, with the task and the keys in its description', async () => {
    const user = userEvent.setup();
    render(<WorldMap world={world} clickableIds={countryIds} description="Find Alphaland" />);
    await user.tab();
    expect(map()).toHaveFocus();
    expect(map()).toHaveAccessibleDescription(/^Find Alphaland\. Use the arrow keys/);
    // The next tab stop is the zoom buttons, not the countries.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toHaveFocus();
  });

  it('moves a cursor with the arrow keys, announces it, and answers with Enter', async () => {
    const user = userEvent.setup();
    const onCountryClick = vi.fn();
    const { container } = render(
      <WorldMap
        world={world}
        clickableIds={countryIds}
        onCountryClick={onCountryClick}
        nameOf={nameOf}
      />,
    );
    map().focus();
    // No cursor until the first arrow key, so mouse players never see one.
    expect(cursorIds(container)).toEqual([]);

    // The first press starts at the country nearest the middle of the view (AAA, at
    // 0–10°E); neutral land (NEU) is skipped.
    await user.keyboard('{ArrowRight}');
    expect(cursorIds(container)).toEqual(['AAA']);
    expect(screen.getByText('Alphaland')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(cursorIds(container)).toEqual(['BBB']);
    expect(screen.getByText('Betaland')).toBeInTheDocument();
    // Nothing further right that is a country: the cursor stays.
    await user.keyboard('{ArrowRight}');
    expect(cursorIds(container)).toEqual(['BBB']);

    await user.keyboard('{ArrowLeft}{Enter}');
    expect(onCountryClick).toHaveBeenCalledExactlyOnceWith('AAA');
  });

  it('lets the cursor move on a read-only map, but Enter does nothing', async () => {
    const user = userEvent.setup();
    const { container } = render(<WorldMap world={world} clickableIds={countryIds} />);
    map().focus();
    await user.keyboard('{ArrowRight}{Enter} ');
    expect(cursorIds(container)).toEqual(['AAA']);
  });

  it('answers when Enter is released, once, and only if it was pressed on the map', async () => {
    const user = userEvent.setup();
    const onCountryClick = vi.fn();
    render(<WorldMap world={world} clickableIds={countryIds} onCountryClick={onCountryClick} />);
    map().focus();
    await user.keyboard('{ArrowRight}');

    // Held down (with auto-repeat): nothing until it is released, then one answer.
    await user.keyboard('{Enter>3}');
    expect(onCountryClick).not.toHaveBeenCalled();
    await user.keyboard('{/Enter}');
    expect(onCountryClick).toHaveBeenCalledExactlyOnceWith('AAA');

    // A release whose press happened elsewhere (e.g. on "Next question") is ignored.
    fireEvent.keyUp(map(), { key: 'Enter' });
    fireEvent.keyUp(map(), { key: ' ' });
    expect(onCountryClick).toHaveBeenCalledTimes(1);
  });

  it('leaves browser shortcuts with Ctrl, Cmd or Alt alone', async () => {
    const user = userEvent.setup();
    const { container } = render(<WorldMap world={world} clickableIds={countryIds} />);
    map().focus();
    await user.keyboard('{Control>}+0{/Control}{Meta>}+{/Meta}{Alt>}{ArrowRight}{/Alt}');
    expect(view(container).k).toBe(1);
    expect(cursorIds(container)).toEqual([]);
  });

  it('does not bring back a remembered cursor that this map cannot click', async () => {
    const user = userEvent.setup();
    const first = render(<WorldMap world={world} clickableIds={countryIds} />);
    map().focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(cursorIds(first.container)).toEqual(['BBB']);
    first.unmount();

    const other = render(
      <WorldMap world={world} clickableIds={new Set(['AAA'])} initialView="previous" />,
    );
    expect(cursorIds(other.container)).toEqual([]);
  });

  it('zooms with +, - and 0', async () => {
    const user = userEvent.setup();
    const { container } = render(<WorldMap world={world} clickableIds={countryIds} />);
    map().focus();
    await user.keyboard('++');
    expect(view(container).k).toBe(4);
    await user.keyboard('-');
    expect(view(container).k).toBe(2);
    await user.keyboard('0');
    expect(view(container).k).toBe(1);
  });
});
