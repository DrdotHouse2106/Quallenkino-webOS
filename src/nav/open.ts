import type { Item } from '../api/items'
import type { Router } from './router'

/** Passende Seite zu einem Eintrag: Sendung → Programm-Details, Sender → einschalten, sonst Detailseite. */
export function openItem(router: Router, item: Item) {
  if (item.Type === 'Program') router.push({ name: 'program', id: item.Id })
  else if (item.Type === 'TvChannel') router.push({ name: 'player', id: item.Id })
  else router.push({ name: 'details', id: item.Id })
}
