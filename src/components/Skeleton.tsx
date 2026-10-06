/**
 * Het wachtscherm heeft de vorm van wat eraan komt, in plaats van een
 * draaiend rondje. Zo springt de bladspiegel niet wanneer de data binnen is.
 */

export function DaySkeleton() {
  return (
    <div className="page" aria-busy="true" aria-live="polite" aria-label="Bezig met laden">
      <div className="sk sk--titel" />
      <div className="sk sk--regel" style={{ width: '58%', marginBottom: 22 }} />

      <div className="sk sk--blok" />

      <div className="sk sk--regel" style={{ width: '70%', margin: '18px 0 20px' }} />

      {[0, 1, 2].map((i) => (
        <div key={i} className="sk-rij">
          <div className="sk sk--tijd" />
          <div className="grow">
            <div className="sk sk--regel" style={{ width: `${68 - i * 12}%` }} />
            <div className="sk sk--regel sk--klein" style={{ width: `${44 - i * 6}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
