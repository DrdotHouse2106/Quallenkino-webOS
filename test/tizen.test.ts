import { describe, expect, it } from 'vitest'
import { deviceProfile, tizenVideoCodecs } from '../src/player/profile'

describe('Samsung (Tizen)', () => {
  it('meldet nur Codecs, die der Fernseher abspielen kann', () => {
    expect(tizenVideoCodecs(type => (type.includes('hvc1') ? 'probably' : ''))).toBe('h264,hevc')
    expect(tizenVideoCodecs(type => (type.includes('av01') || type.includes('hvc1') ? 'maybe' : ''))).toBe('h264,hevc,av1')
    // Ohne Antwort: H.264 und HEVC (alle Modelle ab 2020)
    expect(tizenVideoCodecs(() => '')).toBe('h264,hevc')
  })

  it('Profil: eigener Name, kein DTS', () => {
    const profile = deviceProfile(undefined, 'tizen')
    expect(profile.Name).toBe('Quallenkino Tizen')
    expect(profile.DirectPlayProfiles.some(p => (p.AudioCodec ?? '').includes('dts'))).toBe(false)
    expect(deviceProfile(undefined, 'webos').Name).toBe('Quallenkino webOS')
  })
})

describe('Samsung (Tizen): Flexbox-Abstände ohne gap', () => {
  it('rechnet gap in Ränder der Kinder um', async () => {
    const { flexGapFallback } = await import('../src/platform/flexGap')
    const css = flexGapFallback('.a { display: flex; gap: 20px; }\n.b { display: flex; flex-direction: column; gap: 12px; }\n.c { display: flex; flex-wrap: wrap; gap: 16px; }\n.d { display: grid; gap: 8px; }')
    expect(css).not.toMatch(/\.a \{[^}]*gap/)
    expect(css).toContain('.a > * + * { margin-left: 20px; }')
    expect(css).toContain('.b > * + * { margin-top: 12px; }')
    expect(css).toContain('.c > * { margin: 0 16px 16px 0; }')
    // Grid behält gap (kennt auch das alte Chromium)
    expect(css).toMatch(/\.d \{[^}]*gap: 8px/)
  })
})
