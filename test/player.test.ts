import { describe, expect, it } from 'vitest'
import { audioTrackPosition, cueAt, directAudioPossible, fileDefaultAudio, parseVtt, pickAudio, pickSubtitle } from '../src/player/tracks'
import { canPlayAudio } from '../src/player/profile'
import { streamFor, subtitleUrl } from '../src/player/playback'

const source = (streams: object[], extra: object = {}) => ({ Id: 'ms', MediaStreams: streams as never, ...extra })

describe('Tonspur und Untertitel', () => {
  it('Deutscher Ton → keine Untertitel, außer erzwungene', () => {
    const s = source([
      { Index: 1, Type: 'Audio', Language: 'ger', IsDefault: true },
      { Index: 2, Type: 'Audio', Language: 'eng' },
      { Index: 3, Type: 'Subtitle', Language: 'ger' },
      { Index: 4, Type: 'Subtitle', Language: 'ger', IsForced: true },
    ])
    expect(pickAudio(s)).toBe(1)
    expect(pickSubtitle(s, 1)).toBe(4)
  })

  it('Fremder Ton → deutsche Untertitel', () => {
    const s = source([
      { Index: 1, Type: 'Audio', Language: 'jpn' },
      { Index: 2, Type: 'Subtitle', Language: 'eng' },
      { Index: 3, Type: 'Subtitle', Language: 'ger' },
    ])
    expect(pickAudio(s)).toBe(1)
    expect(pickSubtitle(s, 1)).toBe(3)
  })

  it('Mehrere deutsche Spuren: die direkt abspielbare (AC3 vor DTS)', () => {
    const s = { ...source([
      { Index: 1, Type: 'Audio', Language: 'ger', Codec: 'dts', IsDefault: true },
      { Index: 2, Type: 'Audio', Language: 'ger', Codec: 'ac3' },
      { Index: 3, Type: 'Audio', Language: 'eng', Codec: 'dts' },
    ]), DefaultAudioStreamIndex: 1 }
    expect(pickAudio(s)).toBe(2)
  })

  it('Vorgabe des Servers vor anderer deutscher Spur', () => {
    const s = { ...source([
      { Index: 1, Type: 'Audio', Language: 'ger', Codec: 'ac3' },
      { Index: 2, Type: 'Audio', Language: 'ger', Codec: 'aac', Title: 'Kommentar' },
    ]), DefaultAudioStreamIndex: 1 }
    expect(pickAudio(s)).toBe(1)
  })

  it('Ohne passende Untertitel → aus', () => {
    expect(pickSubtitle(source([{ Index: 1, Type: 'Audio', Language: 'eng' }]), 1)).toBe(-1)
  })
})

describe('Abspiel-Adresse', () => {
  const api = { url: 'http://srv:8096/', token: 'tok', userId: 'u' }
  it('Direkt abspielen mit Container und Token', () => {
    const stream = streamFor(api, 'item', { PlaySessionId: 'ps', MediaSources: [{ Id: 'ms', Container: 'mkv', SupportsDirectPlay: true }] })
    expect(stream?.method).toBe('DirectPlay')
    expect(stream?.url).toMatch(/^http:\/\/srv:8096\/Videos\/item\/stream\.mkv\?Static=true&mediaSourceId=ms/)
    expect(stream?.url).toContain('api_key=tok')
  })

  it('Umrechnung: Adresse des Servers, Token ergänzt', () => {
    const stream = streamFor(api, 'item', { PlaySessionId: 'ps', MediaSources: [{ Id: 'ms', TranscodingUrl: '/videos/item/master.m3u8?x=1' }] })
    expect(stream?.method).toBe('Transcode')
    expect(stream?.url).toBe('http://srv:8096/videos/item/master.m3u8?x=1&api_key=tok')
  })
})

describe('WebVTT', () => {
  it('liest Zeiten und Text, ohne Formatierung', () => {
    const cues = parseVtt('WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.500 align:start\n<i>Hallo</i>\nWelt\n\n00:01:00,000 --> 00:01:02,000\nZwei')
    expect(cues).toHaveLength(2)
    expect(cueAt(cues, 2)).toBe('Hallo\nWelt')
    expect(cueAt(cues, 61)).toBe('Zwei')
    expect(cueAt(cues, 10)).toBeNull()
  })
})

