/** Jellyfin-style auto-skip: intro/recap vs outro/credits. */
export function shouldAutoSkipSegment(
  kind: string,
  prefs: { autoSkipIntro?: boolean; autoSkipCredits?: boolean },
): boolean {
  switch (kind.trim().toLowerCase()) {
    case 'intro':
    case 'recap':
      return prefs.autoSkipIntro === true;
    case 'outro':
    case 'credits':
      return prefs.autoSkipCredits === true;
    default:
      return false;
  }
}
