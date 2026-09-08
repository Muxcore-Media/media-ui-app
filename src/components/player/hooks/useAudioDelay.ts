import { useEffect } from 'react';
import { applyHouseholdAudioOffset, stopLeadAudio } from '../../../lib/audio-delay';
import { isHlsPlaySrc } from '../../../lib/player/hls';

export function useAudioDelay(
  videoRef: React.RefObject<HTMLMediaElement | null>,
  playSrc: string,
  offsetMs: number,
  ready = true,
) {
  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current;
    if (!video) return;
    const canLead = Boolean(playSrc) && !isHlsPlaySrc(playSrc);
    applyHouseholdAudioOffset({ video, playSrc, offsetMs, canLead });
    const onTime = () => {
      applyHouseholdAudioOffset({ video, playSrc, offsetMs, canLead });
    };
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onTime);
    video.addEventListener('pause', onTime);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onTime);
      video.removeEventListener('pause', onTime);
      stopLeadAudio(video);
    };
  }, [videoRef, playSrc, offsetMs, ready]);
}
