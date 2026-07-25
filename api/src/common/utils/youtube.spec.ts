import { extractYoutubeVideoId } from './youtube';

describe('extractYoutubeVideoId', () => {
  it('accepts a bare 11-character video id', () => {
    expect(extractYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from a youtube.com/watch link', () => {
    expect(
      extractYoutubeVideoId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
      ),
    ).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from a youtu.be short link', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('extracts the id from a youtube.com/embed link', () => {
    expect(
      extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from a youtube.com/shorts link', () => {
    expect(
      extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from an m.youtube.com link', () => {
    expect(
      extractYoutubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('returns null for a non-YouTube URL', () => {
    expect(extractYoutubeVideoId('https://vimeo.com/dQw4w9WgXcQ')).toBeNull();
  });

  it('returns null for a YouTube link missing a video id', () => {
    expect(
      extractYoutubeVideoId('https://www.youtube.com/channel/UC12345'),
    ).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(extractYoutubeVideoId('not a link or an id')).toBeNull();
  });

  it('returns null for a too-short id-like string', () => {
    expect(extractYoutubeVideoId('short')).toBeNull();
  });
});
