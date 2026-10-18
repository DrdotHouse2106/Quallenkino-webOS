import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import type { Api, Item } from '../api/items'
import { backdropUrl, logoUrl } from '../api/images'
import { TrailerVideo } from './TrailerVideo'
import { cleanOverview, facts, subtitle, title } from './format'

interface HeroBackdropProps {
  api: Api
  item: Item | null
  trailerUrl: string | null
  onTrailerEnd: () => void
  onTrailerPlaying: (playing: boolean) => void
  /** Anderes Bild statt des Hintergrundbilds (z. B. Bild einer Sendung). */
  image?: string | null
}

/** Bild oben rechts (bzw. Trailer), nach links und unten in Schwarz auslaufend. */
export function HeroBackdrop({ api, item, trailerUrl, onTrailerEnd, onTrailerPlaying, image }: HeroBackdropProps) {
  const url = image !== undefined ? image : item ? backdropUrl(api, item) : null
  return (
    <div class="qk-hero-backdrop">
      {url && <img key={url} class="qk-fade-in" src={url} alt="" />}
      {trailerUrl && <TrailerVideo key={trailerUrl} url={trailerUrl} onEnded={onTrailerEnd} onPlayingChange={onTrailerPlaying} />}
      {/* Verläufe liegen über Bild UND Video, damit Text lesbar bleibt */}
      <div class="qk-hero-shade-top" />
      <div class="qk-hero-shade-left" />
      <div class="qk-hero-shade-bottom" />
    </div>
  )
}

interface HeroInfoProps {
  api: Api
  item: Item
  reason?: string
  /** Nachgeladene Beschreibung, falls die Reihe keine mitliefert. */
  overview?: string
  children?: ComponentChildren
}

/** Infobereich: Logo bzw. Titel, Begründung, Eckdaten, Beschreibung. */
export function HeroInfo({ api, item, reason, overview, children }: HeroInfoProps) {
  const logo = logoUrl(api, item)
  const [logoFailed, setLogoFailed] = useState(false)
  const sub = subtitle(item)
  const text = cleanOverview(item.Overview || overview)
  const list = facts(item)
  return (
    <div class="qk-hero-info" key={item.Id}>
      {logo && !logoFailed
        ? <img class="qk-hero-logo" src={logo} alt={title(item)} onError={() => setLogoFailed(true)} />
        : <div class="qk-hero-title">{title(item)}</div>}
      {sub && <div class="qk-hero-subtitle">{sub}</div>}
      {reason && <div class="qk-hero-reason">{reason}</div>}
      {list.length > 0 && <div class="qk-hero-facts">{list.join('  ·  ')}</div>}
      {text && <div class={`qk-hero-overview ${reason ? 'short' : ''}`}>{text}</div>}
      {children}
    </div>
  )
}
