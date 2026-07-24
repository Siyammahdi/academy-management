import type { ReactNode } from 'react';
import Link from 'next/link';
import { Container } from '../../components/layout/container';

// Minimal, distraction-free chrome — just a way back home, no full nav.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-rule">
        <Container width="marketing">
          <div className="flex h-16 items-center">
            <Link
              href="/"
              className="font-display text-h3 font-semibold text-ink"
            >
              An Nahda Academy
            </Link>
          </div>
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-narrow px-4">{children}</div>
      </main>
    </div>
  );
}
