# Data

Generates the country dataset used by the game. The output is static data committed to
`frontend/public/data/` and loaded by the frontend with `fetch` — see
[ADR 0001](../docs/decisions/0001-static-data-first.md) and
[ADR 0002](../docs/decisions/0002-map-click-core-mode.md).

## Running

Requires Node.js 24 (it runs `build.ts` directly, without a compile step).

```sh
cd data
npm install
npm run build       # writes frontend/public/data/, prints output sizes
npm run typecheck   # tsc --noEmit
```

Sources are downloaded once into `data/.cache/` (git-ignored). Delete that folder to
download them again. Commit the regenerated files in `frontend/public/data/`.

## Output

| File              | Contents                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| `countries.json`  | One entry per country on the map: id, names, capitals, region, area, …       |
| `world.topo.json` | TopoJSON, object `world`. Each geometry's `id` matches a `countries.json` id |

Shapes whose `id` is not in `countries.json` are neutral land (e.g. Somaliland): drawn,
but never asked about. Territories without a Natural Earth shape (e.g. Gibraltar,
Réunion) are not in the dataset.

## Sources and licenses

| Source                                                                     | Used for         | License                                                |
| -------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------ |
| [Natural Earth](https://www.naturalearthdata.com/) 1:50m admin-0, `v5.1.2` | Country shapes   | Public domain                                          |
| [mledoze/countries](https://github.com/mledoze/countries), pinned commit   | Country metadata | [ODbL](https://opendatacommons.org/licenses/odbl/1-0/) |

Versions are pinned at the top of `build.ts`.

## When the build fails

The script stops if a shape can't be matched to metadata, or a UN member has no shape.
Fix it in `build.ts` by adding the code to `NE_TO_CCA3` (the two sources use different
codes for the same country) or to `NEUTRAL_LAND` (a shape that should not be asked about).
