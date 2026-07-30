import { NextResponse } from 'next/server'

/**
 * SSLCommerz posts form fields to success_url. Capture them and redirect
 * to the status page as a GET so the client can confirm with the API.
 * (Cannot share a folder with page.tsx — separate return path.)
 */
export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData()
  const params = new URLSearchParams()
  for (const key of ['tran_id', 'val_id', 'status', 'amount']) {
    const value = formData.get(key)
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value)
    }
  }
  const url = new URL('/payments/success', request.url)
  url.search = params.toString()
  return NextResponse.redirect(url, 303)
}

/** Allow a GET hit to pass through with query params if the gateway uses GET. */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url)
  const url = new URL('/payments/success', request.url)
  url.search = incoming.search
  return NextResponse.redirect(url, 303)
}
