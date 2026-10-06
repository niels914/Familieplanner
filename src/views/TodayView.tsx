/**
 * Vandaag volgt de tijd. 's Ochtends: wat moet er vandaag mee, en wat staat er
 * op de planning. 's Middags: wat komt er nog, en morgen klaarzetten als
 * compacte regel. 's Avonds: morgen, met wat er klaar moet staan.
 * Zie src/lib/dayPart.ts voor de tijdstippen.
 */

import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../shared/types';
import { addDays, formatLong } from '../../shared/dates';
import { toMin } from '../../shared/signals';
import { useData, useStore } from '../lib/store';
import { birthdaysOnDate, eventsOnDate, pickupForDate } from '../lib/events';
import { ageTurning, turningLabel } from '../../shared/verjaardagen';
import { feestdagenOp, feestdagNamen, isFeestdag } from '../../shared/feestdagen';
import { GREETING, dayPart, nowInNl, useNow } from '../lib/dayPart';
import { doneBring, openBring } from '../lib/prep';
import { useNav } from '../lib/nav';
import { useRegel } from '../lib/useRegel';
import { Timeline } from '../components/Timeline';
import { DayFacts } from '../components/DayFacts';
import { Icon } from '../components/Icon';
import { PushPrompt } from '../components/PushPrompt';
import { EmptyState } from '../components/EmptyState';
import { PageHead } from '../components/PageHead';
import { AllDone, PrepList } from '../components/PrepList';
import { RegelRow } from '../components/RegelRow';
import { SignalBanner } from '../components/SignalBanner';

/** Is dit item al voorbij? Zonder eindtijd rekenen we een half uur. */
function isPast(e: CalendarEvent, minutes: number): boolean {
  if (e.allDay || !e.time) return false;
  const end = e.endTime ? toMin(e.endTime) : toMin(e.time) + 30;
  return end <= minutes;
}

const preview = (events: CalendarEvent[]) =>
  events.length === 0
    ? 'niets gepland'
    : events
        .slice(0, 2)
        .map((e) => e.title)
        .join(', ') + (events.length > 2 ? `, +${events.length - 2}` : '');

