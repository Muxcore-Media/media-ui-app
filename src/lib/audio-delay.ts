import {
  AUDIO_DELAY_MAX_SEC,
  audioGraphDelaySeconds,
  clampAudioOffsetMs,
  leadAudioTime,
} from './audio-offset';

export type AudioDelayGraph = {
  ctx: AudioContext;
  delay: DelayNode;
};

const graphs = new WeakMap<HTMLMediaElement, AudioDelayGraph>();
const leadAudio = new WeakMap<HTMLMediaElement, HTMLAudioElement>();
const leadMuteRestore = new WeakMap<HTMLMediaElement, boolean>();

export function hasAudioDelayGraph(el: HTMLMediaElement): boolean {
  return graphs.has(el);
}

export function ensureAudioDelayGraph(
  el: HTMLMediaElement,
  createContext: () => AudioContext = () => new AudioContext(),
): AudioDelayGraph | null {
  const existing = graphs.get(el);
  if (existing) return existing;
  try {
    if (!el.crossOrigin) el.crossOrigin = 'anonymous';
    const ctx = createContext();
    const source = ctx.createMediaElementSource(el);
    const delay = ctx.createDelay(AUDIO_DELAY_MAX_SEC);
    source.connect(delay);
    delay.connect(ctx.destination);
    const graph = { ctx, delay };
    graphs.set(el, graph);
    return graph;
  } catch {
    return null;
  }
}

export function applyAudioDelayGraph(graph: AudioDelayGraph | null, offsetMs: number): number {
  const seconds = audioGraphDelaySeconds(offsetMs);
  if (graph) {
    graph.delay.delayTime.setValueAtTime(seconds, graph.ctx.currentTime);
    void graph.ctx.resume();
  }
  return seconds;
}

export function stopLeadAudio(video: HTMLMediaElement): void {
  const audio = leadAudio.get(video);
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    leadAudio.delete(video);
  }
  if (leadMuteRestore.has(video)) {
    video.muted = leadMuteRestore.get(video) === true;
    leadMuteRestore.delete(video);
  }
}

export function syncLeadAudio(
  video: HTMLMediaElement,
  src: string,
  offsetMs: number,
  createAudio: () => HTMLAudioElement = () => new Audio(),
): number {
  const target = leadAudioTime(video.currentTime, offsetMs);
  let audio = leadAudio.get(video);
  if (!audio) {
    audio = createAudio();
    audio.preload = 'auto';
    leadAudio.set(video, audio);
    leadMuteRestore.set(video, video.muted);
    video.muted = true;
  }
  if (src && audio.getAttribute('src') !== src) {
    audio.src = src;
  }
  audio.volume = video.volume;
  audio.muted = leadMuteRestore.get(video) === true;
  audio.playbackRate = video.playbackRate || 1;
  if (Math.abs(audio.currentTime - target) > 0.08) {
    try {
      audio.currentTime = target;
    } catch {
      /* ignore unready media */
    }
  }
  if (video.paused) audio.pause();
  else void audio.play()?.catch?.(() => {});
  return target;
}

export function applyHouseholdAudioOffset(opts: {
  video: HTMLMediaElement;
  playSrc: string;
  offsetMs: number;
  canLead: boolean;
  createContext?: () => AudioContext;
  createAudio?: () => HTMLAudioElement;
}): { mode: 'delay' | 'lead' | 'none'; appliedSec: number } {
  const ms = clampAudioOffsetMs(opts.offsetMs);
  if (ms > 0) {
    stopLeadAudio(opts.video);
    const applied = applyAudioDelayGraph(ensureAudioDelayGraph(opts.video, opts.createContext), ms);
    return { mode: 'delay', appliedSec: applied };
  }
  if (ms < 0 && opts.canLead && !hasAudioDelayGraph(opts.video)) {
    const applied = syncLeadAudio(opts.video, opts.playSrc, ms, opts.createAudio);
    return { mode: 'lead', appliedSec: applied };
  }
  if (hasAudioDelayGraph(opts.video)) {
    applyAudioDelayGraph(graphs.get(opts.video) ?? null, 0);
  }
  stopLeadAudio(opts.video);
  return { mode: 'none', appliedSec: 0 };
}
