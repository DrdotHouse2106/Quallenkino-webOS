import { setFocus } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useState } from 'preact/hooks'
import { get, item as loadItem, personItems, searchPeople, type Api, type Item } from '../api/items'
import { thumbUrl } from '../api/images'
import { airing, credits as loadCredits, creditLines, program as loadProgram, setFavorite, type Credits } from '../api/livetv'
import { normalizeName } from '../api/names'
import { findPerson as findSeerrPerson } from '../api/jellyseerr'
import { cleanOverview } from '../home/format'
import { HeroBackdrop } from '../home/Hero'
import { Row } from '../home/Rows'
import { t } from '../i18n'
import { useRouter } from '../nav/router'
import { ActionButton, ActionRow } from '../pages/ActionButton'
import { Page } from '../pages/Page'
import { toast } from '../ui/Toast'

/** Person zu einem Namen aus den Programmdaten: nur bei genau passendem Namen. */
async function findPerson(api: Api, name: string): Promise<Item | null> {
  const wanted = normalizeName(name)
  const found = await searchPeople(api, name)
  return found.find(p => normalizeName(p.Name ?? '') === wanted) ?? null
}

/**
 * Sendung im Detail (wie die Programm-Detailseite der Android-App): Zeit, Sender, Beschreibung,
 * Regie und Darsteller aus den Programmdaten (Plugin), Einschalten und Lieblingssender.
 */
export function ProgramPage({ api, id }: { api: Api; id: string }) {
  const router = useRouter()
  const [program, setProgram] = useState<Item | null>(null)
  const [channel, setChannel] = useState<Item | null>(null)
  const [credits, setCredits] = useState<Credits | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    loadProgram(api, id)
      .then(loaded => {
        if (!active) return
        setProgram(loaded)
        requestAnimationFrame(() => setFocus('p-watch'))
        if (loaded.ChannelId) loadItem(api, loaded.ChannelId).then(c => active && setChannel(c)).catch(() => {})
      })
      .catch(() => active && setFailed(true))
    loadCredits(api, id).then(value => active && setCredits(value))
    return () => {
      active = false
    }
  }, [id])

  async function toggleFavorite() {
    if (!channel) return
    const next = !channel.UserData?.IsFavorite
    try {
      await setFavorite(api, channel.Id, next)
      setChannel({ ...channel, UserData: { ...channel.UserData, IsFavorite: next } })
    } catch {
      toast(t.actionFailed)
    }
  }

  async function openPerson(name: string) {
    const person = await findPerson(api, name).catch(() => null)
    // Mit Titeln auf dem Server: deren Personenseite. Sonst die aus Jellyseerr mit ganzer Filmografie
    // (anfragbar) – ein Personeneintrag ohne Titel hilft nicht weiter.
    const owned = person ? (await Promise.all([personItems(api, person.Id, 'Movie'), personItems(api, person.Id, 'Series')])).flat().length : 0
    if (person && owned > 0) return router.push({ name: 'person', id: person.Id })
    // Die Person auf dem Server kennt ihre TMDB-Id – damit ist sie in Jellyseerr eindeutig
    const tmdb = person ? (await get<Item>(api, `/Users/${api.userId}/Items/${person.Id}?Fields=ProviderIds`).catch(() => null))?.ProviderIds?.Tmdb : undefined
    const seerrId = tmdb ? Number(tmdb) : await findSeerrPerson(api, name)
    if (seerrId) router.push({ name: 'seerrPerson', id: seerrId })
    else if (person) router.push({ name: 'person', id: person.Id })
    else toast(t.personNotFound(name))
  }

  // Darsteller und Regie als Kreise mit Initialen (die Programmdaten haben keine Fotos)
  const people: Item[] = credits
    ? [
        ...credits.directors.map((name, i) => ({ Id: `d${i}`, Name: name, Role: t.director })),
        ...credits.actors.map((a, i) => ({ Id: `a${i}`, Name: a.name, Role: a.role })),
      ]
    : []
  const meta = program ? [airing(program), program.ProductionYear, program.OfficialRating, program.Genres?.slice(0, 2).join(', ')].filter(Boolean) : []

  return (
    <Page focusKey="program" class="qk-details">
      {program && <HeroBackdrop api={api} item={program} image={thumbUrl(api, program, 1280)} trailerUrl={null} onTrailerEnd={() => {}} onTrailerPlaying={() => {}} />}
      <div class="qk-page-main">
        {failed && <p class="qk-error">{t.detailsFailed}</p>}
        {program && (
          <div class="qk-details-top">
            <div class="qk-hero-info">
              <div class="qk-hero-title">{program.Name}</div>
              {program.EpisodeTitle && <div class="qk-hero-subtitle">{program.EpisodeTitle}</div>}
              <div class="qk-hero-facts">{meta.join('  ·  ')}</div>
              {creditLines(credits).map(line => <div class="qk-hero-credits">{line}</div>)}
              {program.Overview && <div class="qk-hero-overview">{cleanOverview(program.Overview)}</div>}
            </div>
            <ActionRow focusKey="p-buttons">
              <ActionButton focusKey="p-watch" icon="liveTv" label={`${t.watchChannel}${program.ChannelName ? ` (${program.ChannelName})` : ''}`} onPress={() => program.ChannelId && router.push({ name: 'player', id: program.ChannelId })} />
              {channel && <ActionButton focusKey="p-favorite" icon="star" label={t.favoriteChannel} active={!!channel.UserData?.IsFavorite} onPress={toggleFavorite} />}
            </ActionRow>
          </div>
        )}
        <div class="qk-rows qk-page-rows">
          {people.length > 0 && (
            <Row api={api} row={{ key: 'p-cast', title: t.castAndCrew, items: people, kind: 'people' }} onFocusItem={() => {}} onOpen={person => openPerson(person.Name ?? '')} />
          )}
        </div>
      </div>
    </Page>
  )
}
