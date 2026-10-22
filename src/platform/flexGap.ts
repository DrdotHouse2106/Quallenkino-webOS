/**
 * Samsung Tizen 5.5/6.0 (Chromium 69/76) kennt `gap` in Flexbox nicht. Für den Tizen-Build werden die
 * Abstände der Flex-Regeln deshalb in Ränder der Kinder umgerechnet (Spalte: oben, Zeile: links,
 * umbrechend: rechts und unten) und `gap` dort entfernt – sonst gäbe es auf neueren Modellen doppelte Abstände.
 */
export function flexGapFallback(css: string): string {
  const extra: string[] = []
  const out = css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector: string, body: string) => {
    if (!/display:\s*flex/.test(body)) return rule
    const gap = body.match(/(?:^|;)\s*gap:\s*([^;]+?)\s*(?:;|$)/)
    if (!gap) return rule
    const [row, column = row] = gap[1].split(/\s+/)
    const sel = selector.trim()
    if (/flex-wrap:\s*wrap/.test(body)) extra.push(`${sel} > * { margin: 0 ${column} ${row} 0; }`)
    else if (/flex-direction:\s*column/.test(body)) extra.push(`${sel} > * + * { margin-top: ${row}; }`)
    else extra.push(`${sel} > * + * { margin-left: ${column}; }`)
    return `${selector}{${body.replace(/(^|;)\s*gap:[^;]+;?/, '$1')}}`
  })
  return out + '\n' + extra.join('\n') + '\n'
}
