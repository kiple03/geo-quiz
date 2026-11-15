# 0009. Reverse capital mode: name the country from its capital

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

[ADR 0007](0007-multiple-choice-and-datasets-per-mode.md) added "Name the capital": a
country is named and the player picks its capital. It left the reverse direction (a
capital is named, the player picks the country) as a follow-up, with one known problem:
"Kingston" is the capital of both Jamaica and Norfolk Island.

The data has three kinds of edge case for this direction:

- **A shared capital:** Kingston (Jamaica, Norfolk Island), and George Town (Cayman
  Islands) and Georgetown (Guyana), which differ only in a space. Both of the latter
  are in the Americas, so they often meet in one question.
- **Several capitals:** South Africa (Pretoria, Bloemfontein, Cape Town) is the only one.
- **Capitals that contain the country's name:** 14 countries, e.g. Mexico City, Kuwait
  City, Luxembourg, Singapore, Vatican City, Tunis (Tunisia).

## Decision

- **A separate mode, `capital-country` ("Whose capital?"), not a direction switch on
  the capital mode.** The two flag modes are split the same way (ADR 0008). Grouping
  each pair under one menu card with a "reverse" switch is a menu question, left for
  the style and layout pass (see [docs/backlog.md](../backlog.md)). Mode ids are stable,
  so grouping them later doesn't change the URLs or saved results.
- **Countries that share a capital are never options together.** `sharesCapital` in
  `capital/capitals.ts` compares all capitals of both countries, and is passed to
  `buildChoiceQuestions` as `conflicts` (ADR 0008). Capitals are compared with
  `labelKey` (game/choice), which ignores case, accents, spaces and punctuation, so
  "George Town" and "Georgetown" count as one. `pickOptions` uses the same key for
  duplicate labels, so "Name the capital" never offers both either. So when Kingston is
  asked, only one of Jamaica and Norfolk Island is offered, and the answer is checked by
  country id as in the other modes. Both are still asked. This is found from the data,
  not listed by hand, so a new shared capital is handled too. The other options considered:
  accepting either country (but then two options would both be "right") or leaving
  Kingston out (losing two questions).
- **The prompt shows the main capital** (`capitals[0]`, Pretoria for South Africa), the
  same one "Name the capital" shows as an option. The feedback and the results list all
  of them ("Pretoria (also Bloemfontein and Cape Town)").
- **Capitals that contain the country's name stay in** as easy questions. Leaving them
  out would remove 14 countries, mostly small ones that are worth learning. Capitals
  that contain _another_ country's name (Port of Spain and Spain, Tirana and Iran,
  Charlotte Amalie and Mali) are accepted as fair trick options; each pair is in
  different regions, so they rarely meet.
- **No flags on the options**, as in the other multiple-choice modes. A flag would not
  give the answer away here, but plain names keep the options easy to scan. Flags appear
  next to country names in the feedback and the results, after answering.
- **No shared capital-mode factory.** The two capital modes share the pool
  (`hasCapital`), `isCorrect` and the results text (`describeCapitalQuestion`); the
  rest differs, so a factory like `flagMode` would not save code.

## Consequences

- With the full data, wrong options come from the target's region first. Jamaica
  (Americas) and Norfolk Island (Oceania) are in different regions, so they rarely meet;
  Guyana and the Cayman Islands (both Americas) often do. Tests with four-country
  datasets cover both pairs.
- A question can have fewer than four options when the candidates run out because of
  conflicts. With the real data every region has enough.
- Questions with a capital that contains the country's name are easier than the rest.
  If that becomes a problem, a later difficulty setting could filter them out.
