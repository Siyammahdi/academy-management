import { Injectable, Logger } from '@nestjs/common';
import {
  GatewayNotConfiguredException,
  GatewaySessionFailedException,
} from '../../common/exceptions/gateway.exception';
import type {
  GatewaySessionParams,
  GatewaySessionResult,
  GatewayStatusQuery,
  GatewayStatusResult,
  GatewayTrxStatus,
  PaymentGateway,
} from './payment-gateway';

interface PaystationInitiateResponse {
  status_code?: string | number;
  status?: string;
  message?: string;
  payment_amount?: string | number;
  invoice_number?: string;
  payment_url?: string;
}

interface PaystationStatusPayload {
  invoice_number?: string;
  trx_status?: string;
  trx_id?: string;
  payment_amount?: string | number;
}

interface PaystationStatusResponse {
  status_code?: string | number;
  status?: string;
  message?: string;
  data?: PaystationStatusPayload;
}

function mapPaystationTrxStatus(raw: string | undefined): GatewayTrxStatus {
  switch ((raw ?? '').toLowerCase()) {
    case 'success':
      return 'success';
    case 'failed':
      return 'failed';
    case 'refund':
      return 'refund';
    case 'processing':
      return 'processing';
    default:
      return 'processing';
  }
}

function amountAsString(value: string | number | undefined): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n.toFixed(2) : value.trim();
  }
  return undefined;
}

@Injectable()
export class PaystationGatewayService implements PaymentGateway {
  readonly provider = 'paystation' as const;
  private readonly logger = new Logger(PaystationGatewayService.name);
  private readonly baseUrl = (process.env.PAYSTATION_BASE_URL ?? '').replace(
    /\/$/,
    '',
  );
  private readonly merchantId = process.env.PAYSTATION_MERCHANT_ID;
  private readonly password = process.env.PAYSTATION_PASSWORD;
  private readonly callbackUrl = process.env.PAYSTATION_CALLBACK_URL;

  private requireConfig(): {
    baseUrl: string;
    merchantId: string;
    password: string;
    callbackUrl: string;
  } {
    const baseUrl = this.baseUrl;
    const merchantId = this.merchantId?.trim() ?? '';
    const password = this.password?.trim() ?? '';
    const callbackUrl = this.callbackUrl?.trim() ?? '';
    const placeholder = (value: string) =>
      !value ||
      value === 'REPLACE_ME' ||
      value.toLowerCase().includes('replace');

    if (
      !baseUrl ||
      placeholder(merchantId) ||
      placeholder(password) ||
      !callbackUrl
    ) {
      throw new GatewayNotConfiguredException();
    }
    return { baseUrl, merchantId, password, callbackUrl };
  }

  async initiateSession(
    params: GatewaySessionParams,
  ): Promise<GatewaySessionResult> {
    const { baseUrl, merchantId, password, callbackUrl } =
      this.requireConfig();

    const body = {
      merchantId,
      password,
      invoice_number: params.transactionReference,
      currency: 'BDT',
      payment_amount: params.amount,
      pay_with_charge: '0',
      reference: params.reference ?? params.transactionReference,
      cust_name: params.customerName,
      cust_phone: params.customerPhone,
      cust_email: params.customerEmail ?? 'no-reply@annahda.academy',
      cust_address: params.customerAddress ?? 'Dhaka',
      callback_url: callbackUrl,
      checkout_items: params.checkoutItems ?? 'Course fee',
    };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/initiate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      const cause =
        error instanceof Error && 'cause' in error
          ? String((error as Error & { cause?: unknown }).cause)
          : '';
      this.logger.error(
        `PayStation session request failed: ${error instanceof Error ? error.message : String(error)}${cause ? ` (${cause})` : ''} → ${baseUrl}/initiate-payment`,
      );
      throw new GatewaySessionFailedException(
        'Could not reach PayStation. Check PAYSTATION_BASE_URL and network access.',
      );
    }

    let result: PaystationInitiateResponse;
    try {
      result = (await response.json()) as PaystationInitiateResponse;
    } catch {
      this.logger.warn(
        `PayStation returned non-JSON (HTTP ${response.status}) from ${baseUrl}/initiate-payment`,
      );
      throw new GatewaySessionFailedException(
        `PayStation returned an unexpected response (HTTP ${response.status}).`,
      );
    }
    const statusCode = String(result.status_code ?? '');
    const ok =
      (statusCode === '200' || result.status === 'success') &&
      typeof result.payment_url === 'string' &&
      result.payment_url.length > 0;

    if (!ok) {
      const detail = [statusCode, result.message, result.status]
        .filter((part) => typeof part === 'string' && part.trim().length > 0)
        .join(' — ');
      this.logger.warn(`PayStation session failed: ${detail || 'unknown'}`);
      throw new GatewaySessionFailedException(
        result.message?.trim() || detail || undefined,
      );
    }

    return { redirectUrl: result.payment_url! };
  }

  /**
   * Transaction status by invoice (primary). When `providerRef` is set,
   * also tries v2 by trxId as a fallback if invoice lookup fails.
   */
  async checkStatus(
    query: GatewayStatusQuery,
  ): Promise<GatewayStatusResult | null> {
    const { baseUrl, merchantId } = this.requireConfig();
    const invoice = query.invoiceNumber.trim();
    if (!invoice) return null;

    const byInvoice = await this.fetchStatusByInvoice(
      baseUrl,
      merchantId,
      invoice,
    );
    if (byInvoice) return byInvoice;

    const trxId = query.providerRef?.trim();
    if (trxId) {
      return this.fetchStatusByTrxId(baseUrl, merchantId, invoice, trxId);
    }
    return null;
  }

  private async fetchStatusByInvoice(
    baseUrl: string,
    merchantId: string,
    invoiceNumber: string,
  ): Promise<GatewayStatusResult | null> {
    try {
      const response = await fetch(`${baseUrl}/transaction-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          merchantId,
        },
        body: JSON.stringify({ invoice_number: invoiceNumber }),
      });
      const result = (await response.json()) as PaystationStatusResponse;
      return this.mapStatusResponse(result, invoiceNumber);
    } catch (error) {
      this.logger.error(
        `PayStation status-by-invoice failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async fetchStatusByTrxId(
    baseUrl: string,
    merchantId: string,
    invoiceNumber: string,
    trxId: string,
  ): Promise<GatewayStatusResult | null> {
    try {
      const response = await fetch(`${baseUrl}/v2/transaction-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          merchantId,
        },
        body: JSON.stringify({ trxId }),
      });
      const result = (await response.json()) as PaystationStatusResponse;
      return this.mapStatusResponse(result, invoiceNumber);
    } catch (error) {
      this.logger.error(
        `PayStation status-by-trxId failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private mapStatusResponse(
    result: PaystationStatusResponse,
    fallbackInvoice: string,
  ): GatewayStatusResult | null {
    const data = result.data;
    if (!data || typeof data.trx_status !== 'string') {
      const detail = [result.status_code, result.message]
        .filter((part) => part !== undefined && String(part).trim().length > 0)
        .join(' — ');
      this.logger.warn(
        `PayStation status response missing data: ${detail || 'unknown'}`,
      );
      return null;
    }

    return {
      invoiceNumber:
        typeof data.invoice_number === 'string' && data.invoice_number
          ? data.invoice_number
          : fallbackInvoice,
      trxStatus: mapPaystationTrxStatus(data.trx_status),
      trxId: typeof data.trx_id === 'string' ? data.trx_id : undefined,
      amount: amountAsString(data.payment_amount),
    };
  }
}
