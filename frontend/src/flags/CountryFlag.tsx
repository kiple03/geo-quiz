import { flagUrl, type GameData } from '../data/load';
import { hasFlagImage } from '../data/flags';
import './CountryFlag.css';

interface FlagImageProps {
  /** A country id, e.g. "NOR". */
  id: string;
  /**
   * Empty (the default) when the country's name is next to it, so screen readers don't
   * read it twice. Never the country's name while the flag is the question (ADR 0008).
   */
  alt?: string;
  /** `inline` sits in a line of text; `large` is a question; `fill` fills its box. */
  size?: 'inline' | 'large' | 'fill';
}

/**
 * A flag by country id, as a plain `<img>`: inlining the SVGs would let their internal
 * ids clash. Renders nothing for a country without a flag image (Antarctica).
 */
export function FlagImage({ id, alt = '', size = 'inline' }: FlagImageProps) {
  if (!hasFlagImage(id)) return null;
  return (
    <img
      className={`flag flag--${size}`}
      src={flagUrl(id)}
      alt={alt}
      // The 4:3 shape, reserved before the image loads.
      width={4}
      height={3}
      draggable={false}
    />
  );
}

/**
 * The flag next to a country's name, e.g. in a prompt or feedback. Renders nothing
 * for ids that are not countries, so it is safe for any `Question.targetId`.
 * Only where the flag is not the answer to an open question (ADR 0008).
 */
function CountryFlag({ data, ...props }: FlagImageProps & { data: GameData }) {
  if (!data.countriesById.has(props.id)) return null;
  return <FlagImage {...props} />;
}

export default CountryFlag;
