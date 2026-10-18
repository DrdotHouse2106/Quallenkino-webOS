import { describe, expect, it } from 'vitest'
import { airing, creditLines, relative, programProgress } from '../src/api/livetv'
import { normalizeName } from '../src/api/names'
import { pickTrailer, statusOf, toResult } from '../src/api/jellyseerr'
import { collectionTitle } from '../src/api/worlds'
import { guideStart, programAt } from '../src/livetv/GuidePage'
import { pickAudio, pickSubtitle } from '../src/player/tracks'
import { youtubeKey } from '../src/pages/YouTubePage'
import { pickTeaser } from '../src/home/Screensaver'
import { withoutResumed } from '../src/home/useHomeData'
import { blockSystemScreensaver } from '../src/platform/systemScreensaver'

describe('Live-TV', () => {
  const now = new Date(2026, 9, 18, 18, 0)
  it('relative Zeit wie Android (ab 59,5 Min. Stunden)', () => {
    expect(relative(new Date(2026, 9, 18, 18, 20), now)).toBe('in 20 Minuten')
    expect(relative(new Date(2026, 9, 18, 18, 59, 40), now)).toBe('in 1 Stunde')
    expect(relative(new Date(2026, 9, 18, 20, 15), now)).toBe('in 2 Stunden')
    expect(relative(new Date(2026, 9, 18, 17, 59), now)).toBe('vor 1 Minute')
  })

  it('Zeile unter der Sendung', () => {
    const later = { Id: 'p', StartDate: new Date(2026, 9, 18, 20, 15).toISOString(), EndDate: new Date(2026, 9, 18, 21, 45).toISOString(), ChannelName: 'Das Erste' }
    expect(airing(later, now)).toBe('Heute 20:15–21:45 · in 2 Stunden · Das Erste')
    const running = { Id: 'r', StartDate: new Date(2026, 9, 18, 17, 30).toISOString(), EndDate: new Date(2026, 9, 18, 18, 25).toISOString(), ChannelName: 'ZDF' }
    expect(airing(running, now)).toBe('Läuft · noch 25 Min. · ZDF')
    expect(programProgress(running, now.getTime())).toBeCloseTo(54.5, 0)
  })

  it('Besetzung als Zeilen (höchstens vier Darsteller)', () => {
    const lines = creditLines({ directors: ['Bora Dağtekin'], actors: [{ name: 'A', role: 'X' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }], writers: [] })
    expect(lines).toEqual(['Regie: Bora Dağtekin', 'Mit: A (X), B, C, D'])
    expect(creditLines(null)).toEqual([])
  })

  it('Programmführer: Start auf :00/:30, Sendung zur Zeit', () => {
    expect(guideStart(new Date(2026, 9, 18, 18, 44)).getMinutes()).toBe(30)
    const list = [
      { Id: 'a', StartDate: new Date(2026, 9, 18, 17, 0).toISOString(), EndDate: new Date(2026, 9, 18, 18, 30).toISOString() },
      { Id: 'b', StartDate: new Date(2026, 9, 18, 18, 30).toISOString(), EndDate: new Date(2026, 9, 18, 19, 0).toISOString() },
    ]
    expect(programAt(list, now)).toBe(0)
    expect(programAt(list, new Date(2026, 9, 18, 18, 45))).toBe(1)
    expect(programAt([], now)).toBe(-1)
  })

  it('Namen vergleichbar (M’Barek)', () => {
    expect(normalizeName('Elyas M’Barek')).toBe(normalizeName("elyas  m'barek"))
    expect(normalizeName('Zoë Kravitz')).toBe('zoe kravitz')
  })
})

describe('Jellyseerr', () => {
  it('Stand wie Android', () => {
    expect([5, 4, 3, 2, 1, undefined].map(statusOf)).toEqual(['available', 'partial', 'requested', 'requested', 'none', 'none'])
  })

  it('Ergebnisse: nur Filme und Serien', () => {
    expect(toResult({ id: 1, mediaType: 'person', name: 'X' })).toBeNull()
    expect(toResult({ id: 2, mediaType: 'tv', name: 'Dark', firstAirDate: '2017-12-01', mediaInfo: { status: 5 } })).toMatchObject({ type: 'tv', title: 'Dark', year: '2017', status: 'available' })
  })
})

