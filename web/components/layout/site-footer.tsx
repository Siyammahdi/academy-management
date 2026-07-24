import Link from 'next/link';
import { Container } from './container';

const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/login', label: 'Log in' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <Container width="marketing">
        <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-sm text-ink-muted">
            © {new Date().getFullYear()} An Nahda Academy
          </p>
          <nav className="flex items-center gap-6" aria-label="Footer">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm text-ink-muted hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  );
}
