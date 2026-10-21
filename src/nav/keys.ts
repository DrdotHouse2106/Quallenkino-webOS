/**
 * Tasten der Fernbedienung – LG (webOS), Samsung (Tizen: Zurück 10009, Play/Pause-Kombitaste 10252) – und
 * Entsprechungen auf der Tastatur zum Testen im Browser.
 */
export const Keys = {
  back: [461, 10009, 27, 8],
  enter: [13],
  play: [415],
  pause: [19],
  playPause: [10252],
  stop: [413],
  fastForward: [417],
  rewind: [412],
} as const

export function isBack(event: KeyboardEvent): boolean {
  return (Keys.back as readonly number[]).includes(event.keyCode)
}

type BackHandler = () => boolean

const handlers: BackHandler[] = []

/** „Zurück“ abfangen: der zuletzt angemeldete Handler kommt zuerst dran. Gibt eine Abmeldung zurück. */
export function onBack(handler: BackHandler): () => void {
  handlers.push(handler)
  return () => {
    const index = handlers.lastIndexOf(handler)
    if (index >= 0) handlers.splice(index, 1)
  }
}

export function installBackHandling() {
  window.addEventListener('keydown', event => {
    if (!isBack(event)) return
    // In Textfeldern löscht die Rücktaste Zeichen – nicht als „Zurück“ werten
    const target = event.target as HTMLElement | null
    if (event.keyCode === 8 && target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    for (let i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i]()) {
        event.preventDefault()
        return
      }
    }
  })
}