describe('Zeitanzeige', async () => {
  const { formatTime } = await import('../src/player/PlayerPage')
  it('Minuten und Stunden', () => {
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(3725)).toBe('1:02:05')
  })
})

describe('Tonspur wechseln', () => {
  const source = {
    Id: 'm',
    MediaStreams: [
      { Index: 0, Type: 'Video' },
      { Index: 1, Type: 'Audio', Codec: 'ac3', Language: 'eng' },
      { Index: 2, Type: 'Audio', Codec: 'dts', Language: 'ger', IsDefault: true },
      { Index: 3, Type: 'Subtitle', Codec: 'subrip' },
      { Index: 4, Type: 'Audio', Codec: 'aac', IsExternal: true },
    ],
  }

  it('Stelle in audioTracks zählt nur Spuren der Datei', () => {
    expect(audioTrackPosition(source, 1)).toBe(0)
    expect(audioTrackPosition(source, 2)).toBe(1)
    expect(audioTrackPosition(source, 4)).toBe(-1)
  })

  it('Standard der Datei ist die markierte Spur', () => {
    expect(fileDefaultAudio(source)).toBe(2)
  })

  it('Deutsch an 4. Stelle, Englisch Standard der Datei: ohne audioTracks umrechnen', () => {
    const deadpool = {
      Id: 'd',
      MediaStreams: [
        { Index: 0, Type: 'Video' },
        { Index: 1, Type: 'Audio', Codec: 'eac3', Language: 'eng', IsDefault: true },
        { Index: 2, Type: 'Audio', Codec: 'eac3', Language: 'fra' },
        { Index: 3, Type: 'Audio', Codec: 'eac3', Language: 'spa' },
        { Index: 4, Type: 'Audio', Codec: 'eac3', Language: 'deu', Title: 'German 5.1' },
        { Index: 5, Type: 'Audio', Codec: 'opus', Language: 'eng', Title: 'Commentary' },
        { Index: 9, Type: 'Subtitle', Codec: 'subrip', Language: 'deu', IsForced: true },
      ],
    }
    expect(pickAudio(deadpool)).toBe(4)
    expect(directAudioPossible(deadpool, 4, false)).toBe(false)
    expect(directAudioPossible(deadpool, 4, true)).toBe(true)
    expect(directAudioPossible(deadpool, 1, false)).toBe(true)
  })

  it('Zwei Standardspuren mit DTS: umrechnen', () => {
    const logan = {
      Id: 'l',
      MediaStreams: [
        { Index: 0, Type: 'Video' },
        { Index: 1, Type: 'Audio', Codec: 'dts', Language: 'deu', IsDefault: true },
        { Index: 2, Type: 'Audio', Codec: 'eac3', Language: 'eng', IsDefault: true },
      ],
    }
    expect(directAudioPossible(logan, 1, true)).toBe(false)
  })

  it('DTS und TrueHD kann der Fernseher nicht selbst', () => {
    expect(canPlayAudio('dts')).toBe(false)
    expect(canPlayAudio('truehd')).toBe(false)
    expect(canPlayAudio('EAC3')).toBe(true)
  })
})

describe('Untertitel laden', () => {
  it('immer die ganze Datei als WebVTT, nicht die DeliveryUrl', () => {
    const url = subtitleUrl({ url: 'http://srv/', token: 't', userId: 'u' }, 'i', { Id: 'ms' }, { Index: 3, Type: 'Subtitle', DeliveryUrl: '/Videos/i/ms/Subtitles/3/930000000/Stream.subrip' })
    expect(url).toBe('http://srv/Videos/i/ms/Subtitles/3/0/Stream.vtt?api_key=t')
  })

  it('SRT-Zeiten mit Komma werden gelesen', () => {
    const cues = parseVtt('1\n00:01:33,120 --> 00:01:35,000\nHallo\n\n2\n00:01:36,000 --> 00:01:38,500\nWelt')
    expect(cues).toEqual([{ start: 93.12, end: 95, text: 'Hallo' }, { start: 96, end: 98.5, text: 'Welt' }])
  })
})
