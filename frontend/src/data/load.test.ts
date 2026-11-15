import { fixtureCountries, fixtureGameData, fixtureWorldJson } from '../test/fixtures';
import { createGameData, datasetLoaders, requireDataset } from './load';

const files: Record<string, unknown> = {
  '/data/countries.json': fixtureCountries,
  '/data/world.topo.json': fixtureWorldJson,
};

function stubFetch(overrides: Record<string, Response> = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url in overrides) return overrides[url];
    if (url in files) return new Response(JSON.stringify(files[url]));
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('datasetLoaders', () => {
  it('loads each dataset from its own file in /data/', async () => {
    const fetchMock = stubFetch();

    expect(await datasetLoaders.countries()).toHaveLength(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/data/countries.json']);

    const world = await datasetLoaders.world();
    expect(world.objects.world.geometries).toHaveLength(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/data/countries.json',
      '/data/world.topo.json',
    ]);
  });

  it('rejects with the file name and status on an HTTP error', async () => {
    stubFetch({ '/data/world.topo.json': new Response('', { status: 503 }) });
    await expect(datasetLoaders.world()).rejects.toThrow(
      'Could not load world.topo.json (HTTP 503)',
    );
  });

  it('rejects when a file fails validation', async () => {
    stubFetch({ '/data/countries.json': new Response(JSON.stringify([{ id: 'NOR' }])) });
    await expect(datasetLoaders.countries()).rejects.toThrow(/countries.json is invalid/);
  });
});

describe('createGameData', () => {
  it('indexes the countries by id', () => {
    const data = createGameData(fixtureCountries);
    expect(data.countriesById.get('BBB')?.name).toBe('Betaland');
    expect([...data.countryIds]).toEqual(['AAA', 'BBB']);
    expect(data.datasets).toEqual({});
  });
});

describe('requireDataset', () => {
  it('returns a loaded dataset', () => {
    expect(requireDataset(fixtureGameData, 'world')).toBe(fixtureGameData.datasets.world);
  });

  it("throws a clear error when the mode didn't declare the dataset", () => {
    expect(() => requireDataset(createGameData(fixtureCountries), 'world')).toThrow(
      /"world" dataset is not loaded/,
    );
  });
});
