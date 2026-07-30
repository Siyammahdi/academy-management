'use client'

import { useEffect, useRef } from 'react'
import {
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  UnderlineIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  label?: string
  value: string
  onChange: (html: string) => void
  className?: string
  placeholder?: string
}

/** Lightweight contentEditable editor — no extra deps. Stores HTML. */
export function RichTextEditor({
  label,
  value,
  onChange,
  className,
  placeholder = 'Write the assignment…',
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  function exec(command: string): void {
    ref.current?.focus()
    document.execCommand(command, false)
    onChange(ref.current?.innerHTML ?? '')
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      ) : null}
      <div className="overflow-hidden rounded-lg bg-input/50">
        <div className="flex flex-wrap gap-1 border-b border-border/40 px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-9"
            onClick={() => exec('bold')}
            aria-label="Bold"
          >
            <BoldIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-9"
            onClick={() => exec('italic')}
            aria-label="Italic"
          >
            <ItalicIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-9"
            onClick={() => exec('underline')}
            aria-label="Underline"
          >
            <UnderlineIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-9"
            onClick={() => exec('insertUnorderedList')}
            aria-label="Bullet list"
          >
            <ListIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="min-h-9"
            onClick={() => exec('insertOrderedList')}
            aria-label="Numbered list"
          >
            <ListOrderedIcon />
          </Button>
        </div>
        <ScrollArea className="h-72">
          <div
            ref={ref}
            role="textbox"
            aria-multiline
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className="min-h-36 px-3 py-2 text-sm text-foreground outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
            onInput={() => onChange(ref.current?.innerHTML ?? '')}
          />
        </ScrollArea>
      </div>
    </div>
  )
}

/** Safe-ish HTML render for stored homework descriptions. */
export function RichTextHtml({
  html,
  className,
}: {
  html: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
