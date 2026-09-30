import { useMemo, useState } from 'react';
import { addDays, formatShort, startOfWeek, todayInNl, weekdayShort } from '../../shared/dates';
import { useData, useStore } from '../lib/store';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';

export function FoodView() {
  const [tab, setTab] = useState<'boodschappen' | 'menu'>('boodschappen');

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1>Eten</h1>
          <div className="page__sub">Boodschappenlijst en het weekmenu, gedeeld met z'n tweeën.</div>
        </div>
      </div>

      <div className="segmented" role="group" aria-label="Weergave" style={{ marginBottom: 14 }}>
        <button aria-pressed={tab === 'boodschappen'} onClick={() => setTab('boodschappen')}>
          Boodschappen
        </button>
        <button aria-pressed={tab === 'menu'} onClick={() => setTab('menu')}>
          Weekmenu
        </button>
      </div>

      {tab === 'boodschappen' ? <Shopping /> : <WeekMenu />}
    </div>
  );
}

function Shopping() {
  const { shopping } = useData();
  const { addShopping, toggleShopping, deleteShopping, clearDoneShopping } = useStore();
  const [text, setText] = useState('');

  const open = shopping.filter((i) => !i.done);
  const done = shopping.filter((i) => i.done);

  const add = () => {
    const value = text.trim();
    if (!value) return;
    // Meerdere in één keer: "melk, brood, kaas"
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) void addShopping(part);
    setText('');
  };

  return (
    <div className="stack">
      <div className="row">
        <input
          className="input grow"
          placeholder="Melk, brood, luiers"
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

      <div className="list">
        {open.length === 0 && done.length === 0 ? (
          <EmptyState
            icon="mandje"
            title="De boodschappenlijst is leeg."
            hint="Typ hierboven wat er op moet, of zet de ingrediënten uit het weekmenu erop."
          />
        ) : (
          open.map((item) => (
            <div key={item.id} className="shopitem">
              <label className="shopitem__label grow">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => void toggleShopping(item.id)}
                />
                <span className="shopitem__text">
                  {item.text}
                  {item.source && <span className="muted tiny"> · {item.source}</span>}
                </span>
              </label>
              <button
                className="btn btn--ghost btn--sm"
                aria-label={`${item.text} verwijderen`}
                onClick={() => void deleteShopping(item.id)}
              >
                <Icon name="kruis" size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {done.length > 0 && (
        <>
          <div className="row row--between">
            <div className="section-title" style={{ margin: 0 }}>
              Afgevinkt ({done.length})
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => void clearDoneShopping()}>
              Opruimen
            </button>
          </div>
          <div className="list">
            {done.map((item) => (
              <div key={item.id} className="shopitem shopitem--done">
                <label className="shopitem__label grow">
                  <input type="checkbox" checked onChange={() => void toggleShopping(item.id)} />
                  <span className="shopitem__text">{item.text}</span>
                </label>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WeekMenu() {
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
