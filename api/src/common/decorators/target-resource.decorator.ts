import { SetMetadata } from '@nestjs/common';

/**
 * Tells BatchScopeGuard / SelfApprovalGuard how to walk from the route's
 * `:id` param to the batch/enrollment it belongs to (doc 04 §4.1). 'batch'
 * means the `:id` param IS the batch id directly.
 */
export type TargetResourceKind =
  'batch' | 'enrollment' | 'billingPeriod' | 'payment' | 'request';

export const TARGET_RESOURCE_KEY = 'targetResource';

export const TargetResource = (
  kind: TargetResourceKind,
): MethodDecorator & ClassDecorator => SetMetadata(TARGET_RESOURCE_KEY, kind);
