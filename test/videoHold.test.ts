import { describe, expect, it } from 'vitest'
import { holdScreensaver, videoActive } from '../src/platform/videoHold'

const doc = (videos: Array<{ paused: boolean; ended: boolean }>) => ({ querySelectorAll: () => videos }) as never

describe('Bildschirmschoner während Videos', () => {
  it('ein laufendes Video hält ihn zurück, ein angehaltenes oder beendetes nicht', () => {
    expect(videoActive(doc([{ paused: false, ended: false }]))).toBe(true)
    expect(videoActive(doc([{ paused: true, ended: false }, { paused: false, ended: true }]))).toBe(false)
  })

  it('YouTube-Vorschau hält ihn zurück, bis sie freigegeben wird (auch bei doppelter Freigabe)', () => {
    const release = holdScreensaver()
    expect(videoActive(doc([]))).toBe(true)
    release()
    release()
    expect(videoActive(doc([]))).toBe(false)
  })
})

import { playerUrl, subtitlesFor, trailerButtonLabel } from '../src/platform/youtube'

describe('Trailer-Untertitel nach Sprache', () => {
  it('deutsch, OmU und unbekannt ohne, Fremdsprache mit deutschen Untertiteln', () => {
    expect(['de', 'de-DE', 'OmU', '', undefined].map(subtitlesFor)).toEqual([false, false, false, false, false])
    expect(['en', 'EN', 'ja'].map(subtitlesFor)).toEqual([true, true, true])
    expect(playerUrl('abcdefghijk', 1, true)).toContain('&cc=1')
    expect(playerUrl('abcdefghijk', 1)).toContain('&cc=0')
  })

  it('Knopf mit Sprache wie im Web', () => {
    expect(trailerButtonLabel('Trailer ansehen', 'en')).toBe('Trailer ansehen (EN)')
    expect(trailerButtonLabel('Trailer ansehen', 'omu')).toBe('Trailer ansehen (OmU)')
    expect(trailerButtonLabel('Trailer ansehen', 'de')).toBe('Trailer ansehen')
  })
})
