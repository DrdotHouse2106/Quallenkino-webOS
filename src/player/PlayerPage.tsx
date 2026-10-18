import { FocusContext, setFocus, useFocusable } from '@noriginmedia/norigin-spatial-navigation'
import { useEffect, useRef, useState } from 'preact/hooks'
import { fullItem, get, ratingTarget, setRating, type Api, type Item } from '../api/items'
import { subtitle as episodeSubtitle, title as itemTitle } from '../home/format'
import { t } from '../i18n'
import { isBack, Keys } from '../nav/keys'
import { useRouter } from '../nav/router'
import { Page } from '../pages/Page'
import { toast } from '../ui/Toast'
import { Icon, type IconName } from '../ui/Icon'
import {
  nextEpisode,
  playbackInfo,
  reportProgress,
  reportStart,
  reportStop,
  segments as loadSegments,
  streamFor,
  subtitleUrl,
  TICKS_PER_SECOND,
  type PlaybackInfo,
  type Segment,
  type Stream,
} from './playback'
import { canPlayAudio } from './profile'
import { programProgress, timeRange } from '../api/livetv'
import { loadSettings } from '../settings'
import { audioStreams, audioTrackPosition, cueAt, fileDefaultAudio, parseVtt, pickAudio, pickSubtitle, subtitleStreams, trackLabel, type Cue } from './tracks'

const OSD_TIMEOUT_MS = 5_000
const PROGRESS_INTERVAL_MS = 10_000
const SEEK_SECONDS = 10
const FAST_SEEK_SECONDS = 30
/** „Überspringen“ füllt sich so lange und springt dann selbst (wie Android). */
const SKIP_DELAY_MS = 5_000
/** „Nächste Folge“ zählt so lange herunter. */
const NEXT_COUNTDOWN_S = 10
/** Ohne Abspann-Markierung: so kurz vor Schluss die nächste Folge anbieten. */
const NEXT_BEFORE_END_S = 30
/** So lange nach dem Sprung wird geprüft, wo der Fernseher wirklich gelandet ist. */
const SEEK_CHECK_S = 1.2
/** Erst ab so viel zu früh wird einmal nachgefragt (sehr großer Abstand der Schlüsselbilder). */
const SEEK_MAX_EARLY_S = 8
/** Bild-Untertitel kann nur der Server ins Bild rechnen. */
const IMAGE_SUBTITLES = ['pgssub', 'pgs', 'dvdsub', 'dvbsub', 'ass', 'ssa']

interface AudioTrackLike { enabled: boolean }
const audioTrackList = (element: HTMLVideoElement | null) =>
  (element as (HTMLVideoElement & { audioTracks?: ArrayLike<AudioTrackLike> }) | null)?.audioTracks
const supportsAudioTracks = () => typeof HTMLMediaElement !== 'undefined' && 'audioTracks' in HTMLMediaElement.prototype

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

interface Props {
  api: Api
  id: string
  /** Startposition (Fortsetzen); sonst ab Anfang. */
  startTicks?: number
}

