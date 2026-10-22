import { useEffect, useState } from 'preact/hooks'
import type { Api } from '../api/items'
import { seriesCaption, seriesDetail, seriesImage, type SeriesDetail } from '../api/sections'
import { HeroBackdrop } from '../home/Hero'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { focusSoon } from '../nav/focus'
import { startPlayback } from '../player/start'
import { ActionButton } from './ActionButton'
import { Page } from './Page'

/**
 * Seite einer Filmreihe (wie im Web): Bild und Name der Reihe, „x von y gesehen“, Knopf „Weiter mit Teil n“
 * (spielt direkt ab bzw. setzt fort) und alle Teile in Erscheinungsreihenfolge, gesehene mit Haken.
 */
export function MovieSeriesPage({ api, id }: { api: Api; id: string }) {
  const router = useRouter()
  const [series, setSeries] = useState<SeriesDetail | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    seriesDetail(api, id).then(result => {
      if (!active) return
      setSeries(result)
      if (result?.Parts.length) focusSoon('series-continue')
    })
    return () => {
      active = false
    }
  }, [id])

  const next = series ? series.Parts[Math.min(series.NextIndex, series.Parts.length - 1)] : undefined
  const allWatched = !!series && series.Total > 0 && series.Watched >= series.Total
  const label = allWatched ? t.seriesFromStart : t.seriesContinue((series?.NextIndex ?? 0) + 1)
  const backdropItem = next ?? series?.Parts[0] ?? null
  const image = series ? seriesImage(api, series) : null
  return (
    <Page focusKey="movie-series" class="qk-details qk-world-page">
      <HeroBackdrop api={api} item={backdropItem} image={image ?? undefined} trailerUrl={null} onTrailerEnd={() => {}} onTrailerPlaying={() => {}} />
      <div class="qk-page-main">
        <div class="qk-series-head">
          <div class="qk-hero-title">{series?.Name ?? ''}</div>
          {series && <div class="qk-hero-facts">{seriesCaption(series)}</div>}
          {series === undefined && <p class="qk-muted">{t.loading}</p>}
          {series === null && <p class="qk-muted">{t.detailsFailed}</p>}
          {series && next && (
            <div class="qk-series-actions">
              <ActionButton focusKey="series-continue" icon="play" label={label}
                onPress={() => startPlayback(api, router, allWatched ? series.Parts[0] : next)} />
            </div>
          )}
        </div>
        <div class="qk-rows qk-page-rows">
          {series && series.Parts.length > 0 && (
            <Row api={api} row={{ key: 'series-parts', title: t.seriesParts(series.Parts.length), items: series.Parts, kind: 'posters' }}
              onFocusItem={() => {}} onOpen={part => router.push({ name: 'details', id: part.Id })} />
          )}
        </div>
      </div>
    </Page>
  )
}
