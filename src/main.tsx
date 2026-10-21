import { render } from 'preact'
import { init } from '@noriginmedia/norigin-spatial-navigation'
import { App } from './app'
import { ToastHost } from './ui/Toast'
import { installBackHandling } from './nav/keys'
import { installSystemScreensaverGuard } from './platform/systemScreensaver'
import { registerKeys } from './platform/platform'
import './styles.css'

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
