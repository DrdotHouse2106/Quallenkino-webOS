import { useEffect, useState } from 'preact/hooks'
import { available as jellyseerrAvailable } from '../api/jellyseerr'
import type { Api, Item } from '../api/items'
import { episodeLine, episodeWhen } from '../api/sections'
import { HeroBackdrop, HeroInfo } from '../home/Hero'
import { t } from '../i18n'
import { focusSoon } from '../nav/focus'
import { useRouter } from '../nav/router'
import { ActionButton } from './ActionButton'
import { Page } from './Page'

/**
 * Eintrag aus „Demnächst“ wie im Web (Plugin ab 12.49):
 * - Folge: Serie, „SxxEyy · Folgentitel“, „Samstag, 24.10.2026 · 21:00 Uhr · Sender“, Beschreibung, Hinweis auf
 *   weitere neue Folgen und Knopf „Zur Serie“.
 * - Film: Titel, Jahr, Termin und Beschreibung (es wird nichts angefragt).
 */
export function UpcomingPage({ api, item }: { api: Api; item: Item }) {
  const router = useRouter()
  const episode = item.UpcomingEpisode
  // „Anfragen …“ nur mit erreichbarem Jellyseerr
  const [canRequest, setCanRequest] = useState(false)
  useEffect(() => {
    if (!item.Discover || item.Discover.inLibrary) return
    let active = true
    jellyseerrAvailable(api).then(ok => {
      if (!active) return
      setCanRequest(ok)
      if (ok) focusSoon('discover-request')
    })
    return () => {
      active = false
    }
  }, [item])
  useEffect(() => {
    if (episode) focusSoon('upcoming-series')
    else if (item.Discover?.trailerKey) focusSoon('discover-trailer')
  }, [item])
  return (
    <Page focusKey="upcoming" class="qk-details">
      <HeroBackdrop api={api} item={item} trailerUrl={null} onTrailerEnd={() => {}} onTrailerPlaying={() => {}} />
      <div class="qk-page-main">
        {episode ? (
          <div class="qk-hero-info">
            <div class="qk-hero-title">{episode.seriesName}</div>
            {episode.subtitle && <div class="qk-hero-reason">{episode.subtitle}</div>}
            {episodeLine(episode) && <div class="qk-hero-subtitle">{episodeLine(episode)}</div>}
            {episodeWhen(episode) && <div class="qk-hero-facts">{episodeWhen(episode)}</div>}
            {episode.overview && <div class="qk-hero-overview long">{episode.overview}</div>}
            {/* „Danach: S03E06 am So. 01.11.“ vom Server, sonst nur die Anzahl */}
            {episode.nextAfter ? <div class="qk-hero-facts">{episode.nextAfter}</div> : episode.more ? <div class="qk-hero-facts">{t.upcomingMore(episode.more)}</div> : null}
            <div class="qk-series-actions">
              <ActionButton focusKey="upcoming-series" icon="info" label={t.toSeries} onPress={() => router.push({ name: 'details', id: episode.seriesId })} />
            </div>
          </div>
        ) : item.Discover ? (
          <HeroInfo api={api} item={item} reason={item.Discover.releaseText} overview={item.Overview}>
            {item.Discover.providers.length > 0 && <div class="qk-hero-subtitle">{t.discoverProviders(item.Discover.providers.join(', '))}</div>}
            {/* Kinofilm vor dem Start: Anfrage wartet, bis er digital zu haben ist */}
            {canRequest && !item.Discover.released && item.Discover.mediaType === 'movie' && <div class="qk-hero-facts">{t.discoverAfterCinema}</div>}
            {(canRequest || item.Discover.trailerKey) && (
              <div class="qk-series-actions">
                {/* Öffnet die Anfrage-Seite (Status, Staffelwahl) – angefragt wird erst dort per Knopf */}
                {canRequest && <ActionButton focusKey="discover-request" icon="add" label={t.discoverRequest} onPress={() => router.push({ name: 'request', type: item.Discover!.mediaType, id: item.Discover!.tmdbId })} />}
                {item.Discover.trailerKey && <ActionButton focusKey="discover-trailer" icon="trailer" label={t.discoverTrailer} onPress={() => router.push({ name: 'youtube', key: item.Discover!.trailerKey! })} />}
              </div>
            )}
          </HeroInfo>
        ) : (
          <HeroInfo api={api} item={item} reason={item.Caption} overview={item.Overview} />
        )}
      </div>
    </Page>
  )
}
