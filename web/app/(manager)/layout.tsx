import type { ReactNode } from 'react';
import { AppShell } from '../../components/layout/app-shell';

const NAV_ITEMS = [
  { href: '/manager', label: 'Overview' },
  { href: '/manager/batches', label: 'Batches' },
  { href: '/manager/payments', label: 'Payments' },
];

// Real access control is middleware.ts (cookie-based UX gate) plus the
// API's own RolesGuard/BatchScopeGuard/SelfApprovalGuard on every request
// (the actual authority). This layout only supplies the application chrome.
export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="An Nahda Manager" items={NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
