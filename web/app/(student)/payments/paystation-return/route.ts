import { NextResponse } from 'next/server'

/**
 * PayStation Hosted Checkout redirects here with query params:
 * status (Successful|Failed|Canceled), invoice_number, trx_id.
 * We never settle from these alone — the success page calls
 * POST /payments/gateway/confirm which hits transaction-status.
 * Cancel/fail keep invoice_number so the app can abandon the pending payment.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url)
  const status = (incoming.searchParams.get('status') ?? '').toLowerCase()
  const invoice =
    incoming.searchParams.get('invoice_number') ??
    incoming.searchParams.get('invoiceNumber') ??
    ''
  const trxId =
    incoming.searchParams.get('trx_id') ??
    incoming.searchParams.get('trxId') ??
    ''

  const params = new URLSearchParams()
  params.set('provider', 'paystation')
  if (invoice) params.set('tran_id', invoice)
  if (trxId) params.set('trx_id', trxId)
  if (status) params.set('status', status)

  if (status === 'canceled' || status === 'cancelled') {
    const url = new URL('/payments/cancel', request.url)
    url.search = params.toString()
    return NextResponse.redirect(url, 303)
  }

  if (status === 'failed' || status === 'fail') {
    const url = new URL('/payments/fail', request.url)
    url.search = params.toString()
    return NextResponse.redirect(url, 303)
  }

  const url = new URL('/payments/success', request.url)
  url.search = params.toString()
  return NextResponse.redirect(url, 303)
}