export function TodayView() {
  const { events, contacts, pickupRules, pickupOverrides, meals } = useData();
  const { saveEvent } = useStore();
  const { openEvent, openDate } = useNav();
  const regel = useRegel();

  const now = useNow();
  const { date: today, minutes } = nowInNl(now);
  const part = dayPart(Math.floor(minutes / 60));
  const tomorrow = addDays(today, 1);

  const [prepOpen, setPrepOpen] = useState(false);

  const todayEvents = useMemo(() => eventsOnDate(events, today), [events, today]);
  const tomorrowEvents = useMemo(() => eventsOnDate(events, tomorrow), [events, tomorrow]);

  const mustBring = openBring(todayEvents);
  const doneToday = doneBring(todayEvents);
  const prepTomorrow = openBring(tomorrowEvents);
  const doneTomorrow = doneBring(tomorrowEvents);

  const toggleBring = (event: CalendarEvent, itemId: string) => {
    void saveEvent({
      ...event,
      bring: event.bring.map((b) => (b.id === itemId ? { ...b, done: !b.done } : b)),
    }).catch(() => {});
  };

  const factsFor = (date: string) => ({
    pickups: pickupForDate(date, pickupRules, pickupOverrides),
    dish: meals.find((m) => m.date === date)?.dish,
  });

  const birthdaysFor = (date: string) =>
    birthdaysOnDate(contacts, date).map((c) => (
      <p key={c.id} className="banner banner--info iconrow">
        <Icon name="taart" size={18} /> {c.name} is {date === today ? 'vandaag' : 'morgen'} jarig
        {ageTurning(c.birthday, date) !== undefined && ` en ${turningLabel(ageTurning(c.birthday, date))}`}
        {c.parents.length > 0 && ` — ouders: ${c.parents.map((p) => p.name).join(', ')}`}
      </p>
    ));

  const feestdagFor = (date: string) => {
    const feest = feestdagenOp(date);
    if (feest.length === 0) return null;
    return (
      <p className={`banner iconrow banner--${isFeestdag(feest) ? 'feestdag' : 'gezinsdag'}`}>
        <Icon name="feest" size={18} /> {date === today ? 'Vandaag' : 'Morgen'}: {feestdagNamen(feest)}
      </p>
    );
  };

  const signalsOn = (date: string) =>
    regel.open.flatMap((i) =>
      i.kind === 'signal' && i.signal.date === date ? [<SignalBanner key={i.signal.key} signal={i.signal} />] : [],
    );

  const timeline = (evs: CalendarEvent[], opts: { compact?: boolean; dim?: boolean; empty?: boolean } = {}) =>
    evs.length === 0 ? (
      opts.empty ? <EmptyState icon="vandaag" title="Een lege dag." hint="Ook fijn." /> : null
    ) : (
      <Timeline
        events={evs}
        onOpen={openEvent}
        onToggleBring={toggleBring}
        compactBring={opts.compact}
        dim={opts.dim}
      />
    );

  // ------------------------------------------------------------------ ochtend
  if (part === 'ochtend') {
    const facts = factsFor(today);
    return (
      <div className="page">
        <PushPrompt />
        <PageHead
          kicker={GREETING.ochtend}
          title={formatLong(today)}
          sub={todayEvents.length === 0 ? 'Niets in de agenda' : `${todayEvents.length} ding${todayEvents.length === 1 ? '' : 'en'} vandaag`}
        />
        <PrepList
          items={mustBring}
          done={doneToday}
          title="Vandaag mee"
          doneText="Alles zit in de tas."
          onToggle={toggleBring}
        />
        {signalsOn(today)}
        <RegelRow />
        <DayFacts {...facts} />
        {feestdagFor(today)}
        {birthdaysFor(today)}
        {timeline(todayEvents, { compact: true, empty: true })}

        <details className="foldout">
          <summary>
            <span className="foldout__label">Morgen</span>
            <span className="foldout__preview grow">
              {preview(tomorrowEvents)}
            </span>
            <Icon name="chevron-rechts" size={17} className="foldout__chevron" />
          </summary>
          <PrepList
            items={prepTomorrow}
            done={doneTomorrow}
            title="Klaarzetten voor morgen"
            doneText="Alles staat klaar voor morgen."
            onToggle={toggleBring}
            onHead={() => openDate(tomorrow)}
          />
          <DayFacts {...factsFor(tomorrow)} />
          {timeline(tomorrowEvents, { compact: true })}
        </details>
      </div>
    );
  }

  // ------------------------------------------------------------------- middag
  if (part === 'middag') {
    const rest = todayEvents.filter((e) => !isPast(e, minutes));
    const earlier = todayEvents.filter((e) => isPast(e, minutes));
    const facts = factsFor(today);
    return (
      <div className="page">
        <PushPrompt />
        <PageHead
          kicker={GREETING.middag}
          title={formatLong(today)}
          sub={rest.length === 0 ? 'Voor vandaag zijn jullie klaar' : `Nog ${rest.length} te gaan`}
        />
        {prepTomorrow.length > 0 ? (
          <>
            <button className="compactprep" onClick={() => setPrepOpen((o) => !o)} aria-expanded={prepOpen}>
              <Icon name="rugzak" size={19} />
              <strong className="grow">Morgen klaarzetten</strong>
              <span className="prep__count">
                {doneTomorrow > 0 ? `${doneTomorrow} van ${doneTomorrow + prepTomorrow.length}` : prepTomorrow.length}
              </span>
              <Icon
                name="chevron-rechts"
                size={17}
                style={{ transform: prepOpen ? 'rotate(90deg)' : undefined }}
              />
            </button>
            {prepOpen && (
              <PrepList
                items={prepTomorrow}
                done={doneTomorrow}
                title="Klaarzetten voor morgen"
                onToggle={toggleBring}
              />
            )}
          </>
        ) : (
          doneTomorrow > 0 && <AllDone text="Alles staat klaar voor morgen." />
        )}
        {signalsOn(today)}
        <RegelRow />
        <DayFacts {...facts} />
        {feestdagFor(today)}
        {birthdaysFor(today)}
        {timeline(rest, { empty: true })}

        {earlier.length > 0 && (
          <details className="foldout">
            <summary>
              <span className="foldout__label">Eerder vandaag</span>
              <span className="foldout__preview grow">{earlier.length} gedaan</span>
              <Icon name="chevron-rechts" size={17} className="foldout__chevron" />
            </summary>
            {timeline(earlier, { dim: true })}
          </details>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------- avond
  return (
    <div className="page">
      <PushPrompt />
      <PageHead
        kicker={`${GREETING.avond} · morgen`}
        title={formatLong(tomorrow)}
        sub={tomorrowEvents.length === 0 ? 'Niets gepland' : `${tomorrowEvents.length} ding${tomorrowEvents.length === 1 ? '' : 'en'}`}
      />
      <PrepList
        items={prepTomorrow}
        done={doneTomorrow}
        title="Klaarzetten voor morgen"
        doneText="Alles staat klaar voor morgen."
        onToggle={toggleBring}
      />
      {signalsOn(tomorrow)}
      <RegelRow />
      <DayFacts {...factsFor(tomorrow)} />
      {feestdagFor(tomorrow)}
      {birthdaysFor(tomorrow)}
      {timeline(tomorrowEvents, { compact: true, empty: true })}

      <details className="foldout">
        <summary>
          <span className="foldout__label">Vandaag</span>
          <span className="foldout__preview grow">{preview(todayEvents)}</span>
          <Icon name="chevron-rechts" size={17} className="foldout__chevron" />
        </summary>
        {timeline(todayEvents)}
      </details>
    </div>
  );
}
