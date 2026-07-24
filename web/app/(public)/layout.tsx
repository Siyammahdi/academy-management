import type { ReactNode } from 'react';
import { SiteHeader } from '../../components/layout/site-header';
import { SiteFooter } from '../../components/layout/site-footer';

// doc 09 §9 — marketing surface: --paper background (not --paper-app).
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
