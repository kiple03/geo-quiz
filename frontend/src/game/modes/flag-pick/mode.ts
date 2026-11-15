import { flagMode } from '../../choice/flagChoices';
import FlagPickPlay from './FlagPickPlay';

/** Multiple choice (ADR 0008): a country is named, the player picks its flag. */
export const flagPickMode = flagMode({
  id: 'flag-pick',
  title: 'Pick the flag',
  description: 'A country is named. Pick its flag from four flags.',
  previewFlags: ['NOR', 'CAN', 'NPL'],
  // Options are flags: every option's flag is preloaded.
  flagOptions: true,
  Play: FlagPickPlay,
});
