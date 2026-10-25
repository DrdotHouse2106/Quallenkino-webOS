import { PLATFORM, type Platform } from '../platform/platform'
import { HDR_ALL, unsupportedRangeTypes, type HdrSupport } from './hdr'

/**
 * Abspiel-Fähigkeiten eines LG-Fernsehers mit webOS (ab webOS 6, Ziel webOS 23) bzw. eines Samsung-Fernsehers
 * mit Tizen (ab 5.5) für den Server.
 * Der Server entscheidet damit: direkt abspielen, nur umpacken oder umrechnen (HLS).
 *
 * - Video: H.264, HEVC (auch 10 Bit/HDR10), VP9, AV1 – direkt.
 * - Ton: AAC, MP3, AC3, E-AC3 (auch Atmos), FLAC, Opus direkt. DTS und TrueHD können neuere LG- und Samsung-Geräte
 *   nicht → der Server rechnet nur den Ton um, das Bild bleibt unverändert.
 * - Untertitel: Text (SRT, VTT) als WebVTT von außen (zeigt die App selbst an), Bild-Untertitel
 *   (PGS, DVD) und ASS/SSA werden vom Server ins Bild gerechnet.
 */
export const MAX_BITRATE = 120_000_000

const VIDEO_WEBOS = 'h264,hevc,vp9,av1'

/**
 * Samsung (Tizen ab 5.5, Modelle ab 2020): HEVC, VP9 und AV1 je nach Modell – deshalb zur Laufzeit prüfen.
 * Ohne Antwort (z. B. im Test) gelten H.264 und HEVC.
 */
export function tizenVideoCodecs(canPlay: (type: string) => string = defaultCanPlay): string {
  const checks: Array<[string, string]> = [
    ['hevc', 'video/mp4; codecs="hvc1.1.6.L120.90"'],
    ['vp9', 'video/webm; codecs="vp9"'],
    ['av1', 'video/mp4; codecs="av01.0.08M.08"'],
  ]
  const supported = checks.filter(([, type]) => canPlay(type) !== '').map(([codec]) => codec)
  return ['h264', ...(supported.length ? supported : ['hevc'])].join(',')
}

function defaultCanPlay(type: string): string {
  if (typeof document === 'undefined') return ''
  try {
    return document.createElement('video').canPlayType(type)
  } catch {
    return ''
  }
}
const AUDIO = 'aac,mp3,ac3,eac3,flac,opus,vorbis,alac,pcm_s16le,pcm_s24le'

/** Kann der Fernseher diesen Ton selbst abspielen? (DTS, TrueHD nicht → Server rechnet um.) */
export function canPlayAudio(codec?: string): boolean {
  return !!codec && AUDIO.split(',').includes(codec.toLowerCase())
}

export function deviceProfile(maxBitrate = MAX_BITRATE, platform: Platform = PLATFORM, hdr: HdrSupport = HDR_ALL) {
  const VIDEO = platform === 'tizen' ? tizenVideoCodecs() : VIDEO_WEBOS
  // HDR-Arten, die der Fernseher nicht zeigen kann: der Server wandelt sie mit Tonemapping nach SDR um.
  // „NotEquals“ greift nur über ApplyConditions, wenn das Video eine dieser Arten hat (wie in Jellyfin Android TV).
  const rangeTypes = unsupportedRangeTypes(hdr)
  const hdrProfiles = rangeTypes.length
    ? ['hevc', 'av1', 'vp9'].map(codec => ({
        Type: 'Video',
        Codec: codec,
        Conditions: [{ Condition: 'NotEquals', Property: 'VideoRangeType', Value: rangeTypes.join('|'), IsRequired: false }],
        ApplyConditions: [{ Condition: 'EqualsAny', Property: 'VideoRangeType', Value: rangeTypes.join('|'), IsRequired: false }],
      }))
    : []
  return {
    Name: platform === 'tizen' ? 'Quallenkino Tizen' : 'Quallenkino webOS',
    MaxStreamingBitrate: maxBitrate,
    MaxStaticBitrate: maxBitrate,
    MusicStreamingTranscodingBitrate: 384_000,
    DirectPlayProfiles: [
      { Container: 'mp4,m4v,mov', Type: 'Video', VideoCodec: VIDEO, AudioCodec: AUDIO },
      { Container: 'mkv', Type: 'Video', VideoCodec: VIDEO, AudioCodec: AUDIO },
      { Container: 'webm', Type: 'Video', VideoCodec: 'vp9,av1', AudioCodec: 'opus,vorbis' },
      { Container: 'ts,mpegts,m2ts', Type: 'Video', VideoCodec: 'h264,hevc', AudioCodec: 'aac,mp3,ac3,eac3' },
      { Container: 'mp3,aac,m4a,flac,ogg,opus,wav', Type: 'Audio' },
    ],
    TranscodingProfiles: [
      {
        Container: 'ts',
        Type: 'Video',
        VideoCodec: 'h264,hevc',
        // Muss der Ton umgerechnet werden, zuerst Dolby Digital: behält 5.1 auch über Soundbar/AV-Receiver (ARC)
        AudioCodec: 'ac3,eac3,aac',
        Context: 'Streaming',
        Protocol: 'hls',
        MaxAudioChannels: '6',
        MinSegments: 1,
        BreakOnNonKeyFrames: true,
      },
      { Container: 'mp3', Type: 'Audio', AudioCodec: 'mp3', Context: 'Streaming', Protocol: 'http', MaxAudioChannels: '2' },
    ],
    ContainerProfiles: [],
    CodecProfiles: [
      { Type: 'Video', Codec: 'h264', Conditions: [{ Condition: 'LessThanEqual', Property: 'VideoLevel', Value: '52', IsRequired: false }] },
      ...hdrProfiles,
    ],
    SubtitleProfiles: [
      { Format: 'vtt', Method: 'External' },
      { Format: 'srt', Method: 'External' },
      { Format: 'subrip', Method: 'External' },
      { Format: 'ass', Method: 'Encode' },
      { Format: 'ssa', Method: 'Encode' },
      { Format: 'pgssub', Method: 'Encode' },
      { Format: 'dvdsub', Method: 'Encode' },
      { Format: 'dvbsub', Method: 'Encode' },
    ],
  }
}
