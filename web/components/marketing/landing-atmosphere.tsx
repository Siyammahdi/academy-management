'use client'

import { useRef } from 'react'

import { useGsapContext } from '@/lib/gsap/use-gsap-context'
import { cn } from '@/lib/utils'

type AtmosphereTone = 'wash' | 'deep' | 'hero'

interface LandingAtmosphereProps {
  tone?: AtmosphereTone
  className?: string
  /** Extra soft rings / orbs for quieter sections. */
  density?: 'sparse' | 'rich'
}

const GRADIENT: Record<AtmosphereTone, string> = {
  hero: [
    'radial-gradient(ellipse at 15% 0%, var(--primary-wash), transparent 55%)',
    'radial-gradient(ellipse at 85% 20%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 50%)',
    'radial-gradient(ellipse at 50% 100%, color-mix(in oklch, var(--primary-wash) 80%, transparent), transparent 55%)',
  ].join(', '),
  wash: [
    'radial-gradient(ellipse at 10% 0%, var(--primary-wash), transparent 50%)',
    'radial-gradient(ellipse at 95% 60%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 45%)',
  ].join(', '),
  deep: [
    'radial-gradient(ellipse at 20% 10%, color-mix(in oklch, var(--primary) 35%, transparent), transparent 55%)',
    'radial-gradient(ellipse at 90% 80%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 50%)',
  ].join(', '),
}

/**
 * Ambient layer for marketing sections: soft brand gradients, a quiet grid,
 * and slow floating orbs. Purely decorative — `aria-hidden`, pointer-events
 * none, and motionless under prefers-reduced-motion (via useGsapContext).
 */
export function LandingAtmosphere({
  tone = 'wash',
  className,
  density = 'sparse',
}: LandingAtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGsapContext(rootRef, (gsap) => {
    const root = rootRef.current
    if (!root) return

    root.querySelectorAll<HTMLElement>('[data-float]').forEach((orb, i) => {
      const ampY = 22 + (i % 3) * 10
      const ampX = 14 + (i % 2) * 8
      const duration = 6.5 + i * 1.5

      gsap.to(orb, {
        y: ampY,
        x: ampX,
        duration,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.4,
      })

      gsap.to(orb, {
        scale: 1.12,
        opacity: Number(orb.dataset.opacityPeak ?? 1),
        duration: duration * 1.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.55,
      })
    })

    root.querySelectorAll<HTMLElement>('[data-drift]').forEach((ring, i) => {
      gsap.to(ring, {
        rotation: i % 2 === 0 ? 28 : -22,
        scale: 1.06,
        duration: 16 + i * 5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    })

  }, [density, tone])

  const isDeep = tone === 'deep'
  const rich = density === 'rich' || tone === 'hero'

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      <div className="absolute inset-0" style={{ backgroundImage: GRADIENT[tone] }} />

      <div
        className={cn(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2',
          isDeep
            ? 'bg-gradient-to-b from-transparent via-primary-foreground/10 to-transparent'
            : 'bg-gradient-to-b from-transparent via-primary/15 to-transparent',
        )}
      />

      <div
        className={cn('absolute inset-0', isDeep ? 'opacity-10' : 'opacity-30')}
        style={{
          backgroundImage: isDeep
            ? `linear-gradient(color-mix(in oklch, var(--primary-foreground) 12%, transparent) 1px, transparent 1px),
               linear-gradient(90deg, color-mix(in oklch, var(--primary-foreground) 12%, transparent) 1px, transparent 1px)`
            : `linear-gradient(color-mix(in oklch, var(--primary) 10%, transparent) 1px, transparent 1px),
               linear-gradient(90deg, color-mix(in oklch, var(--primary) 10%, transparent) 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem',
          maskImage:
            'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />

      <span
        data-float
        data-opacity-peak="0.9"
        className={cn(
          'absolute -top-16 -left-10 size-56 rounded-full blur-3xl sm:size-72',
          isDeep ? 'bg-primary/40' : 'bg-primary/20',
        )}
      />
      <span
        data-float
        data-opacity-peak="0.85"
        className={cn(
          'absolute top-1/3 -right-12 size-48 rounded-full blur-3xl sm:size-64',
          isDeep ? 'bg-primary-foreground/10' : 'bg-primary/15',
        )}
      />
      {rich ? (
        <span
          data-float
          data-opacity-peak="0.8"
          className={cn(
            'absolute -bottom-20 left-1/3 size-64 rounded-full blur-3xl sm:size-80',
            isDeep ? 'bg-primary/30' : 'bg-primary-wash',
          )}
        />
      ) : null}

      <span
        data-drift
        className={cn(
          'absolute top-20 right-16 size-40 rounded-full border sm:right-24 sm:size-52',
          isDeep ? 'border-primary-foreground/15' : 'border-primary/20',
        )}
      />
      <span
        data-drift
        className={cn(
          'absolute bottom-16 left-8 size-28 rounded-full border sm:left-12 sm:size-36',
          isDeep ? 'border-primary-foreground/10' : 'border-primary/15',
        )}
      />
      {rich ? (
        <span
          data-drift
          className={cn(
            'absolute top-1/2 right-1/3 size-16 rounded-full border',
            isDeep ? 'border-primary-foreground/20' : 'border-primary/25',
          )}
        />
      ) : null}

      <span
        data-float
        className={cn(
          'absolute top-24 left-1/4 size-2 rounded-full',
          isDeep ? 'bg-primary-foreground/40' : 'bg-primary/50',
        )}
      />
      <span
        data-float
        className={cn(
          'absolute top-1/2 right-1/4 size-1.5 rounded-full',
          isDeep ? 'bg-primary-foreground/30' : 'bg-primary/40',
        )}
      />
      {rich ? (
        <span
          data-float
          className={cn(
            'absolute right-1/3 bottom-28 size-2.5 rounded-full',
            isDeep ? 'bg-primary/60' : 'bg-primary/35',
          )}
        />
      ) : null}
    </div>
  )
}
