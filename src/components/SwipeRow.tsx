import { useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface SwipeAction {
  label: string;
  icon: IconName;
  run: () => void;
}

/** Vanaf hoeveel pixels een veeg doorgaat; korter springt de rij terug. */
const THRESHOLD = 88;
/** Tot hoever de rij meeschuift voordat hij tegenwerkt. */
const SLACK = 24;

/**
 * Een rij die je kunt vegen: naar rechts (`right`) en naar links (`left`) voert een
 * actie uit, zoals afvinken of weghalen. Alleen voor aanraking; met de muis blijven de
 * gewone knoppen. Verticaal scrollen werkt gewoon door. De knoppen in de rij blijven
 * bestaan, dus vegen is een extra gemak en nergens verplicht.
 */
export function SwipeRow({
  children,
  right,
  left,
}: {
  children: ReactNode;
  right?: SwipeAction;
  left?: SwipeAction;
}) {
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const locked = useRef(false);
  const width = useRef(0);

  const clamp = (value: number) => {
    const max = (value > 0 ? right : left) ? width.current : 0;
    const limit = max + SLACK;
    // Zonder actie aan die kant schuift de rij nauwelijks mee.
    if (!(value > 0 ? right : left)) return Math.sign(value) * Math.min(Math.abs(value) * 0.15, 10);
    return Math.max(-limit, Math.min(limit, value));
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    width.current = e.currentTarget.getBoundingClientRect().width;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    locked.current = false;
    setSettling(false);
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!locked.current) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      // Eerst naar boven of beneden: dat is scrollen, daar blijven we vanaf.
      if (Math.abs(my) > Math.abs(mx)) {
        start.current = null;
        return;
      }
      locked.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* niet overal mogelijk; de veeg werkt dan ook zonder */
      }
    }
    setDx(clamp(mx));
  };

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId || !locked.current) return;
    locked.current = false;

    const action = dx > 0 ? right : left;
    if (action && Math.abs(dx) >= THRESHOLD) {
      // Schuif de rij naar buiten, voer de actie uit en zet hem dan stilletjes terug.
      setSettling(true);
      setDx(Math.sign(dx) * width.current);
      window.setTimeout(() => {
        action.run();
        setSettling(false);
        setDx(0);
      }, 160);
      return;
    }
    setSettling(true);
    setDx(0);
  };

  const strength = Math.min(1, Math.abs(dx) / THRESHOLD);
  const show = dx > 0 ? right : dx < 0 ? left : undefined;

  return (
    <div className="swipe">
      {show && (
        <div
          className={`swipe__bg swipe__bg--${dx > 0 ? 'right' : 'left'}`}
          style={{ opacity: 0.35 + 0.65 * strength }}
          aria-hidden="true"
        >
          <Icon name={show.icon} size={20} />
          <span>{show.label}</span>
        </div>
      )}
      <div
        className={`swipe__fg ${settling ? 'swipe__fg--settling' : ''}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {children}
      </div>
    </div>
  );
}