export function PlayerPage({ api, id, startTicks }: Props) {
  const router = useRouter()
  const video = useRef<HTMLVideoElement>(null)
  const [item, setItem] = useState<Item | null>(null)
  const [stream, setStream] = useState<Stream | null>(null)
  const [audio, setAudio] = useState<number | undefined>(undefined)
  const [subtitle, setSubtitle] = useState(-1)
  const [cues, setCues] = useState<Cue[]>([])
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [paused, setPaused] = useState(false)
  const [osd, setOsd] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [segmentList, setSegmentList] = useState<Segment[]>([])
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [next, setNext] = useState<Item | null>(null)
  const [nextCancelled, setNextCancelled] = useState(false)
  const [likes, setLikes] = useState<boolean | null>(null)
  /** Live-TV: die gerade laufende Sendung. */
  const [nowOn, setNowOn] = useState<Item | null>(null)
  const live = item?.Type === 'TvChannel'
  const startAt = useRef((startTicks ?? 0) / TICKS_PER_SECOND)
  const started = useRef(false)
  /** Nach „gestoppt“ keine Meldungen mehr (beim Schließen feuert das Video noch „pause“). */
  const stopped = useRef(false)
  const osdTimer = useRef<ReturnType<typeof setTimeout>>()

  // Titel, Abspiel-Infos, Intro/Abspann, nächste Folge
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const loaded = await fullItem(api, id)
        if (!active) return
        setItem(loaded)
        if (loaded.Type === 'TvChannel') {
          // Sender: laufende Sendung für die Leiste; kein Fortsetzen, keine Abschnitte
          loadChannel(api, id).then(channel => active && setNowOn(channel.CurrentProgram ?? null)).catch(() => {})
          const info = await playbackInfo(api, id)
          const source = info.MediaSources?.[0]
          if (!source) throw new Error('keine Quelle')
          const settings = loadSettings()
          const audioIndex = pickAudio(source, settings.audio)
          // Die erste Antwort direkt nutzen: jede weitere würde einen zweiten Live-Stream (Tuner) öffnen
          await open(audioIndex, pickSubtitle(source, audioIndex, settings.subtitles), 0, false, false, info)
          return
        }
        const target = ratingTarget(loaded)
        if (target === loaded.Id) setLikes(loaded.UserData?.Likes ?? null)
        else if (target) fullItem(api, target).then(series => active && setLikes(series.UserData?.Likes ?? null)).catch(() => {})
        loadSegments(api, id).then(list => active && setSegmentList(list))
        nextEpisode(api, loaded).then(found => active && setNext(found))
        const info = await playbackInfo(api, id, { startTicks: startTicks ?? 0 })
        const source = info.MediaSources?.[0]
        if (!source) throw new Error('keine Quelle')
        const settings = loadSettings()
        const audioIndex = pickAudio(source, settings.audio)
        const subtitleIndex = pickSubtitle(source, audioIndex, settings.subtitles)
        await open(audioIndex, subtitleIndex, startAt.current)
      } catch {
        if (active) setError(t.playbackFailed)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  /**
   * Quelle (neu) öffnen – auch beim Wechsel von Ton oder eingebrannten Untertiteln.
   * Beim direkten Abspielen läuft immer die Tonspur der Datei, die der Fernseher wählt; eine andere
   * schaltet die App über video.audioTracks um. Geht das nicht oder kann der Fernseher den Ton nicht
   * (DTS, TrueHD), rechnet der Server um.
   */
  async function open(audioIndex: number | undefined, subtitleIndex: number, position: number, transcode = false, switching = false, preloaded?: PlaybackInfo) {
    const startTicks = Math.round(position * TICKS_PER_SECOND)
    const info = preloaded ?? await playbackInfo(api, id, { audio: audioIndex, subtitle: subtitleIndex, startTicks, transcode })
    let next = streamFor(api, id, info, { audio: audioIndex, transcode })
    if (!next) throw new Error('nicht abspielbar')
    // Live-TV entscheidet der Server allein (eine zweite Anfrage würde einen weiteren Tuner belegen)
    const liveSource = !!preloaded || !!next.source.LiveStreamId || !!next.source.IsInfiniteStream
    const direct = liveSource || (next.method !== 'Transcode' && directAudioPossible(next, audioIndex, switching))
    // Für die Fehlersuche am Fernseher (Konsole über den Web-Inspector)
    console.info('[Quallenkino] Wiedergabe', {
      method: next.method,
      audio: audioIndex,
      codec: audioStreams(next.source).find(s => s.Index === audioIndex)?.Codec,
      fileDefault: fileDefaultAudio(next.source),
      serverDefault: next.source.DefaultAudioStreamIndex,
      switching,
      forceTranscode: next.method !== 'Transcode' && !direct,
    })
    if (next.method !== 'Transcode' && !direct) {
      const forced = await playbackInfo(api, id, { audio: audioIndex, subtitle: subtitleIndex, startTicks, transcode: true })
      next = streamFor(api, id, forced, { audio: audioIndex, transcode: true }) ?? next
    }
    startAt.current = position
    setAudio(audioIndex)
    setSubtitle(subtitleIndex)
    setStream(next)
    loadCues(next, subtitleIndex)
  }

  /**
   * Kann diese Tonspur ohne Umrechnung laufen? Umgerechnet wird nur, wenn der Fernseher den Ton der
   * gewählten Spur nicht kann (DTS, TrueHD) – oder wenn auf eine andere Spur gewechselt wird und das
   * Umschalten im Fernseher (audioTracks) fehlt. Beim Start bleibt es sonst beim direkten Abspielen.
   */
  function directAudioPossible(current: Stream, audioIndex: number | undefined, switching: boolean): boolean {
    const track = audioStreams(current.source).find(s => s.Index === audioIndex)
    if (!track) return true
    if (!canPlayAudio(track.Codec)) return false
    if (!switching) return true
    return audioIndex === fileDefaultAudio(current.source) || (supportsAudioTracks() && audioTrackPosition(current.source, audioIndex) >= 0)
  }

  /** Beim direkten Abspielen die gewählte Tonspur im Video einschalten. */
  function applyAudioTrack(current: Stream, audioIndex: number | undefined): boolean {
    const tracks = audioTrackList(video.current)
    const position = audioTrackPosition(current.source, audioIndex)
    if (!tracks || position < 0 || position >= tracks.length) return false
    for (let i = 0; i < tracks.length; i++) tracks[i].enabled = i === position
    return true
  }

  /**
   * Text-Untertitel (SRT, VTT – auch in der MKV-Datei eingebettete) als WebVTT vom Server laden und
   * selbst anzeigen; eingebrannte zeigt das Bild schon.
   */
  function loadCues(current: Stream, index: number) {
    setCues([])
    const track = subtitleStreams(current.source).find(s => s.Index === index)
    if (!track || isBurnedIn(track)) return
    fetch(subtitleUrl(api, id, current.source, track))
      .then(response => response.text())
      .then(text => setCues(parseVtt(text)))
      .catch(() => setCues([]))
  }

  const isBurnedIn = (track: { DeliveryMethod?: string; Codec?: string }) =>
    track.DeliveryMethod === 'Encode' || IMAGE_SUBTITLES.includes((track.Codec ?? '').toLowerCase())

  async function rate(value: boolean) {
    const target = item && ratingTarget(item)
    if (!target) return
    try {
      setLikes(await setRating(api, target, likes === value ? null : value))
    } catch {
      toast(t.ratingFailed)
    }
    showOsd()
  }

  const position = () => video.current?.currentTime ?? 0
  const reportBody = (isPaused = false) => stream && {
    ItemId: id,
    MediaSourceId: stream.source.Id,
    PlaySessionId: stream.playSessionId,
    PositionTicks: Math.round(position() * TICKS_PER_SECOND),
    PlayMethod: stream.method,
    AudioStreamIndex: audio,
    SubtitleStreamIndex: subtitle,
    IsPaused: isPaused,
    CanSeek: !live,
    LiveStreamId: stream.source.LiveStreamId,
  }

  // Fortschritt melden; beim Verlassen „gestoppt“ an der aktuellen Stelle
  useEffect(() => {
    if (!stream) return
    const timer = setInterval(() => {
      const body = reportBody(video.current?.paused)
      if (body && started.current && !stopped.current) reportProgress(api, body)
    }, PROGRESS_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [stream, audio, subtitle])
  useEffect(() => {
    stopped.current = false
    return () => {
      const body = reportBody()
      if (body && started.current) reportStop(api, body)
      stopped.current = true
    }
  }, [stream])

  function showOsd() {
    setOsd(true)
    clearTimeout(osdTimer.current)
    osdTimer.current = setTimeout(() => {
      if (!video.current?.paused) setOsd(false)
    }, OSD_TIMEOUT_MS)
  }

  function togglePause() {
    const element = video.current
    if (!element) return
    if (element.paused) element.play().catch(() => {})
    else element.pause()
    showOsd()
  }

  function seekBy(seconds: number) {
    const element = video.current
    if (!element || live) return
    seekTarget.current = null
    element.currentTime = Math.max(0, Math.min((duration || element.duration || 0) - 1, element.currentTime + seconds))
    showOsd()
  }

  // Intro/Abspann gerade aktiv?
  const ticks = time * TICKS_PER_SECOND
  const activeSegment = segmentList.find(s => ticks >= s.StartTicks && ticks < s.EndTicks - TICKS_PER_SECOND)
  const segmentKey = activeSegment ? `${activeSegment.Type}-${activeSegment.StartTicks}` : null
  const outroStarted = segmentList.some(s => s.Type === 'Outro' && ticks >= s.StartTicks)
  const showNext = !!next && !nextCancelled && !dialog && duration > 0 && (outroStarted || duration - time <= NEXT_BEFORE_END_S)
  // Beim Abspann mit nächster Folge übernimmt die Karte „Nächste Folge“ (10-s-Countdown)
  const showSkip = !!activeSegment && segmentKey !== dismissed && !dialog && !(activeSegment.Type === 'Outro' && showNext)

  function skip() {
    if (!activeSegment) return
    if (activeSegment.Type === 'Outro' && next && !nextCancelled) {
      playNext()
      return
    }
    seekExact(activeSegment.EndTicks / TICKS_PER_SECOND)
    setDismissed(segmentKey)
  }

  /**
   * An eine Stelle springen (Intro-, Rückblick-, Abspann-Ende). Der LG springt bei direkt abgespielten
   * Dateien zum vorigen Schlüsselbild und meldet bei „seeked“ trotzdem die angefragte Zeit. Lieber
   * etwas zu früh landen als Inhalt verpassen: Die Landung wird gut eine Sekunde nach dem Wiederanlauf
   * gemessen; nur wenn sie mehr als 8 s zu früh ist, wird einmal knapp hinter dem Ziel nachgefragt –
   * schießt das über das Ziel hinaus, geht es zurück zur ersten Landung.
   */
  const seekTarget = useRef<{ time: number; first: number; retried: boolean; since: number | null } | null>(null)
  function seekExact(seconds: number) {
    const element = video.current
    if (!element) return
    const request = seconds + 0.3
    seekTarget.current = { time: seconds, first: request, retried: false, since: null }
    element.currentTime = request
  }
  /** Ab hier läuft die Uhr für die Messung (nach „seeked“ bzw. erneut nach „playing“, falls gepuffert wurde). */
  function startSeekClock() {
    if (seekTarget.current) seekTarget.current.since = performance.now()
  }
  function checkSeek() {
    const element = video.current
    const target = seekTarget.current
    if (!element || !target || target.since === null || element.paused) return
    const elapsed = (performance.now() - target.since) / 1000
    if (elapsed < SEEK_CHECK_S) return
    const landed = element.currentTime - elapsed * (element.playbackRate || 1)
    if (!target.retried && landed < target.time - SEEK_MAX_EARLY_S) {
      target.retried = true
      target.since = null
      element.currentTime = target.time + 0.5
    } else if (target.retried && landed > target.time + 1) {
      // Zu weit: zurück zur ersten (frühen) Landung
      seekTarget.current = null
      element.currentTime = target.first
    } else seekTarget.current = null
  }

  function playNext() {
    if (!next) return
    router.replace({ name: 'player', id: next.Id })
  }

  // Tasten: bei ausgeblendeter Leiste holen Pfeile/OK sie hervor; Medientasten wirken immer
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const code = event.keyCode
      const isMedia = (list: readonly number[]) => list.includes(code)
      if (isMedia(Keys.play) || isMedia(Keys.pause) || code === 32) {
        event.preventDefault()
        if (isMedia(Keys.play)) video.current?.play().catch(() => {})
        else if (isMedia(Keys.pause)) video.current?.pause()
        else togglePause()
        showOsd()
        return
      }
      if (isMedia(Keys.fastForward)) return seekBy(FAST_SEEK_SECONDS)
      if (isMedia(Keys.rewind)) return seekBy(-FAST_SEEK_SECONDS)
      if (isMedia(Keys.stop)) {
        router.pop()
        return
      }
      if (isBack(event) || dialog) return
      // Überspringen bzw. Nächste Folge haben Vorrang vor der Leiste
      if ((showSkip || showNext) && !osd && code === 13) {
        event.preventDefault()
        event.stopPropagation()
        if (showSkip) skip()
        else playNext()
        return
      }
      if (!osd && [13, 37, 38, 39, 40].includes(code)) {
        event.preventDefault()
        event.stopPropagation()
        // OK bei ausgeblendeter Leiste: Pause/Weiter (wie Android); Pfeile holen nur die Leiste
        if (code === 13) togglePause()
        else showOsd()
        requestAnimationFrame(() => setFocus('player-bar'))
        return
      }
      if (osd) showOsd()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [osd, dialog, showSkip, showNext, duration, stream])

  function onBackPress(): boolean {
    if (dialog) {
      setDialog(false)
      requestAnimationFrame(() => setFocus('player-bar'))
      return true
    }
    if (showSkip) {
      setDismissed(segmentKey)
      return true
    }
    if (showNext) {
      setNextCancelled(true)
      return true
    }
    if (osd) {
      setOsd(false)
      return true
    }
    return false
  }

  const name = item ? itemTitle(item) : ''
  const sub = live ? (nowOn ? [timeRange(nowOn), nowOn.Name].filter(Boolean).join('  ·  ') : null) : item ? episodeSubtitle(item) : null
  const cue = cueAt(cues, time)

  return (
    <Page focusKey="player" class="qk-player" onBackPress={onBackPress}>
      {stream && (
        <video
          ref={video}
          key={stream.url}
          src={stream.url}
          autoPlay
          playsInline
          onLoadedMetadata={() => {
            const element = video.current
            if (!element) return
            setDuration(Number.isFinite(element.duration) && element.duration > 0 ? element.duration : (stream.source.RunTimeTicks ?? 0) / TICKS_PER_SECOND)
            if (startAt.current > 1 && element.currentTime < startAt.current - 1) element.currentTime = startAt.current
            // Andere Tonspur als die der Datei: im Fernseher umschalten, wenn er das kann
            if (stream.method !== 'Transcode' && audio !== fileDefaultAudio(stream.source)) applyAudioTrack(stream, audio)
          }}
          onTimeUpdate={() => {
            setTime(video.current?.currentTime ?? 0)
            checkSeek()
          }}
          onSeeked={startSeekClock}
          onPlaying={() => {
            setPaused(false)
            startSeekClock()
            if (!started.current) {
              started.current = true
              const body = reportBody()
              if (body) reportStart(api, body)
            }
          }}
          onPause={() => {
            setPaused(true)
            setOsd(true)
            const body = reportBody(true)
            if (body && started.current && !stopped.current) reportProgress(api, body)
          }}
          onEnded={() => (next && !nextCancelled ? playNext() : router.pop())}
          onError={() => setError(t.playbackFailed)}
        />
      )}
      {cue && !dialog && <div class={`qk-subtitle ${osd ? 'raised' : ''}`}>{cue.split('\n').map(line => <div>{line}</div>)}</div>}
      {!stream && !error && <div class="qk-player-loading">{t.loading}</div>}
      {error && <div class="qk-player-loading qk-error">{error}</div>}

      {showSkip && activeSegment && <SkipButton key={segmentKey} label={activeSegment.Type === 'Outro' ? t.skipCredits : activeSegment.Type === 'Recap' ? t.skipRecap : t.skipIntro} onSkip={skip} />}
      {!showSkip && showNext && next && <NextPanel item={next} onPlay={playNext} />}

      <div class={`qk-osd ${osd ? 'visible' : ''}`}>
        <div class="qk-osd-title">{name}</div>
        {sub && <div class="qk-osd-subtitle">{sub}</div>}
        {live ? <LiveBar program={nowOn} paused={paused} onToggle={togglePause} /> : <SeekBar time={time} duration={duration} paused={paused} onSeek={seekBy} onToggle={togglePause} />}
        <OsdButtons
          hasNext={!!next}
          canRate={!live && !!item && !!ratingTarget(item)}
          likes={likes}
          onRate={rate}
          onTracks={() => {
            setDialog(true)
            requestAnimationFrame(() => setFocus('tracks'))
          }}
          onNext={playNext}
        />
      </div>

      {dialog && stream && (
        <TrackDialog
          stream={stream}
          audio={audio}
          subtitle={subtitle}
          onAudio={index => {
            setDialog(false)
            const track = audioStreams(stream.source).find(s => s.Index === index)
            // Direkt: umschalten ohne Neustart, wenn der Fernseher den Ton kann
            if (stream.method !== 'Transcode' && canPlayAudio(track?.Codec) && applyAudioTrack(stream, index)) {
              setAudio(index)
              return
            }
            open(index, subtitle, position(), stream.method !== 'Transcode', true).catch(() => setError(t.playbackFailed))
          }}
          onSubtitle={index => {
            setDialog(false)
            const track = subtitleStreams(stream.source).find(s => s.Index === index)
            const current = subtitleStreams(stream.source).find(s => s.Index === subtitle)
            // Eingebrannte Untertitel (neu oder bisher) brauchen eine neue Umrechnung, Text-Untertitel nicht
            if ((track && isBurnedIn(track)) || (current && isBurnedIn(current))) open(audio, index, position()).catch(() => setError(t.playbackFailed))
            else {
              setSubtitle(index)
              loadCues(stream, index)
            }
          }}
        />
      )}
    </Page>
  )
}

const loadChannel = (api: Api, id: string) => get<Item>(api, `/LiveTv/Channels/${id}?userId=${api.userId}`)

/** Live-TV: statt der Zeitleiste der Fortschritt der laufenden Sendung; OK pausiert. */
function LiveBar({ program, paused, onToggle }: { program: Item | null; paused: boolean; onToggle: () => void }) {
  const { ref, focused } = useFocusable({ focusKey: 'player-bar', onEnterPress: onToggle })
  const percent = program ? programProgress(program) ?? 0 : 0
  return (
    <div ref={ref} class={`qk-seek ${focused ? 'focused' : ''}`}>
      <span class="qk-seek-state"><Icon name={paused ? 'play' : 'pause'} size={30} /></span>
      <span class="qk-seek-time qk-live-badge">LIVE</span>
      <div class="qk-seek-track"><div class="qk-seek-fill" style={{ width: `${percent}%` }} /></div>
      <span class="qk-seek-time">{program?.EndDate ? timeRange(program).split('–')[1] : ''}</span>
    </div>
  )
}

function SeekBar({ time, duration, paused, onSeek, onToggle }: { time: number; duration: number; paused: boolean; onSeek: (s: number) => void; onToggle: () => void }) {
  const { ref, focused } = useFocusable({
    focusKey: 'player-bar',
    onEnterPress: onToggle,
    onArrowPress: direction => {
      if (direction === 'left') onSeek(-SEEK_SECONDS)
      else if (direction === 'right') onSeek(SEEK_SECONDS)
      else return true
      return false
    },
  })
  const percent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0
  return (
    <div ref={ref} class={`qk-seek ${focused ? 'focused' : ''}`}>
      {/* Zeigt, was OK bewirkt: läuft → Pause, pausiert → Abspielen */}
      <span class="qk-seek-state"><Icon name={paused ? 'play' : 'pause'} size={30} /></span>
      <span class="qk-seek-time">{formatTime(time)}</span>
      <div class="qk-seek-track"><div class="qk-seek-fill" style={{ width: `${percent}%` }} /><div class="qk-seek-knob" style={{ left: `${percent}%` }} /></div>
      <span class="qk-seek-time">{duration > 0 ? '-' + formatTime(duration - time) : ''}</span>
    </div>
  )
}

interface OsdButtonsProps {
  hasNext: boolean
  canRate: boolean
  likes: boolean | null
  onRate: (value: boolean) => void
  onTracks: () => void
  onNext: () => void
}

function OsdButtons({ hasNext, canRate, likes, onRate, onTracks, onNext }: OsdButtonsProps) {
  const { ref, focusKey } = useFocusable({ focusKey: 'player-buttons', trackChildren: true })
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-osd-buttons">
        <OsdButton focusKey="player-tracks" icon="subtitles" label={t.audioSubtitles} onPress={onTracks} />
        {hasNext && <OsdButton focusKey="player-next" icon="skipNext" label={t.nextEpisode} onPress={onNext} />}
        {canRate && <OsdButton focusKey="player-like" icon="thumbUp" label={t.like} active={likes === true} onPress={() => onRate(true)} />}
        {canRate && <OsdButton focusKey="player-dislike" icon="thumbDown" label={t.dislike} active={likes === false} onPress={() => onRate(false)} />}
      </div>
    </FocusContext.Provider>
  )
}

