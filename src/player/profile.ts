/**
 * Abspiel-Fähigkeiten eines LG-Fernsehers mit webOS (ab webOS 6, Ziel webOS 23) für den Server.
 * Der Server entscheidet damit: direkt abspielen, nur umpacken oder umrechnen (HLS).
 *
 * - Video: H.264, HEVC (auch 10 Bit/HDR10), VP9, AV1 – direkt.
 * - Ton: AAC, MP3, AC3, E-AC3 (auch Atmos), FLAC, Opus direkt. DTS und TrueHD können neuere LG-Geräte
 *   nicht → der Server rechnet nur den Ton um, das Bild bleibt unverändert.
 * - Untertitel: Text (SRT, VTT) als WebVTT von außen (zeigt die App selbst an), Bild-Untertitel
 *   (PGS, DVD) und ASS/SSA werden vom Server ins Bild gerechnet.
 */
export const MAX_BITRATE = 120_000_000

const VIDEO = 'h264,hevc,vp9,av1'
const AUDIO = 'aac,mp3,ac3,eac3,flac,opus,vorbis,alac,pcm_s16le,pcm_s24le'

/** Kann der Fernseher diesen Ton selbst abspielen? (DTS, TrueHD nicht → Server rechnet um.) */
export function canPlayAudio(codec?: string): boolean {
  return !!codec && AUDIO.split(',').includes(codec.toLowerCase())
}

export function deviceProfile(maxBitrate = MAX_BITRATE) {
  return {
    Name: 'Quallenkino webOS',
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
