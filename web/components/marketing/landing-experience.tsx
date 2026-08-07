'use client'

import { useRef } from 'react'
import {
  BookOpenIcon,
  ClapperboardIcon,
  RadioIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'

import { Eyebrow } from '@/components/marketing/eyebrow'
import { LandingAtmosphere } from '@/components/marketing/landing-atmosphere'
import { MarketingImage } from '@/components/marketing/marketing-image'
import { useMarketingCopy } from '@/components/i18n/locale-provider'
import { Container } from '@/components/layout/container'
import { EASE } from '@/lib/gsap'
import { blurRise, wordRise } from '@/lib/gsap/motion'
import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { useTilt } from '@/lib/gsap/use-tilt'
import type { MarketingImage as MarketingImageModel } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

const PANEL_ICONS: LucideIcon[] = [
  RadioIcon,
  BookOpenIcon,
  ClapperboardIcon,
  WalletIcon,
]

/**
 * “Inside the portal” — pinned horizontal journey with deliberate scroll
 * distance, snap-to-panel settling, and premium interactive cards.
 */
export function LandingExperience() {
  const t = useMarketingCopy()
  const experience = t.experience
  const rootRef = useRef<HTMLElement>(null)
  const panelCount = experience.panels.length

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    const headline = root.querySelector<HTMLElement>(
      '[data-experience-headline]',
    )
    if (headline) {
      wordRise(gsap, headline, { stagger: 0.04, start: 'top 85%', rotate: 3 })
    }

    const lead = root.querySelector('[data-experience-lead]')
    if (lead) blurRise(gsap, lead, { y: 20, blur: 8 })

    const stage = root.querySelector<HTMLElement>('[data-experience-stage]')
    const track = root.querySelector<HTMLElement>('[data-experience-track]')
    const progress = root.querySelector<HTMLElement>('[data-experience-progress]')
    const counter = root.querySelector<HTMLElement>('[data-experience-counter]')
    if (!stage || !track) return

    const panels = gsap.utils.toArray<HTMLElement>(
      track.querySelectorAll('[data-experience-panel]'),
    )
    const mm = gsap.matchMedia()

    mm.add('(min-width: 1024px)', () => {
      const getDistance = () =>
        Math.max(0, track.scrollWidth - stage.clientWidth)

      gsap.set(track, { x: 0 })
      gsap.set(panels, { clearProps: 'scale,opacity,filter' })

      // One viewport of scroll per panel — prevents “one flick past all cards”.
      const scrollEnd = () => {
        const travel = getDistance()
        const perPanel = window.innerHeight * 0.95
        return `+=${Math.max(travel * 2.4, perPanel * Math.max(panels.length, 1))}`
      }

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: scrollEnd,
          pin: true,
          pinSpacing: true,
          scrub: 1.15,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: panels.length > 1 ? 1 / (panels.length - 1) : 0,
            duration: { min: 0.18, max: 0.55 },
            delay: 0.04,
            ease: 'power1.inOut',
          },
          onUpdate: (self) => {
            if (progress) gsap.set(progress, { scaleX: self.progress })

            const activeIndex = Math.round(
              self.progress * Math.max(panels.length - 1, 0),
            )
            if (counter) {
              counter.textContent = String(activeIndex + 1).padStart(2, '0')
            }

            const center = window.innerWidth * 0.42
            panels.forEach((panel, i) => {
              const rect = panel.getBoundingClientRect()
              const panelCenter = rect.left + rect.width / 2
              const dist = Math.abs(panelCenter - center)
              const norm = Math.min(1, dist / (window.innerWidth * 0.55))
              const active = i === activeIndex

              gsap.set(panel, {
                scale: 1 - norm * 0.08,
                opacity: 1 - norm * 0.35,
                filter: `brightness(${1 - norm * 0.22})`,
              })

              panel.dataset.active = active ? 'true' : 'false'
            })
          },
        },
      })

      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    })

    mm.add('(max-width: 1023px)', () => {
      gsap.fromTo(
        panels,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: EASE.expo,
          scrollTrigger: { trigger: track, start: 'top 85%', once: true },
        },
      )
    })
  }, [panelCount])

  return (
    <section
      ref={rootRef}
      className="relative bg-primary-strong text-primary-foreground"
      aria-labelledby="experience-heading"
    >
      <LandingAtmosphere tone="deep" density="rich" />

      <div
        data-experience-stage
        className="relative z-10 flex flex-col justify-center py-20 sm:py-24 lg:h-svh lg:py-0"
      >
        <Container width="marketing">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Eyebrow tone="inverse">{experience.eyebrow}</Eyebrow>
              <h2
                id="experience-heading"
                data-experience-headline
                className="mt-5 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
              >
                {experience.heading}
              </h2>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-10">
              <p
                data-experience-lead
                className="max-w-sm text-base leading-relaxed text-primary-foreground/70"
              >
                {experience.lead}
              </p>
              <p
                aria-hidden
                className="hidden font-heading text-sm font-semibold tracking-wide text-primary-foreground/50 tabular-nums lg:block"
              >
                <span data-experience-counter>01</span>
                <span className="mx-1.5 opacity-40">/</span>
                <span>{String(panelCount).padStart(2, '0')}</span>
              </p>
            </div>
          </div>

          <div
            aria-hidden
            className="mt-8 hidden h-0.5 overflow-hidden rounded-full bg-primary-foreground/15 lg:block"
          >
            <div
              data-experience-progress
              className="h-full w-full origin-left scale-x-0 rounded-full bg-primary-foreground/80"
            />
          </div>
        </Container>

        <div className="mt-12 overflow-x-auto pb-6 [scrollbar-width:none] lg:mt-14 lg:overflow-hidden lg:pb-0 [&::-webkit-scrollbar]:hidden">
          <ul
            data-experience-track
            className="flex w-max snap-x snap-mandatory gap-5 px-4 will-change-transform sm:gap-6 sm:px-6 lg:gap-8 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] lg:pr-[30vw]"
          >
            {experience.panels.map((panel, index) => (
              <li
                key={panel.index}
                data-experience-panel
                data-active="false"
                className="group/panel w-[min(84vw,22rem)] shrink-0 snap-center snap-always sm:w-96 lg:w-[28rem]"
              >
                <ExperienceCard
                  index={panel.index}
                  title={panel.title}
                  body={panel.body}
                  image={panel.image}
                  icon={PANEL_ICONS[index] ?? BookOpenIcon}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function ExperienceCard({
  index,
  title,
  body,
  image,
  icon: Icon,
}: {
  index: string
  title: string
  body: string
  image: MarketingImageModel
  icon: LucideIcon
}) {
  const tiltRef = useTilt<HTMLDivElement>(6)
  const shineRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const card = event.currentTarget
    const shine = shineRef.current
    const media = card.querySelector<HTMLElement>('[data-card-media]')
    const bounds = card.getBoundingClientRect()
    const px = (event.clientX - bounds.left) / bounds.width
    const py = (event.clientY - bounds.top) / bounds.height

    if (shine) {
      shine.style.opacity = '1'
      shine.style.background = `radial-gradient(600px circle at ${px * 100}% ${py * 100}%, color-mix(in oklch, var(--primary-foreground) 18%, transparent), transparent 42%)`
    }
    if (media) {
      const dx = (px - 0.5) * 12
      const dy = (py - 0.5) * 12
      media.style.transform = `scale(1.08) translate(${dx}px, ${dy}px)`
    }
  }

  function onPointerLeave(event: React.PointerEvent<HTMLDivElement>) {
    const card = event.currentTarget
    const shine = shineRef.current
    const media = card.querySelector<HTMLElement>('[data-card-media]')
    if (shine) shine.style.opacity = '0'
    if (media) media.style.transform = 'scale(1) translate(0, 0)'
  }

  return (
    <div
      ref={tiltRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn(
        'group relative h-[28rem] overflow-hidden rounded-xl bg-primary-foreground/5 ring-1 ring-primary-foreground/10 transition-[box-shadow,ring-color] duration-500 sm:h-[30rem] lg:h-[32rem]',
        'hover:ring-primary-foreground/25',
        'group-data-[active=true]/panel:ring-primary-foreground/40',
      )}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          data-card-media
          className="absolute inset-0 transition-transform duration-700 ease-out will-change-transform"
        >
          <MarketingImage
            image={image}
            className="absolute inset-0 h-full w-full rounded-none"
            imageClassName="object-cover"
            sizes="(min-width: 1024px) 28rem, 84vw"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-primary-strong via-primary-strong/55 to-primary-strong/10"
        />
        <div
          ref={shineRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-6">
        <span className="font-heading text-xs font-semibold tracking-[0.22em] text-primary-foreground/55 tabular-nums uppercase transition-colors duration-300 group-hover:text-primary-foreground/80">
          {index}
        </span>
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:bg-primary-foreground/15">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="rounded-xl bg-primary-strong/55 p-5 backdrop-blur-md ring-1 ring-primary-foreground/10 transition-[background-color,transform] duration-500 group-hover:bg-primary-strong/70 group-hover:-translate-y-0.5 sm:p-6">
          <h3 className="font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-pretty text-primary-foreground/75 sm:text-[0.9375rem]">
            {body}
          </p>
        </div>
      </div>

      {/* Oversized index watermark */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 -bottom-4 font-heading text-[7rem] font-semibold leading-none tracking-tighter text-primary-foreground/[0.06] transition-transform duration-700 group-hover:scale-105 sm:text-[8.5rem]"
      >
        {index}
      </span>
    </div>
  )
}
