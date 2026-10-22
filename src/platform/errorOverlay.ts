/**
 * Diagnose für Samsung (Tizen): Skriptfehler sichtbar unten auf den Bildschirm schreiben, weil es dort keine
 * einfach erreichbare Konsole gibt. Höchstens die letzten 3 Meldungen, jede verschwindet nach 20 Sekunden.
 * Gestaltung per CSSOM (nicht per style-Attribut), damit auch eine strenge Content-Security-Policy nicht stört.
 */
export function installErrorOverlay() {
  let box: HTMLDivElement | null = null

  function show(text: string) {
    if (!document.body) return
    if (!box) {
      box = document.createElement('div')
      const s = box.style
      s.position = 'fixed'
      s.left = '40px'
      s.right = '40px'
      s.bottom = '40px'
      s.zIndex = '9999'
      s.font = '22px monospace'
      s.color = '#fff'
      s.pointerEvents = 'none'
      document.body.appendChild(box)
    }
    const line = document.createElement('div')
    const s = line.style
    s.background = 'rgba(160, 20, 20, 0.92)'
    s.padding = '10px 16px'
    s.marginTop = '8px'
    s.borderRadius = '8px'
    s.whiteSpace = 'pre-wrap'
    line.textContent = `Quallenkino-Fehler: ${text}`.slice(0, 400)
    box.appendChild(line)
    while (box.childElementCount > 3) box.removeChild(box.firstChild!)
    setTimeout(() => line.remove(), 20_000)
  }

  window.addEventListener('error', event => {
    const where = event.filename ? ` (${event.filename.split('/').pop()}:${event.lineno}:${event.colno})` : ''
    show(`${event.message}${where}`)
  })
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason as { message?: string } | undefined
    show(`Promise: ${reason?.message ?? String(event.reason)}`)
  })
}
