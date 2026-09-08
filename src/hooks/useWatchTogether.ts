import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import {
  joinWatchTogetherHref,
  readWatchTogetherHostToken,
  shouldFollowHost,
  storeWatchTogetherHostToken,
  type WatchTogetherRoom,
} from '../lib/watch-together';

type Opts = {
  roomId?: string;
  src: string;
  title: string;
  mediaId?: string;
  positionSec: number;
  playing: boolean;
  seekAbsolute: (sec: number) => void;
  setPlaying: (on: boolean) => void;
};

export function useWatchTogether({
  roomId,
  src,
  title,
  mediaId,
  positionSec,
  playing,
  seekAbsolute,
  setPlaying,
}: Opts) {
  const [room, setRoom] = useState<WatchTogetherRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posRef = useRef(positionSec);
  const playingRef = useRef(playing);
  const followLock = useRef(false);

  posRef.current = positionSec;
  playingRef.current = playing;

  const hostToken = roomId ? readWatchTogetherHostToken(roomId) : '';
  const youAreHost = Boolean(room?.youAreHost || hostToken);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      void api
        .getWatchTogether(roomId)
        .then((next) => {
          if (!cancelled) setRoom(next);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Watch together unavailable');
        });
    };
    tick();
    const id = window.setInterval(tick, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomId]);

  useEffect(() => {
    if (!room || youAreHost || followLock.current) return;
    if (shouldFollowHost(posRef.current, room.positionSeconds)) {
      followLock.current = true;
      seekAbsolute(room.positionSeconds);
      window.setTimeout(() => {
        followLock.current = false;
      }, 400);
    }
    if (room.playing !== playingRef.current) {
      setPlaying(room.playing);
    }
  }, [room, youAreHost, seekAbsolute, setPlaying]);

  useEffect(() => {
    if (!roomId || !youAreHost) return;
    const id = window.setInterval(() => {
      const token = readWatchTogetherHostToken(roomId);
      void api
        .syncWatchTogether(
          roomId,
          { positionSeconds: posRef.current, playing: playingRef.current },
          token,
        )
        .catch(() => {
          /* guest tabs ignore */
        });
    }, 2000);
    return () => window.clearInterval(id);
  }, [roomId, youAreHost]);

  const start = useCallback(async () => {
    setError(null);
    const created = await api.createWatchTogether({
      mediaId,
      src,
      title,
      positionSeconds: posRef.current,
      playing: playingRef.current,
    });
    if (created.hostToken) storeWatchTogetherHostToken(created.id, created.hostToken);
    setRoom(created);
    const href = joinWatchTogetherHref(window.location.search, created.id);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
    }
    return { room: created, href };
  }, [mediaId, src, title]);

  return { room, youAreHost, copied, error, start };
}
