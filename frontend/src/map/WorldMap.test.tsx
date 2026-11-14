import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fixtureGameData } from '../test/fixtures';
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
    expect(screen.getByRole('img', { name: 'World map' })).toBeInTheDocument();
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
});
