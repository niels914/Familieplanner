/**
 * Eigen iconenset. Eén lijnstijl: 24px raster, lijndikte 1,75, ronde uiteinden,
 * geen vulling. Ze erven `currentColor`, dus ze kleuren mee met de actieve
 * staat en met het donkere thema — wat met emoji niet kon.
 */

import type { SVGProps } from 'react';

export type IconName =
  | 'vandaag'
  | 'kalender'
  | 'oppas'
  | 'contacten'
  | 'meer'
  | 'rugzak'
  | 'fles'
  | 'blokken'
  | 'taart'
  | 'koffer'
  | 'speld'
  | 'klok'
  | 'telefoon'
  | 'bericht'
  | 'bon'
  | 'camera'
  | 'zoeken'
  | 'plus'
  | 'vinkje'
  | 'kruis'
  | 'chevron-links'
  | 'chevron-rechts'
  | 'potlood'
  | 'prullenbak'
  | 'terugdraaien'
  | 'eten'
  | 'auto'
  | 'instellingen'
  | 'mandje'
  | 'huis'
  | 'delen'
  | 'plusvak'
  | 'herhaal'
  | 'regelen'
  | 'bel';

const PATHS: Record<IconName, JSX.Element> = {
  vandaag: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </>
  ),
  kalender: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v3.5M16 3v3.5" />
      <circle cx="8" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  oppas: (
    <>
      <circle cx="8.5" cy="7" r="3" />
      <path d="M3.5 20c0-3.6 2.2-5.6 5-5.6s5 2 5 5.6" />
      <circle cx="17" cy="12.6" r="2.2" />
      <path d="M13.6 20c0-2.2 1.5-3.5 3.4-3.5s3.5 1.3 3.5 3.5" />
    </>
  ),
  contacten: (
    <>
      <circle cx="9.5" cy="8" r="3.2" />
      <path d="M3 20c0-3.9 2.9-6.1 6.5-6.1S16 16.1 16 20" />
      <path d="M17 4.7a3.2 3.2 0 0 1 0 6.6M18.6 14.4c2.4.6 4.4 2.5 4.4 5.6" />
    </>
  ),
  meer: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  rugzak: (
    <>
      <path d="M4.5 11a5.5 5.5 0 0 1 5.5-5.5h4A5.5 5.5 0 0 1 19.5 11v7.5A2.5 2.5 0 0 1 17 21H7a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M4.5 13.5h15" />
      <rect x="10.25" y="11.8" width="3.5" height="3.4" rx="1.2" />
      <path d="M9.5 5.7V4.6A1.6 1.6 0 0 1 11.1 3h1.8a1.6 1.6 0 0 1 1.6 1.6v1.1" />
    </>
  ),
  fles: (
    <>
      <path d="M10.5 4.5v-1a1.5 1.5 0 0 1 3 0v1" />
      <rect x="9.4" y="4.5" width="5.2" height="2.2" rx="1.1" />
      <path d="M9 6.7h6a3 3 0 0 1 3 3v8.8a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18.5V9.7a3 3 0 0 1 3-3Z" />
      <path d="M8.6 11.8h2.6M8.6 14.8h1.8" />
    </>
  ),
  blokken: (
    <>
      <path d="M12 8.5V20" />
      <circle cx="12" cy="6.3" r="1.8" />
      <rect x="8.5" y="10.5" width="7" height="3" rx="1.5" />
      <rect x="6.5" y="14" width="11" height="3" rx="1.5" />
      <rect x="4.5" y="17.5" width="15" height="3" rx="1.5" />
    </>
  ),
  taart: (
    <>
      <rect x="4" y="13.8" width="16" height="6.7" rx="2.2" />
      <path d="M4 16c1.6 0 1.6 1.6 3.2 1.6S8.8 16 10.4 16s1.6 1.6 3.2 1.6S15.2 16 16.8 16s1.6 1.6 3.2 1.6" />
      <path d="M12 9.8v4" />
      <path d="M12 6.6c1.3 1.1 1.3 2.8 0 2.8s-1.3-1.7 0-2.8Z" />
    </>
  ),
  koffer: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5" />
      <path d="M12 11v5.5" />
    </>
  ),
  speld: (
    <>
      <path d="M9 3.5h6v1.2l-1 4.3 3 2.5v1H7v-1l3-2.5-1-4.3Z" />
      <path d="M12 12.5V21" />
    </>
  ),
  klok: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  telefoon: (
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.8 1.8 0 0 1-2 1.8C11 18.4 5.6 13 4.7 5.3A1.8 1.8 0 0 1 6.5 3.5Z" />
  ),
  bericht: (
    <path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v9a1.5 1.5 0 0 1-1.5 1.5h-7.5L7 20.5v-4H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5Z" />
  ),
  bon: (
    <>
      <path d="M6 3.5h12V21l-2.1-1.4-1.95 1.4-1.95-1.4L10.05 21 8.1 19.6 6 21Z" />
      <path d="M9.2 8h5.6M9.2 11.5h5.6M9.2 15h3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5h3l1.5-2h7L17 8.5h3V19H4Z" />
      <circle cx="12" cy="13.5" r="3.4" />
    </>
  ),
  zoeken: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8 21 21" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  vinkje: <path d="M5 12.5 9.5 17 19 7" />,
  kruis: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-links': <path d="M15 5 8.5 12 15 19" />,
  'chevron-rechts': <path d="M9 5l6.5 7L9 19" />,
  potlood: (
    <>
      <path d="M4 20.5l.9-3.6L16.3 5.5l2.7 2.7L7.6 19.6Z" />
      <path d="M14.6 7.2l2.7 2.7" />
    </>
  ),
  prullenbak: (
    <>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
      <path d="M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13" />
    </>
  ),
  terugdraaien: (
    <>
      <path d="M4 9.5h7a6 6 0 1 1-6 6" />
      <path d="M4 9.5 7.5 6M4 9.5 7.5 13" />
    </>
  ),
  eten: (
    <>
      <path d="M6 3v5a2 2 0 0 0 4 0V3M8 8v13" />
      <path d="M16.5 3c2.4 1.6 2.4 6 0 7.6V21" />
    </>
  ),
  auto: (
    <>
      <path d="M4 16.5v-3l1.8-4.2a2 2 0 0 1 1.8-1.2h8.8a2 2 0 0 1 1.8 1.2L20 13.5v3" />
      <path d="M3.5 13.5h17" />
      <circle cx="7.5" cy="16.8" r="1.7" />
      <circle cx="16.5" cy="16.8" r="1.7" />
    </>
  ),
  instellingen: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <path d="M9 5v4M15 10v4M8 15v4" />
    </>
  ),
  mandje: (
    <>
      <path d="M3 8h18l-1.8 10.6a2 2 0 0 1-2 1.7H6.8a2 2 0 0 1-2-1.7Z" />
      <path d="M8.5 8l2-4.5M15.5 8l-2-4.5" />
      <path d="M9.5 12v4.5M14.5 12v4.5" />
    </>
  ),
  delen: (
    <>
      <path d="M8.5 9H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1.5" />
      <path d="M12 3v11.5M8.5 6.5 12 3l3.5 3.5" />
    </>
  ),
  herhaal: (
    <>
      <path d="M4.5 11V9.5a3 3 0 0 1 3-3h11M15.5 3.5l3 3-3 3" />
      <path d="M19.5 13v1.5a3 3 0 0 1-3 3h-11M8.5 20.5l-3-3 3-3" />
    </>
  ),
  regelen: (
    <>
      <path d="M4 6.2l1.5 1.5L8.2 4.8M4 12.2l1.5 1.5 2.7-2.9M4 18.2l1.5 1.5 2.7-2.9" />
      <path d="M12 6.5h8M12 12.5h8M12 18.5h8" />
    </>
  ),
  bel: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  plusvak: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  huis: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 12v7.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V12" />
    </>
  ),
};

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Zet een toegankelijke naam; zonder label is het icoon decoratief. */
  label?: string;
}

export function Icon({ name, size = 22, label, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
