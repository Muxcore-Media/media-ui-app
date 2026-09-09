export type AcquisitionPeer = {
  id: string;
  kind: 'indexer' | 'downloader' | string;
  label: string;
  live: boolean;
};

export type HouseholdIndexer = {
  id: number;
  name: string;
  protocol: string;
  language: string;
  configured: boolean;
};

export type IndexerCapabilities = {
  supportsSearch: boolean;
  supportsMovieSearch: boolean;
  supportsTvSearch: boolean;
  supportsMusicSearch: boolean;
  supportsBookSearch: boolean;
  supportsIdSearch: boolean;
  supportsSeasonPack: boolean;
  supportedCategories: string[];
  supportedProtocols: string[];
};

export type AcquisitionVpn = {
  configured: boolean;
  confPresent: boolean;
};

export type AcquisitionStatus = {
  ready: boolean;
  hasIndexer: boolean;
  hasDownloader: boolean;
  peers: AcquisitionPeer[];
  indexers: HouseholdIndexer[];
  indexersAvailable: boolean;
  capabilities: IndexerCapabilities;
  capabilitiesAvailable: boolean;
  message: string;
  liveGrabAllowed: boolean;
  indexerMode: string;
  downloaderMode: string;
  vpn: AcquisitionVpn;
};

export type IndexersResponse = {
  available: boolean;
  indexers: HouseholdIndexer[];
  capabilities: IndexerCapabilities;
  capabilitiesAvailable: boolean;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeHouseholdIndexer(raw: unknown): HouseholdIndexer {
  const rec = asRecord(raw);
  const id = Number(rec.id ?? 0);
  return {
    id: Number.isFinite(id) ? id : 0,
    name: String(rec.name ?? ''),
    protocol: String(rec.protocol ?? ''),
    language: String(rec.language ?? ''),
    configured: rec.configured === true,
  };
}

export function normalizeIndexerCapabilities(raw: unknown): IndexerCapabilities {
  const rec = asRecord(raw);
  const cats = Array.isArray(rec.supported_categories) ? rec.supported_categories : rec.supportedCategories;
  const protos = Array.isArray(rec.supported_protocols) ? rec.supported_protocols : rec.supportedProtocols;
  return {
    supportsSearch: rec.supports_search === true || rec.supportsSearch === true,
    supportsMovieSearch: rec.supports_movie_search === true || rec.supportsMovieSearch === true,
    supportsTvSearch: rec.supports_tv_search === true || rec.supportsTvSearch === true,
    supportsMusicSearch: rec.supports_music_search === true || rec.supportsMusicSearch === true,
    supportsBookSearch: rec.supports_book_search === true || rec.supportsBookSearch === true,
    supportsIdSearch: rec.supports_id_search === true || rec.supportsIdSearch === true,
    supportsSeasonPack: rec.supports_season_pack === true || rec.supportsSeasonPack === true,
    supportedCategories: Array.isArray(cats) ? cats.map((c) => String(c)).filter(Boolean) : [],
    supportedProtocols: Array.isArray(protos) ? protos.map((p) => String(p)).filter(Boolean) : [],
  };
}

export function indexerCapabilityLabels(caps: IndexerCapabilities): string[] {
  const labels: string[] = [];
  if (caps.supportsMovieSearch) labels.push('Movies');
  if (caps.supportsTvSearch) labels.push('TV');
  if (caps.supportsMusicSearch) labels.push('Music');
  if (caps.supportsBookSearch) labels.push('Books');
  if (caps.supportsIdSearch) labels.push('ID search');
  if (caps.supportsSeasonPack) labels.push('Season packs');
  for (const proto of caps.supportedProtocols) {
    if (!labels.some((l) => l.toLowerCase() === proto.toLowerCase())) {
      labels.push(proto);
    }
  }
  return labels;
}

export function normalizeIndexers(raw: unknown): IndexersResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.indexers) ? rec.indexers : [];
  return {
    available: rec.available === true,
    indexers: rows.map(normalizeHouseholdIndexer).filter((row) => row.name || row.id),
    capabilities: normalizeIndexerCapabilities(rec.capabilities),
    capabilitiesAvailable: rec.capabilities_available === true || rec.capabilitiesAvailable === true,
  };
}

export function normalizeAcquisitionStatus(raw: Record<string, unknown> = {}): AcquisitionStatus {
  const peersRaw = Array.isArray(raw.peers) ? raw.peers : [];
  const peers: AcquisitionPeer[] = peersRaw.map((row) => {
    const p = (row || {}) as Record<string, unknown>;
    return {
      id: String(p.id ?? ''),
      kind: String(p.kind ?? ''),
      label: String(p.label ?? p.id ?? ''),
      live: p.live === true,
    };
  });
  const listed = normalizeIndexers({
    available: raw.indexers_available === true || raw.indexersAvailable === true,
    indexers: raw.indexers,
    capabilities: raw.capabilities,
    capabilities_available: raw.capabilities_available === true || raw.capabilitiesAvailable === true,
  });
  const vpnRaw = asRecord(raw.vpn);
  return {
    ready: raw.ready === true,
    hasIndexer: raw.hasIndexer === true || raw.has_indexer === true,
    hasDownloader: raw.hasDownloader === true || raw.has_downloader === true,
    peers,
    indexers: listed.indexers,
    indexersAvailable: listed.available,
    capabilities: listed.capabilities,
    capabilitiesAvailable: listed.capabilitiesAvailable,
    message: String(raw.message ?? ''),
    liveGrabAllowed: raw.live_grab_allowed !== false && raw.liveGrabAllowed !== false,
    indexerMode: String(raw.indexer_mode ?? raw.indexerMode ?? ''),
    downloaderMode: String(raw.downloader_mode ?? raw.downloaderMode ?? ''),
    vpn: {
      configured: vpnRaw.configured === true,
      confPresent: vpnRaw.conf_present === true || vpnRaw.confPresent === true,
    },
  };
}

/** Fallback copy when GET /api/acquisition is unavailable. */
export function acquisitionFallbackMessage(): string {
  return 'Requests are saved, but nothing will download until an indexer and a downloader (qBittorrent, SABnzbd, or debrid) are connected.';
}
