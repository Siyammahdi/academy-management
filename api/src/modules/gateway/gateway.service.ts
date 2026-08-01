/**
 * Backward-compatible re-exports. Prefer importing from
 * `sslcommerz.gateway`, `paystation.gateway`, or `payment-gateway`.
 */
export {
  SslcommerzGatewayService,
  SslcommerzGatewayService as GatewayService,
  computeVerifySign,
  type SslcommerzWebhookPayload,
} from './sslcommerz.gateway';
export { PaystationGatewayService } from './paystation.gateway';
export { GatewayRegistry } from './gateway.registry';
export {
  DEFAULT_GATEWAY_PROVIDER,
  GATEWAY_PROVIDERS,
  generateGatewayInvoiceNumber,
  isGatewayProvider,
  type GatewayProviderId,
  type GatewaySessionParams,
  type GatewaySessionResult,
  type GatewayStatusQuery,
  type GatewayStatusResult,
  type GatewayTrxStatus,
  type PaymentGateway,
  type PaymentProviderId,
} from './payment-gateway';
