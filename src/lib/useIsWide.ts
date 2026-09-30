import { useEffect, useState } from 'react';

/** Breekpunt waarop het maandraster en de dag naast elkaar passen. */
const WIDE = '(min-width: 860px)';

/**
 * De opmaak wordt door CSS geregeld, maar de agenda moet ook wéten of hij
 * breed staat: op een breed scherm bladeren de pijltjes per maand, op een
 * telefoon per week.
 */
export function useIsWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(WIDE).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener('change', onChange);
    setWide(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return wide;
}
