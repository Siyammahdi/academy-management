// YouTube video ids are exactly 11 characters from the URL-safe base64
// alphabet. A teacher may paste the bare id or a full link in any of
// YouTube's common forms — this extracts the id either way; the frontend
// builds the embed from the id alone, never a stored URL.
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (host === 'youtube.com') {
    const watchId = url.searchParams.get('v');
    if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) {
      return watchId;
    }
    const match = /^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/.exec(url.pathname);
    if (match) {
      return match[1];
    }
  }

  return null;
}
