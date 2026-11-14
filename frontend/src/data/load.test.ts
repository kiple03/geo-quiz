import { fixtureCountries, fixtureWorldJson } from '../test/fixtures';
import { loadGameData } from './load';

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

describe('loadGameData', () => {
  it('fetches both files from /data/ and indexes countries by id', async () => {
    const fetchMock = stubFetch();
    const data = await loadGameData();

    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
      '/data/countries.json',
      '/data/world.topo.json',
    ]);
    expect(data.countries).toHaveLength(2);
    expect(data.countriesById.get('BBB')?.name).toBe('Betaland');
    expect(data.world.objects.world.geometries).toHaveLength(3);
  });

  it('rejects with the file name and status on an HTTP error', async () => {
    stubFetch({ '/data/world.topo.json': new Response('', { status: 503 }) });
    await expect(loadGameData()).rejects.toThrow('Could not load world.topo.json (HTTP 503)');
  });

  it('rejects when a file fails validation', async () => {
    stubFetch({ '/data/countries.json': new Response(JSON.stringify([{ id: 'NOR' }])) });
    await expect(loadGameData()).rejects.toThrow(/countries.json is invalid/);
  });
});
