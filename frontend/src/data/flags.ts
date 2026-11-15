/**
 * Flag rules shared by the frontend and data/build.ts (ADR 0008). The images are
 * generated: one SVG per country in public/data/flags/, named by `Country.id`.
 * Imported by Node too, so it imports nothing.
 */

/**
 * Countries with no flag image at all: Antarctica has no official flag (the source
 * shows a proposal). They get no file, and no flag is shown next to their name.
 */
export const NO_FLAG: ReadonlySet<string> = new Set(['ATA']);

/**
 * Countries whose flag is another country's, by id: the image is shown next to their
 * name, but they are left out of flag rounds, where they could not be told apart.
 * The build fails if two flag files are identical and not listed here; the French
 * tricolour versions differ in their markup only, so they are listed by hand.
 */
export const SHARED_FLAGS: Readonly<Record<string, string>> = {
  HMD: 'AUS', // Heard Island and McDonald Islands
  SHN: 'GBR', // Saint Helena, Ascension and Tristan da Cunha
  BLM: 'FRA', // Saint Barthélemy
  MAF: 'FRA', // Saint Martin
  SPM: 'FRA', // Saint Pierre and Miquelon
  WLF: 'FRA', // Wallis and Futuna
};

/**
 * Flags that look the same at the size and 4:3 shape they are shown in: never offered
 * in the same question. Similar but learnable pairs (Australia and New Zealand,
 * Ireland and Côte d'Ivoire) are allowed on purpose.
 */
export const LOOK_ALIKE_FLAGS: readonly (readonly [string, string])[] = [
  ['TCD', 'ROU'], // Chad, Romania: the same stripes, slightly different blue
  ['IDN', 'MCO'], // Indonesia, Monaco: only the proportions differ, lost at 4:3
];

/** Whether the country has a flag image to show next to its name. */
export const hasFlagImage = (id: string) => !NO_FLAG.has(id);

/** Whether the country's flag is its own, so a flag round can ask about it. */
export const hasOwnFlag = (id: string) => hasFlagImage(id) && !(id in SHARED_FLAGS);

/** Whether two countries' flags are too alike to be options in the same question. */
export const flagsLookAlike = (a: string, b: string) =>
  LOOK_ALIKE_FLAGS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
