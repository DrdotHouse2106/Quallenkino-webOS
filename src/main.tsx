import { render } from 'preact'
import { init } from '@noriginmedia/norigin-spatial-navigation'
import { App } from './app'
import { ToastHost } from './ui/Toast'
import { installBackHandling } from './nav/keys'
import { installSystemScreensaverGuard } from './platform/systemScreensaver'
import { isTizen, registerKeys } from './platform/platform'
import { installErrorOverlay } from './platform/errorOverlay'
import './styles.css'

// Samsung: Fehler sichtbar machen (keine einfach erreichbare Konsole)
if (isTizen) installErrorOverlay()

// Fernbedienung: Pfeiltasten bewegen den Fokus; Magic-Remote-Zeiger setzt ihn per Hover
init({ debug: false, visualDebug: false, shouldFocusDOMNode: false })
installBackHandling()
// Samsung: Medien- und Farbtasten anmelden (sonst kommen sie nicht an)
registerKeys()
// LG-Schoner zurückhalten, solange der eigene Bildschirmschoner eingeschaltet ist
installSystemScreensaverGuard()

render(
  <>
    <App />
    <ToastHost />
  </>,
  document.getElementById('app')!,
)
