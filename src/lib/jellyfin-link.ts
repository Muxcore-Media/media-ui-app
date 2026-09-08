export type JellyfinLink = {
  available: boolean;
  linked: boolean;
  matched: boolean;
  muxId: string;
  jellyfinId: string;
  path: string;
  title: string;
  mediaKind: string;
  matchReason: string;
  error: string;
};

function asBool(v: unknown): boolean {
  return v === true;
}

export function normalizeJellyfinLink(raw: Record<string, unknown> | null | undefined): JellyfinLink {
  return {
    available: asBool(raw?.available),
    linked: asBool(raw?.linked) || asBool(raw?.matched),
    matched: asBool(raw?.matched) || asBool(raw?.linked),
    muxId: String(raw?.muxId ?? raw?.mux_id ?? ''),
    jellyfinId: String(raw?.jellyfinId ?? raw?.jellyfin_id ?? ''),
    path: String(raw?.path ?? ''),
    title: String(raw?.title ?? ''),
    mediaKind: String(raw?.mediaKind ?? raw?.media_kind ?? ''),
    matchReason: String(raw?.matchReason ?? raw?.match_reason ?? ''),
    error: String(raw?.error ?? ''),
  };
}

export function jellyfinLinkLabel(link: JellyfinLink): string {
  if (!link.available) return link.error || 'Jellyfin bridge is not connected';
  if (!link.linked) return 'Not linked to Jellyfin';
  const reason = link.matchReason ? ` · ${link.matchReason}` : '';
  return `Linked${reason}`;
}
