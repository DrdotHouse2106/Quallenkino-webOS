import { hdrSupport } from './hdr'
import { loadSettings } from '../settings'
import { deviceId } from '../api/auth'
import { request } from '../api/http'
import type { Api, Item } from '../api/items'
import { deviceProfile } from './profile'

export interface MediaStream {
  Index: number
  Type: 'Video' | 'Audio' | 'Subtitle' | string
  Codec?: string
  Language?: string
  DisplayTitle?: string
  Title?: string
  IsDefault?: boolean
  IsForced?: boolean
  IsExternal?: boolean
  DeliveryMethod?: string
  DeliveryUrl?: string
  Channels?: number
}

export interface MediaSource {
  Id: string
  Container?: string
  SupportsDirectPlay?: boolean
  SupportsDirectStream?: boolean
  TranscodingUrl?: string
  MediaStreams?: MediaStream[]
  DefaultAudioStreamIndex?: number
  DefaultSubtitleStreamIndex?: number
  RunTimeTicks?: number
  /** Live-TV: geöffneter Live-Stream (beim Stoppen wieder geschlossen). */
  LiveStreamId?: string
  IsInfiniteStream?: boolean
}

export interface PlaybackInfo {
  MediaSources: MediaSource[]
  PlaySessionId: string
}

export type PlayMethod = 'DirectPlay' | 'DirectStream' | 'Transcode'

export interface Stream {
  url: string
  method: PlayMethod
  source: MediaSource
  playSessionId: string
}

export const TICKS_PER_SECOND = 10_000_000

const base = (api: Api) => api.url.replace(/\/+$/, '')

/** Abspiel-Infos vom Server: welche Quelle, direkt oder umgerechnet. */
export function playbackInfo(api: Api, itemId: string, options: { audio?: number; subtitle?: number; startTicks?: number; transcode?: boolean } = {}) {
  return request<PlaybackInfo>(api.url, `/Items/${itemId}/PlaybackInfo?userId=${api.userId}`, {
    method: 'POST',
    token: api.token,
    timeoutMs: 20_000,
    body: {
      // HDR nur direkt, wenn der Fernseher es zeigen kann (sonst Tonemapping auf dem Server)
      DeviceProfile: deviceProfile(undefined, undefined, hdrSupport(loadSettings().hdr)),
      UserId: api.userId,
      MaxStreamingBitrate: deviceProfile().MaxStreamingBitrate,
      StartTimeTicks: options.startTicks ?? 0,
      AudioStreamIndex: options.audio,
      SubtitleStreamIndex: options.subtitle ?? -1,
      // Erzwungene Umrechnung: z. B. für eine andere Tonspur, die direkt nicht wählbar ist
      EnableDirectPlay: !options.transcode,
      EnableDirectStream: !options.transcode,
      EnableTranscoding: true,
      AllowVideoStreamCopy: true,
      AllowAudioStreamCopy: true,
      AutoOpenLiveStream: true,
    },
  })
}

/** Adresse zum Abspielen: direkt (Datei), sonst die Umrechnung des Servers (HLS). */
export function streamFor(api: Api, itemId: string, info: PlaybackInfo, options: { audio?: number; transcode?: boolean } = {}): Stream | null {
  const source = info.MediaSources?.[0]
  if (!source) return null
  // Live-TV: die HLS-Umrechnung des Servers läuft auf dem Fernseher am zuverlässigsten
  const live = !!source.LiveStreamId || !!source.IsInfiniteStream
  if (!options.transcode && !(live && source.TranscodingUrl) && (source.SupportsDirectPlay || source.SupportsDirectStream)) {
    const params = new URLSearchParams({
      Static: 'true',
      mediaSourceId: source.Id,
      deviceId: deviceId(),
      ApiKey: api.token,
      PlaySessionId: info.PlaySessionId,
    })
    if (options.audio !== undefined) params.set('AudioStreamIndex', String(options.audio))
    if (source.LiveStreamId) params.set('LiveStreamId', source.LiveStreamId)
    const container = (source.Container ?? 'mp4').split(',')[0]
    return {
      url: `${base(api)}/Videos/${itemId}/stream.${container}?${params}`,
      method: source.SupportsDirectPlay ? 'DirectPlay' : 'DirectStream',
      source,
      playSessionId: info.PlaySessionId,
    }
  }
  if (source.TranscodingUrl) {
    let url = base(api) + source.TranscodingUrl
    if (!/[?&](api_key|ApiKey)=/i.test(url)) url += (url.includes('?') ? '&' : '?') + `ApiKey=${encodeURIComponent(api.token)}`
    return { url, method: 'Transcode', source, playSessionId: info.PlaySessionId }
  }
  return null
}

