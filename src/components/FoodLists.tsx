import { useMemo, useState } from 'react';
import { addDays, formatShort, startOfWeek, todayInNl, weekdayShort } from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { quickPicks } from '../../shared/shopping';
import { Icon } from '../components/Icon';
import { SwipeRow } from '../components/SwipeRow';
import { EmptyState } from '../components/EmptyState';

export function Shopping() {
  const { shopping, settings } = useData();
  const { addShopping, toggleShopping, deleteShopping, clearDoneShopping } = useStore();
  const [text, setText] = useState('');

  const open = shopping.filter((i) => !i.done);
  const done = shopping.filter((i) => i.done);
  // Wat jullie vaak kopen, en nu niet al op de lijst staat.
  const picks = quickPicks(
    settings.shoppingOften,
    open.map((i) => i.text),
  );

  const add = () => {
    const value = text.trim();
    if (!value) return;
    // Meerdere in één keer: "melk, brood, kaas"
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) void addShopping(part).catch(() => {});
    setText('');
  };

  const remove = (id: string) => void deleteShopping(id).catch(() => {});
  const toggle = (id: string) => void toggleShopping(id).catch(() => {});

  return (
    <div className="shopping">
      <div className="stack">
        <div className="list">
          {open.length === 0 && done.length === 0 ? (
            <EmptyState
              icon="mandje"
              title="De boodschappenlijst is leeg."
              hint="Typ hieronder wat er op moet."
            />
          ) : (
            open.map((item) => (
              <SwipeRow
                key={item.id}
                right={{ label: 'Afvinken', icon: 'vinkje', run: () => toggle(item.id) }}
                left={{ label: 'Weg', icon: 'prullenbak', run: () => remove(item.id) }}
              >
                <div className="shopitem">
                  <label className="shopitem__label grow">
                    <input type="checkbox" checked={false} onChange={() => toggle(item.id)} />
                    <span className="shopitem__text">
                      {item.text}
                      {item.source && <span className="muted tiny"> · {item.source}</span>}
                    </span>
                  </label>
                  <button
                    className="btn btn--ghost btn--sm"
                    aria-label={`${item.text} verwijderen`}
                    onClick={() => remove(item.id)}
                  >
                    <Icon name="kruis" size={16} />
                  </button>
                </div>
              </SwipeRow>
            ))
          )}
        </div>

        {done.length > 0 && (
          <>
            <div className="row row--between">
              <div className="section-title" style={{ margin: 0 }}>
                Afgevinkt ({done.length})
              </div>
              <button className="btn btn--sm btn--ghost" onClick={() => void clearDoneShopping().catch(() => {})}>
                Opruimen
              </button>
            </div>
            <div className="list">
              {done.map((item) => (
                <SwipeRow
                  key={item.id}
                  right={{ label: 'Terugzetten', icon: 'terugdraaien', run: () => toggle(item.id) }}
                  left={{ label: 'Weg', icon: 'prullenbak', run: () => remove(item.id) }}
                >
                  <div className="shopitem shopitem--done">
                    <label className="shopitem__label grow">
                      <input type="checkbox" checked onChange={() => toggle(item.id)} />
                      <span className="shopitem__text">{item.text}</span>
                    </label>
                  </div>
                </SwipeRow>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Onderaan, binnen bereik van je duim. Op een groot scherm staat dit bovenaan. */}
      <div className="shopbar">
        <div className="shopbar__inner">
          {picks.length > 0 && (
            <div className="picks shopbar__picks" role="group" aria-label="Vaak gekocht">
              {picks.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="pick"
                  onClick={() => void addShopping(p).catch(() => {})}
                >
                  <Icon name="plus" size={14} /> {p}
                </button>
              ))}
            </div>
          )}
          <div className="row">
            <input
              className="input grow"
              placeholder="Melk, brood, luiers"
              aria-label="Wat moet er op de lijst?"
              enterKeyHint="done"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button className="btn btn--primary" onClick={add} disabled={!text.trim()}>
              Toevoegen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeekMenu() {
  const { meals } = useData();
  const { saveMeal, addShoppingBulk, setNotice } = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayInNl()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const mealFor = (date: string) => meals.find((m) => m.date === date);

  const toShoppingList = () => {
    const items = days.flatMap((d) => {
      const meal = mealFor(d);
      return (meal?.ingredients ?? []).map((i) => i);
    });
    if (items.length === 0) {
      setNotice('Vul eerst ingrediënten in bij de gerechten.');
      return;
    }
    void addShoppingBulk(items).then(() =>
      setNotice(`${items.length} ingrediënt(en) op de boodschappenlijst gezet.`),
    );
  };

  return (
    <div className="stack">
      <div className="row row--between">
        <button
          className="btn btn--sm btn--ghost iconrow"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <Icon name="chevron-links" size={16} /> Vorige
        </button>
        <span className="small muted">
          {formatShort(weekStart)} — {formatShort(addDays(weekStart, 6))}
        </span>
        <button
          className="btn btn--sm btn--ghost iconrow"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          Volgende <Icon name="chevron-rechts" size={16} />
        </button>
      </div>

      {days.map((date, index) => {
        const meal = mealFor(date);
        return (
          <div key={date} className="card card--pad stack stack--sm">
            <div className="row row--between">
              <strong className="cap">
                {weekdayShort(index)} {formatShort(date)}
              </strong>
              {date === todayInNl() && <span className="chip chip--gezin">vandaag</span>}
            </div>
            <input
              className="input"
              placeholder="Wat eten we?"
              defaultValue={meal?.dish ?? ''}
              onBlur={(e) => {
                if (e.target.value === (meal?.dish ?? '')) return;
                void saveMeal({
                  date,
                  dish: e.target.value,
                  ingredients: meal?.ingredients ?? [],
                  notes: meal?.notes,
                });
              }}
            />
            <input
              className="input"
              placeholder="Boodschappen hiervoor, komma's ertussen"
              defaultValue={(meal?.ingredients ?? []).join(', ')}
              onBlur={(e) => {
                const ingredients = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (ingredients.join(', ') === (meal?.ingredients ?? []).join(', ')) return;
                void saveMeal({
                  date,
                  dish: meal?.dish ?? '',
                  ingredients,
                  notes: meal?.notes,
                });
              }}
            />
          </div>
        );
      })}

      <button className="btn btn--primary btn--block" onClick={toShoppingList}>
        Ingrediënten naar de boodschappenlijst
      </button>
    </div>
  );
}
