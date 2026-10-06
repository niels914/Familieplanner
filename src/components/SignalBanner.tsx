import { spanLabel, type Signal } from '../../shared/signals';
import { useNav } from '../lib/nav';
import { Icon } from './Icon';

/** Eén open signaal als balk boven een dag. Tik opent de keuzes. */
export function SignalBanner({ signal }: { signal: Signal }) {
  const { openSignal } = useNav();
  return (
    <button className="signalbanner" onClick={() => openSignal(signal.key)}>
      <Icon name="bel" size={18} />
      <span className="grow">
        <b>Niemand thuis {spanLabel(signal.window)}</b>
        <span className="tiny">
          {signal.coverage === 'partial'
            ? `Oppas dekt een deel, nog open: ${signal.gaps.map(spanLabel).join(', ')}`
            : 'Allebei weg, nog niet geregeld'}
        </span>
      </span>
      <Icon name="chevron-rechts" size={17} />
    </button>
  );
}
