import type { MarketingImage } from '@/lib/marketing/media'

export interface MarketingFact {
  label: string
  value: string
}

export interface MarketingProgramCopy {
  slug: string
  /** Lower-case keywords matched against live course titles — not translated. */
  keywords: string[]
  index: string
  name: string
  tagline: string
  /** Italicised phrase shown beside the name in stack cards. */
  emphasis?: string
  /** Short right-column focus line on stack cards. */
  focus?: string
  /** Small category label (e.g. Arabic) for stack index row. */
  category?: string
  description: string
  includes: string[]
  image: MarketingImage
}

export interface MarketingCopy {
  academy: {
    name: string
    shortName: string
  }
  nav: {
    programs: string
    enrollment: string
    questions: string
    about: string
    payFees: string
    logIn: string
    register: string
    /** Logged-in CTA — opens role home (dashboard / manager / admin). */
    goToApp: string
    openMenu: string
    closeMenu: string
    primaryNav: string
    language: string
  }
  footer: {
    blurb: string
    academyColumn: string
    studentsColumn: string
    programs: string
    howEnrollment: string
    about: string
    questions: string
    createAccount: string
    logIn: string
    payGuest: string
    contact: string
    classesNote: string
  }
  hero: {
    eyebrow: string
    headline: string
    lead: string
    ctaPrograms: string
    ctaRegister: string
    facts: MarketingFact[]
    chipClosed: string
    chipOpen: (batches: number, seats: number) => string
  }
  academyStory: {
    eyebrow: string
    heading: string
    quote: string
    body: string[]
    aside: {
      label: string
      value: string
      note: string
    }
  }
  programs: {
    eyebrow: string
    heading: string
    lead: string
    alsoRunning: string
    openSuffix: string
    perMonth: string
    register: string
    enrollNow: string
    askNext: string
    viewProgram: string
    batchOnRequest: string
    enrollmentClosed: string
    fullNext: string
    enrollmentOpen: string
    feesPending: string
    entryFee: string
    monthly: string
    billing: string
    onePayment: string
    seatsLeft: string
    batchMeta: (name: string, starts: string, closes: string) => string
  }
  flagship: MarketingProgramCopy[]
  experience: {
    eyebrow: string
    heading: string
    lead: string
    panels: Array<{
      index: string
      title: string
      body: string
      image: MarketingImage
    }>
  }
  journey: {
    eyebrow: string
    heading: string
    steps: Array<{ index: string; title: string; body: string }>
    aside: string
    talkAdmissions: string
  }
  glance: {
    programsOffered: string
    batchesOpen: string
    seatsFree: string
    dueWindow: string
    nextWindow: string
    liveNote: string
  }
  assurances: {
    eyebrow: string
    heading: string
    lead: string
    guestCta: string
    items: Array<{ title: string; body: string }>
  }
  faq: {
    eyebrow: string
    heading: string
    aside: string
    readyPrefix: string
    readyLink: string
    items: Array<{ question: string; answer: string }>
  }
  closing: {
    eyebrow: string
    heading: string
    lead: string
    createAccount: string
    payFees: string
    preferAsk: string
    orCall: string
  }
  about: {
    eyebrow: string
    title: string
    lead: string
    seePrograms: string
    contactAdmissions: string
    sections: Array<{
      index: string
      heading: string
      body: string[]
      image: MarketingImage
    }>
  }
  contactPage: {
    eyebrow: string
    title: string
    lead: string
    email: string
    phone: string
    hours: string
    hoursValue: string
    alreadyStudent: string
    alreadyStudentBody: string
    alreadyStudentAction: string
    payingSomeone: string
    payingSomeoneBody: string
    payingSomeoneAction: string
    newHere: string
    newHereBody: string
    newHereAction: string
    teachingNote: string
  }
  contact: {
    email: string
    phone: string
  }
}
