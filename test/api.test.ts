import { describe, expect, it } from 'vitest'
import { authorizationHeader, deviceId } from '../src/api/auth'
import { candidateUrls } from '../src/api/server'
import { isNewer } from '../src/api/update'
import { parseReminders, reminderKey } from '../src/api/reminders'
import { normalizeCatalog } from '../src/api/avatars'
import { reorderRows } from '../src/api/behavior'
import { withSession, withoutSession, type SavedState } from '../src/store'
import { mergeProfiles, tileColor } from '../src/screens/ProfileScreen'

describe('Server-Adresse', () => {
  it('Name ohne Schema: nur https (kein stilles http)', () => {
    expect(candidateUrls('kino.example.de')).toEqual(['https://kino.example.de', 'https://kino.example.de:8920'])
    expect(candidateUrls('http://kino.example.de')).toEqual(['http://kino.example.de'])
  })

  it('mit Port keine Zusatz-Ports', () => {
    expect(candidateUrls('kino.example.de:8443')).toEqual(['https://kino.example.de:8443'])
    expect(candidateUrls('192.168.1.10:8096/')).toEqual(['http://192.168.1.10:8096', 'https://192.168.1.10:8096'])
  })

  it('IP-Adresse: zuerst http mit Port 8096', () => {
    expect(candidateUrls('192.168.1.10')).toEqual([
      'http://192.168.1.10:8096',
      'http://192.168.1.10',
      'https://192.168.1.10:8920',
      'https://192.168.1.10',
    ])
  })

  it('mit Schema genau diese Adresse', () => {
    expect(candidateUrls(' http://jelly.local ')).toEqual(['http://jelly.local'])
    expect(candidateUrls('')).toEqual([])
  })
})

describe('Anmeldung', () => {
  it('Header mit App-Name und Token', () => {
    const header = authorizationHeader('qk-1', 'abc')
    expect(header).toContain('Client="Quallenkino"')
    expect(header).toContain('DeviceId="qk-1"')
    expect(header).toContain('Token="abc"')
  })

  it('Geräte-Id wird einmal erzeugt und gemerkt', () => {
    const data = new Map<string, string>()
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
    const first = deviceId(storage)
    expect(deviceId(storage)).toBe(first)
  })

  it('pro Profil eine Anmeldung', () => {
    const empty: SavedState = { sessions: [] }
    const a = withSession(empty, { userId: 'u1', name: 'A', token: 't1' })
    const b = withSession(a, { userId: 'u1', name: 'A', token: 't2' })
    expect(b.sessions).toHaveLength(1)
    expect(b.sessions[0].token).toBe('t2')
    expect(b.lastUserId).toBe('u1')
    expect(withoutSession(b, 'u1').sessions).toHaveLength(0)
  })

  it('feste Kachelfarbe pro Name', () => {
    expect(tileColor('Ulberding')).toBe(tileColor('Ulberding'))
  })
})

describe('Profile', () => {
  it('versteckte, hier angemeldete Profile kommen dazu, ohne doppelte', () => {
    const list = mergeProfiles([{ Id: 'a', Name: 'Anna' }], [{ Id: 'a', Name: 'Anna' }, { Id: 'b', Name: 'Ben' }])
    expect(list.map(u => u.Id)).toEqual(['a', 'b'])
  })
})

describe('Update-Prüfung', () => {
  it('vergleicht Versionen', () => {
    expect(isNewer('v1.0.10', '1.0.9')).toBe(true)
    expect(isNewer('1.1.0', '1.0.12')).toBe(true)
    expect(isNewer('v1.0.5', '1.0.5')).toBe(false)
    expect(isNewer('1.0.4', '1.0.5')).toBe(false)
  })
})

describe('Erinnerungen', () => {
  it('liest gemerkte Sendungen mit und ohne Bindestriche', () => {
    const list = parseReminders([
      { ProgramId: 'ABCDEF0123456789ABCDEF0123456789', IsSeries: true },
      { ProgramId: '11111111-2222-3333-4444-555555555555', IsSeries: false },
    ])
    expect(list.get('abcdef0123456789abcdef0123456789')).toBe(true)
    expect(list.get(reminderKey('11111111-2222-3333-4444-555555555555'))).toBe(false)
    expect(list.has('x')).toBe(false)
  })
})

