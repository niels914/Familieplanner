/**
 * Een bonnetje groot bekijken. Eén tik op de foto zoomt in (en weer uit), want het kleine
 * lettertype van een kassabon lees je anders niet. Een pdf opent in de eigen viewer van de telefoon.
 */

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function ImageViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="viewer__close btn btn--sm" onClick={onClose} aria-label="Sluiten">
        <Icon name="kruis" size={18} /> Sluiten
      </button>
      <div className={`viewer__scroll ${zoom ? 'viewer__scroll--zoom' : ''}`}>
        <img
          className="viewer__img"
          src={src}
          alt={title}
          onClick={() => setZoom((z) => !z)}
          style={zoom ? { width: '250%', maxWidth: 'none', maxHeight: 'none' } : undefined}
        />
      </div>
      <p className="viewer__hint">{zoom ? 'Tik om uit te zoomen' : 'Tik om in te zoomen'}</p>
    </div>
  );
}
