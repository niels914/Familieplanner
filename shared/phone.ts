/**
 * Telefoonnummers voor WhatsApp. De link `https://wa.me/<nummer>` wil het hele
 * nummer met landcode, zonder plus, nullen of spaties: 06 12065600 wordt
 * 31612065600. Een nummer zonder landcode behandelen we als Nederlands.
 */

/** Het nummer zoals WhatsApp het wil, of null als het geen WhatsApp-nummer lijkt. */
export function whatsappNumber(phone: string | undefined): string | null {
  if (!phone) return null;

  // "+31 (0)6 12345678": die (0) hoort er niet bij.
  let text = phone.replace(/\(0\)/g, '').trim();
  const plus = text.startsWith('+');
  let digits = text.replace(/\D/g, '');
  if (digits === '') return null;

  if (plus) {
    // al met landcode
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = `31${digits.slice(1)}`;
  } else {
    return null; // zonder 0 of landcode is niet te raden
  }

  if (digits.length < 8 || digits.length > 15) return null;

  // Een Nederlands vast nummer (010, 0481, 088...) heeft geen WhatsApp. Mobiel is 06.
  if (digits.startsWith('31') && !/^316\d{8}$/.test(digits)) return null;

  return digits;
}

/** De link die WhatsApp opent met een gesprek met dit nummer. */
export function whatsappLink(phone: string | undefined): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}` : null;
}
