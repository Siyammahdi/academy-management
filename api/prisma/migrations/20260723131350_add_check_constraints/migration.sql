-- Money is never negative
ALTER TABLE billing_periods
  ADD CONSTRAINT chk_amount_owed_non_negative CHECK (amount_owed >= 0),
  ADD CONSTRAINT chk_amount_paid_non_negative CHECK (amount_paid >= 0);

ALTER TABLE payments
  ADD CONSTRAINT chk_payment_amount_positive CHECK (amount > 0);   -- PAY-10

ALTER TABLE refunds
  ADD CONSTRAINT chk_refund_amount_positive CHECK (amount > 0);

-- Discount is a valid percentage (FEE-04)
ALTER TABLE batches
  ADD CONSTRAINT chk_discount_range CHECK (entry_discount_percent BETWEEN 0 AND 100);

-- Due window is a valid, ordered day range
ALTER TABLE batches
  ADD CONSTRAINT chk_due_days CHECK (
    due_day_start BETWEEN 1 AND 28
    AND due_day_end BETWEEN 1 AND 28
    AND due_day_start <= due_day_end
  );

-- Capacity is meaningful
ALTER TABLE batches
  ADD CONSTRAINT chk_capacity_positive CHECK (capacity > 0);

-- Enrollment window is ordered
ALTER TABLE batches
  ADD CONSTRAINT chk_enrollment_window CHECK (enrollment_opens_at < enrollment_closes_at);

-- periodMonth is always the first of the month (TIME-04)
ALTER TABLE billing_periods
  ADD CONSTRAINT chk_period_month_is_first CHECK (EXTRACT(DAY FROM period_month) = 1);

-- Request type/field coherence
ALTER TABLE requests
  ADD CONSTRAINT chk_request_fields CHECK (
    (type = 'partial_payment' AND requested_amount IS NOT NULL)
    OR (type = 'grace' AND extended_due_date IS NOT NULL)
    OR status = 'pending'
  );

-- Manual payments require proof (PAY-06)
ALTER TABLE payments
  ADD CONSTRAINT chk_manual_requires_proof CHECK (
    method <> 'manual' OR (transaction_reference IS NOT NULL AND proof_url IS NOT NULL)
  );

-- Guest payments identify the payer (PAY-11)
ALTER TABLE payments
  ADD CONSTRAINT chk_guest_identified CHECK (
    paid_by <> 'guest' OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
  );
