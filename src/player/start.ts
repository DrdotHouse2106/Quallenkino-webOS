import type { Api, Item } from '../api/items'
import type { Router } from '../nav/router'
import { t } from '../i18n'
import { toast } from '../ui/Toast'
import { episodeToPlay } from './playback'

/**
 * „Abspielen“: Serie → nächste bzw. erste Folge; sonst der Titel selbst, an der gemerkten Stelle
 * fortgesetzt (Weiterschauen).
 */
export async function startPlayback(api: Api, router: Router, target: Item, fromStart = false) {
  let playable: Item | null = target
  if (target.Type === 'Series' || target.Type === 'Season') playable = await episodeToPlay(api, target)
  if (!playable) {
    toast(t.playbackFailed)
    return
  }
  const resumeTicks = fromStart ? 0 : playable.UserData?.PlaybackPositionTicks ?? 0
  router.push({ name: 'player', id: playable.Id, startTicks: resumeTicks > 0 ? resumeTicks : undefined })
}
