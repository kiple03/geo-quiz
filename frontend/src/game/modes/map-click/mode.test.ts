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

    it('asks about countries that are big enough to click', () => {
      for (const id of ['NOR', 'BRA', 'JPN', 'LBN']) expect(poolIds, id).toContain(id);
    });

    it('leaves out countries too small to click', () => {
      for (const id of ['VAT', 'MCO', 'LUX', 'SGP']) expect(poolIds, id).not.toContain(id);
    });

    it('never includes neutral land, and still has plenty of countries', () => {
      for (const id of poolIds) expect(data.countryIds.has(id)).toBe(true);
      expect(poolIds.size).toBeGreaterThan(150);
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
