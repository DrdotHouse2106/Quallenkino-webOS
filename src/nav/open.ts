import type { Item } from '../api/items'
import type { Router } from './router'

/** Passende Seite zu einem Eintrag: Welt, Sendung → Programm-Details, Sender → einschalten, sonst Detailseite. */
export function openItem(router: Router, item: Item) {
  if (item.World) router.push({ name: 'world', id: item.World.Id })
  else if (item.Type === 'Program') router.push({ name: 'program', id: item.Id })
  else if (item.Type === 'TvChannel') router.push({ name: 'player', id: item.Id })
  else router.push({ name: 'details', id: item.Id })
}
