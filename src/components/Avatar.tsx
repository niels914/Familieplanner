/**
 * Een dier per gezinslid, als kleine tekening: Matthijs een olifant, Amélie een
 * aap, Lotte een lieveheersbeestje, Irene een schildpad en Niels een uil.
 *
 * Elke persoon heeft een eigen pastelachtergrond (de kleur van die persoon) en
 * de dieren hebben vaste kleuren, zodat ze er in het lichte en het donkere
 * thema hetzelfde uitzien. Ze staan in de code, dus
 * er wordt niets extra geladen en ze blijven scherp op elk scherm.
 */

import type { SVGProps } from 'react';
import type { PersonId } from '../../shared/types';
import { PERSON_LABEL } from '../../shared/types';
import { Icon } from './Icon';

const INK = '#2a2f3a';

/** Ogen met een glans, voor de dieren die er een gewoon paar hebben. */
const Eye = ({ x, y, r = 2.4 }: { x: number; y: number; r?: number }) => (
  <>
    <circle cx={x} cy={y} r={r} fill={INK} />
    <circle cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.38} fill="#fff" />
  </>
);

type Animal = 'uil' | 'lieveheersbeestje' | 'schildpad' | 'olifant' | 'aap';

const ART: Record<Animal, JSX.Element> = {
  // ------------------------------------------------------------ uil
  uil: (
    <>
      <path d="M13 12 27 17 16 29Z" fill="#7a5a43" />
      <path d="M51 12 37 17 48 29Z" fill="#7a5a43" />
      <ellipse cx="32" cy="39" rx="20" ry="22" fill="#8d6a4f" />
      <ellipse cx="13.5" cy="46" rx="5" ry="12" fill="#7a5a43" transform="rotate(8 13.5 46)" />
      <ellipse cx="50.5" cy="46" rx="5" ry="12" fill="#7a5a43" transform="rotate(-8 50.5 46)" />
      <ellipse cx="32" cy="52" rx="11" ry="10" fill="#f0e2c8" />
      <path
        d="M27 48q2.5 2.5 5 0m0 0q2.5 2.5 5 0M25 54q2.5 2.5 5 0m4 0q2.5 2.5 5 0"
        fill="none"
        stroke="#c9ae88"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="33" r="9" fill="#f6ecd8" />
      <circle cx="40" cy="33" r="9" fill="#f6ecd8" />
      <circle cx="24" cy="33" r="5.6" fill="#fff" />
      <circle cx="40" cy="33" r="5.6" fill="#fff" />
      <circle cx="24.6" cy="33.4" r="3.2" fill={INK} />
      <circle cx="39.4" cy="33.4" r="3.2" fill={INK} />
      <circle cx="25.7" cy="32.2" r="1.1" fill="#fff" />
      <circle cx="40.5" cy="32.2" r="1.1" fill="#fff" />
      <path d="M29 38.5h6l-3 5.5Z" fill="#f2a53a" />
    </>
  ),

  // ---------------------------------------------- lieveheersbeestje
  lieveheersbeestje: (
    <>
      <path
        d="M25 14C22 9 19 7 15 7M39 14C42 9 45 7 49 7"
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="15" cy="7" r="2.3" fill={INK} />
      <circle cx="49" cy="7" r="2.3" fill={INK} />
      <circle cx="32" cy="39" r="22" fill="#e4453c" />
      <path d="M32 24v36" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="39" r="3.8" fill={INK} />
      <circle cx="43" cy="39" r="3.8" fill={INK} />
      <circle cx="24" cy="52" r="3.2" fill={INK} />
      <circle cx="40" cy="52" r="3.2" fill={INK} />
      <circle cx="19" cy="28" r="2.6" fill={INK} />
      <circle cx="45" cy="28" r="2.6" fill={INK} />
      <path d="M17 33a16 16 0 0 1 6-11" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 21a13 11 0 0 1 24 0Z" fill={INK} />
      <path d="M17.5 24a14.5 12 0 0 1 29 0c-4 3.5-9 5-14.500 5s-10.500-1.500-14.500-5Z" fill={INK} />
      <circle cx="26.500" cy="21.500" r="2.800" fill="#fff" />
      <circle cx="37.500" cy="21.500" r="2.800" fill="#fff" />
      <circle cx="27.200" cy="22" r="1.400" fill={INK} />
      <circle cx="38.200" cy="22" r="1.400" fill={INK} />
      <path d="M29 26.500q3 2.500 6 0" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),

  // -------------------------------------------------------- schildpad
  schildpad: (
    <>
      <ellipse cx="32" cy="47" rx="26" ry="21" fill="#4f9461" />
      <path d="M32 38 41.500 43.500V54.500L32 60 22.500 54.500V43.500Z" fill="#78b784" stroke="#2f6e46" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M41.500 43.500 51 40M41.500 54.500 52 58M22.500 43.500 13 40M22.500 54.500 12 58M32 38V30"
        fill="none"
        stroke="#2f6e46"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="11.500" cy="49" rx="6" ry="4.500" fill="#a5d27f" transform="rotate(-20 11.500 49)" />
      <ellipse cx="52.500" cy="49" rx="6" ry="4.500" fill="#a5d27f" transform="rotate(20 52.500 49)" />
      <circle cx="32" cy="25" r="12" fill="#a5d27f" />
      <Eye x={27} y={24} />
      <Eye x={37} y={24} />
      <path d="M28 30q4 3.500 8 0" fill="none" stroke={INK} strokeWidth="1.700" strokeLinecap="round" />
      <circle cx="23.500" cy="28.500" r="2.200" fill="#f3a9a0" fillOpacity=".7" />
      <circle cx="40.500" cy="28.500" r="2.200" fill="#f3a9a0" fillOpacity=".7" />
    </>
  ),

  // ----------------------------------------------------------- olifant
  olifant: (
    <>
      <circle cx="13" cy="31" r="13" fill="#9ca8b6" />
      <circle cx="51" cy="31" r="13" fill="#9ca8b6" />
      <circle cx="14" cy="32" r="8" fill="#e6b4be" />
      <circle cx="50" cy="32" r="8" fill="#e6b4be" />
      <ellipse cx="32" cy="32" rx="18" ry="20" fill="#bcc5cf" />
      <path d="M32 38v14q0 6 6 5.500" fill="none" stroke="#bcc5cf" strokeWidth="10" strokeLinecap="round" />
      <path d="M28 46h8M28.500 51h7" stroke="#9ca8b6" strokeWidth="1.500" strokeLinecap="round" />
      <Eye x={25.500} y={30} />
      <Eye x={38.500} y={30} />
      <circle cx="22" cy="37" r="2.600" fill="#e6a8b4" fillOpacity=".7" />
      <circle cx="42" cy="37" r="2.600" fill="#e6a8b4" fillOpacity=".7" />
    </>
  ),

  // --------------------------------------------------------------- aap
  aap: (
    <>
      <path d="M32 14c-1-4 2-7 6-6" fill="none" stroke="#7b5233" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12.500" cy="34" r="7.500" fill="#7b5233" />
      <circle cx="51.500" cy="34" r="7.500" fill="#7b5233" />
      <circle cx="12.500" cy="34" r="4.200" fill="#efcca0" />
      <circle cx="51.500" cy="34" r="4.200" fill="#efcca0" />
      <ellipse cx="32" cy="34" rx="20" ry="21" fill="#8b5e3c" />
      <circle cx="24" cy="34" r="9" fill="#efcca0" />
      <circle cx="40" cy="34" r="9" fill="#efcca0" />
      <ellipse cx="32" cy="44" rx="13" ry="10.500" fill="#efcca0" />
      <Eye x={25.500} y={33} />
      <Eye x={38.500} y={33} />
      <ellipse cx="32" cy="40.500" rx="3.200" ry="2.200" fill="#7b5233" />
      <path d="M26 46.500q6 5.500 12 0" fill="none" stroke={INK} strokeWidth="1.800" strokeLinecap="round" />
    </>
  ),
};

