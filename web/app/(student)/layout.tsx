import type { ReactNode } from 'react';
import { AppShell } from '../../components/layout/app-shell';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/dues', label: 'Dues' },
  { href: '/dashboard/payments', label: 'Payments' },
  { href: '/dashboard/batches', label: 'Enroll' },
];

// Real access control is middleware.ts (cookie-based UX gate) plus the
// API's own scoping from the token on every request (the actual
// authority — doc 04 §6, never a client-supplied student id). This layout
// only supplies the application chrome.
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="An Nahda" items={NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