describe('Jellyseerr-Trailer', () => {
  const yt = (key: string, type: string, name: string, lang?: string) => ({ site: 'YouTube', key, type, name, iso_639_1: lang })
  it('deutsch zuerst, Trailer vor Teaser', () => {
    expect(pickTrailer([yt('a', 'Teaser', 'Teaser', 'de'), yt('b', 'Trailer', 'Official Trailer', 'en'), yt('c', 'Trailer', 'Trailer Deutsch', 'en')])).toEqual({ key: 'c', label: '' })
  })
  it('Kennzeichnung fremder Sprachen', () => {
    expect(pickTrailer([yt('a', 'Trailer', 'Official Trailer', 'en')])).toEqual({ key: 'a', label: 'EN' })
    expect(pickTrailer([yt('a', 'Trailer', 'Trailer', 'ja')], 'ja')).toEqual({ key: 'a', label: 'OmU' })
    expect(pickTrailer([{ site: 'Vimeo', key: 'x', type: 'Trailer' }])).toBeUndefined()
  })
})

describe('Welten und Einstellungen', () => {
  it('Sammlungsname ohne „Filmreihe“', () => {
    expect(collectionTitle('Iron Man Filmreihe')).toBe('Iron Man')
    expect(collectionTitle('Star Wars Collection')).toBe('Star Wars')
  })

  const source = {
    Id: 'm',
    DefaultAudioStreamIndex: 1,
    MediaStreams: [
      { Index: 1, Type: 'Audio', Language: 'ger', Codec: 'ac3' },
      { Index: 2, Type: 'Audio', Language: 'eng', Codec: 'eac3' },
      { Index: 3, Type: 'Subtitle', Language: 'ger' },
      { Index: 4, Type: 'Subtitle', Language: 'ger', IsForced: true },
    ],
  }
  it('Ton: Originalton wählt die fremde Spur', () => {
    expect(pickAudio(source, 'own')).toBe(1)
    expect(pickAudio(source, 'original')).toBe(2)
  })
  it('Untertitel: intelligent, immer, aus', () => {
    expect(pickSubtitle(source, 1, 'smart')).toBe(4)
    expect(pickSubtitle(source, 1, 'always')).toBe(3)
    expect(pickSubtitle(source, 2, 'off')).toBe(-1)
  })
})

describe('YouTube', () => {
  it('Id aus Trailer-Adressen', () => {
    expect(youtubeKey('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeKey('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeKey('https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0')).toBe('dQw4w9WgXcQ')
    expect(youtubeKey('https://vimeo.com/123')).toBeNull()
  })
})

describe('Bildschirmschoner', () => {
  const v = (Id: string, seconds?: number, Name = Id) => ({ Id, Name, RunTimeTicks: seconds === undefined ? undefined : seconds * 10_000_000 })
  it('Teaser wie Android: Name, sonst kürzestes Video bis 100 s, sonst erster Trailer', () => {
    expect(pickTeaser([v('t1', 150), v('t2', 140, 'Teaser 2')], [])?.Id).toBe('t2')
    expect(pickTeaser([v('t1', 150)], [v('e1', 90), v('e2', 60)])?.Id).toBe('e2')
    expect(pickTeaser([v('t1', 150)], [v('e1', 600)])?.Id).toBe('t1')
    expect(pickTeaser([], [])).toBeNull()
  })
})

describe('LG-Bildschirmschoner', () => {
  it('nur zurückhalten, wenn die App sichtbar und der eigene Schoner an ist', () => {
    expect(blockSystemScreensaver(true, 5)).toBe(true)
    expect(blockSystemScreensaver(true, 0)).toBe(false)
    expect(blockSystemScreensaver(false, 5)).toBe(false)
  })
})

describe('Startseite', () => {
  it('„Als Nächstes“ ohne Titel und Serien aus „Weiterschauen“', () => {
    const row = (key: string, items: { Id: string; SeriesId?: string }[]) => ({ key, title: key, kind: 'cards' as const, items })
    const result = withoutResumed(row('nextup', [{ Id: 'e1', SeriesId: 's1' }, { Id: 'e2', SeriesId: 's2' }, { Id: 'm1' }]), row('resume', [{ Id: 'e9', SeriesId: 's1' }, { Id: 'm1' }]))
    expect(result?.items.map(i => i.Id)).toEqual(['e2'])
  })
})
