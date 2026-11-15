import { flagMode } from '../../choice/flagChoices';
import FlagNamePlay from './FlagNamePlay';

/** Multiple choice (ADR 0008): a flag is shown, the player picks its country. */
export const flagNameMode = flagMode({
  id: 'flag-name',
  title: 'Name the flag',
  description: 'A flag is shown. Pick the country it belongs to from four options.',
  previewFlags: ['JPN', 'BRA', 'KEN'],
  // Options are names: only the asked flags are preloaded.
  flagOptions: false,
  Play: FlagNamePlay,
});
