'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface YoutubeEmbedProps {
  videoId: string;
  title: string;
}

// Lazy-loaded: renders a thumbnail until clicked, so a page listing many
// recordings never eagerly loads N YouTube iframes at once.
export function YoutubeEmbed({ videoId, title }: YoutubeEmbedProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-ink">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-sm bg-ink"
    >
      <Image
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        fill
        sizes="(min-width: 768px) 640px, 100vw"
        className="object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-ink/20 transition-colors group-hover:bg-ink/30">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-raised/90 text-ink shadow-overlay">
          <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
