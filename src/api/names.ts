/**
 * Namen vergleichbar machen (wie in der Android-App): typografische Apostrophe und Anführungszeichen
 * vereinheitlicht, Akzente entfernt, Kleinschreibung, Leerzeichen zusammengefasst.
 * So passt z. B. „Elyas M’Barek“ aus den Programmdaten zu „Elyas M'Barek“ auf dem Server.
 */
export function normalizeName(name: string): string {
  return name
    .replace(/[‘’‚‛′´`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
