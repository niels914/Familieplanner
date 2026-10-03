/**
 * Mensen: de mensen om jullie heen. Contacten (klasgenootjes en hun ouders) en
 * Oppas (wie, hoeveel uur, wat is er nog te betalen) als twee segmenten.
 */

import { useState } from 'react';
import { PageHead } from '../components/PageHead';
import { ContactsView } from './ContactsView';
import { SittersView } from './SittersView';

type Segment = 'contacten' | 'oppas';

export function MensenView() {
  const [segment, setSegment] = useState<Segment>('contacten');

  return (
    <div className="page">
      <PageHead
        title="Mensen"
        sub={segment === 'contacten' ? 'Klasgenootjes en hun ouders' : 'Oppas, uren en wat er openstaat'}
      />
      <div className="segmented" role="group" aria-label="Onderdeel" style={{ marginBottom: 14 }}>
        <button aria-pressed={segment === 'contacten'} onClick={() => setSegment('contacten')}>
          Contacten
        </button>
        <button aria-pressed={segment === 'oppas'} onClick={() => setSegment('oppas')}>
          Oppas
        </button>
      </div>
      {segment === 'contacten' ? <ContactsView embedded /> : <SittersView embedded />}
    </div>
  );
}
