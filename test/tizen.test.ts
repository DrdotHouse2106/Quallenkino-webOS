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
