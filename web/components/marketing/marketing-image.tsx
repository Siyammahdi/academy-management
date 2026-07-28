import Image from 'next/image'

import type { MarketingImage as MarketingImageModel } from '@/lib/marketing/media'
import { cn } from '@/lib/utils'

interface MarketingImageProps {
  image: MarketingImageModel
  /** Sizing/aspect classes for the frame. */
  className?: string
  /** Extra classes on the <img> itself (e.g. object-position). */
  imageClassName?: string
  sizes: string
  priority?: boolean
}

/**
 * A photograph in a masked frame. The frame carries `data-image-frame` and
 * the picture `data-image`, which is what the section motion hooks target
 * for clip reveals and parallax. The purple wash underneath means a slow or
 * failed image still reads as a deliberate surface.
 */
export function MarketingImage({
  image,
  className,
  imageClassName,
  sizes,
  priority = false,
}: MarketingImageProps) {
  return (
    <div
      data-image-frame
      className={cn(
        'relative overflow-hidden rounded-xl bg-primary-wash',
        className,
      )}
    >
      <Image
        data-image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', imageClassName)}
      />
    </div>
  )
}
