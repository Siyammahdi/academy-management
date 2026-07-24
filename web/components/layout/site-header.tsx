import Link from 'next/link';
import { Container } from './container';
import { buttonClassNames } from '../ui/button-styles';

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

// doc 09 §9 — marketing surface; purple leads (primary CTA).
export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-paper">
      <Container width="marketing">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-display text-h3 font-semibold text-ink"
          >
            An Nahda Academy
          </Link>
          <nav
            className="hidden items-center gap-6 sm:flex"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-body text-ink-muted hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="font-body text-body text-ink-muted hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className={buttonClassNames('primary', 'compact')}
            >
              Register
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
