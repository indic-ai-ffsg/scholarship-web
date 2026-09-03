/* The string tables.
 *
 * Hindi and English at launch; the content model extends to further Indian
 * languages by adding a table here (Table 3.3, Localisation).
 *
 * These are UI chrome only. Everything that carries meaning — a scheme's
 * criteria, the reason an application was blocked — is written by the API in
 * the recipient's language and passes through untouched. Translating those here
 * would put two sources of truth in front of the one sentence a student most
 * needs to understand.
 */

type Dict = Record<string, string>

export const en: Dict = {
  /* The name under the mark in the bar, and the tail of every tab title. The
   * foundation's name and what this site of theirs is — "Scholarships" alone
   * named a category rather than a service, and said nothing about whose it
   * was. */
  'app.name': 'Indic AI scholarship',
  /* Still used: the tab title for a page that has no name of its own. */
  'app.tagline': 'For students with disabilities',

  'nav.check': 'Check eligibility',
  /* The bar names the place, not the verb: a nav item is a destination, and
   * "Find scholarships" read as an instruction sitting beside three nouns. */
  'nav.find': 'Scholarships',
  'nav.partner': 'Become a partner',
  'nav.impact': 'Impact',
  'nav.matches': 'My matches',
  'nav.applications': 'My applications',
  'nav.documents': 'My documents',
  'nav.profile': 'My profile',
  'nav.privacy': 'My data',
  'nav.helpers': 'People helping me',
  'nav.account': 'My account',
  'nav.register': 'Sign up',
  /* The foundation's own words, supplied by the foundation. Reproduced as
   * given — this is the organisation describing itself, and quietly editing an
   * organisation's description of itself is not a typographic decision. */
  'footer.about': 'Indic AI is a Non-profit enhancing, Ability into Distinction for “People with Disabilities” to realise their potential, become active participants in the economy & fulfill their dreams. Our venture has also been selected by IIM- Bangalore for NSRCEL social incubation programme among 9 other esteemed organizations aiming to bring a change in the society.',
  'footer.social': 'Indic AI elsewhere',
  'footer.copyright': 'Copyright © {year} Indic AI | All rights reserved',
  /* One door, so one word for it. "Login" told a first-time student they
     were in the wrong place, and "Register" told a returning one the same;
     naming both is the only label that turns nobody away.

     "Sign up" rather than "register" because it is the wording people have met
     everywhere else, and familiarity is worth more here than precision. The
     cost is real and worth writing down: it differs from "sign in" by one
     short word, and in/up pairs are a known confusion for readers with
     dyslexia. If that ever shows up in testing, "Sign in or create account"
     is the more distinct phrasing and this is the line to change. It is also the
     heading on the page it opens — see auth.title — because a destination
     that repeats the button confirms you arrived where you meant to. */
  'nav.signin': 'Sign in or sign up',
  'nav.signout': 'Sign out',
  'nav.skip': 'Skip to main content',


  'public.title': 'Find a scholarship you qualify for',
  'public.lede': 'Every scholarship here is open to students with disabilities. You do not need an account to look.',
  'public.search': 'Search by name or keyword',
  'public.filter.disability': 'Type of disability',
  'public.filter.course': 'What you study',
  'public.filter.state': 'Your state',
  'public.filter.provider': 'Who offers it',
  'public.filter.any': 'Any',
  /* Each filter says "any what", because "Any" four times over a column of
     dropdowns tells a reader nothing about which one they are looking at. */
  'public.filter.anyDisability': 'Any disability',
  'public.filter.anyCourse': 'Any level of study',
  'public.filter.allStates': 'All states',
  'public.filters': 'Filters',
  'public.clear': 'Clear',
  'public.results': 'scholarships open now',
  'public.none': 'No scholarships match those filters',
  'public.none.hint': 'Try removing a filter. New schemes open through the year.',
  'public.whoFor': 'Who this is for',
  'public.about': 'About this scholarship',
  'public.atAGlance': 'At a glance',
  'public.signedInHelp': 'Checked against your profile, with anything that blocks you named.',
  'public.closes': 'Closes',
  'public.closesIn': 'Closes in {n} days',
  'public.closingSoon': 'Closing soon',
  'public.award': 'Award',
  'public.renewable': 'Can be renewed each year',
  'public.offeredBy': 'Offered by',
  'public.cta': 'Check if you qualify',
  'public.ctaHelp': 'Answer a few questions and we will tell you which of these are open to you. No account needed.',
  'public.back': 'Back to all scholarships',

  /* The partner page.
   *
   * Written against the temptation this page always carries: to open with
   * numbers the platform has not earned yet. Every claim here is either
   * something the code demonstrably does, or a count read live from the
   * directory two seconds before the reader sees it. */
  'partner.title': 'Run your scholarship where the students already are',
  'partner.lede': 'Publish a scheme here and it is checked against every student profile automatically, applications arrive with documents already verified, and every rupee and every decision is on the record. Charities, companies and government departments all run schemes on this platform.',
  'partner.talk': 'Talk to us',
  'partner.seeLive': 'See it working',
  'partner.seeFigures': 'the figures in full',

  'partner.exampleTitle': 'Your scheme, as a student meets it',
  'partner.exampleBody': 'A real scheme on the platform right now — not a mock-up. Yours looks like this, in the same list, on the same page they are already reading.',

  'partner.statesTitle': 'Every student gets a reason, not a rejection',
  'partner.statesBody': 'The platform does not answer yes or no. It answers in four states, and three of them tell the student what to do next — which is what turns your scheme from a form somebody abandoned into an application you can actually decide.',
  'partner.state.ELIGIBLE': 'Every criterion met, and the documents behind them verified. Ready to apply.',
  'partner.state.LIKELY_ELIGIBLE': 'Every criterion met on what the student has declared. The certificate is what settles it.',
  'partner.state.BLOCKED': 'One specific thing is missing, and the student is told which. This is the state that recovers an application instead of losing it.',
  'partner.state.NOT_ELIGIBLE': 'A criterion your scheme sets cannot be met, and the student is told which one rather than left guessing.',

  'partner.doesTitle': 'What the platform does for you',
  'partner.does.rules': 'Your criteria, applied for you',
  'partner.does.rulesBody': 'Your eligibility rules are stored as rules, not prose, so every student on the platform is matched against them the moment their profile changes. You review applications that already meet them.',
  'partner.does.documents': 'Certificates verified once',
  'partner.does.documentsBody': 'A disability certificate verified by any organisation here is trusted by all of them, with an expiry date attached. You are not the fourth body to check the same paper.',
  'partner.does.money': 'Sanction and disbursement tracked',
  'partner.does.moneyBody': 'Record what you sanctioned and what you paid, against the student and against your budget, and report on it without assembling a spreadsheet.',
  'partner.does.record': 'A record you can be audited against',
  'partner.does.recordBody': 'Every decision, every document opened and every consent given is logged with who did it and when — and the student can see the same log. That is the DPDP Act as a feature rather than a memo.',

  'partner.asksTitle': 'What it asks of you',
  'partner.asksBody': 'The half of this that partner pages leave out. None of it is onerous, and all of it is the reason the rest works.',
  'partner.asks.criteria': 'Say who the scheme is for, precisely',
  'partner.asks.criteriaBody': 'Percentages, income ceilings, states, course levels. Written as conditions rather than as a paragraph, because a paragraph cannot be checked automatically and a student cannot be told which line they failed.',
  'partner.asks.answer': 'Answer the applications',
  'partner.asks.answerBody': 'A student who applies is waiting on a person. The platform will chase you about it, and the time you take is visible to the platform team.',
  'partner.asks.verify': 'Name somebody to verify, if you can',
  'partner.asks.verifyBody': 'Not required. But an organisation that verifies documents for students in its own district makes every other scheme on the platform faster, and that is how this stops being one more portal.',

  'partner.notTitle': 'What we do not do',
  'partner.notBody': 'We do not choose your scholars, we do not hold your funds, and we do not publish numbers we cannot count. Selection is yours; disbursement is yours; the platform records both and shows the student what happened.',

  'partner.talkTitle': 'Start a conversation',
  'partner.talkBody': 'Four questions, no application. Somebody reads it and writes back — nothing is approved by filling in a form, because an approved organisation can see applicants\' disability certificates and that is not a decision to leave to a web page.',
  'partner.org': 'Organisation name',
  'partner.type': 'What kind of organisation',
  'partner.typeNGO': 'Charity or NGO',
  'partner.typeCorporate': 'Company',
  'partner.typeGovernment': 'Government department',
  'partner.typePrivate': 'Private organisation',
  'partner.adminName': 'Your name',
  'partner.adminEmail': 'Your email address',
  'partner.adminHint': 'Where we write back. Nothing else is sent here.',
  'partner.submit': 'Send',
  'partner.sending': 'Sending…',
  'partner.doneTitle': 'Thank you — we have it',
  'partner.doneBody': 'Somebody at the platform will read this and write to the address you gave. We answer every enquiry, including the ones we cannot take forward.',

  'impact.title': 'Impact',
  'impact.lede': 'Every figure here is counted from what is on the platform right now, not from a report written last year.',
  'impact.open': 'Scholarships open',
  'impact.openHint': 'Taking applications today.',
  'impact.value': 'On offer',
  'impact.valueHint': 'The awards of every scheme open now, added up.',
  'impact.providers': 'Providers',
  'impact.providersHint': 'Charities, companies and departments with a live scheme.',
  'impact.states': 'States covered',
  'impact.statesHint': 'Where an open scheme is available.',
  'impact.byProvider': 'Who is funding them',
  'impact.byLevel': 'What they are for',
  'impact.honest': 'What is not here',
  'impact.honestBody': 'No figure for students helped or money paid out. The platform can count those and this page will show them when the numbers are real rather than a demonstration — a public impact page that flatters itself is worth nothing to the students it is meant to serve.',
  'impact.empty': 'Nothing is open at the moment. New schemes open through the year.',

  'check.title': 'Check if you qualify',
  'check.lede': 'Answer what you know — no question here is required. We check every scholarship that is open and tell you which ones are for you.',
  'check.privacy': 'These answers are used once, to work out this result. They are not saved on our servers. They stay on this phone or computer, so that you do not type them again if you create an account.',
  'check.disabilityType': 'Your disability',
  'check.disabilityPercent': 'Percentage on your certificate',
  'check.disabilityPercentHint': 'Many scholarships need 40% or more.',
  'check.courseLevel': 'What you are studying',
  'check.state': 'State you live in',
  'check.income': "Your family's yearly income",
  'check.incomeHint': 'In rupees, as on your income certificate.',
  'check.category': 'Your category',
  'check.dob': 'Date of birth',
  'check.marks': 'Last exam marks (%)',
  'check.more': 'Two more questions',
  'check.moreHint': 'Only if you know them. They let us check schemes with an age limit or a marks requirement.',
  'check.unanswered': 'Not answered',
  'check.go': 'Check now',
  'check.checking': 'Checking…',
  'check.results': 'Your results',
  'check.eligibleHelp': 'Nothing you told us blocks this one. Documents come later, when you apply.',
  'check.answerThese': 'To be sure, answer: {fields}',
  'check.summary': 'You may qualify for {n} of the {total} scholarships open now.',
  'check.summaryBlocked': '{n} of the {total} scholarships open now might be open to you. Answer a little more and we can say for certain.',
  'check.summaryNone': 'None of the {total} scholarships open now match these answers.',
  'check.answered': 'Based on the {n} answers you gave. Answer more and we can check more.',
  'check.applyRegister': 'Create account to apply',
  'check.browse': 'See scholarships like these',
  'check.saveTitle': 'Keep these answers',
  'check.saveBody': 'An account takes a mobile number or an email address, nothing else. Your answers carry over, so you will not type them again — and we tell you when a new scholarship matches you.',

  /* The student's hub. Counts are phrased as things rather than numbers —
     "3 open" reads as a fact, "3" alone reads as a score. */
  'nav.dashboard': 'Dashboard',
  'dash.title': 'Your dashboard',
  'dash.lede': 'Where your scholarships, applications and documents stand.',
  'dash.matches': 'Scholarships you can apply for',
  'dash.matchesHint': 'Matched to the details you have given.',
  'dash.matchesBlocked': '{n} more need one thing from you first.',
  'dash.applications': 'Applications in progress',
  'dash.applicationsHint': '{approved} approved · {rejected} not successful',
  'dash.documents': 'Documents verified',
  'dash.documentsHint': 'Verified once, reused for every application.',
  'dash.funding': 'Received so far',
  'dash.fundingHint': '{sanctioned} sanctioned in total.',
  'dash.recent': 'Recent applications',
  'dash.noApplications': 'No applications yet',
  'dash.noApplicationsHint': 'When you apply for a scholarship it will appear here with its progress.',
  'dash.findScholarships': 'Find scholarships',
  'dash.editDetails': 'View or edit your details',
  /* The dashboard's completeness panel. "to go" rather than "incomplete": the
     same number said as the distance left rather than as a deficiency. */
  'dash.profileTitle': 'Your profile',
  'dash.toGo': '{n}% to go',
  'dash.allApplications': 'See all',
  /* What each tile leads to, in words. A card that only changes colour under a
     pointer says nothing to a keyboard or screen-reader user. */
  'dash.matchesGo': 'See your matches',
  'dash.applicationsGo': 'Track your applications',
  'dash.documentsGo': 'Manage documents',
  'dash.draftsTitle': '{n} application not sent',
  'dash.draftsBody': 'A started application is not a submitted one. Finish it before the scholarship closes.',
  'dash.draftsAction': 'Finish it',
  'dash.expiringTitle': '{n} document expiring soon',
  'dash.expiringBody': 'Replace it now and it stays valid for every application you make.',
  'dash.expiringAction': 'Check documents',

  /* Still "Login" because this one is a link inside a sentence addressed to
     someone who already has an account (Check.tsx: "Already have an
     account?"). The page heading is auth.title, which has to speak to both. */
  'auth.signin': 'Login',
  'auth.title': 'Sign in or sign up',
  'auth.register': 'Create your account',
  'auth.phone': 'Mobile number',
  'auth.phoneHint': 'We will send a 6-digit code to this number by SMS. The same number signs you in every time.',
  /* Said where the mistake is, in the terms the field itself uses: the leading
     digit is the part a number copied off a document most often loses. */
  'auth.phoneMissing': 'Enter your mobile number to continue.',
  'auth.phoneInvalid': 'That does not look right. Indian mobile numbers are 10 digits and start with 6, 7, 8 or 9.',
  'auth.phonePlaceholder': '98765 43210',
  /* Said once, plainly, on the first screen. A student who has been here before
     and one who has not both type the same thing, and neither has to work out
     which button applies to them. */
  'auth.oneDoor': 'New here or coming back, the same number works. We make you an account if you do not have one.',
  /* How long this is. Two steps is short enough that saying so up front removes
     most of the reason to abandon a form that has just asked for a phone
     number. */
  'auth.stepOf': 'Step {n} of 2 · {name}',
  'auth.stepPhone': 'Your number',
  'auth.stepCode': 'Your code',
  /* Under the button, not in a policy nobody opens. This audience is warned
     about handing over a phone number, and the answer to that warning belongs
     on the screen doing the asking. */
  'auth.privacy': 'Your number is used to sign you in and nothing else. There is no password to remember.',
  'auth.sendCode': 'Send code',
  'auth.sending': 'Sending…',
  'auth.continue': 'Continue',
  'auth.checking': 'Checking…',
  /* Still used by the public eligibility check, which sends somebody to the
     one sign-in page whether or not they turn out to have an account. */
  'auth.haveAccount': 'Already have an account?',
  /* Said on the code screen, once the number has been recognised or not. The
     flow checks before sending the code so a student is told which of the two
     is happening rather than discovering it afterwards. */
  'auth.welcomeBack': 'Welcome back. Enter the code to sign in.',
  'auth.newHere': 'We will create your account once you enter the code.',
  'auth.codeTitle': 'Enter the code we sent',
  'auth.code': '6-digit code',
  'auth.codeHint': 'The message usually arrives within a few seconds.',
  'auth.noCode': 'No message yet?',
  'auth.verify': 'Verify',
  'auth.resend': 'Send it again',
  'auth.resent': 'Sent. It can take a moment to arrive.',
  /* On the button itself, so the wait is read where the press would be —
     and short, because a sentence on a button wraps to three lines on a
     phone. */
  'auth.resendIn': 'Send it again in {n}s',
  'auth.changeNumber': 'Use a different number',
  'auth.welcome': 'Welcome. Let us set up your details.',

  'profile.complete': '{n}% complete',
  /* The profile review screen. "Change" rather than "Edit": the student is not
     editing a record, they are correcting something that has changed. */
  'profile.viewLede': 'Everything you have told us. Change any answer and it is used for every scholarship from then on.',
  'profile.change': 'Change',
  'profile.add': 'Add',
  'profile.save': 'Save',
  'profile.saving': 'Saving…',
  'profile.cancelEdit': 'Cancel',
  'profile.notAnswered': 'Not answered yet',
  'profile.verified': 'Verified',
  'profile.continue': 'Continue where you left off',
  'profile.start': 'Start your profile',
  'profile.saved': 'Saved',
  'profile.savedLocally': 'Saved on this device. It will sync when you are back online.',
  'profile.back': 'Back',
  'profile.next': 'Next',
  /* Shown instead of Next on an optional question with an empty box. "Skip"
     alone read as discarding something; this says what actually happens. */
  'profile.skip': 'Skip for now',
  'profile.finish': 'Finish',
  'profile.step': 'Question {n} of {total}',
  'profile.done.title': 'Your profile is ready',
  'profile.done.body': 'We are checking you against every scholarship now. This takes a moment.',
  'profile.done.cta': 'See my matches',
  'profile.done.dashboard': 'Go to my dashboard',

  'match.title': 'Scholarships for you',
  'match.lede': 'Checked against your profile. The ones you can apply to are first.',
  'match.eligible': 'You qualify',
  'match.likely': 'You probably qualify',
  'match.blocked': 'One thing to do first',
  'match.ineligible': 'Not open to you',
  'match.eligibleHelp': 'Everything we checked is verified.',
  'match.likelyHelp': 'Based on what you told us. Getting it verified makes your application stronger.',
  'match.blockedHelp': 'You are close. Do this and you can apply.',
  'match.ineligibleHelp': 'This scheme asks for something you cannot change.',
  'match.apply': 'Apply',
  'match.applied': 'You have applied',
  'match.view': 'See details',
  'match.none': 'No matches yet',
  'match.noneHint': 'Finish your profile and we will check every scholarship for you.',
  'match.working': 'We are still checking. This page will update.',

  'doc.title': 'Your documents',
  'doc.lede': 'Upload a document once. Every scholarship you apply to can use it — you will not be asked for it again.',
  'doc.upload': 'Add a document',
  'doc.type': 'What is this document?',
  'doc.file': 'Choose a file',
  'doc.fileHint': 'A PDF or a clear photograph. Up to 10 MB.',
  'doc.verified': 'Verified',
  'doc.verifiedBy': 'Verified by {org}',
  'doc.pending': 'Waiting to be verified',
  'doc.expired': 'Verification expired',
  'doc.expiring': 'Expires in {n} days',
  'doc.validUntil': 'Valid until {date}',
  'doc.none': 'You have not added any documents yet',
  'doc.uploading': 'Uploading…',
  'doc.remove': 'Remove',

  'apply.title': 'Apply',
  'apply.consent': 'Share my details with this provider',
  'apply.consentBody': 'They will see only what this scholarship needs to make a decision: {fields}. You can see who looked at your documents at any time.',
  'apply.submit': 'Send my application',
  'apply.submitting': 'Sending…',
  'apply.blocked': 'You cannot apply yet',
  'apply.needProfile': 'Your profile comes first',
  'apply.needProfileHint': 'An application is sent from your profile, so we need that before you can apply. It takes a few minutes, and anything you have already told us is filled in.',
  'apply.docs': 'Documents this scholarship needs',

  'appl.title': 'Your applications',
  'appl.none': 'You have not applied to anything yet',
  'appl.noneHint': 'Look at your matches to find scholarships you qualify for.',
  'appl.reference': 'Reference',
  'appl.whatNext': 'What happens next',
  'appl.history': 'History',
  'appl.needsYou': 'They need something from you',

  'privacy.title': 'Your data',
  'privacy.lede': 'What we hold, who has seen it, and how to take it back.',
  'privacy.access': 'Who has looked at your documents',
  'privacy.accessNone': 'Nobody outside your own account has opened your documents.',
  'privacy.consents': 'What you have agreed to share',
  'privacy.withdraw': 'Withdraw',
  'privacy.export': 'Download everything we hold',
  'privacy.exportBody': 'A complete machine-readable copy of your data.',
  'privacy.erase': 'Delete my data',
  'privacy.eraseBody': 'We must keep records of any scholarship paid to you. Everything else is removed.',
  'privacy.requested': 'Requested',

  'common.loading': 'Loading',
  'common.retry': 'Try again',
  'common.required': 'required',
  'common.optional': 'optional',
  'common.error': 'Something went wrong',
  'common.offline': 'You are offline. Your work is saved on this device.',

  /* Guardians and assisted use. Written for the student rather than about the
   * feature: "someone to help you" is what this is, and "guardian link" is
   * what we call it among ourselves. */
  'helpers.title': 'People helping me',
  'helpers.lede': 'You can ask someone you trust — a parent, a brother or sister, a teacher — to help you with your applications. They see what you see, and everything they do is recorded under their own name, not yours.',
  'helpers.mine': 'People who help me',
  'helpers.none': 'Nobody is helping you yet',
  'helpers.noneHint': 'You can add someone below, and remove them whenever you want.',
  'helpers.invite': 'Ask someone to help me',
  'helpers.contact': 'Their email address or mobile number',
  'helpers.contactHint': 'They need an account on this site already. Ask them to sign up first if they have not.',
  'helpers.relationship': 'How do you know them?',
  'helpers.relationshipHint': 'For example: mother, elder brother, teacher.',
  'helpers.canSubmit': 'They can send applications for me',
  'helpers.canSubmitHint': 'Leave this off and they can fill things in, but only you can send the application.',
  'helpers.send': 'Send the request',
  'helpers.sent': 'We have asked them. They will see it when they next sign in.',
  'helpers.remove': 'Remove',
  'helpers.removed': 'Removed. They can no longer see anything of yours.',
  'helpers.statusInvited': 'Waiting for them to agree',
  'helpers.statusActive': 'Helping you',
  'helpers.statusEnded': 'No longer helping you',
  'helpers.canSubmitYes': 'Can send applications for you',
  'helpers.canSubmitNo': 'Can help, but cannot send applications',

  'helpers.theirs': 'Students I help',
  'helpers.accept': 'Yes, I will help',
  'helpers.accepted': 'Thank you. Sign out and in again, then choose their name to help them.',
  'helpers.decline': 'No thank you',
  'helpers.askedBy': 'asked for your help',


  /* --- landing page ---------------------------------------------------------
   * The first thing a visitor sees, and often the only thing: somebody
   * arriving from a printed notice or a WhatsApp forward decides here whether
   * this is worth an account. So it answers "is there help for me" before it
   * asks for anything. */
  /* The lead panel of the band, which is compiled copy rather than a row an
   * operator wrote. It is the site's proposition, so it does not expire and is
   * not something to be edited under deadline pressure at 11pm.
   *
   * Two of these claims are not currently true of this build. The portal is
   * English-only — the language toggle was removed and the carousel reads only
   * the _en fields — so "6 languages" and "in your language" describe the
   * product as intended rather than as shipped. Written as instructed; if the
   * Hindi table comes back, they become true, and until then they are the two
   * lines to change if somebody decides the page should only claim what it
   * does. */
  /* The headline, in the three pieces it is coloured in. Together they read
   * "Dis-Ability to Distinction"; see the note on Lead() for why the hyphen
   * belongs to the struck-out piece and not to the one after it. */
  'slides.lead.was': 'Dis-',
  'slides.lead.able': 'Ability to',
  'slides.lead.dist': 'Distinction',
  'slides.lead.body': "Every scholarship you're eligible for — government and private — matched to your profile, in your language, in one place.",
  'slides.lead.free': 'Completely free',
  'slides.lead.languages': '6 languages',
  'slides.lead.support': 'Personal support at every step',

  'slides.label': 'Announcements',
  'slides.position': '{n} of {total}',
  /* The dots. Each is named by the panel it goes to rather than by its number;
   * the {name} is a headline. */
  'slides.goto': 'Show {name}',
  'slides.watch': 'Watch the video',
  'slides.external': 'opens another website',

  'home.title': 'Scholarships for students with disabilities, in one place',
  'home.lede': 'Tell us about yourself once. We check you against every scholarship here and tell you which ones you qualify for — and exactly what is missing for the rest.',
  'home.search': 'Search scholarships',
  'home.searchPlaceholder': 'Try: engineering, Delhi, post-matric',
  'home.searchGo': 'Search',
  'home.browseAll': 'Browse all scholarships',
  'home.openNow': 'scholarships open right now',
  'home.noAccount': 'No account needed to look.',

  'home.how': 'How it works',
  'home.step1': 'Check if you qualify',
  'home.step1Body': 'Answer a few questions. No account, and nothing you type is saved.',
  'home.step2': 'See what is open to you',
  'home.step2Body': 'Every scholarship here is checked against your answers — and where one is closed to you, we say why.',
  'home.step3': 'Apply when you are ready',
  'home.step3Body': 'An account is needed only to apply. Your answers carry over, and a certificate uploaded once is reused by every provider after that.',

  'home.closing': 'Closing soon',
  'home.closingLede': 'Apply to these first.',
  'home.browse': 'Browse by',
  'home.browseWho': 'Who offers it',
  'home.browseLevel': 'Your level of study',

  'home.cta': 'Ready to see your matches?',
  'home.ctaBody': 'Creating an account takes a mobile number or an email address. Nothing else.',
  'home.ctaButton': 'Create an account',
  'home.signedInCta': 'See what you qualify for',

}

/* One table, and no switch in front of it.
 *
 * Hindi was here from the start — the report's Table 3.3 asks for it, and half
 * this audience reads it first — and it has been taken out at the product's
 * request. What is kept is the indirection: every string is still looked up by
 * key rather than written into a component, so the copy has one home, a
 * reviewer can read the whole voice of the product in one file, and a second
 * language is a table away rather than a rewrite.
 *
 * What went with it: the language toggle, the stored preference, the
 * navigator.language sniff, and the Hindi halves of the vocabularies in
 * fields.ts. The API still sends Hindi copy for scheme summaries and slides —
 * those columns are the providers' and the operators' — and this app simply
 * does not read them now.
 */
