import { render } from 'preact'
import { init } from '@noriginmedia/norigin-spatial-navigation'
import { App } from './app'
import { ToastHost } from './ui/Toast'
import { installBackHandling } from './nav/keys'
import './styles.css'

// Fernbedienung: Pfeiltasten bewegen den Fokus; Magic-Remote-Zeiger setzt ihn per Hover
init({ debug: false, visualDebug: false, shouldFocusDOMNode: false })
installBackHandling()

render(
  <>
    <App />
    <ToastHost />
  </>,
  document.getElementById('app')!,
)
