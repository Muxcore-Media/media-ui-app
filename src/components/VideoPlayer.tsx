import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUALITY_OPTIONS, type AspectMode } from '../lib/player/types';
import {
  getPreferences,
  getProgress,
  updatePreferences,
  type MediaKind,
  type UserPreferences,
} from '../lib/userdata';
import { usePlaybackSource } from './player/hooks/usePlaybackSource';
import { useVideoElement } from './player/hooks/useVideoElement';
import { usePlaybackSegments } from './player/hooks/usePlaybackSegments';
import { usePlaybackChapters } from './player/hooks/usePlaybackChapters';
import { usePlaybackAnalysis } from './player/hooks/usePlaybackAnalysis';
import { useTrickplay } from './player/hooks/useTrickplay';
import { useSubtitleCues } from './player/hooks/useSubtitleCues';
import { useSubtitleSearch } from './player/hooks/useSubtitleSearch';
import { useUpNext } from './player/hooks/useUpNext';
import { useProgressReporting } from './player/hooks/useProgressReporting';
import { usePlayerChrome } from './player/hooks/usePlayerChrome';
import { useKeyboardShortcuts } from './player/hooks/useKeyboardShortcuts';
import { useGestures } from './player/hooks/useGestures';
import { useStats } from './player/hooks/useStats';
import TopBar from './player/TopBar';
import ControlsBar from './player/ControlsBar';
import CenterOverlay from './player/CenterOverlay';
import SubtitleOverlay from './player/SubtitleOverlay';
import SkipSegmentButton from './player/SkipSegmentButton';
import UpNextOverlay from './player/UpNextOverlay';
import NextEpisodeButton from './player/NextEpisodeButton';
import ResumeDialog from './player/ResumeDialog';
import StatsOverlay from './player/StatsOverlay';
import ShortcutsHelp from './player/ShortcutsHelp';
import ErrorScreen from './player/ErrorScreen';
import PlayerEpisodeDrawer from './player/PlayerEpisodeDrawer';
import { LoadingStatus } from './ui/LoadingStatus';
import {
  audioTracksFromAnalysis,
  mergeAudioTracks,
  mergeTextTracks,
  subtitleTracksFromAnalysis,
} from '../lib/player/tracks';
import type { PlaybackSubtitleTrack } from '../api/client';
import type { PlayerTrackInfo } from '../lib/player/types';

/** Show the "Next Episode" button this many seconds before the end of an episode. */
const NEAR_END_SEC = 120;

const ASPECT_CLASS: Record<AspectMode, string> = {
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill',
};

type CaptionTrack = {
  label: string;
  src: string;
  srclang?: string;
  language?: string;
  default?: boolean;
};

type Props = {
  src: string;
  title?: string;
  mediaId?: string;
  mediaKind?: MediaKind;
  mediaYear?: number;
  posterUrl?: string;
  href?: string;
  showId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  subtitleTracks?: CaptionTrack[];
  /** When true, skip the resume prompt and start at 0. */
  startOver?: boolean;
  /** Content rating from the player URL, persisted onto progress for resume gating. */
  contentRating?: string;
};

