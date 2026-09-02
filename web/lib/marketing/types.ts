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
    /** Logged-in CTA — opens role home (dashboard / teacher / admin). */
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
    legalColumn: string
    connectColumn: string
    programs: string
    howEnrollment: string
    about: string
    questions: string
    createAccount: string
    logIn: string
    payGuest: string
    terms: string
    privacy: string
    refund: string
    tradeLicenseLabel: string
    classesNote: string
    followLabel: string
    officeLabel: string
    registeredLabel: string
    paymentBannerAlt: string
    backToTop: string
    social: {
      facebook: string
      whatsapp: string
      telegram: string
    }
  }
  hero: {
    eyebrow: string
    headline: string
    lead: string
    ctaPrograms: string
    ctaRegister: string
    facts: MarketingFact[]
    /** Quiet proof line above the identity statement. */
    kicker: string
    /** Bold academy positioning line in the hero intro stack. */
    identity: string
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
    /** Three interactive “batch promise” beats. */
    pillars: Array<{
      index: string
      title: string
      body: string
    }>
    /** Interactive curriculum levels. */
    levels: Array<{
      id: string
      label: string
      note: string
    }>
    exploreHint: string
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
    lead: string
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
    tradeLicenseLabel: string
    tradeLicenseIdLabel: string
    registeredAddressLabel: string
    officeAddressLabel: string
    locationsEyebrow: string
    locationsHeading: string
    locationsLead: string
    sections: Array<{
      index: string
      heading: string
      body: string[]
      image: MarketingImage
      /** Optional fact rows under the body (licence numbers, etc.). */
      facts?: Array<{ label: string; value: string }>
    }>
  }
  legal: {
    terms: LegalDocumentCopy
    privacy: LegalDocumentCopy
    refund: LegalDocumentCopy
  }
  checkoutAcceptance: {
    agreePrefix: string
    terms: string
    privacy: string
    refund: string
    required: string
  }
  contactPage: {
    eyebrow: string
    title: string
    lead: string
    email: string
    phone: string
    hours: string
    hoursValue: string
    registeredAddress: string
    officeAddress: string
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
    /** Digits for `tel:` links — Latin numerals, E.164-style. */
    phoneHref: string
    /** Trade licence number (licence no). */
    tradeLicense: string
    /** Trade licence ID as issued on the certificate. */
    tradeLicenseId: string
    registeredAddress: string
    officeAddress: string
    /** External social profile URLs — Latin, not localized. */
    social: {
      facebook: string
      whatsapp: string
      telegram: string
    }
  }
}

export interface LegalDocumentCopy {
  eyebrow: string
  title: string
  lead: string
  updated: string
  sections: Array<{
    heading: string
    paragraphs: string[]
  }>
}
