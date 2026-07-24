'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cx } from '../../lib/cx';
import { apiFetch } from '../../lib/api';
import { clearSession, getRefreshToken } from '../../lib/session';

export interface NavItem {
  href: string;
  label: string;
}

const DEFAULT_TITLE = 'An Nahda Admin';
const DEFAULT_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/batches', label: 'Batches' },
  { href: '/admin/payments', label: 'Payments' },
];

export interface SidebarProps {
  title?: string;
  items?: NavItem[];
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({
  title = DEFAULT_TITLE,
  items = DEFAULT_ITEMS,
  className,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // The session is being cleared locally regardless — a failed
        // revoke on the server just means the refresh token expires on
        // its own schedule instead.
      }
    }
    clearSession();
    router.push('/login');
  }

  return (
    <nav className={cx('flex h-full flex-col justify-between', className)}>
      <div className="flex flex-col gap-1 p-4">
        <span className="mb-4 font-display text-h3 font-semibold text-ink">
          {title}
        </span>
        {items.map((item) => {
          // The first item is always the section's own overview/root page
          // (/admin, /manager, …) — it needs an exact match so it isn't
          // shown active while on a nested route within the same section.
          const isRoot = item.href === items[0]?.href;
          const isActive = isRoot
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cx(
                'rounded-sm px-3 py-2 font-body text-body',
                isActive
                  ? 'bg-purple-wash text-purple-deep'
                  : 'text-ink-muted hover:bg-paper-sunken hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-rule p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="font-body text-sm font-medium text-purple hover:text-purple-deep"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