/**
 * Untertitel-Datei als WebVTT, immer die ganze Datei ab 0 – nicht die DeliveryUrl des Servers
 * (die kann SRT sein oder nur einen Ausschnitt ab der Startposition enthalten).
 */
export function subtitleUrl(api: Api, itemId: string, source: MediaSource, stream: MediaStream): string {
  // Ohne Token in der Adresse – geladen wird mit Anmeldung im Header (PlayerPage)
  return `${base(api)}/Videos/${itemId}/${source.Id}/Subtitles/${stream.Index}/0/Stream.vtt`
}

// Fortschritt an den Server melden (Weiterschauen, Gesehen, Dashboard)
interface Report {
  ItemId: string
  MediaSourceId: string
  PlaySessionId: string
  PositionTicks: number
  PlayMethod: PlayMethod
  AudioStreamIndex?: number
  SubtitleStreamIndex?: number
  IsPaused?: boolean
  CanSeek: boolean
  LiveStreamId?: string
}

const report = (api: Api, path: string, body: Report) =>
  request(api.url, path, { method: 'POST', token: api.token, body }).catch(() => undefined)

export const reportStart = (api: Api, body: Report) => report(api, '/Sessions/Playing', body)
export const reportProgress = (api: Api, body: Report) => report(api, '/Sessions/Playing/Progress', body)
export const reportStop = (api: Api, body: Report) => report(api, '/Sessions/Playing/Stopped', body)

/** Live-Stream freigeben (Tuner), auch wenn die Wiedergabe nie angelaufen ist. */
export const closeLiveStream = (api: Api, liveStreamId: string) =>
  request(api.url, `/LiveStreams/Close?liveStreamId=${encodeURIComponent(liveStreamId)}`, { method: 'POST', token: api.token }).catch(() => undefined)

// Intro und Abspann (Media Segments, z. B. vom Plugin Intro Skipper)
export interface Segment {
  Type: 'Intro' | 'Outro' | 'Recap' | 'Preview' | 'Commercial' | string
  StartTicks: number
  EndTicks: number
}

export async function segments(api: Api, itemId: string): Promise<Segment[]> {
  try {
    const result = await request<{ Items?: Segment[] }>(api.url, `/MediaSegments/${itemId}?includeSegmentTypes=Intro&includeSegmentTypes=Outro&includeSegmentTypes=Recap`, { token: api.token })
    return result?.Items ?? []
  } catch {
    return []
  }
}

/** Nächste Folge nach dieser (gleiche Serie), sonst null. */
export async function nextEpisode(api: Api, episode: Item): Promise<Item | null> {
  if (episode.Type !== 'Episode' || !episode.SeriesId) return null
  try {
    const result = await request<{ Items: Item[] }>(api.url, `/Shows/${episode.SeriesId}/Episodes?userId=${api.userId}&adjacentTo=${episode.Id}&Fields=Overview&EnableImageTypes=Primary,Thumb&ImageTypeLimit=1`, { token: api.token })
    const list = result?.Items ?? []
    const index = list.findIndex(i => i.Id === episode.Id)
    return index >= 0 && index < list.length - 1 ? list[index + 1] : null
  } catch {
    return null
  }
}

/** Was „Abspielen“ bei einer Serie startet: die nächste Folge, sonst die erste. */
export async function episodeToPlay(api: Api, series: Item): Promise<Item | null> {
  try {
    const next = await request<{ Items: Item[] }>(api.url, `/Shows/NextUp?userId=${api.userId}&seriesId=${series.Id}&limit=1`, { token: api.token })
    if (next?.Items?.[0]) return next.Items[0]
    const all = await request<{ Items: Item[] }>(api.url, `/Shows/${series.Id}/Episodes?userId=${api.userId}&limit=1`, { token: api.token })
    return all?.Items?.[0] ?? null
  } catch {
    return null
  }
}