describe('Profilbilder', () => {
  it('macht Bildadressen vollständig und lässt leere Kategorien weg', () => {
    const catalog = normalizeCatalog({
      Colors: ['#e50914'],
      Categories: [
        { Id: 'tiere', Name: 'Tiere', Icons: [{ Id: 'tiere/katze', Name: 'Katze', ImageUrl: 'LocalRecs/Avatars/Icons/tiere/katze' }, { Id: 'tiere/hund', Name: 'Hund', ImageUrl: 'https://cdn/hund.png' }] },
        { Id: 'leer', Name: 'Leer', Icons: [] },
      ],
    }, 'http://srv:8096/')
    expect(catalog.Categories).toHaveLength(1)
    expect(catalog.Categories[0].Icons[0].ImageUrl).toBe('http://srv:8096/LocalRecs/Avatars/Icons/tiere/katze')
    expect(catalog.Categories[0].Icons[1].ImageUrl).toBe('https://cdn/hund.png')
  })
})

describe('Tageszeit-Reihenfolge', () => {
  const kind = (key: string) => ({ 'recs-movies': 'movies', 'recs-series': 'series', tv: 'livetv' } as Record<string, string>)[key] ?? null
  it('tauscht nur die Plätze der Empfehlungszeilen', () => {
    expect(reorderRows(['resume', 'recs-movies', 'recs-series', 'tv', 'top10'], kind, ['livetv', 'series', 'movies']))
      .toEqual(['resume', 'tv', 'recs-series', 'recs-movies', 'top10'])
    expect(reorderRows(['resume', 'recs-movies'], kind, null)).toEqual(['resume', 'recs-movies'])
  })
})

describe('Banner vom Server', () => {
  it('übernimmt Reihenfolge und Badges', async () => {
    const { parseBillboard } = await import('../src/api/billboard')
    const result = parseBillboard({ Items: [{ Id: 'a1' }, {}, { Id: 'b2' }], Reasons: { 'B2-x': 'Neue Folgen', c: ' ' } })
    expect(result.ids).toEqual(['a1', 'b2'])
    expect(result.reasons).toEqual({ b2x: 'Neue Folgen' })
  })
})

describe('Filmreihen (Plugin ab 12.45)', () => {
  it('nimmt je Reihe den Teil zum Weiterschauen und die Begründung', async () => {
    const { parseMovieSeries } = await import('../src/api/sections')
    const result = parseMovieSeries({ Items: [{ Name: 'Reihe A', Reason: 'Weiter mit Teil 2', Next: { Id: 'AB-12', Name: 'Teil 2' } as never }, { Name: 'Ohne nächsten Teil' }] })
    expect(result.items.map(i => i.Id)).toEqual(['AB-12'])
    expect(result.reasons).toEqual({ ab12: 'Weiter mit Teil 2' })
  })
})

describe('Momente (Plugin ab 12.46)', () => {
  it('übernimmt Zeilen mit Titel und Begründungen, leere fallen weg', async () => {
    const { parseMoments } = await import('../src/api/sections')
    const rows = parseMoments({ Rows: [
      { Key: 'ontv', Title: 'Läuft heute im TV – hier ohne Werbung', Items: [{ Id: 'AB-12', Name: 'Film' } as never], Reasons: { 'AB-12': 'Heute 20:15 auf ZDF – hier ohne Werbung' } },
      { Key: 'leer', Title: 'Leer', Items: [] },
    ] })
    expect(rows.map(r => r.key)).toEqual(['ontv'])
    expect(rows[0].reasons).toEqual({ ab12: 'Heute 20:15 auf ZDF – hier ohne Werbung' })
  })
})

describe('Filmreihen-Karte', () => {
  it('Untertitel wie im Web', async () => {
    const { seriesCaption } = await import('../src/api/sections')
    expect(seriesCaption({ Id: '1', Name: 'R', Total: 4, Watched: 2, NextIndex: 2 })).toBe('2 von 4 gesehen · Weiter mit Teil 3')
    expect(seriesCaption({ Id: '1', Name: 'R', Total: 4, Watched: 0, NextIndex: 0, Reason: '4 Teile' })).toBe('4 Teile')
    expect(seriesCaption({ Id: '1', Name: 'R', Total: 3, Watched: 3, NextIndex: 0 })).toBe('Alle 3 Teile gesehen')
  })
})

