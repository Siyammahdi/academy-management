import type { ReactNode } from 'react'

// Auth chrome lives in AuthShell on each page — this layout is a passthrough
// so login/register own the full viewport split without nested headers.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
