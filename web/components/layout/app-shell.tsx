'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import type { NavItem } from './sidebar';
import { Container } from './container';

export interface AppShellProps {
  children: ReactNode;
  title?: string;
  items?: NavItem[];
}

// doc 09 §10 — the sidebar collapses to a drawer below 1024px. Shared by
// every role-scoped section (admin, manager, …) — pass `title`/`items` to
// customize the nav instead of duplicating this shell.
export function AppShell({ children, title, items }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-paper-app">
      <header className="flex items-center justify-between border-b border-rule px-4 py-3 lg:hidden">
        <span className="font-display text-h3 font-semibold text-ink">
          {title ?? 'An Nahda Admin'}
        </span>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-sm border border-rule-strong text-ink"
        >
          Menu
        </button>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-rule bg-paper-raised lg:block">
          <Sidebar
            className="sticky top-0 h-screen"
            title={title}
            items={items}
          />
        </aside>

        {isDrawerOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="relative z-10 h-full w-64 bg-paper-raised shadow-overlay">
              <Sidebar
                title={title}
                items={items}
                onNavigate={() => setIsDrawerOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <main className="flex-1 py-8">
          <Container width="app" className="flex flex-col gap-8">
            {children}
          </Container>
        </main>
      </div>
    </div>
  );
}
