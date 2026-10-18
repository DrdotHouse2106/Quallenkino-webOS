import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'preact/hooks'
import type { Api } from '../api/items'
import { person as loadPerson, profileUrl, resultCard, type PersonDetails } from '../api/jellyseerr'
import { initials, Row } from '../home/Rows'
import { cleanOverview } from '../home/format'
import { t } from '../i18n'
import { openItem } from '../nav/open'
import { useRouter } from '../nav/router'
import { formatDate } from '../pages/PersonPage'
import { Page } from '../pages/Page'
import { Img } from '../ui/Img'

/** Person aus Jellyseerr (z. B. aus der Besetzung einer Sendung): Foto, Geburtstag, Biografie, Filme, Serien. */
export function SeerrPersonPage({ api, id }: { api: Api; id: number }) {
  const router = useRouter()
  const [person, setPerson] = useState<PersonDetails | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    loadPerson(api, id)
      .then(loaded => {
        setPerson(loaded)
        const first = loaded.movies.length ? 'row-sp-movies' : 'row-sp-series'
        requestAnimationFrame(() => setFocus(first))
      })
      .catch(() => setFailed(true))
  }, [id])

  const born = formatDate(person?.birthday)
  return (
    <Page focusKey="seerr-person" class="qk-person-page">
      <div class="qk-page-main">
        {failed && <p class="qk-error">{t.detailsFailed}</p>}
        <div class="qk-person-head">
          <div class="qk-person-photo large"><Img src={profileUrl(person?.profilePath)} lazy={false} fallback={<span>{initials(person?.name ?? '')}</span>} /></div>
          <div class="qk-person-info">
            <div class="qk-hero-title">{person?.name}</div>
            {(born || person?.placeOfBirth) && <div class="qk-hero-facts">{[born && t.born(born), person?.placeOfBirth].filter(Boolean).join('  ·  ')}</div>}
            {person?.biography && <div class="qk-hero-overview long">{cleanOverview(person.biography)}</div>}
          </div>
        </div>
        <div class="qk-rows qk-page-rows">
          {person && person.movies.length > 0 && <Row api={api} row={{ key: 'sp-movies', title: t.movies, items: person.movies.map(resultCard), kind: 'posters' }} onFocusItem={() => {}} onOpen={item => openItem(router, item)} />}
          {person && person.series.length > 0 && <Row api={api} row={{ key: 'sp-series', title: t.series, items: person.series.map(resultCard), kind: 'posters' }} onFocusItem={() => {}} onOpen={item => openItem(router, item)} />}
        </div>
      </div>
    </Page>
  )
}
