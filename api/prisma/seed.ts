import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

// Fixed ids make every upsert below idempotent — re-running this script
// never creates duplicates (doc 05 §7: "MUST be idempotent").
const SEED_ADMIN_USER_ID = 'seed_admin_user';
const SEED_COURSE_ID = 'seed_course_arabic';
const SEED_BATCH_ID = 'seed_batch_arabic_1';

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@nahda.local';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  // Prerequisite for AuthService.register's sequential studentId generator
  // (doc 05 §6) — the row it `.update()`s must already exist.
  await prisma.studentIdSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, current: 0 },
  });

  const passwordHash = await argon2.hash(SEED_ADMIN_PASSWORD);
  const admin = await prisma.user.upsert({
    where: { id: SEED_ADMIN_USER_ID },
    update: { isEmailVerified: true },
    create: {
      id: SEED_ADMIN_USER_ID,
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: admin.id, role: 'admin' } },
    update: {},
    create: { userId: admin.id, role: 'admin' },
  });

  const course = await prisma.course.upsert({
    where: { id: SEED_COURSE_ID },
    update: {
      slug: 'learning-arabic-language',
      featured: true,
      featuredOrder: 0,
      tagline: 'Read, write, and speak with confidence.',
      category: 'Arabic',
      emphasis: 'from the foundations',
      focus: 'A clear path from alphabet to fluency.',
      highlights: [
        'Structured Basic → Intermediate → Advanced parts',
        'Live classes off-platform with recorded catch-up',
        'Monthly billing after enrollment',
      ],
      audience:
        'Beginners and returning students who want a calm, structured Arabic path.',
      outcomes: [
        'Comfortable Qur’anic reading basics',
        'Everyday conversation confidence',
        'A habit of consistent study',
      ],
    },
    create: {
      id: SEED_COURSE_ID,
      slug: 'learning-arabic-language',
      title: 'Learning Arabic Language',
      description: 'Foundational Arabic for new students.',
      billingType: 'monthly',
      enrollmentFee: '1000.00',
      monthlyFee: '500.00',
      featured: true,
      featuredOrder: 0,
      tagline: 'Read, write, and speak with confidence.',
      category: 'Arabic',
      emphasis: 'from the foundations',
      focus: 'A clear path from alphabet to fluency.',
      highlights: [
        'Structured Basic → Intermediate → Advanced parts',
        'Live classes off-platform with recorded catch-up',
        'Monthly billing after enrollment',
      ],
      audience:
        'Beginners and returning students who want a calm, structured Arabic path.',
      outcomes: [
        'Comfortable Qur’anic reading basics',
        'Everyday conversation confidence',
        'A habit of consistent study',
      ],
    },
  });

  const now = new Date();
  const enrollmentOpensAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const enrollmentClosesAt = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const courseStartDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  await prisma.batch.upsert({
    where: { id: SEED_BATCH_ID },
    update: {},
    create: {
      id: SEED_BATCH_ID,
      courseId: course.id,
      name: 'Batch 1',
      // Frozen snapshot from the course (doc 05 §2, FEE-02) — never re-read
      // from Course after this point.
      enrollmentFee: course.enrollmentFee,
      monthlyFee: course.monthlyFee,
      capacity: 30,
      courseStartDate,
      enrollmentOpensAt,
      enrollmentClosesAt,
      status: 'enrolling',
    },
  });

  console.log('Seed complete:', {
    admin: admin.email,
    course: course.title,
    batch: SEED_BATCH_ID,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
