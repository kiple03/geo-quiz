# 0008. Flag images and flag modes

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

The flag modes ask about flags in both directions: a flag is shown and the player names
the country, or a country is named and the player picks its flag. They reuse the
multiple choice from [ADR 0007](0007-multiple-choice-and-datasets-per-mode.md), whose
options were plain text. Flags are also wanted next to country names in the other
modes, the results and the menu.

That needs a flag image per country, with a licence that allows committing the images,
and a size the client can afford ([ADR 0001](0001-static-data-first.md)). `Country.iso2`
was kept for this. All 237 countries have one (Kosovo is `XK`), but the data has edge
cases:

- Antarctica has no official flag.
- Some territories fly another country's flag: Heard Island and McDonald Islands
  (Australia), Saint Helena, Ascension and Tristan da Cunha (the United Kingdom, in the
  source), and Saint Barthélemy, Saint Martin, Saint Pierre and Miquelon, and Wallis
  and Futuna (France).
- Some flags look the same: Chad and Romania differ only in a shade of blue, and
  Indonesia and Monaco only in their proportions.

## Decision

- **Source: [flag-icons](https://github.com/lipis/flag-icons) (MIT), pinned exactly as
  a devDependency of `data/`.** Its SVGs are already optimised and cover every country.
  The alternative, Wikimedia SVGs (public domain, e.g. via `hampusborgos/country-flags`),
  keeps each flag's real proportions, but the files are much larger and unoptimised.
- **Format: SVG at 4:3.** All flags have the same shape, so a grid of options stays
  even. The price is that real proportions are lost: square flags (Switzerland, Vatican
  City) are drawn 4:3, and Indonesia and Monaco become the same picture.
- **Static files, not a dataset.** `data/build.ts` copies one flag per country to
  `frontend/public/data/flags/<Country.id>.svg` with flag-icons' licence, removing each
  file's root `id` (`flag-icons-no`) so that identical flags compare equal. All 236 are
  1.6 MB, but the median flag is about 0.4 KB gzipped and the largest (Serbia) 49 KB.
  The browser fetches each flag when it is first shown and caches it. A round fetches
  its flags when it starts (`GameMode.preload`), so later questions don't wait: the
  asked flags, plus every option's in "Pick the flag" (at most 40). `flagUrl(id)`
  in `data/load.ts` is the only place that knows where flags live. `Country` is
  unchanged.
- **Shown as `<img>`, never inlined.** Several flag files use internal ids (Nepal's
  `np-a`) that would clash if many were inlined on one page. `<img>` also keeps the
  flag's shapes out of the accessibility tree. `FlagImage` and `CountryFlag` in
  `src/flags/` render them; `CountryFlag` renders nothing for an id that is not a
  country, or a country without a flag.
- **The flag rules are in `src/data/flags.ts`**, shared with the build. `NO_FLAG`
  (Antarctica) gets no file and no flag anywhere. `SHARED_FLAGS` lists the territories
  above: their flag is shown next to their name, since it is the flag they fly, but
  flag rounds never ask about or offer them. The build fails if two flag files are
  identical and not covered there, or if the rules contradict each other (e.g. a shared
  flag pointing at a country without a flag of its own). The French ones differ in their markup only, so they
  were found by eye. `LOOK_ALIKE_FLAGS` (Chad and Romania, Indonesia and Monaco) are
  never options in the same question, through a new `conflicts` setting in
  `buildChoiceQuestions`. Similar but learnable pairs (Australia and New Zealand,
  Ireland and Côte d'Ivoire) are allowed on purpose.
- **Two modes: "Name the flag" (`flag-name`) and "Pick the flag" (`flag-pick`).** Their
  shared parts are in `game/choice/flagChoices.ts`. Wrong options come from the target's
  region first, as in capital mode.
- **Options can show a picture.** A `ChoiceOption` can have `content` (e.g. a flag),
  shown in place of its label, and an `askingLabel`, its accessible name while the
  question is open. In "Pick the flag" the options are "Flag 1"… while asking, and are
  named and captioned with their country once answered, so the player learns which
  flag was which.
- **A flag may go next to a country's name, but never where it would give the answer
  away.** Flags are shown in the map and capital prompts and feedback, the flag modes'
  feedback, every row of the results, and as decoration on the flag modes' menu cards
  (`GameModeInfo.previewFlags`). They are not shown next to capital options (a flag
  would say whose capital it is), the "Name the flag" options, or the "Pick the flag"
  prompt. A flag next to a name has empty alt text, so the country is not read twice.
  The asked flag in "Name the flag" is "The flag to name" until the question is
  answered.

## Consequences

- **Positive:** The flag modes download only the flags they show, and need no new
  dataset. The rules for shared and look-alike flags are in one file, checked by the
  build. A mode for other kinds of pictures can reuse `content` and `askingLabel`.
- **Negative:** The flag modes need sight. A screen reader gets a fair game (no names
  leak while asking) and every name afterwards, but cannot tell flags apart. Flags lose
  their real proportions. Someone who opens the developer tools can read the answer
  from an image's file name (and from some internal ids, e.g. `ar-a`).
- **Follow-up:** Subdivision flags (US states, Norwegian counties;
  [backlog](../backlog.md) item 2) would be their own files under their own ids.
  `CountryFlag` already renders nothing for an id that is not a country. If more
  look-alike pairs show up in play (e.g. the Netherlands and Luxembourg), they are one
  line in `LOOK_ALIKE_FLAGS`.
