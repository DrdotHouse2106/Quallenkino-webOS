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
