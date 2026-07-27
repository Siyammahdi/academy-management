// Typed calls against doc 06 §3/§4/§7's admin-facing endpoints, plus the
// small additive read endpoints this build required (GET /students/count,
// GET /users, the widened GET /batches/:id and GET /payments/pending
// includes) — see the api/ changes made alongside this frontend.

import { apiFetch, ApiError, type ApiErrorBody } from './api';
import { getAccessToken } from './session';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

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
  enrollmentId: string;
  studentId: string;
  fullName: string;
  phone: string;
  enrollmentStatus: string;
  inPenalty: boolean;
  enrolledAt: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  phone: string;
}

export interface StudentListItem {
  id: string;
  studentId: string;
  fullName: string;
  phone: string;
  status: 'active' | 'inactive';
  email: string | null;
  activeEnrollments: number;
  createdAt: string;
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
  createdAt?: string;
  hasStudentProfile?: boolean;
}

export type RoleName = 'admin' | 'manager' | 'student';

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

/** Admin-only — ENR-08. `studentId` is the Student row id (cuid), not ANA-####. */
export function addLateJoiner(
  batchId: string,
  studentId: string,
): Promise<{ enrollment: { id: string; status: string } }> {
  return apiFetch(`/batches/${batchId}/late-joiner`, {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
}

/** Admin-only — withdraw an enrollment. */
export function withdrawEnrollment(enrollmentId: string): Promise<Enrollment> {
  return apiFetch(`/enrollments/${enrollmentId}/withdraw`, {
    method: 'POST',
  });
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

export function refundPayment(
  id: string,
  input: { amount: string; reason: string },
): Promise<unknown> {
  return apiFetch(`/payments/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Admin-only job triggers (api/src/jobs) — same queue path as cron.
export function triggerPenaltySweep(): Promise<{ jobId: string }> {
  return apiFetch('/jobs/penalty-sweep/trigger', { method: 'POST' });
}

export function triggerBillingGeneration(): Promise<{ jobId: string }> {
  return apiFetch('/jobs/billing-generation/trigger', { method: 'POST' });
}

export function triggerGatewayExpiry(): Promise<{ jobId: string }> {
  return apiFetch('/jobs/gateway-expiry/trigger', { method: 'POST' });
}

// Small additive endpoints backing the overview page and the manager picker.
export function getStudentCount(): Promise<{ count: number }> {
  return apiFetch('/students/count');
}

export function listStudents(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: 'active' | 'inactive';
}): Promise<Paginated<StudentListItem>> {
  return apiFetch(
    `/students${toQueryString({
      page: params?.page,
      limit: params?.limit,
      q: params?.q,
      status: params?.status,
    })}`,
  );
}

export function createUser(input: {
  email: string
  password: string
  roles: RoleName[]
  fullName?: string
  phone?: string
}): Promise<UserSummary> {
  return apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function listUsers(
  role?: string,
  q?: string,
): Promise<UserSummary[]> {
  return apiFetch(`/users${toQueryString({ role, q })}`);
}

export function assignUserRole(
  userId: string,
  role: RoleName,
): Promise<UserSummary> {
  return apiFetch(`/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export function removeUserRole(
  userId: string,
  role: RoleName,
): Promise<UserSummary> {
  return apiFetch(`/users/${userId}/roles/${role}`, {
    method: 'DELETE',
  });
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

export interface Recording {
  id: string;
  batchId: string;
  title: string;
  youtubeVideoId: string;
  recordedFor: string;
  createdAt: string;
}

export type RecordingWithContext = Recording & {
  batch: Batch & { course: Course };
};

export interface CreateRecordingInput {
  title: string;
  youtubeVideoId: string;
  recordedFor: string;
}

export type UpdateRecordingInput = Partial<CreateRecordingInput>;

export function listBatchRecordings(batchId: string): Promise<Recording[]> {
  return apiFetch(`/batches/${batchId}/recordings`);
}

export function createRecording(
  batchId: string,
  input: CreateRecordingInput,
): Promise<Recording> {
  return apiFetch(`/batches/${batchId}/recordings`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateRecording(
  id: string,
  input: UpdateRecordingInput,
): Promise<Recording> {
  return apiFetch(`/recordings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteRecording(id: string): Promise<void> {
  return apiFetch(`/recordings/${id}`, { method: 'DELETE' });
}

export function listMyRecordings(): Promise<RecordingWithContext[]> {
  return apiFetch('/me/recordings');
}

// Reporting (doc 06 §11) — revenue, outstanding, enrollment capacity, ledger, audit logs.
// These are admin/manager read-only endpoints.

export interface RevenueByMonth {
  periodMonth: string
  revenue: string
}

export interface RevenueReport {
  totalRevenue: string
  byMonth: RevenueByMonth[]
}

export interface OutstandingItem {
  billingPeriodId: string
  periodMonth: string
  courseTitle: string
  batchName: string
  amountOutstanding: string
}

export interface OutstandingReport {
  totalOutstanding: string
  dueCount: number
  items: OutstandingItem[]
  meta: PaginationMeta
}

export interface EnrollmentBatchReport {
  batchId: string
  batchName: string
  courseTitle: string
  capacity: number
  filled: number
  pendingCount: number
  seatRemaining: number
  status: string
}

export interface EnrollmentReport {
  batches: EnrollmentBatchReport[]
  totals: { filled: number; pending: number; fullBatches: number }
}

export type LedgerEntryKind = 'payment' | 'refund'

export interface LedgerEntry {
  kind: LedgerEntryKind
  id: string
  createdAt: string
  periodMonth: string
  courseTitle: string
  batchName: string
  amount: string
  status?: string
  method?: PaymentMethod
  transactionReference?: string | null
  refundReason?: string
}

export interface LedgerReport {
  entries: LedgerEntry[]
  meta: PaginationMeta
}

export interface AuditLogEntry {
  id: string
  actorUserId: string | null
  action: string
  targetType: string
  targetId: string
  createdAt: string
  details: unknown | null
}

export function listReportsRevenue(query: {
  from?: string
  to?: string
  batchId?: string
}): Promise<RevenueReport> {
  return apiFetch(
    `/reports/revenue${toQueryString({ from: query.from, to: query.to, batchId: query.batchId })}`,
  )
}

export function listReportsOutstanding(query: {
  from?: string
  to?: string
  batchId?: string
  page?: number
  limit?: number
}): Promise<OutstandingReport> {
  return apiFetch(
    `/reports/outstanding${toQueryString({ from: query.from, to: query.to, batchId: query.batchId, page: query.page, limit: query.limit })}`,
  )
}

export function listReportsEnrollments(query: { batchId?: string }): Promise<EnrollmentReport> {
  return apiFetch(`/reports/enrollments${toQueryString({ batchId: query.batchId })}`)
}

export function listReportsLedger(query: {
  from?: string
  to?: string
  batchId?: string
  page?: number
  limit?: number
}): Promise<LedgerReport> {
  return apiFetch(
    `/reports/ledger${toQueryString({ from: query.from, to: query.to, batchId: query.batchId, page: query.page, limit: query.limit })}`,
  )
}

export function listAuditLogs(query: {
  actorUserId?: string
  action?: string
  targetType?: string
  targetId?: string
  page?: number
  limit?: number
}): Promise<Paginated<AuditLogEntry>> {
  return apiFetch(
    `/audit-logs${toQueryString({
      actorUserId: query.actorUserId,
      action: query.action,
      targetType: query.targetType,
      targetId: query.targetId,
      page: query.page,
      limit: query.limit,
    })}`,
  )
}

/** Admin-only CSV download of the ledger for the selected month range. */
export async function downloadReportsExport(query: {
  from?: string
  to?: string
  batchId?: string
}): Promise<void> {
  const token = getAccessToken()
  const path = `/reports/export${toQueryString({
    from: query.from,
    to: query.to,
    batchId: query.batchId,
  })}`
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    const text = await response.text()
    let body: unknown
    try {
      body = text.length > 0 ? JSON.parse(text) : undefined
    } catch {
      body = undefined
    }
    if (body && typeof body === 'object' && body !== null && 'error' in body) {
      throw new ApiError(body as ApiErrorBody)
    }
    throw new Error('Export failed')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ledger_${query.from ?? 'from'}_${query.to ?? 'to'}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
