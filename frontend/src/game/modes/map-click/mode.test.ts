import countriesRaw from '../../../../public/data/countries.json?raw';
import worldRaw from '../../../../public/data/world.topo.json?raw';
import { createGameData } from '../../../data/load';
import { parseCountries, parseWorld } from '../../../data/validate';
import { fixtureGameData } from '../../../test/fixtures';
import { mapClickMode } from './mode';

describe('map-click mode', () => {
  describe('questionPool with the real data', () => {
    const data = createGameData(
      parseCountries(JSON.parse(countriesRaw)),
      parseWorld(JSON.parse(worldRaw)),
    );
    const poolIds = new Set(mapClickMode.questionPool(data).map((c) => c.id));

    it('asks about every country, including the tiniest (zoom and markers)', () => {
      for (const id of ['NOR', 'BRA', 'LUX', 'SGP', 'MCO', 'VAT', 'TUV']) {
        expect(poolIds, id).toContain(id);
      }
      expect(poolIds.size).toBe(data.countries.length);
    });

    it('never includes neutral land', () => {
      for (const id of poolIds) expect(data.countryIds.has(id)).toBe(true);
    });
  });

  it('accepts only the target country as the answer', () => {
    const question = { targetId: 'AAA' };
    expect(mapClickMode.isCorrect(question, 'AAA', fixtureGameData)).toBe(true);
    expect(mapClickMode.isCorrect(question, 'BBB', fixtureGameData)).toBe(false);
  });

  it('describes a question by the name of the country asked for', () => {
    expect(mapClickMode.describeQuestion({ targetId: 'AAA' }, fixtureGameData)).toBe('Alphaland');
  });

  it('describes an answer by country name', () => {
    expect(mapClickMode.describeAnswer('BBB', fixtureGameData)).toBe('Betaland');
    expect(mapClickMode.describeAnswer('XYZ', fixtureGameData)).toBe('XYZ');
  });
});
