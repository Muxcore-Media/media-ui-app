export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1h 42m" style duration, for stats/settings surfaces. */
export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

const displayNamesCache = new Map<string, Intl.DisplayNames>();

function displayNamesFor(locale: string): Intl.DisplayNames | null {
  if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return null;
  let inst = displayNamesCache.get(locale);
  if (!inst) {
    try {
      inst = new Intl.DisplayNames([locale], { type: 'language' });
      displayNamesCache.set(locale, inst);
    } catch {
      return null;
    }
  }
  return inst;
}

// Common ISO 639-2/B → ISO 639-1 mapping for the codes media tooling (ffprobe,
// mkv muxers) actually emits; Intl.DisplayNames only understands 639-1/BCP-47.
const ISO_639_2_TO_1: Record<string, string> = {
  eng: 'en',
  spa: 'es',
  fre: 'fr',
  fra: 'fr',
  ger: 'de',
  deu: 'de',
  ita: 'it',
  por: 'pt',
  rus: 'ru',
  jpn: 'ja',
  kor: 'ko',
  chi: 'zh',
  zho: 'zh',
  ara: 'ar',
  hin: 'hi',
  nld: 'nl',
  dut: 'nl',
  swe: 'sv',
  nor: 'no',
  dan: 'da',
  fin: 'fi',
  pol: 'pl',
  tur: 'tr',
  ell: 'el',
  gre: 'el',
  heb: 'he',
  tha: 'th',
  vie: 'vi',
  ces: 'cs',
  cze: 'cs',
  hun: 'hu',
  ron: 'ro',
  rum: 'ro',
  ukr: 'uk',
  ind: 'id',
};

/** Best-effort human language name from an ISO 639-1/2 code (e.g. "eng" → "English"). */
export function languageDisplayName(code: string | undefined | null): string | null {
  const raw = (code || '').trim().toLowerCase();
  if (!raw) return null;
  const bcp47 = raw.length === 3 ? ISO_639_2_TO_1[raw] || raw : raw;
  const names = displayNamesFor('en');
  if (!names) return null;
  try {
    const name = names.of(bcp47);
    if (!name || name.toLowerCase() === bcp47) return null;
    return name;
  } catch {
    return null;
  }
}

export function segmentKindLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case 'intro':
      return 'Skip Intro';
    case 'outro':
      return 'Skip Outro';
    case 'credits':
      return 'Skip Credits';
    case 'recap':
      return 'Skip Recap';
    default:
      return 'Skip';
  }
}