describe('Demnächst (Plugin ab 12.48)', () => {
  it('Folgen als Serien-Karte, Filme mit eigenen Bildern', async () => {
    const { parseUpcoming } = await import('../src/api/sections')
    const items = parseUpcoming('http://srv:8096/', { Items: [
      { Kind: 'Episode', Title: 'Serie', Subtitle: 'Fr · S2 E3 „Titel“', Series: { Id: 'ser1', Name: 'Serie' } as never },
      { Kind: 'Movie', Title: 'Film', Subtitle: 'Kinostart 12.11.', Movie: { TmdbId: 42, Year: 2026, Overview: 'Text', BackdropUrl: 'LocalRecs/Upcoming/Movies/7/Images/Backdrop' } },
      { Kind: 'Movie', Title: 'Ohne Bild', Movie: { RadarrId: 8 } },
    ] })
    expect(items[0]).toMatchObject({ Id: 'ser1', Caption: 'Fr · S2 E3 „Titel“' })
    expect(items[1]).toMatchObject({ Id: 'upcoming-42', Upcoming: true, ProductionYear: 2026, ImageUrl: 'http://srv:8096/LocalRecs/Upcoming/Movies/7/Images/Backdrop' })
    expect(items[2].ImageUrl).toBeNull()
  })
})

describe('Demnächst: Folgen-Ansicht (Plugin ab 12.49)', () => {
  it('Folge mit Code, Termin und Sender', async () => {
    const { parseUpcoming, episodeLine, episodeWhen } = await import('../src/api/sections')
    const [item] = parseUpcoming('http://srv', { Items: [{ Kind: 'Episode', ReleaseType: 'SeasonPremiere', Title: 'Serie', Subtitle: 'Staffelstart morgen',
      Series: { Id: 'ser1', Name: 'Serie' } as never, SeasonNumber: 2, EpisodeNumber: 1, EpisodeTitle: 'Anfang', Date: '2026-10-24T19:00:00Z', Network: 'Paramount+', EpisodeOverview: 'Text', MoreEpisodes: 2 }] })
    const episode = item.UpcomingEpisode!
    expect(episodeLine(episode)).toBe('S02E01 · Anfang')
    expect(episodeWhen(episode, () => new Date(2026, 9, 24, 21, 0))).toBe('Samstag, 24.10.2026 · 21:00 Uhr · Paramount+')
    expect(episode.more).toBe(2)
    expect(item.Caption).toBe('Staffelstart morgen')
  })
})

describe('Serienseite: kommende und neue Folgen', () => {
  it('verbindet Text und MoreText, markiert NewToday', async () => {
    const { parseSeriesUpcoming } = await import('../src/api/sections')
    const info = parseSeriesUpcoming({
      Text: 'Staffelstart morgen · 19:00 Uhr · Paramount+ · S03E01 Der Anfang',
      MoreText: '+2 weitere bis 07.11.',
      NewText: 'Neu: S02E05',
      NewToday: [{ ItemId: 'C2B157EA3DC84584A30BCB96492EDA16' }],
    })
    expect(info?.next).toBe('Staffelstart morgen · 19:00 Uhr · Paramount+ · S03E01 Der Anfang · +2 weitere bis 07.11.')
    expect(info?.newText).toBe('Neu: S02E05')
    expect(info?.newIds).toEqual(['c2b157ea3dc84584a30bcb96492eda16'])
    expect(parseSeriesUpcoming(undefined)).toBeNull()
    expect(parseSeriesUpcoming({ Text: '' })).toBeNull()
  })
})

describe('Demnächst ab 12.52.2', () => {
  it('nimmt LocalTime und NextAfter vom Server', async () => {
    const { parseUpcoming, episodeWhen } = await import('../src/api/sections')
    const items = parseUpcoming('http://srv', {
      Items: [{
        Kind: 'Episode', Title: 'Serie', Date: '2026-10-24T13:30:00Z', LocalTime: '15:30 Uhr MESZ', Network: 'TBS (JP)',
        MoreEpisodes: 1, NextAfter: { Text: 'Danach: S03E06 am So. 01.11.' }, Series: { Id: 'c2b157ea3dc84584a30bcb96492eda16', Name: 'Serie', Type: 'Series' },
      }],
    } as never)
    const episode = items[0].UpcomingEpisode!
    expect(episode.nextAfter).toBe('Danach: S03E06 am So. 01.11.')
    expect(episodeWhen(episode)).toContain('15:30 Uhr MESZ · TBS (JP)')
  })
})

