/** Piepkleine testhulp: geen framework nodig voor dit aantal controles. */
let failures = 0;
let total = 0;

export function check(what: string, actual: unknown, expected: unknown): void {
  total++;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(`  ✗ ${what}\n      verwacht: ${JSON.stringify(expected)}\n      kreeg:    ${JSON.stringify(actual)}`);
  } else {
    console.log(`  ✓ ${what}`);
  }
}

export function report(name: string): void {
  console.log(`${failures === 0 ? '✓' : '✗'} ${name}: ${total - failures}/${total} goed\n`);
  if (failures > 0) process.exitCode = 1;
}