function OsdButton({ focusKey, label, onPress, selected, active, icon }: { focusKey: string; label: string; onPress: () => void; selected?: boolean; active?: boolean; icon?: IconName }) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onPress })
  return (
    <div ref={ref} class={`qk-osd-button ${focused ? 'focused' : ''} ${selected ? 'selected' : ''} ${active ? 'active' : ''}`} onClick={onPress}>
      {selected && <Icon name="check" size={22} />}
      {icon && <Icon name={icon} size={24} />}
      <span>{label}</span>
    </div>
  )
}

/** Ton und Untertitel in einem Fenster, zwei Spalten (wie Android). */
function TrackDialog({ stream, audio, subtitle, onAudio, onSubtitle }: { stream: Stream; audio?: number; subtitle: number; onAudio: (i: number) => void; onSubtitle: (i: number) => void }) {
  const { ref, focusKey } = useFocusable({ focusKey: 'tracks', trackChildren: true, isFocusBoundary: true, preferredChildFocusKey: `track-a-${audio}` })
  const audios = audioStreams(stream.source)
  const subtitles = subtitleStreams(stream.source)
  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} class="qk-tracks">
        <div class="qk-tracks-column">
          <div class="qk-tracks-title">{t.audio}</div>
          {audios.map(a => <OsdButton key={a.Index} focusKey={`track-a-${a.Index}`} label={trackLabel(a)} selected={a.Index === audio} onPress={() => onAudio(a.Index)} />)}
        </div>
        <div class="qk-tracks-column">
          <div class="qk-tracks-title">{t.subtitles}</div>
          <OsdButton focusKey="track-s-off" label={t.off} selected={subtitle < 0} onPress={() => onSubtitle(-1)} />
          {subtitles.map(s => <OsdButton key={s.Index} focusKey={`track-s-${s.Index}`} label={trackLabel(s) + (s.IsForced && !/erzwungen|forced/i.test(trackLabel(s)) ? ` (${t.forced})` : '')} selected={s.Index === subtitle} onPress={() => onSubtitle(s.Index)} />)}
        </div>
      </div>
    </FocusContext.Provider>
  )
}

/** „Überspringen“: der Balken füllt sich, dann wird übersprungen; OK sofort, Zurück bricht ab. */
function SkipButton({ label, onSkip }: { label: string; onSkip: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onSkip, SKIP_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div class="qk-skip">
      <span>{label}</span>
      <div class="qk-skip-fill" style={{ animationDuration: `${SKIP_DELAY_MS}ms` }} />
    </div>
  )
}

/** Nächste Folge mit Countdown; OK startet sofort, Zurück bleibt bei dieser Folge. */
function NextPanel({ item, onPlay }: { item: Item; onPlay: () => void }) {
  const [left, setLeft] = useState(NEXT_COUNTDOWN_S)
  useEffect(() => {
    if (left <= 0) {
      onPlay()
      return
    }
    const timer = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(timer)
  }, [left])
  const sub = episodeSubtitle(item)
  return (
    <div class="qk-next">
      <div class="qk-next-label">{t.nextEpisodeIn(left)}</div>
      <div class="qk-next-title">{sub ?? item.Name}</div>
      <div class="qk-next-hint">{t.nextEpisodeHint}</div>
    </div>
  )
}
