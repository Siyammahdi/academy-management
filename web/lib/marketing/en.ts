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
    programs: 'Programs',
    howEnrollment: 'How enrollment works',
    about: 'About',
    questions: 'Questions',
    createAccount: 'Create an account',
    logIn: 'Log in',
    payGuest: 'Pay as a guest',
    contact: 'Contact admissions',
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
    askNext: 'Ask about the next batch',
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
        title: 'Every payment is confirmed by someone accountable',
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
  },
}