export default function VideoPlayer({
  src,
  title,
  mediaId,
  mediaKind = 'movie',
  mediaYear,
  posterUrl,
  href = '/',
  showId,
  seasonNumber,
  episodeNumber,
  subtitleTracks = [],
  startOver = false,
  contentRating,
}: Props) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefs = getPreferences();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [savedPositionSec, setSavedPositionSec] = useState(0);
  const [subtitlePrefs, setSubtitlePrefs] = useState<UserPreferences['subtitles']>(prefs.subtitles);
  const [seekBubble, setSeekBubble] = useState<number | null>(null);
  const [aspectMode, setAspectMode] = useState<AspectMode>(prefs.player.aspectMode);
  const [downloadedTracks, setDownloadedTracks] = useState<PlaybackSubtitleTrack[]>([]);

  const resumeCheckedSrcRef = useRef<string | null>(null);
  const autoSubtitleAppliedRef = useRef(false);
  const outroTriggeredRef = useRef(false);
  const resumePlayRef = useRef(false);
  const seekBubbleTimerRef = useRef<number | null>(null);

  const source = usePlaybackSource(src);

  const subtitleSearch = useSubtitleSearch();

  const upNext = useUpNext({
    showId,
    mediaId,
    mediaKind,
    autoplayEnabled: prefs.playback.autoplayNext,
    onAdvance: (nextHref) => navigate(nextHref),
  });

  // Stable callback identities (source/upNext are fresh objects every render)
  // so useVideoElement's listener-setup effect doesn't re-subscribe on every
  // render, which would otherwise loop forever via its unconditional setState.
  const upNextRef = useRef(upNext);
  upNextRef.current = upNext;
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const handleEnded = useCallback(() => upNextRef.current.trigger(), []);
  const handleStalled = useCallback(() => sourceRef.current.scheduleRetry(0), []);
  const handleFatalError = useCallback(() => sourceRef.current.scheduleRetry(0), []);
  const handleLoadedMetadata = useCallback(() => {
    if (resumePlayRef.current) {
      resumePlayRef.current = false;
      videoRef.current?.play()?.catch?.(() => {});
    }
  }, []);

  const videoEl = useVideoElement({
    videoRef,
    playSrc: source.playSrc,
    transcodeOffsetSec: source.transcodeOffsetSec,
    onEnded: handleEnded,
    onStalled: handleStalled,
    onFatalError: handleFatalError,
    onLoadedMetadata: handleLoadedMetadata,
  });

  const absoluteDurationSec =
    videoEl.duration > 0 ? source.transcodeOffsetSec + videoEl.duration : 0;

  const segments = usePlaybackSegments({
    mediaId,
    durationSec: absoluteDurationSec,
    legacyIntroSkipSec: prefs.playback.skipIntroSec,
  });
  const chapters = usePlaybackChapters({ src, durationSec: absoluteDurationSec });
  const probe = usePlaybackAnalysis(src);

  const probeAudio = audioTracksFromAnalysis(probe.analysis?.audio ?? []);
  const probeSubs = subtitleTracksFromAnalysis(probe.analysis?.subtitles ?? []);
  const displayAudio = mergeAudioTracks(videoEl.audioTracks, probeAudio);
  const pictureSubtitles = probeSubs.filter((t) => t.pictureBased);

  const trickplay = useTrickplay({
    src,
    durationSec: absoluteDurationSec,
    enabled: source.trickplayEnabled,
  });

  const captionTracks: CaptionTrack[] = [...subtitleTracks, ...source.remoteTracks, ...downloadedTracks];
  const activeCaption = videoEl.textIdx >= 0 ? captionTracks[videoEl.textIdx] : undefined;
  const subtitles = useSubtitleCues(activeCaption?.src ?? null);

  // Downloaded subtitles appear in the UI track list alongside embedded/sidecar tracks.
  const baseDisplayText = mergeTextTracks(videoEl.textTracks, probeSubs).filter(
    (t) => !t.pictureBased,
  );
  const downloadedTextTracks: PlayerTrackInfo[] = downloadedTracks.map((t, i) => ({
    id: `downloaded-${t.id}`,
    label: t.label,
    kind: 'text' as const,
    index: subtitleTracks.length + source.remoteTracks.length + i,
    language: t.language || t.srclang,
  }));
  const displayText = [...baseDisplayText, ...downloadedTextTracks];

  const stats = useStats({
    videoRef,
    mode: source.playMode,
    maxBitrateMbps: source.maxBitrateMbps,
    streamUrl: source.playSrc,
    enabled: statsVisible,
  });

  const chrome = usePlayerChrome({
    containerRef,
    videoRef,
    initialTheaterMode: prefs.player.theaterMode,
    keepControlsVisible: resumeDialogOpen || settingsOpen || shortcutsOpen || drawerOpen,
  });

  useProgressReporting({
    mediaId,
    mediaKind,
    title: title || 'Playback',
    posterUrl,
    href,
    src,
    enabled: prefs.playback.rememberPosition,
    playing: videoEl.playing,
    positionSec: videoEl.absoluteCurrent,
    durationSec: absoluteDurationSec,
    suppress: resumeDialogOpen,
    contentRating,
  });

  // Resume-vs-start-over prompt: once per title, the first time metadata is ready.
  useEffect(() => {
    if (!src || resumeCheckedSrcRef.current === src) return;
    if (startOver || !mediaId || !prefs.playback.rememberPosition) {
      resumeCheckedSrcRef.current = src;
      return;
    }
    if (videoEl.duration <= 0) return;
    resumeCheckedSrcRef.current = src;
    const saved = getProgress(mediaId);
    if (saved && saved.positionSec > 5 && videoEl.duration - saved.positionSec > 5) {
      setSavedPositionSec(saved.positionSec);
      setResumeDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, mediaId, videoEl.duration, startOver]);

  useEffect(() => {
    autoSubtitleAppliedRef.current = false;
    outroTriggeredRef.current = false;
    setDownloadedTracks([]);
    subtitleSearch.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Auto-select the user's preferred subtitle language once tracks are known.
  useEffect(() => {
    if (autoSubtitleAppliedRef.current || displayText.length === 0) return;
    autoSubtitleAppliedRef.current = true;
    if (!prefs.subtitles.enabled) return;
    const pref = prefs.subtitles.language.toLowerCase();
    const match = displayText.find(
      (t) =>
        (t.language || '').toLowerCase().includes(pref) || t.label.toLowerCase().includes(pref),
    );
    if (match) videoEl.setTextIdx(match.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayText]);

  const activeSegment = segments.activeSegmentAt(videoEl.absoluteCurrent);

  // Trigger the Up Next overlay a little early, once we enter the outro/credits window.
  useEffect(() => {
    if (outroTriggeredRef.current) return;
    if (activeSegment && (activeSegment.kind === 'outro' || activeSegment.kind === 'credits')) {
      outroTriggeredRef.current = true;
      upNextRef.current.trigger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment]);

  function seekAbsolute(sec: number) {
    const target = Math.max(0, absoluteDurationSec > 0 ? Math.min(absoluteDurationSec, sec) : sec);
    if (source.playMode === 'transcode') {
      resumePlayRef.current = videoEl.playing;
      source.seekWithinTranscode(target);
    } else {
      videoEl.seekRelative(target);
    }
  }

  function seekBy(deltaSec: number) {
    seekAbsolute(videoEl.absoluteCurrent + deltaSec);
  }

  function showSeekBubble(deltaSec: number) {
    setSeekBubble(deltaSec);
    if (seekBubbleTimerRef.current) window.clearTimeout(seekBubbleTimerRef.current);
    seekBubbleTimerRef.current = window.setTimeout(() => setSeekBubble(null), 650);
  }

  function handleQuality(id: string) {
    resumePlayRef.current = videoEl.playing;
    source.setQuality(id);
    updatePreferences({ player: { ...prefs.player, preferredQuality: id } });
  }

  function handleSubtitlePrefs(patch: Partial<UserPreferences['subtitles']>) {
    setSubtitlePrefs((s) => ({ ...s, ...patch }));
    updatePreferences({ subtitles: { ...subtitlePrefs, ...patch } });
  }

  function handleToggleTheater() {
    chrome.toggleTheater();
    updatePreferences({ player: { ...prefs.player, theaterMode: !chrome.theaterMode } });
  }

  function handleAspectMode(mode: AspectMode) {
    setAspectMode(mode);
    updatePreferences({ player: { ...prefs.player, aspectMode: mode } });
  }

  function goToPrevMarker() {
    const chapterBoundary = chapters.prevChapterBefore(videoEl.absoluteCurrent);
    if (chapterBoundary != null) {
      seekAbsolute(chapterBoundary);
      return;
    }
    const boundary = segments.prevBoundaryBefore(videoEl.absoluteCurrent);
    seekAbsolute(boundary ?? 0);
  }

  function goToNextMarker() {
    const chapterBoundary = chapters.nextChapterAfter(videoEl.absoluteCurrent);
    if (chapterBoundary != null) {
      seekAbsolute(chapterBoundary);
      return;
    }
    const boundary = segments.nextBoundaryAfter(videoEl.absoluteCurrent);
    if (boundary != null) seekAbsolute(boundary);
  }

  const markerNavEnabled = chapters.chapters.length > 0 || segments.segments.length > 0;

  function handleResume() {
    if (source.playMode === 'transcode') source.seekWithinTranscode(savedPositionSec);
    else videoEl.seekRelative(savedPositionSec);
    setResumeDialogOpen(false);
  }

  function handleStartOver() {
    setResumeDialogOpen(false);
  }

  function handleAudio(idx: number) {
    const track = displayAudio.find((t) => t.index === idx);
    if (source.playMode === 'transcode' && track?.streamIndex != null && track.streamIndex >= 0) {
      resumePlayRef.current = videoEl.playing;
      source.setAudioStreamIndex(track.streamIndex, videoEl.absoluteCurrent);
      videoEl.setAudioIdx(idx);
      return;
    }
    videoEl.setAudioIdx(idx);
  }

  function handleText(idx: number) {
    videoEl.setTextIdx(idx);
  }

  function handleFindSubtitles() {
    void subtitleSearch.search({
      title: title || '',
      language: subtitlePrefs.language,
      mediaType: mediaKind === 'episode' ? 'tv' : 'movie',
      season: seasonNumber,
      episode: episodeNumber,
      year: mediaYear,
    });
  }

  async function handleDownloadSubtitle(id: string, provider: string) {
    const track = await subtitleSearch.download(id, provider);
    if (track) {
      const newIdx = subtitleTracks.length + source.remoteTracks.length + downloadedTracks.length;
      setDownloadedTracks((prev) => [...prev, track]);
      videoEl.setTextIdx(newIdx);
    }
  }

  function toggleSubtitlesShortcut() {
    handleText(videoEl.textIdx === -1 ? (displayText[0]?.index ?? -1) : -1);
  }

  const anyOverlayOpen = resumeDialogOpen || settingsOpen || shortcutsOpen || drawerOpen;

  const gestures = useGestures({
    enabled: !anyOverlayOpen,
    togglePlay: videoEl.togglePlay,
    seekBy,
    volumeBy: (d) => videoEl.setVolume(videoEl.volume + d),
    bumpControls: chrome.bumpControls,
    showSeekBubble,
  });

  useKeyboardShortcuts({
    enabled: prefs.controls.enableKeyboardShortcuts,
    togglePlay: videoEl.togglePlay,
    seekBy,
    seekToFraction: (f) => seekAbsolute((absoluteDurationSec || 0) * f),
    volumeBy: (d) => videoEl.setVolume(videoEl.volume + d),
    toggleMute: () => videoEl.setMuted(!videoEl.muted),
    toggleFullscreen: chrome.toggleFullscreen,
    toggleTheater: handleToggleTheater,
    togglePiP: chrome.togglePiP,
    toggleSubtitles: toggleSubtitlesShortcut,
    cycleSpeed: (dir) => {
      const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
      const idx = speeds.indexOf(videoEl.rate);
      const next = speeds[Math.min(speeds.length - 1, Math.max(0, (idx < 0 ? 2 : idx) + dir))];
      videoEl.setRate(next);
    },
    skipActiveSegment: () => activeSegment && seekAbsolute(activeSegment.end_seconds + 0.1),
    toggleEpisodeDrawer: showId ? () => setDrawerOpen((o) => !o) : undefined,
    toggleHelp: () => setShortcutsOpen((o) => !o),
    closeOverlays: () => {
      setDrawerOpen(false);
      setShortcutsOpen(false);
      setSettingsOpen(false);
    },
    anyOverlayOpen,
  });

  if (!src) {
    return <ErrorScreen message="This title isn't available to play." href={href} />;
  }
  if (source.error) {
    return <ErrorScreen message={source.error} href={href} onRetry={source.retry} />;
  }

  const metaLineParts: string[] = [];
  if (mediaKind === 'episode' && seasonNumber != null && episodeNumber != null) {
    metaLineParts.push(
      `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`,
    );
  }
  if (probe.analysis?.info_line) metaLineParts.push(probe.analysis.info_line);
  const metaLine = metaLineParts.length > 0 ? metaLineParts.join(' · ') : null;

  return (
    <div
      ref={containerRef}
      role="main"
      aria-label={`${title || 'Video'} player`}
      className={`fixed inset-0 z-50 flex flex-col bg-[var(--player-bg)] ${chrome.theaterMode ? 'theater-mode' : ''}`}
      data-testid="video-player"
      onMouseMove={chrome.bumpControls}
      onTouchStart={(e) => {
        chrome.bumpControls();
        gestures.onTouchStart(e);
      }}
      onTouchMove={gestures.onTouchMove}
      onTouchEnd={gestures.onTouchEnd}
    >
      {source.loading ? <LoadingStatus label="Loading playback" /> : null}
      <div className="relative min-h-0 flex-1">
        {!source.loading && (
          <video
            ref={videoRef}
            className={`h-full w-full ${ASPECT_CLASS[aspectMode]}`}
            style={{ filter: `brightness(${gestures.brightness})` }}
            playsInline
            preload="metadata"
            title={title}
            src={source.playSrc}
            data-playback-mode={source.playMode}
            onClick={videoEl.togglePlay}
          >
            {captionTracks.map((t) => (
              <track
                key={t.src + t.label}
                kind="subtitles"
                src={t.src}
                srcLang={t.srclang || t.language || prefs.subtitles.language}
                label={t.label}
                default={
                  Boolean(t.default) ||
                  (prefs.subtitles.enabled &&
                    (t.srclang || t.language || '').toLowerCase() ===
                      prefs.subtitles.language.toLowerCase())
                }
              />
            ))}
          </video>
        )}

        <CenterOverlay
          loading={source.loading}
          buffering={videoEl.buffering}
          playing={videoEl.playing}
          showControls={chrome.showControls}
          onTogglePlay={videoEl.togglePlay}
          seekBubble={seekBubble}
        />

        {!source.loading && !videoEl.fatalError ? (
          <SubtitleOverlay
            cues={subtitles.cuesAt(videoEl.absoluteCurrent)}
            prefs={subtitlePrefs}
            controlsVisible={chrome.showControls}
          />
        ) : null}

        {statsVisible ? <StatsOverlay stats={stats} /> : null}

        {videoEl.fatalError ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--player-scrim)]">
            <div className="pointer-events-auto max-w-sm space-y-3 rounded-xl border border-[var(--player-chip-border)] bg-[var(--player-panel-bg)] p-5 text-center shadow-2xl">
              <p className="text-sm text-[var(--player-fg)]">{videoEl.fatalError}</p>
              <button
                type="button"
                className="rounded-full bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-[var(--text-on-accent)]"
                onClick={source.retry}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <TopBar
          href={href}
          title={title || 'Playback'}
          metaLine={metaLine}
          showEpisodesButton={Boolean(showId && upNext.showData)}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((o) => !o)}
          statsVisible={statsVisible}
          onToggleStats={() => setStatsVisible((v) => !v)}
          onShowShortcuts={() => setShortcutsOpen(true)}
          visible={chrome.showControls}
        />

        <ControlsBar
          visible={chrome.showControls}
          playing={videoEl.playing}
          onTogglePlay={videoEl.togglePlay}
          absoluteCurrent={videoEl.absoluteCurrent}
          durationSec={absoluteDurationSec}
          bufferedAheadSec={videoEl.bufferedAheadSec}
          segments={segments.segments}
          chapters={chapters.chapters}
          onSeekAbsolute={seekAbsolute}
          onSeekRelative={seekBy}
          trickplayFrameAt={trickplay.frameAt}
          trickplayEnabled={source.trickplayEnabled}
          volume={videoEl.volume}
          muted={videoEl.muted}
          onVolume={videoEl.setVolume}
          onMuted={videoEl.setMuted}
          playMode={source.playMode}
          theaterMode={chrome.theaterMode}
          onToggleTheater={handleToggleTheater}
          pipSupported={chrome.pipSupported}
          pipActive={chrome.pipActive}
          onTogglePiP={chrome.togglePiP}
          castSupported={chrome.castSupported}
          castConnected={chrome.castConnected}
          onToggleCast={chrome.toggleCast}
          airPlaySupported={chrome.airPlaySupported}
          onToggleAirPlay={chrome.toggleAirPlay}
          fullscreen={chrome.fullscreen}
          onToggleFullscreen={chrome.toggleFullscreen}
          quality={source.quality}
          qualityOptions={QUALITY_OPTIONS}
          onQuality={handleQuality}
          transcoderAvailable={source.transcoderAvailable}
          audioTracks={displayAudio}
          audioIdx={videoEl.audioIdx}
          onAudio={handleAudio}
          textTracks={displayText}
          pictureSubtitleTracks={pictureSubtitles}
          textIdx={videoEl.textIdx}
          onText={handleText}
          rate={videoEl.rate}
          onRate={videoEl.setRate}
          subtitlePrefs={subtitlePrefs}
          onSubtitlePrefs={handleSubtitlePrefs}
          onSettingsOpenChange={setSettingsOpen}
          aspectMode={aspectMode}
          onAspectMode={handleAspectMode}
          onPrevMarker={markerNavEnabled ? goToPrevMarker : undefined}
          onNextMarker={markerNavEnabled ? goToNextMarker : undefined}
          subtitleSearch={{
            status: subtitleSearch.status,
            results: subtitleSearch.results,
            error: subtitleSearch.error,
            downloadingId: subtitleSearch.downloadingId,
            downloadedId: subtitleSearch.downloadedId,
            onSearch: handleFindSubtitles,
            onDownload: (id, provider) => void handleDownloadSubtitle(id, provider),
          }}
        />

        {activeSegment ? (
          <SkipSegmentButton
            segment={activeSegment}
            onSkip={() => seekAbsolute(activeSegment.end_seconds + 0.1)}
            elevated={upNext.countdownActive}
          />
        ) : null}

        {upNext.countdownActive && upNext.next ? (
          <UpNextOverlay
            title={upNext.next.title}
            secondsLeft={upNext.secondsLeft}
            onPlayNow={upNext.playNow}
            onCancel={upNext.cancel}
          />
        ) : null}

        {!upNext.countdownActive &&
        !activeSegment &&
        upNext.next &&
        absoluteDurationSec > 0 &&
        absoluteDurationSec - videoEl.absoluteCurrent <= NEAR_END_SEC ? (
          <NextEpisodeButton title={upNext.next.title} onPlay={upNext.playNow} />
        ) : null}

        {resumeDialogOpen ? (
          <ResumeDialog
            positionSec={savedPositionSec}
            onResume={handleResume}
            onStartOver={handleStartOver}
          />
        ) : null}

        {shortcutsOpen ? <ShortcutsHelp onClose={() => setShortcutsOpen(false)} /> : null}

        {drawerOpen && upNext.showData ? (
          <PlayerEpisodeDrawer
            show={upNext.showData}
            currentEpisodeId={mediaId}
            onClose={() => setDrawerOpen(false)}
            onPick={(nextHref) => {
              setDrawerOpen(false);
              navigate(nextHref);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
