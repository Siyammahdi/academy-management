'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { PlayIcon, VideoIcon } from 'lucide-react'

import { YoutubeEmbed } from '@/components/media/youtube-embed'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { groupRecordingsByDhakaDay } from '@/lib/student-dashboard'
import type { RecordingWithContext } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface RecordingsTimelineProps {
  items: RecordingWithContext[]
}

export function RecordingsTimeline({ items }: RecordingsTimelineProps) {
  const groups = useMemo(() => groupRecordingsByDhakaDay(items), [items])
  const [activeDay, setActiveDay] = useState(groups[0]?.key ?? '')
  const [playingId, setPlayingId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <section className="rounded-xl bg-muted/60 px-5 py-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-wash text-primary-strong">
          <VideoIcon className="size-5" />
        </div>
        <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
          Recorded classes
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          After each class day, new recordings land here — grouped by date so
          you can catch up in order.
        </p>
      </section>
    )
  }

  const current =
    groups.find((g) => g.key === activeDay) ?? groups[0]!

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <VideoIcon className="size-4" />
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Recorded classes
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Organised by class day · newest first
          </p>
        </div>
      </div>

      {/* Day picker — horizontal snap for mobile app feel */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => {
          const selected = group.key === current.key
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => {
                setActiveDay(group.key)
                setPlayingId(null)
              }}
              className={cn(
                'shrink-0 snap-start rounded-xl px-4 py-3 text-left transition-colors',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary-wash text-primary-strong hover:bg-primary/15',
              )}
            >
              <p className="text-xs font-medium opacity-80">
                {group.weekday}
              </p>
              <p className="font-heading text-sm font-semibold tabular-nums">
                {group.label}
              </p>
              <p className="mt-0.5 text-xs opacity-75">
                {group.items.length}{' '}
                {group.items.length === 1 ? 'class' : 'classes'}
              </p>
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {current.items.map((rec) => {
          const isOpen = playingId === rec.id
          return (
            <article
              key={rec.id}
              className="overflow-hidden rounded-xl bg-card"
            >
              {isOpen ? (
                <div className="space-y-3 p-3 sm:p-4">
                  <YoutubeEmbed
                    videoId={rec.youtubeVideoId}
                    title={rec.title}
                  />
                  <RecordingMeta rec={rec} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setPlayingId(null)}
                  >
                    Collapse
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlayingId(rec.id)}
                  className="flex w-full flex-col gap-0 text-left sm:flex-row"
                >
                  <div className="relative aspect-video w-full shrink-0 bg-primary-strong sm:aspect-auto sm:min-h-[7.5rem] sm:w-44 md:w-52">
                    <Image
                      src={`https://i.ytimg.com/vi/${rec.youtubeVideoId}/hqdefault.jpg`}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 208px, 100vw"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/25">
                      <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <PlayIcon className="size-5 fill-current" />
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-center gap-1 p-4">
                    <RecordingMeta rec={rec} />
                    <span className="mt-1 text-xs font-medium text-primary-strong">
                      Tap to play
                    </span>
                  </div>
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RecordingMeta({ rec }: { rec: RecordingWithContext }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium text-foreground">{rec.title}</p>
      <p className="text-sm text-muted-foreground">
        {rec.batch.course.title} · {rec.batch.name}
      </p>
      <p className="text-xs tabular-nums text-muted-foreground">
        Class day {formatDate(rec.recordedFor)}
      </p>
    </div>
  )
}
