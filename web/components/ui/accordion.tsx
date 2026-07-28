'use client'

import * as React from 'react'
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { PlusIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-border', className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group flex w-full cursor-pointer items-start justify-between gap-6 py-5 text-left outline-none',
          'font-heading text-lg font-medium tracking-tight text-foreground transition-colors hover:text-primary-strong',
          'focus-visible:text-primary-strong sm:text-xl',
          className,
        )}
        {...props}
      >
        {children}
        <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-wash text-primary-strong transition-transform duration-300 group-data-[panel-open]:rotate-45">
          <PlusIcon className="size-4" />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        'h-(--accordion-panel-height) overflow-hidden transition-all duration-300 ease-out',
        'data-[starting-style]:h-0 data-[ending-style]:h-0',
      )}
      {...props}
    >
      <div className={cn('max-w-prose pr-10 pb-6 text-base leading-relaxed text-muted-foreground', className)}>
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
