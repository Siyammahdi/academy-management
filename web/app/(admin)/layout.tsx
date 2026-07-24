import type { ReactNode } from 'react';
import { AppShell } from '../../components/layout/app-shell';

// Real access control is middleware.ts (cookie-based UX gate) plus the
// API's own RolesGuard on every request (the actual authority). This layout
// only supplies the application chrome.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
