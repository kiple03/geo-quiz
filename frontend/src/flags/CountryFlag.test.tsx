import { render } from '@testing-library/react';
import { createGameData } from '../data/load';
import { fixtureCountries } from '../test/fixtures';
import CountryFlag, { FlagImage } from './CountryFlag';

const data = createGameData([
  ...fixtureCountries,
  { ...fixtureCountries[0], id: 'ATA', name: 'Antarctica' },
]);

describe('CountryFlag', () => {
  it('shows a decorative flag by default', () => {
    const { container } = render(<CountryFlag data={data} id="AAA" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', expect.stringMatching(/flags\/AAA\.svg$/));
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveClass('flag', 'flag--inline');
  });

  it('takes alt text and a size', () => {
    const { getByRole } = render(
      <CountryFlag data={data} id="AAA" alt="The flag to name" size="large" />,
    );
    expect(getByRole('img', { name: 'The flag to name' })).toHaveClass('flag--large');
  });

  it('renders nothing for a country without a flag, or an id that is not a country', () => {
    expect(render(<CountryFlag data={data} id="ATA" />).container).toBeEmptyDOMElement();
    expect(render(<CountryFlag data={data} id="US-CA" />).container).toBeEmptyDOMElement();
    expect(render(<FlagImage id="ATA" />).container).toBeEmptyDOMElement();
  });
});
