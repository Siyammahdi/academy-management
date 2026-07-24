import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

export interface GatewaySessionParams {
  transactionReference: string;
  amount: string; // decimal string
  customerName: string;
  customerPhone: string;
}

export interface GatewaySessionResult {
  redirectUrl: string;
}

/// A loose shape, not a class-validator DTO — SSLCommerz's real IPN payload
/// carries many more fields than we care about, and the global
/// ValidationPipe's forbidNonWhitelisted would reject it if we tried to
/// whitelist an exact field set here. See webhook.controller.ts.
export interface SslcommerzWebhookPayload {
  tran_id?: string;
  status?: string;
  amount?: string;
  verify_sign?: string;
  verify_key?: string;
  [key: string]: unknown;
}

function md5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

/**
 * Computes SSLCommerz's IPN "verify_sign": take the field names listed in
 * verify_key, sort them, join as name=value pairs with `&` (store_passwd's
 * value is the MD5 of the actual password, never the plaintext), then MD5
 * the whole string.
 *
 * NOTE: reconstructed from SSLCommerz's documented IPN verification
 * contract, not exercised against a live sandbox in this environment —
 * confirm the exact field set against current merchant-panel docs before
 * relying on this in production.
 */
export function computeVerifySign(
  payload: SslcommerzWebhookPayload,
  storePassword: string,
): string | null {
  const verifyKey = payload.verify_key;
  if (typeof verifyKey !== 'string' || verifyKey.length === 0) {
    return null;
  }

  const parts = verifyKey
    .split(',')
    .sort()
    .map((field) => {
      if (field === 'store_passwd') {
        return `${field}=${md5(storePassword)}`;
      }
      const raw = payload[field];
      const value =
        typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
      return `${field}=${value}`;
    });

  return md5(parts.join('&'));
}

@Injectable()
export class GatewayService {
  private readonly storeId = process.env.SSLCOMMERZ_STORE_ID;
  private readonly storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  private readonly isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';

  // PAY-02 — initiates the session that produces the redirect URL the
  // student is sent to; the Payment row is created by the caller only once
  // this succeeds (doc 06 §7).
  async initiateSession(
    params: GatewaySessionParams,
  ): Promise<GatewaySessionResult> {
    if (!this.storeId || !this.storePassword) {
      throw new Error(
        'SSLCommerz is not configured (SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD)',
      );
    }

    const baseUrl = this.isSandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';

    const body = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePassword,
      total_amount: params.amount,
      currency: 'BDT',
      tran_id: params.transactionReference,
      success_url: `${appUrl}/payments/success`,
      fail_url: `${appUrl}/payments/fail`,
      cancel_url: `${appUrl}/payments/cancel`,
      ipn_url: `${apiUrl}/api/v1/webhooks/sslcommerz`,
      cus_name: params.customerName,
      cus_email: 'no-reply@annahda.academy',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: params.customerPhone,
      shipping_method: 'NO',
      product_name: 'Course fee',
      product_category: 'Education',
      product_profile: 'general',
    });

    const response = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = (await response.json()) as {
      status?: string;
      GatewayPageURL?: string;
    };

    if (result.status !== 'SUCCESS' || !result.GatewayPageURL) {
      throw new Error('SSLCommerz session initiation failed');
    }

    return { redirectUrl: result.GatewayPageURL };
  }

  // PAY-03 / doc 06 §10 step 1 — verify before trusting anything else in
  // the payload.
  verifyWebhookSignature(payload: SslcommerzWebhookPayload): boolean {
    if (!this.storePassword) {
      return false;
    }
    const computed = computeVerifySign(payload, this.storePassword);
    return computed !== null && computed === payload.verify_sign;
  }
}
