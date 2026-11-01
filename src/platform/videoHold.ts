/**
 * Merkt sich, ob gerade irgendwo ein Video läuft (z. B. ein YouTube-Trailer im iframe, dessen Zustand
 * sich nicht über das DOM ablesen lässt). Solange das so ist, startet kein Bildschirmschoner – sonst
 * liefen zwei Trailer mit Ton gleichzeitig.
 */
let holds = 0

/** Hält den Bildschirmschoner zurück; die zurückgegebene Funktion gibt ihn wieder frei (mehrfach aufrufbar). */
export function holdScreensaver(): () => void {
  holds++
  let released = false
  return () => {
    if (released) return
    released = true
    holds--
  }
}

/** Läuft gerade ein Video – ein angehaltenes oder beendetes zählt nicht. */
export function videoActive(doc: Pick<Document, 'querySelectorAll'> = document): boolean {
  if (holds > 0) return true
  return Array.from(doc.querySelectorAll('video')).some(v => !v.paused && !v.ended)
}
