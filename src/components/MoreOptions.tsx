import type { ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * De minder gebruikte velden van een formulier, achter één regel. Dichtgeklapt
 * staat er kort wat er al is ingevuld, zodat je niets mist. Staat er al iets in,
 * dan laat het formulier dit open beginnen.
 */
export function MoreOptions({
  open,
  onToggle,
  preview,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  /** Wat er al is ingevuld, of een hint wat je hier vindt. */
  preview?: string;
  children: ReactNode;
}) {
  return (
    <div className="more">
      <button type="button" className="more__toggle" aria-expanded={open} onClick={onToggle}>
        <span className="more__label">Meer opties</span>
        {!open && preview && <span className="more__preview grow">{preview}</span>}
        {open && <span className="grow" />}
        <Icon name="chevron-rechts" size={17} className="more__chevron" />
      </button>
      {open && <div className="more__body stack">{children}</div>}
    </div>
  );
}