/** Wie welk dier is. */
export const ANIMAL: Record<Exclude<PersonId, 'gezin'>, Animal> = {
  matthijs: 'olifant',
  amelie: 'aap',
  lotte: 'lieveheersbeestje',
  irene: 'schildpad',
  niels: 'uil',
};

/** De pastelkleur van de persoon. */
const BG: Record<Exclude<PersonId, 'gezin'>, string> = {
  matthijs: '#dbe6fa',
  amelie: '#fadfe9',
  lotte: '#d3ece8',
  irene: '#e5dff2',
  niels: '#f3e7d2',
};

type Props = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  who: PersonId;
  size?: number;
};

/** Het dier van een persoon, rond. Voor 'gezin' een huisje op een rustige achtergrond. */
export function Avatar({ who, size = 28, className, ...rest }: Props) {
  if (who === 'gezin') {
    return (
      <span
        className={`avatar-ill avatar-ill--gezin ${className ?? ''}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={PERSON_LABEL.gezin}
      >
        <Icon name="huis" size={Math.round(size * 0.58)} />
      </span>
    );
  }

  const art = ART[ANIMAL[who]];
  const bg = BG[who];
  const clip = `av-${who}-${size}`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={PERSON_LABEL[who]}
      className={`avatar-ill ${className ?? ''}`}
      {...rest}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <circle cx="32" cy="32" r="32" fill={bg} />
        {art}
      </g>
    </svg>
  );
}
