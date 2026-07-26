'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { MenuIcon, XIcon } from 'lucide-react'

import { Sidebar } from './sidebar'
import type { NavItem } from './sidebar'
import { Container } from './container'
import { Button } from '@/components/ui/button'

export interface AppShellProps {
  children: ReactNode
  title?: string
  items?: NavItem[]
}

export function AppShell({ children, title, items }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <span className="font-heading text-base font-semibold tracking-tight text-foreground">
          {title ?? 'An Nahda'}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsDrawerOpen((open) => !open)}
        >
          {isDrawerOpen ? <XIcon /> : <MenuIcon />}
        </Button>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 bg-primary-wash/40 lg:block">
          <Sidebar
            className="sticky top-0 h-svh"
            title={title}
            items={items}
          />
        </aside>

        {isDrawerOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-foreground/30"
              aria-label="Close menu"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="relative z-10 h-full w-80 bg-background">
              <Sidebar
                title={title}
                items={items}
                onNavigate={() => setIsDrawerOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <main className="flex-1 pb-10 pt-5 sm:py-7 lg:py-8">
          <Container width="app" className="flex flex-col gap-6 sm:gap-8">
            {children}
          </Container>
        </main>
      </div>
    </div>
  )
}
