import { loadSettings } from '../settings'

/**
 * LG-Bildschirmschoner zurückhalten, solange Quallenkino im Vordergrund ist und der eigene
 * Bildschirmschoner eingeschaltet ist – sonst überdeckt der LG-Schoner den von Quallenkino.
 * webOS fragt über com.webos.service.tvpower an, bevor es seinen Schoner startet; die Antwort
 * ack:false hält ihn zurück, ack:true lässt ihn zu (z. B. wenn „Bildschirmschoner nach“ auf Aus steht).
 */
interface ServiceBridge {
  onservicecallback: (message: string) => void
  call: (uri: string, parameters: string) => void
  cancel?: () => void
}

const CLIENT = 'quallenkino'
const SERVICE = 'luna://com.webos.service.tvpower/power/'

type BridgeConstructor = new () => ServiceBridge
/** Verweise halten, damit die Anmeldung nicht vom Speicher aufgeräumt wird. */
let subscription: ServiceBridge | null = null
const pending = new Set<ServiceBridge>()

function bridgeClass(): BridgeConstructor | undefined {
  return (window as unknown as { PalmServiceBridge?: BridgeConstructor }).PalmServiceBridge
}

/** Soll der LG-Schoner jetzt zurückgehalten werden? */
export function blockSystemScreensaver(visible: boolean, minutes: number): boolean {
  return visible && minutes > 0
}

function respond(Bridge: BridgeConstructor, timestamp: unknown) {
  const ack = !blockSystemScreensaver(document.visibilityState === 'visible', loadSettings().screensaver)
  const bridge = new Bridge()
  pending.add(bridge)
  bridge.onservicecallback = () => pending.delete(bridge)
  bridge.call(`${SERVICE}responseScreenSaverRequest`, JSON.stringify({ clientName: CLIENT, ack, timestamp }))
}

/** Beim Start einmal aufrufen; außerhalb von webOS (Browser) passiert nichts. */
export function installSystemScreensaverGuard() {
  const Bridge = bridgeClass()
  if (!Bridge || subscription) return
  subscription = new Bridge()
  subscription.onservicecallback = message => {
    try {
      const data = JSON.parse(message) as { timestamp?: unknown }
      if (data.timestamp !== undefined) respond(Bridge, data.timestamp)
    } catch {
      // unbekannte Antwort – ignorieren
    }
  }
  subscription.call(`${SERVICE}registerScreenSaverRequest`, JSON.stringify({ subscribe: true, clientName: CLIENT }))
}
