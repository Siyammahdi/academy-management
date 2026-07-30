import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  GatewayNotConfiguredException,
  GatewaySessionFailedException,
} from '../../common/exceptions/gateway.exception';

export interface GatewaySessionParams {
  transactionReference: string;
  amount: string; // decimal string
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface GatewaySessionResult {
  redirectUrl: string;
  sessionKey?: string;
}

/// A loose shape, not a class-validator DTO — SSLCommerz's real IPN payload
/// carries many more fields than we care about, and the global
/// ValidationPipe's forbidNonWhitelisted would reject it if we tried to
/// whitelist an exact field set here. See webhook.controller.ts.
export interface SslcommerzWebhookPayload {
  tran_id?: string;
  status?: string;
  amount?: string;
  val_id?: string;
  verify_sign?: string;
  verify_key?: string;
  [key: string]: unknown;
}

export interface SslcommerzValidationResult {
  status: string;
  tran_id: string;
  amount: string;
  currency?: string;
}

function md5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

/**
 * Computes SSLCommerz's IPN "verify_sign": take the field names listed in
 * verify_key, sort them, join as name=value pairs with `&` (store_passwd's
 * value is the MD5 of the actual password, never the plaintext), then MD5
 * the whole string.
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
  private readonly logger = new Logger(GatewayService.name);
  private readonly storeId = process.env.SSLCOMMERZ_STORE_ID;
  private readonly storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  private readonly isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';

  private get baseUrl(): string {
    return this.isSandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
  }

  private requireCredentials(): { storeId: string; storePassword: string } {
    if (!this.storeId || !this.storePassword) {
      throw new GatewayNotConfiguredException();
    }
    return { storeId: this.storeId, storePassword: this.storePassword };
  }

  // PAY-02 — initiates the session that produces the redirect URL the
  // student is sent to; the Payment row is created by the caller only once
  // this succeeds (doc 06 §7).
  async initiateSession(
    params: GatewaySessionParams,
  ): Promise<GatewaySessionResult> {
    const { storeId, storePassword } = this.requireCredentials();

    const appUrl = (process.env.APP_URL ?? 'http://localhost:3001').replace(
      /\/$/,
      '',
    );
    const apiUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    const body = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: params.amount,
      currency: 'BDT',
      tran_id: params.transactionReference,
      success_url: `${appUrl}/payments/sslcommerz-return`,
      fail_url: `${appUrl}/payments/fail`,
      cancel_url: `${appUrl}/payments/cancel`,
      ipn_url: `${apiUrl}/api/v1/webhooks/sslcommerz`,
      cus_name: params.customerName,
      cus_email: params.customerEmail ?? 'no-reply@annahda.academy',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: params.customerPhone,
      shipping_method: 'NO',
      product_name: 'Course fee',
      product_category: 'Education',
      product_profile: 'general',
    });

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (error) {
      this.logger.error(
        `SSLCommerz session request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new GatewaySessionFailedException(
        'Could not reach the payment gateway. Try again in a moment.',
      );
    }

    const result = (await response.json()) as {
      status?: string;
      failedreason?: string;
      GatewayPageURL?: string;
      sessionkey?: string;
    };

    if (result.status !== 'SUCCESS' || !result.GatewayPageURL) {
      this.logger.warn(
        `SSLCommerz session failed: ${result.failedreason ?? result.status ?? 'unknown'}`,
      );
      throw new GatewaySessionFailedException(result.failedreason);
    }

    return {
      redirectUrl: result.GatewayPageURL,
      sessionKey: result.sessionkey,
    };
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

  /**
   * Order Validation API — confirms amount + status at SSLCommerz after IPN.
   * Returns null when credentials are missing or the remote call fails.
   */
  async validateTransaction(
    valId: string,
  ): Promise<SslcommerzValidationResult | null> {
    const { storeId, storePassword } = this.requireCredentials();
    const url = new URL(
      `${this.baseUrl}/validator/api/validationserverAPI.php`,
    );
    url.searchParams.set('val_id', valId);
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('store_passwd', storePassword);
    url.searchParams.set('format', 'json');

    try {
      const response = await fetch(url);
      const result = (await response.json()) as {
        status?: string;
        tran_id?: string;
        amount?: string;
        currency?: string;
      };
      if (
        typeof result.status !== 'string' ||
        typeof result.tran_id !== 'string' ||
        typeof result.amount !== 'string'
      ) {
        this.logger.warn('SSLCommerz validation response missing fields');
        return null;
      }
      return {
        status: result.status,
        tran_id: result.tran_id,
        amount: result.amount,
        currency: result.currency,
      };
    } catch (error) {
      this.logger.error(
        `SSLCommerz validation request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
