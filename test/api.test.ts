import { describe, expect, it } from 'vitest'
import { authorizationHeader, deviceId } from '../src/api/auth'
import { candidateUrls } from '../src/api/server'
import { withSession, withoutSession, type SavedState } from '../src/store'
import { tileColor } from '../src/screens/ProfileScreen'

describe('Server-Adresse', () => {
  it('ohne Schema: zuerst https, dann http, dann Standard-Ports', () => {
    expect(candidateUrls('kino.example.de')).toEqual([
      'https://kino.example.de',
      'http://kino.example.de',
      'https://kino.example.de:8920',
      'http://kino.example.de:8096',
    ])
  })

  it('mit Port keine Zusatz-Ports', () => {
    expect(candidateUrls('192.168.1.10:8096/')).toEqual(['https://192.168.1.10:8096', 'http://192.168.1.10:8096'])
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
