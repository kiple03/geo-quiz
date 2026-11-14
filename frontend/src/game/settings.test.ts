import { defaultRoundConfig } from './engine/types';
import { roundConfigFromSearch, roundSearchFor } from './settings';

const parse = (search: string) => roundConfigFromSearch('map-click', new URLSearchParams(search));

describe('roundConfigFromSearch', () => {
  it('gives the defaults without search params', () => {
    expect(parse('')).toEqual(defaultRoundConfig('map-click'));
  });

  it('reads a region by its slug, ignoring case and spaces', () => {
    expect(parse('region=europe').regions).toEqual(['Europe']);
    expect(parse('region=%20Europe%20').regions).toEqual(['Europe']);
  });

  it('reads several regions, in menu order and without repeats', () => {
    expect(parse('region=asia&region=africa&region=asia').regions).toEqual(['Africa', 'Asia']);
  });

  it('ignores unknown regions and other params, so a bad link still plays the world', () => {
    expect(parse('region=atlantis&foo=bar')).toEqual(defaultRoundConfig('map-click'));
    expect(parse('region=atlantis&region=oceania').regions).toEqual(['Oceania']);
    // Not offered as a region (ADR 0006), though it is a `Country.region` value.
    expect(parse('region=antarctic').regions).toEqual([]);
  });
});

describe('roundSearchFor', () => {
  it('writes nothing for the defaults', () => {
    expect(roundSearchFor(defaultRoundConfig('map-click'))).toBe('');
  });

  it('round-trips through the parser', () => {
    const search = roundSearchFor({ regions: ['Africa', 'Americas'] });
    expect(search).toBe('region=africa&region=americas');
    expect(parse(search).regions).toEqual(['Africa', 'Americas']);
  });
});
