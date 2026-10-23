import type { Api, Item } from '../api/items'
import { HeroBackdrop, HeroInfo } from '../home/Hero'
import { Page } from './Page'

/**
 * Film aus „Demnächst“ (noch nicht auf dem Server, Plugin ab 12.48): Titel, Jahr und Beschreibung wie im Web.
 * Es wird nichts angefragt; „Zurück“ schließt die Seite.
 */
export function UpcomingPage({ api, item }: { api: Api; item: Item }) {
  return (
    <Page focusKey="upcoming" class="qk-details">
      <HeroBackdrop api={api} item={item} trailerUrl={null} onTrailerEnd={() => {}} onTrailerPlaying={() => {}} />
      <div class="qk-page-main">
        <HeroInfo api={api} item={item} reason={item.Caption} overview={item.Overview} />
      </div>
    </Page>
  )
}