describe('HDR nur, wenn der Fernseher es kann', () => {
  it('ohne HDR werden alle HDR-Arten umgewandelt, mit HDR10 ohne DV nur Dolby Vision ohne Grundlage', async () => {
    const { hdrFromProbe, unsupportedRangeTypes, HDR_NONE } = await import('../src/player/hdr')
    expect(hdrFromProbe({ highDynamicRange: false, tizenHdr: null, dolbyVisionDecoder: true })).toEqual(HDR_NONE)
    expect(hdrFromProbe({ highDynamicRange: null, tizenHdr: null, dolbyVisionDecoder: false })).toEqual({ hdr10: true, hlg: true, dolbyVision: false })
    expect(unsupportedRangeTypes(HDR_NONE)).toContain('HDR10')
    expect(unsupportedRangeTypes(HDR_NONE)).toContain('DOVIWithHDR10')
    const hdr10Only = unsupportedRangeTypes({ hdr10: true, hlg: true, dolbyVision: false })
    expect(hdr10Only).toContain('DOVI')
    expect(hdr10Only).not.toContain('DOVIWithHDR10')
    expect(hdr10Only).not.toContain('HDR10')
  })

  it('Geräteprofil enthält den HDR-Ausschluss nur bei Bedarf', async () => {
    const { deviceProfile } = await import('../src/player/profile')
    const { HDR_NONE } = await import('../src/player/hdr')
    expect(deviceProfile(undefined, 'webos').CodecProfiles.some(p => p.Codec === 'hevc')).toBe(false)
    const hevc = deviceProfile(undefined, 'webos', HDR_NONE).CodecProfiles.find(p => p.Codec === 'hevc')
    expect((hevc as { Conditions: { Value: string }[] }).Conditions[0].Value.split("|")).not.toContain("HDR10")
  })
})

describe('Entdecken (Plugin ab 12.54)', () => {
  it('Reihen mit Termin, Bibliothek und Abo-Anbietern', async () => {
    const { parseDiscover } = await import('../src/api/sections')
    const sections = parseDiscover('http://srv', {
      Rows: [
        { Key: 'cinema', Title: 'Demnächst im Kino', Items: [
          { TmdbId: 1, MediaType: 'movie', Title: 'Film', BackdropUrl: 'https://image.tmdb.org/a.jpg', ReleaseText: 'Kinostart am Do. 05.11.', TrailerKey: 'abc' },
          { TmdbId: 2, MediaType: 'tv', Title: 'Serie', Providers: ['Netflix'], InLibrary: true, JellyfinId: 'c2b157ea3dc84584a30bcb96492eda16' },
        ] },
        { Key: 'leer', Title: 'Leer', Items: [] },
      ],
    })
    expect(sections.length).toBe(1)
    expect(sections[0].items[0].ImageUrl).toBe('https://image.tmdb.org/a.jpg')
    expect(sections[0].items[0].Caption).toBe('Kinostart am Do. 05.11.')
    expect(sections[0].items[1].Caption).toBe('In der Bibliothek')
    expect(sections[0].items[1].Type).toBe('Series')
  })

  it('FSK einheitlich', async () => {
    const { parentalRating } = await import('../src/home/format')
    expect(parentalRating('12')).toBe('FSK 12')
    expect(parentalRating('FSK-16')).toBe('FSK 16')
    expect(parentalRating('PG-13')).toBe('PG-13')
  })
})

describe('Trailer-Auswahl wie Android', () => {
  it('nichts unter 15 s, Trailer vor Teaser, sonst der längste', async () => {
    const { pickTrailer } = await import('../src/api/items')
    const s = (n: number) => n * 10_000_000
    expect(pickTrailer([{ Id: 'a', Name: 'Clip', RunTimeTicks: s(6) }])).toBeNull()
    expect(pickTrailer([{ Id: 't', Name: 'Teaser', RunTimeTicks: s(150) }, { Id: 'r', Name: 'Trailer', RunTimeTicks: s(140) }])?.Id).toBe('r')
    expect(pickTrailer([{ Id: 'k', Name: 'Spot', RunTimeTicks: s(60) }, { Id: 'l', Name: 'Spot 2', RunTimeTicks: s(120) }])?.Id).toBe('l')
  })
})

describe('Welten chronologisch (Plugin ab 12.55)', () => {
  it('teilt in Abschnitte und schreibt Zeit und Staffeln unter die Karte', async () => {
    const { chronologyGroups, chronologyCaption, seasonsText } = await import('../src/api/worlds')
    const groups = chronologyGroups([
      { Section: 'Hauptzeitlinie' },
      { ItemId: 'a', Label: '2151' },
      { ItemId: 'b', Label: '2256–2258', Seasons: [1, 2] },
      { Section: 'Leer' },
      { Section: 'Ohne Handlungszeit' },
      { ItemId: 'c', Label: null },
    ])
    expect(groups.map(g => g.title)).toEqual(['Hauptzeitlinie', 'Ohne Handlungszeit'])
    expect(chronologyCaption(groups[0].entries[1])).toBe('2256–2258 · Staffel 1–2')
    expect(chronologyCaption(groups[1].entries[0])).toBe('')
    expect(seasonsText([3, 4, 5])).toBe('Staffel 3–5')
    expect(seasonsText([1, 3])).toBe('Staffel 1, 3')
  })
})
