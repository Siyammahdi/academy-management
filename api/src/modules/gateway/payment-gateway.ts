import { randomUUID } from 'node:crypto';

/** Online gateways only — manual is stored as PaymentMethod.manual + provider manual. */
export const GATEWAY_PROVIDERS = ['paystation', 'sslcommerz'] as const;
export type GatewayProviderId = (typeof GATEWAY_PROVIDERS)[number];

export type PaymentProviderId = GatewayProviderId | 'manual';

export function isGatewayProvider(value: unknown): value is GatewayProviderId {
  return (
    typeof value === 'string' &&
    (GATEWAY_PROVIDERS as readonly string[]).includes(value)
  );
}

/** Default online gateway for new checkouts. */
export const DEFAULT_GATEWAY_PROVIDER: GatewayProviderId = 'paystation';

export interface GatewaySessionParams {
  /** Unique invoice / tran_id we generate and store as Payment.transactionReference. */
  transactionReference: string;
  /** Decimal string, e.g. "1500.00". */
  amount: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  /** Opaque merchant reference (e.g. billing period id). */
  reference?: string;
  checkoutItems?: string;
}

export interface GatewaySessionResult {
  redirectUrl: string;
  sessionKey?: string;
}

/**
 * Normalized status after a server-side status check.
 * Maps onto PaymentStatus in PaymentsService (never trust the browser alone).
 */
export type GatewayTrxStatus =
  | 'processing'
  | 'success'
  | 'failed'
  | 'refund'
  | 'canceled';

export interface GatewayStatusQuery {
  invoiceNumber: string;
  /** SSLCommerz val_id, or optional PayStation trx_id hint. */
  providerRef?: string;
}

export interface GatewayStatusResult {
  invoiceNumber: string;
  trxStatus: GatewayTrxStatus;
  trxId?: string;
  amount?: string;
}

/**
 * Shared contract for SSLCommerz, PayStation, and future providers.
 * PaymentsService depends on this — not on a concrete gateway class.
 */
export interface PaymentGateway {
  readonly provider: GatewayProviderId;
  initiateSession(params: GatewaySessionParams): Promise<GatewaySessionResult>;
  checkStatus(query: GatewayStatusQuery): Promise<GatewayStatusResult | null>;
}

/**
 * Unique invoice / tran_id for gateway payments (PAY-04 idempotency anchor).
 * Prefix keeps logs readable; uniqueness comes from the UUID.
 */
export function generateGatewayInvoiceNumber(
  provider: GatewayProviderId,
): string {
  const prefix = provider === 'paystation' ? 'PS' : 'GW';
  return `${prefix}-${randomUUID()}`;
}
