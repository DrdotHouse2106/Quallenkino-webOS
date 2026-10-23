import type { Item } from '../api/items'
import type { Router } from './router'

/** Passende Seite zu einem Eintrag: Welt, Sendung → Programm-Details, Sender → einschalten, sonst Detailseite. */
export function openItem(router: Router, item: Item) {
  if (item.World) router.push({ name: 'world', id: item.World.Id })
  else if (item.Series) router.push({ name: 'movieSeries', id: item.Series.Id })
  else if (item.Upcoming || item.UpcomingEpisode) router.push({ name: 'upcoming', item })
  else if (item.Seerr?.type === 'person') router.push({ name: 'seerrPerson', id: item.Seerr.id })
  else if (item.Seerr?.jellyfinId) router.push({ name: 'details', id: item.Seerr.jellyfinId })
  else if (item.Seerr) router.push({ name: 'request', type: item.Seerr.type, id: item.Seerr.id })
  else if (item.Type === 'Program') router.push({ name: 'program', id: item.Id })
  else if (item.Type === 'TvChannel') router.push({ name: 'player', id: item.Id })
  // Staffel: Serienseite mit dieser Staffel (BACK führt dann zur Serie, nicht zur Startseite)
  else if (item.Type === 'Season' && item.SeriesId) router.push({ name: 'details', id: item.SeriesId, season: item.Id })
  else router.push({ name: 'details', id: item.Id })
}
