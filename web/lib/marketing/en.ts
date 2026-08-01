import { MEDIA } from '@/lib/marketing/media'
import type { MarketingCopy } from '@/lib/marketing/types'

export const en: MarketingCopy = {
  academy: {
    name: 'An Nahda Academy',
    shortName: 'An Nahda',
  },
  nav: {
    programs: 'Programs',
    enrollment: 'Enrollment',
    questions: 'Questions',
    about: 'About',
    payFees: 'Pay fees',
    logIn: 'Log in',
    register: 'Register',
    goToApp: 'Go to dashboard',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    primaryNav: 'Primary',
    language: 'Language',
  },
  footer: {
    blurb:
      'Arabic and Qur’an taught live to small batches. Enrollment, fees, homework and recordings kept in one clear place for students and the families who pay for them.',
    academyColumn: 'Academy',
    studentsColumn: 'Students & families',
    legalColumn: 'Policies',
    programs: 'Programs',
    howEnrollment: 'How enrollment works',
    about: 'About',
    questions: 'Questions',
    createAccount: 'Create an account',
    logIn: 'Log in',
    payGuest: 'Pay as a guest',
    contact: 'Contact admissions',
    terms: 'Terms & conditions',
    privacy: 'Privacy policy',
    refund: 'Return & refund policy',
    tradeLicenseLabel: 'Trade licence',
    classesNote: 'Classes are taught on Zoom and Telegram, in Asia/Dhaka time.',
  },
  hero: {
    eyebrow: 'Arabic & Qur’an study',
    headline: 'An academy where your teacher knows you.',
    lead: 'Two programs, taught live to limited batches on Zoom and Telegram. Enrollment, fees, homework and class recordings stay in one clear place — for the student, and for whoever pays their fees.',
    ctaPrograms: 'See the programs',
    ctaRegister: 'Create an account',
    facts: [
      { label: 'Classes', value: 'Live on Zoom & Telegram' },
      { label: 'Cohorts', value: 'Seats capped per batch' },
      { label: 'Fees', value: 'Monthly, due the 1st–5th' },
    ],
    chipClosed: 'Next batch to be announced',
    chipOpen: (batches, seats) =>
      `${batches} ${batches === 1 ? 'batch' : 'batches'} open · ${seats} ${seats === 1 ? 'seat' : 'seats'} left`,
  },
  academyStory: {
    eyebrow: 'The academy',
    heading: 'We open a few seats at a time, on purpose.',
    quote:
      'A batch is a promise: a start date, a fee that will not move, and a seat that belongs to one student.',
    body: [
      'An Nahda teaches Arabic and the Qur’an the way any serious subject deserves to be taught — in structured parts, over months, with the same teacher and the same small group. Courses run as batches: a cohort with its own start date, its own seats, and its own enrollment window.',
      'Teaching happens where students already are — live sessions on Zoom, and the batch group on Telegram. What surrounds the teaching is what families usually struggle with: what is owed, when it is due, what was assigned, and what was missed. That is what this platform exists to keep clear.',
    ],
    aside: {
      label: 'Course structure',
      value: 'Basic · Intermediate · Advanced',
      note: 'Programs run in parts of roughly eight months each. A part tells you where you are in the curriculum — it never changes what you owe.',
    },
  },
  programs: {
    eyebrow: 'Programs',
    heading: 'Two programs. Taught properly, not broadly.',
    lead: 'We would rather run a short list well than a catalogue badly. Each program opens as a batch with its own seats, its own start date, and fees that stay fixed for everyone in it.',
    alsoRunning: 'Also running',
    openSuffix: ' · open',
    perMonth: '/ month',
    register: 'Register to enroll',
    enrollNow: 'Enroll now',
    askNext: 'Ask about the next batch',
    viewProgram: 'View program',
    batchOnRequest: 'Batch dates on request',
    enrollmentClosed: 'Enrollment closed',
    fullNext: 'Full — try next batch',
    enrollmentOpen: 'Enrollment open',
    feesPending:
      'Fees for this program are confirmed when its next batch opens. Admissions can tell you the current schedule.',
    entryFee: 'Entry fee',
    monthly: 'Monthly',
    billing: 'Billing',
    onePayment: 'One payment',
    seatsLeft: 'Seats left',
    batchMeta: (name, starts, closes) =>
      `${name} starts ${starts} · enrollment closes ${closes}`,
  },
  flagship: [
    {
      slug: 'arabic',
      keywords: ['arabic'],
      index: '01',
      name: 'Learning Arabic',
      tagline: 'The language, taught as a language',
      emphasis: 'as a language',
      focus: 'Built in sequence.',
      category: 'Arabic',
      description:
        'Reading, vocabulary and grammar built in sequence rather than in fragments. Each batch works through one part of the curriculum together, so nobody is quietly left behind while the class moves on.',
      includes: [
        'Live sessions with your batch',
        'Homework set with a due date',
        'Recorded classes to revisit',
        'Progress kept to one cohort',
      ],
      image: MEDIA.programArabic,
    },
    {
      slug: 'quran',
      keywords: ['qur', 'quran', 'koran', 'hifz', 'tajweed'],
      index: '02',
      name: 'Qur’an Learning',
      tagline: 'Recitation and memorization, ongoing',
      emphasis: 'ongoing',
      focus: 'Corrected in the room.',
      category: 'Qur’an',
      description:
        'An ongoing program rather than a short course — recitation corrected in the session, memorization carried month to month, at a pace a small batch makes possible.',
      includes: [
        'Live recitation with your teacher',
        'Continuous monthly enrollment',
        'Class link posted to your batch',
        'Recordings organised by class day',
      ],
      image: MEDIA.programQuran,
    },
    {
      slug: 'path',
      keywords: [],
      index: '03',
      name: 'Basic to Advanced',
      tagline: 'One curriculum, taught in parts',
      emphasis: 'in parts',
      focus: 'Eight months at a time.',
      category: 'Path',
      description:
        'Programs run in parts of roughly eight months each. A part tells you where you are in the curriculum — Basic, Intermediate, then Advanced — and never changes what you owe.',
      includes: [
        'Clear part of the curriculum',
        'Same teacher across the part',
        'Fees fixed for the batch',
        'Progress that belongs to your cohort',
      ],
      image: MEDIA.journey,
    },
  ],
  experience: {
    eyebrow: 'Inside the portal',
    heading: 'What a month of study actually looks like.',
    lead: 'Teaching stays live. Everything a student needs between sessions has one home.',
    panels: [
      {
        index: '01',
        title: 'Join the live class',
        body: 'Your batch manager posts the session link. It appears on your dashboard as a single action — join it, or copy it to open on another device.',
        image: MEDIA.experienceClass,
      },
      {
        index: '02',
        title: 'Work through homework',
        body: 'Assignments are set against your batch with a due date in Dhaka time. Upcoming and past-due work is separated, across every course you are enrolled in.',
        image: MEDIA.experienceHomework,
      },
      {
        index: '03',
        title: 'Rewatch the class',
        body: 'Recorded sessions are shared as video and grouped by the day they were taught, newest first — so catching up after a missed week stays orderly.',
        image: MEDIA.experienceRecording,
      },
      {
        index: '04',
        title: 'Settle the month',
        body: 'Each enrollment carries its own balance and its own due date. Pay online, or submit a receipt for your manager to verify. Nothing is merged into one total.',
        image: MEDIA.experienceFees,
      },
    ],
  },
  journey: {
    eyebrow: 'Enrollment',
    heading: 'Four steps, and no surprises after them.',
    steps: [
      {
        index: '01',
        title: 'A batch opens',
        body: 'Each program opens for enrollment a few times a year. A batch carries its own start date, its own seat count, and its own window.',
      },
      {
        index: '02',
        title: 'You take a seat',
        body: 'Enroll while the window is open. Seats are real: when a batch fills, enrollment closes and the next batch opens instead. There is no waitlist.',
      },
      {
        index: '03',
        title: 'One payment starts you',
        body: 'The entry fee for that batch and your first month are paid together. Paying online activates your seat immediately; a submitted receipt is verified by your batch manager first.',
      },
      {
        index: '04',
        title: 'Then it is monthly',
        body: 'Fees fall due between the 1st and the 5th of each month. The schedule follows the calendar — paying late settles that month without moving the ones after it.',
      },
    ],
    aside:
      'Not sure which part of a program you belong in? Admissions will place you before the batch starts.',
    talkAdmissions: 'Talk to admissions',
  },
  glance: {
    programsOffered: 'Programs offered',
    batchesOpen: 'Batches open now',
    seatsFree: 'Seats still free',
    dueWindow: 'Monthly due window',
    nextWindow: 'Next window to be set',
    liveNote: "Read live from the academy's enrollment records.",
  },
  assurances: {
    eyebrow: 'Before you enroll',
    heading: 'The rules we hold ourselves to.',
    lead: 'These are enforced by the system, not by goodwill — which is the point.',
    guestCta: 'See how guest payment works',
    items: [
      {
        title: 'Your fee is frozen the day your batch opens',
        body: 'A batch takes a copy of the fees at the moment it is created. If the academy later changes what a course costs, your batch is untouched.',
      },
      {
        title: 'A missed month never costs you your seat',
        body: 'Falling behind adds a re-enrollment fee to your balance — once for the lapse, not once per month — and clears when your dues are settled. You are never removed for owing money.',
      },
      {
        title: 'Every payment is confirmed by accountable',
        body: "Online payments are settled by the bank's own confirmation, never by the page you land on. Receipts are checked and marked verified by a named manager.",
      },
      {
        title: 'A manager can never approve their own money',
        body: 'Staff who are also enrolled cannot verify their own payments or grant themselves an extension. Those decisions escalate to an admin.',
      },
      {
        title: 'Family can pay without an account',
        body: 'A parent or relative can look up a student by email, phone or Student ID, see only the dues that are outstanding, and pay one of them directly.',
      },
    ],
  },
  faq: {
    eyebrow: 'Questions',
    heading: 'Asked before enrolling.',
    aside:
      'Anything not answered here, ask us directly — a person replies, usually within a working day.',
    readyPrefix: 'Ready to hold a seat?',
    readyLink: 'Create a student account',
    items: [
      {
        question: 'Where do the classes actually happen?',
        answer:
          'Live on Zoom, with your batch group on Telegram. This site is not where teaching happens — it is where your enrollment, fees, homework, class link and recordings live.',
      },
      {
        question: 'What happens when a batch is full?',
        answer:
          'Enrollment closes for that batch and the seat count stops at capacity. We open the next batch rather than keeping a waitlist, so nobody sits in an unclear queue.',
      },
      {
        question: 'When are fees due each month?',
        answer:
          'Between the 1st and the 5th, in Dhaka time, for each enrollment separately. The due dates follow the calendar: settling a late month never shifts the months that come after it.',
      },
      {
        question: 'Can I still join after enrollment closes?',
        answer:
          'Not on your own. An admin can add a late joiner after the window closes — contact admissions and ask; it is a decision, not an automatic option.',
      },
      {
        question: 'Someone else pays my fees. Do they need an account?',
        answer:
          'No. They can use guest payment with your email, phone or Student ID. They will see your name and the specific dues outstanding, choose which one to pay, and nothing else about your profile is shown.',
      },
      {
        question: 'What if I miss a payment?',
        answer:
          'You keep your seat. A re-enrollment fee is added to your balance once for the lapse, and it clears once every month on that enrollment is paid. If a payment or request of yours is still pending, no fee is added while it waits.',
      },
      {
        question: 'How do I pay by hand rather than online?',
        answer:
          'Submit the transaction reference and a photo of the receipt from your dashboard. It sits as pending until your batch manager verifies it, and your dashboard shows exactly which state it is in.',
      },
    ],
  },
  closing: {
    eyebrow: 'Next batch',
    heading: 'Seats open a few times a year. Be ready for the next one.',
    lead: 'Create a student account now and enrollment takes minutes when the window opens. Paying for someone else needs no account at all.',
    createAccount: 'Create an account',
    payFees: "Pay a student's fees",
    preferAsk: 'Prefer to ask first? Write to',
    orCall: 'or call',
  },
  about: {
    eyebrow: 'About',
    title: 'A madrasa that runs like an institution.',
    lead: 'An Nahda teaches Arabic and the Qur’an with structure, patience, and clear expectations — for students, and for the families paying their fees.',
    seePrograms: 'See the programs',
    contactAdmissions: 'Contact admissions',
    registrationHeading: 'Registered academy',
    registrationBody:
      'An Nahda Academy operates as a registered educational service in Bangladesh. Our trade licence number is published on this page and in the site footer.',
    tradeLicenseLabel: 'Trade licence number',
    sections: [
      {
        index: '01',
        heading: 'What we teach',
        body: [
          'Two programs: Arabic language, and Qur’an recitation and memorization. Both are taught as ongoing study rather than short courses, in parts — Basic, Intermediate, Advanced — of roughly eight months each.',
          'A part describes where a student is in the curriculum. It does not gate progress and it never changes what a student owes.',
        ],
        image: MEDIA.programArabic,
      },
      {
        index: '02',
        heading: 'How a batch works',
        body: [
          'Every course runs as a batch: a cohort with its own start date, its own seats, and its own enrollment window. Once a batch opens you can enroll until it fills or the window closes, whichever comes first.',
          'There is no waitlist. When a batch is full we say so plainly and open the next one, because a seat that exists is worth more than a place in a queue.',
        ],
        image: MEDIA.journey,
      },
      {
        index: '03',
        heading: 'How fees are handled',
        body: [
          'A batch takes a copy of its fees the day it is created, and those fees stay fixed for everyone enrolled in it. Later changes to a course price apply only to batches opened afterwards.',
          'Pay online, or submit a receipt for your batch manager to verify. Each enrollment keeps its own balance and its own monthly due date — nothing is ever merged into a single unexplained total.',
        ],
        image: MEDIA.experienceFees,
      },
    ],
  },
  legal: {
    terms: {
      eyebrow: 'Legal',
      title: 'Terms & conditions',
      lead: 'These terms govern use of An Nahda Academy’s website, student portal, and paid programs. By creating an account, enrolling, or paying fees, you agree to them.',
      updated: 'Last updated 1 August 2026',
      sections: [
        {
          heading: '1. Who we are',
          paragraphs: [
            'An Nahda Academy (“we”, “us”) provides live online Arabic and Qur’an instruction in limited batches, together with enrollment, fee, homework, and recording tools on this website.',
            'Questions about these terms: admissions@annahda.academy.',
          ],
        },
        {
          heading: '2. Accounts and eligibility',
          paragraphs: [
            'You must provide accurate registration details and keep login credentials private. You are responsible for activity under your account.',
            'Parents or guardians who pay for a student remain bound by these terms for that payment and for information they submit on the student’s behalf.',
          ],
        },
        {
          heading: '3. Programs, batches, and enrollment',
          paragraphs: [
            'Each course runs as a batch with its own seats, fees, and enrollment window. Enrollment is available only while the window is open and seats remain.',
            'Submitting an enrollment request does not by itself activate classroom access. Access follows the academy’s payment and activation rules shown at checkout and in the student portal.',
            'Batch schedules, class links, and teaching platforms (for example Zoom or Telegram) may change with reasonable notice when operationally required.',
          ],
        },
        {
          heading: '4. Fees and payments',
          paragraphs: [
            'Fees for a batch are fixed when that batch is created. Amounts shown at checkout are calculated by the academy and cannot be edited by the payer.',
            'Online payments are processed by our payment partner. Manual payments require a transaction reference and proof link and stay pending until verified.',
            'Monthly dues, due dates, and any late penalties follow the rules published in the student portal for each enrollment.',
          ],
        },
        {
          heading: '5. Acceptable use',
          paragraphs: [
            'Class links, homework, recordings, and portal content are for enrolled students only. Do not share access credentials or recorded class material outside the permitted batch.',
            'You must not misuse the site, attempt unauthorised access, or submit false payment proof.',
          ],
        },
        {
          heading: '6. Intellectual property',
          paragraphs: [
            'Course materials, branding, and site content belong to An Nahda Academy or its licensors. Enrollment grants a limited, non-transferable licence to use materials for personal study during the enrollment.',
          ],
        },
        {
          heading: '7. Limitation of liability',
          paragraphs: [
            'Live online classes depend on third-party platforms and each student’s internet connection. We take reasonable care to deliver scheduled teaching but are not liable for outages or disruptions outside our control.',
            'Nothing in these terms limits rights that cannot be excluded under applicable Bangladesh law.',
          ],
        },
        {
          heading: '8. Changes',
          paragraphs: [
            'We may update these terms. The “Last updated” date at the top of this page will change when we do. Continued use of the site or portal after an update constitutes acceptance of the revised terms.',
          ],
        },
      ],
    },
    privacy: {
      eyebrow: 'Legal',
      title: 'Privacy policy',
      lead: 'This policy explains what personal information An Nahda Academy collects, why we use it, and the choices available to students and payers.',
      updated: 'Last updated 1 August 2026',
      sections: [
        {
          heading: '1. Information we collect',
          paragraphs: [
            'Account and profile data such as name, email, phone number, and student identifiers.',
            'Enrollment and billing data including course and batch choices, amounts owed, payment references, and proof links you submit.',
            'Technical data such as login session details and basic device or browser information needed to keep the portal secure.',
          ],
        },
        {
          heading: '2. How we use information',
          paragraphs: [
            'To create and manage student accounts, enrollments, class access, homework, and recordings.',
            'To calculate dues, process payments, verify manual payments, issue receipts, and handle refunds where applicable.',
            'To contact you about enrollment windows, dues, payment status, and operational updates for your batches.',
            'To keep audit records of money-affecting actions and protect the integrity of the academy’s systems.',
          ],
        },
        {
          heading: '3. Who we share with',
          paragraphs: [
            'Payment gateways and banks process online payments on our behalf. They receive only what is required to complete the transaction.',
            'Batch managers and administrators see student and payment information needed to teach, verify payments, and run the academy.',
            'We do not sell personal information.',
          ],
        },
        {
          heading: '4. Retention and security',
          paragraphs: [
            'We retain enrollment, payment, and audit records for as long as needed for teaching operations, financial accountability, and legal obligations.',
            'We use access controls and industry-standard practices to protect data. No method of transmission or storage is perfectly secure; please keep your password private.',
          ],
        },
        {
          heading: '5. Your choices',
          paragraphs: [
            'You may request access to or correction of the personal data we hold about you by writing to admissions@annahda.academy.',
            'Some records cannot be deleted while an enrollment or payment dispute is active, or where we must keep them for audit or legal reasons.',
          ],
        },
        {
          heading: '6. Children and family payers',
          paragraphs: [
            'Where a parent or guardian creates an account or pays on behalf of a student, they should only provide information they are authorised to share.',
            'Guest payers supply name and phone solely to complete and track a specific payment.',
          ],
        },
        {
          heading: '7. Contact',
          paragraphs: [
            'Privacy questions: admissions@annahda.academy. We aim to respond within one working day.',
          ],
        },
      ],
    },
    refund: {
      eyebrow: 'Legal',
      title: 'Return & refund policy',
      lead: 'An Nahda Academy sells live educational services and digital portal access, not physical goods. This policy explains when fees may be refunded.',
      updated: 'Last updated 1 August 2026',
      sections: [
        {
          heading: '1. Nature of our services',
          paragraphs: [
            'Fees cover enrollment in a live teaching batch and related portal services (class access tools, homework, and recordings where provided). There is no physical product to return.',
          ],
        },
        {
          heading: '2. When a refund may be issued',
          paragraphs: [
            'Refunds are discretionary and issued only by academy administrators, typically where a payment was made in error, duplicated, or where the academy cancels a batch before teaching begins.',
            'A verified payment may be refunded in full or in part. Partial refunds reopen the linked billing balance by the refunded amount.',
            'Requesting a refund does not guarantee approval. Each case is reviewed against enrollment status, classes already delivered, and payment records.',
          ],
        },
        {
          heading: '3. What is generally not refundable',
          paragraphs: [
            'Fees for months or periods in which the student had access to scheduled classes, whether or not every session was attended.',
            'Convenience fees or charges added by the payment gateway or bank, if any, which are outside the academy’s fee amount.',
            'Change of mind after a batch has started and classroom access has been granted, except where the academy agrees in writing.',
          ],
        },
        {
          heading: '4. How to request a refund',
          paragraphs: [
            'Email admissions@annahda.academy with the student name or ID, payment reference or receipt, amount, and reason.',
            'We may ask for additional proof. Approved refunds are returned via the original payment method where possible, or another method we confirm with you.',
          ],
        },
        {
          heading: '5. Pending and rejected payments',
          paragraphs: [
            'Manual payments that are rejected or expire are not charged as verified fees. Online payments that fail at the gateway do not create a completed academy payment.',
            'If money left your account but the portal still shows a failed or cancelled payment, contact us promptly with the bank or gateway reference so we can investigate.',
          ],
        },
        {
          heading: '6. Contact',
          paragraphs: [
            'Refund questions: admissions@annahda.academy or the phone number published on the Contact page.',
          ],
        },
      ],
    },
  },
  checkoutAcceptance: {
    agreePrefix: 'I have read and agree to the',
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    refund: 'Return & Refund Policy',
    required: 'Accept the Terms, Privacy Policy, and Return & Refund Policy to continue.',
  },
  contactPage: {
    eyebrow: 'Contact',
    title: 'Talk to admissions.',
    lead: 'Questions about a program, a batch date, a fee, or a payment that needs checking — write or call. A person answers, usually within one working day.',
    email: 'Email',
    phone: 'Phone',
    hours: 'Hours',
    hoursValue: 'Sat–Thu, Asia/Dhaka',
    alreadyStudent: 'Already a student',
    alreadyStudentBody:
      'Log in to see your dues, submit a payment, and open your class link.',
    alreadyStudentAction: 'Log in',
    payingSomeone: 'Paying for someone',
    payingSomeoneBody:
      'Look a student up by email, phone or Student ID and settle one specific due — no account needed.',
    payingSomeoneAction: 'Pay as a guest',
    newHere: 'New here',
    newHereBody:
      'Create a student account so enrollment takes minutes when the next batch opens.',
    newHereAction: 'Create an account',
    teachingNote:
      "Teaching happens on Zoom and in your batch's Telegram group. Enrollment, fees, homework and recordings live in the student portal.",
  },
  contact: {
    email: 'admissions@annahda.academy',
    phone: '+880 1700-000000',
    /** Replace with the academy’s official trade licence number. */
    tradeLicense: 'TRAD/DNCC/XXXXXX/2024',
  },
}
