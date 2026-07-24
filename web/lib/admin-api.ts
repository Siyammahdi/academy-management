// Typed calls against doc 06 §3/§4/§7's admin-facing endpoints, plus the
// small additive read endpoints this build required (GET /students/count,
// GET /users, the widened GET /batches/:id and GET /payments/pending
// includes) — see the api/ changes made alongside this frontend.

import { apiFetch } from './api';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type BillingType = 'monthly' | 'one_time';
export type CourseStatus = 'active' | 'archived';
export type BatchStatus = 'upcoming' | 'enrolling' | 'running' | 'completed';
export type PeriodStatus = 'unpaid' | 'pending' | 'partially_paid' | 'paid';
export type PaymentMethod = 'gateway' | 'manual';
export type PaymentStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface CoursePart {
  name: string;
  durationMonths: number;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  billingType: BillingType;
  enrollmentFee: string;
  monthlyFee: string;
  parts: CoursePart[] | null;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  billingType: BillingType;
  enrollmentFee: string;
  monthlyFee: string;
  parts?: CoursePart[];
}

export type UpdateCourseInput = Partial<CreateCourseInput>;

export interface Batch {
  id: string;
  courseId: string;
  name: string;
  enrollmentFee: string;
  monthlyFee: string;
  entryDiscountPercent: number;
  capacity: number;
  courseStartDate: string;
  enrollmentOpensAt: string;
  enrollmentClosesAt: string;
  dueDayStart: number;
  dueDayEnd: number;
  status: BatchStatus;
  classLink: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchManagerSummary {
  userId: string;
  email: string;
}

export type BatchWithSeats = Batch & {
  seatsRemaining: number;
  managers: BatchManagerSummary[];
};

export interface CreateBatchInput {
  courseId: string;
  name: string;
  capacity: number;
  entryDiscountPercent?: number;
  courseStartDate: string;
  enrollmentOpensAt: string;
  enrollmentClosesAt: string;
  dueDayStart?: number;
  dueDayEnd?: number;
}

export type UpdateBatchInput = Partial<Omit<CreateBatchInput, 'courseId'>>;

export interface RosterEntry {
  studentId: string;
  fullName: string;
  phone: string;
  enrollmentStatus: string;
  enrolledAt: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  phone: string;
}

export interface Enrollment {
  id: string;
  batchId: string;
  studentId: string;
  status: string;
  inPenalty: boolean;
  enrolledAt: string;
  updatedAt: string;
}

export type EnrollmentWithBatch = Enrollment & {
  batch: Batch & { course: Course };
};

export interface BillingPeriod {
  id: string;
  enrollmentId: string;
  periodMonth: string;
  amountOwed: string;
  amountPaid: string;
  dueDate: string;
  status: PeriodStatus;
}

export type BillingPeriodWithContext = BillingPeriod & {
  // Computed server-side (Prisma.Decimal) — never derived client-side.
  outstanding: string;
  enrollment: EnrollmentWithBatch;
};

export interface Payment {
  id: string;
  billingPeriodId: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidBy: 'student' | 'guest';
  transactionReference: string | null;
  proofUrl: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PendingPayment = Payment & {
  billingPeriod: BillingPeriod & {
    enrollment: Enrollment & {
      student: Student;
      batch: Batch & { course: Course };
    };
  };
};

// Same shape as PendingPayment — GET /me/payments now includes the same
// billingPeriod/enrollment/batch/course nesting, just under a name that
// makes sense for a student's full history (not only pending items).
export type PaymentWithContext = PendingPayment;

export interface UserSummary {
  id: string;
  email: string;
  roles: string[];
}

function toQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query.length > 0 ? `?${query}` : '';
}

// Courses (doc 06 §3) — GET /courses is "active only" by design, so
// archived courses simply stop appearing here once archived.
export function listCourses(
  page?: number,
  limit?: number,
): Promise<Paginated<Course>> {
  return apiFetch(`/courses${toQueryString({ page, limit })}`);
}

export function createCourse(input: CreateCourseInput): Promise<Course> {
  return apiFetch('/courses', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCourse(
  id: string,
  input: UpdateCourseInput,
): Promise<Course> {
  return apiFetch(`/courses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function archiveCourse(id: string): Promise<Course> {
  return apiFetch(`/courses/${id}/archive`, { method: 'POST' });
}

export function getCourse(id: string): Promise<Course> {
  return apiFetch(`/courses/${id}`);
}

// Batches (doc 06 §4)
export function listBatches(params: {
  status?: BatchStatus;
  courseId?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<Batch>> {
  return apiFetch(`/batches${toQueryString(params)}`);
}

export function getBatch(id: string): Promise<BatchWithSeats> {
  return apiFetch(`/batches/${id}`);
}

export function createBatch(input: CreateBatchInput): Promise<Batch> {
  return apiFetch('/batches', { method: 'POST', body: JSON.stringify(input) });
}

export function updateBatch(
  id: string,
  input: UpdateBatchInput,
): Promise<Batch> {
  return apiFetch(`/batches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function updateClassLink(
  id: string,
  classLink: string,
): Promise<Batch> {
  return apiFetch(`/batches/${id}/class-link`, {
    method: 'PATCH',
    body: JSON.stringify({ classLink }),
  });
}

export function changeBatchStatus(
  id: string,
  status: BatchStatus,
): Promise<Batch> {
  return apiFetch(`/batches/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export function assignManager(batchId: string, userId: string): Promise<void> {
  return apiFetch(`/batches/${batchId}/managers`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function removeManager(
  batchId: string,
  userId: string,
): Promise<void> {
  return apiFetch(`/batches/${batchId}/managers/${userId}`, {
    method: 'DELETE',
  });
}

export function getRoster(batchId: string): Promise<RosterEntry[]> {
  return apiFetch(`/batches/${batchId}/roster`);
}

// Self-scoped for a manager (or an admin who also manages batches) — not in
// doc 06's own endpoint table; added because there was no way at all for a
// manager to discover which batches they're assigned to.
export function getManagedBatches(): Promise<BatchWithSeats[]> {
  return apiFetch('/me/managed-batches');
}

export function getAtRiskCount(): Promise<{ count: number }> {
  return apiFetch('/me/managed-batches/at-risk-count');
}

// Payments (doc 06 §7)
export function listPendingPayments(
  page?: number,
  limit?: number,
): Promise<Paginated<PendingPayment>> {
  return apiFetch(`/payments/pending${toQueryString({ page, limit })}`);
}

export function verifyPayment(id: string): Promise<Payment> {
  return apiFetch(`/payments/${id}/verify`, { method: 'POST' });
}

export function rejectPayment(id: string): Promise<Payment> {
  return apiFetch(`/payments/${id}/reject`, { method: 'POST' });
}

// Small additive endpoints backing the overview page and the manager picker.
export function getStudentCount(): Promise<{ count: number }> {
  return apiFetch('/students/count');
}

export function listUsers(role?: string): Promise<UserSummary[]> {
  return apiFetch(`/users${toQueryString({ role })}`);
}

// Student self-service (doc 06 §5/§6/§7) — every one of these is scoped by
// the API from the token; none takes a client-supplied student id (doc 04 §6).
export function listMyEnrollments(
  page?: number,
  limit?: number,
): Promise<Paginated<EnrollmentWithBatch>> {
  return apiFetch(`/me/enrollments${toQueryString({ page, limit })}`);
}

export function listMyBillingPeriods(
  status?: PeriodStatus,
  page?: number,
  limit?: number,
): Promise<Paginated<BillingPeriodWithContext>> {
  return apiFetch(`/me/billing-periods${toQueryString({ status, page, limit })}`);
}

export function listMyPayments(
  page?: number,
  limit?: number,
): Promise<Paginated<PaymentWithContext>> {
  return apiFetch(`/me/payments${toQueryString({ page, limit })}`);
}

export function payGateway(
  billingPeriodId: string,
): Promise<{ redirectUrl: string }> {
  return apiFetch(`/billing-periods/${billingPeriodId}/pay/gateway`, {
    method: 'POST',
  });
}

export interface PayManualInput {
  amount: string;
  transactionReference: string;
  proofUrl: string;
}

export function payManual(
  billingPeriodId: string,
  input: PayManualInput,
): Promise<Payment> {
  return apiFetch(`/billing-periods/${billingPeriodId}/pay/manual`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface EnrollResult {
  enrollment: { id: string; status: string };
  firstPeriod: {
    id: string;
    periodMonth: string;
    amountOwed: string;
    dueDate: string;
  };
}

export function enrollInBatch(batchId: string): Promise<EnrollResult> {
  return apiFetch(`/batches/${batchId}/enroll`, { method: 'POST' });
}

export interface Homework {
  id: string;
  batchId: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
}

export type HomeworkWithContext = Homework & {
  batch: Batch & { course: Course };
};

export interface CreateHomeworkInput {
  title: string;
  description: string;
  dueDate: string;
}

export type UpdateHomeworkInput = Partial<CreateHomeworkInput>;

export function listBatchHomework(batchId: string): Promise<Homework[]> {
  return apiFetch(`/batches/${batchId}/homework`);
}

export function createHomework(
  batchId: string,
  input: CreateHomeworkInput,
): Promise<Homework> {
  return apiFetch(`/batches/${batchId}/homework`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateHomework(
  id: string,
  input: UpdateHomeworkInput,
): Promise<Homework> {
  return apiFetch(`/homework/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteHomework(id: string): Promise<void> {
  return apiFetch(`/homework/${id}`, { method: 'DELETE' });
}

export function listMyHomework(): Promise<HomeworkWithContext[]> {
  return apiFetch('/me/homework');
}
