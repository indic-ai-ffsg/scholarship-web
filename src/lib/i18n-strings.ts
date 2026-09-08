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
  /* The tab name for one application, which is not the same page as the public
     listing for the same scheme — and took the identical title until this
     existed. Two tabs reading "HSBC Merit Scholarship" are two tabs a reader
     has to open to tell apart. */
  'app.yourApplication': 'Your application · {title}',

  'nav.home': 'Home',
  /* The bar names the place, not the verb: a nav item is a destination, and
   * "Find scholarships" read as an instruction sitting beside three nouns. */
  'nav.find': 'Scholarships',
  /* "For partners" in the bar; the page's own heading still says "Become a
     partner". A nav item names a destination, and the imperative reads as an
     instruction to a student who is not the audience for it. */
  'nav.partner': 'For partners',
  'nav.impact': 'Impact',
  'nav.how': 'How it works',
  'nav.matches': 'My matches',
  'nav.applications': 'My applications',
  'nav.documents': 'My documents',
  'nav.profile': 'My profile',
  'nav.privacy': 'My data',
  'nav.account': 'My account',
  'nav.register': 'Sign up',
  'footer.social': 'Indic AI elsewhere',
  /* Names the relationship rather than leaving a second mark to imply one.
     See .footer-sponsor in styles.css. */
  'footer.sponsor': 'Supported by',
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
  /* "Sign in", not "Sign in or Sign Up".
   *
   * Both halves were there because the two used to be separate screens going
   * to the same place. They are one screen now, and it registers an unknown
   * number on the way through — so the longer label described a distinction
   * that no longer exists, and it made the account door the loudest thing in
   * the masthead on a site whose actual ask is the registration form. */
  'nav.signin': 'Sign in',
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
  /* Stands in the count's place while a search runs. It replaced a sweeping
     progress bar: the count line is already reserved, so the word costs no
     reflow and does not flicker the way the bar did. */
  'public.searching': 'Searching…',
  /* Two empty states, because they are two situations and the page was
   * telling the wrong one.
   *
   * It said "No scholarships match those filters. Try removing a filter" with
   * every filter unset — blaming the reader for something they had not done,
   * on a directory that was simply empty. The first pair is for a search that
   * genuinely narrowed to nothing; the second is for a directory with nothing
   * in it, which is what a new deployment looks like. */
  'public.none': 'No scholarships match those filters',
  'public.none.hint': 'Try removing a filter. New schemes open through the year.',
  'public.none.clear': 'Clear all filters',
  'public.empty': 'No scholarships are listed here yet',
  'public.empty.hint': 'Providers are being added now. Nothing here sits behind an account — when schemes are listed you will see them without signing in.',
  'public.whoFor': 'Who this is for',
  'public.about': 'About this scholarship',
  'public.atAGlance': 'At a glance',
  'public.closes': 'Closes',
  'public.awardUnstated': 'Award not stated',
  'public.noClose': 'No closing date',
  'public.closesIn': 'Closes in {n} days',
  'public.closingSoon': 'Closing soon',
  'public.award': 'Award',
  'public.renewable': 'Can be renewed each year',
  'public.offeredBy': 'Offered by',
  'public.cta': 'Find scholarships for you',
  /* Under the Apply button on a scheme page, for somebody who has an account.
     It says the press is safe: the next screen checks the profile and the
     documents and names anything missing, so pressing Apply is not the same as
     sending an application. */
  /* Under the Apply button for a scheme the platform lists but does not run.
     Says plainly that the application is not ours to receive, so a student who
     later cannot find it under "My applications" knows why. */
  'public.applyExternal': "Apply on the sponsor's site",
  'public.applyExternalHelp': '{org} runs this scholarship and takes the application on their own website. It will not appear under your applications here.',
  /* Spoken, never drawn. Appended to the accessible name of any link that opens
     a new tab, which is otherwise one of the most disorienting things a screen
     reader user can meet. */
  'common.newTab': 'opens in a new tab',
  'public.applyHelp': 'We check your profile and your documents against this scholarship first, and tell you if anything is missing. Nothing is sent until you confirm.',
  'public.ctaHelp': 'Tell us about yourself once and we will show you every scholarship you qualify for.',
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


  /* The student's hub. Counts are phrased as things rather than numbers —
     "3 open" reads as a fact, "3" alone reads as a score. */
  'nav.dashboard': 'Dashboard',
  'dash.title': 'Your dashboard',
  'dash.lede': 'Your scholarships, applications and documents, all in one place.',
  'dash.matches': 'Scholarships you can apply for',
  'dash.matchesHint': 'Based on the details you gave us.',
  /* No verb to agree with {n}, which is how it stays right at 1 and at 7, and
   * no "more" — the count above it is often 0, and "1 more" than nothing is
   * not a thing anybody can count. It said "1 more need one thing from you
   * first" on a tile reading 0. */
  'dash.matchesBlocked': '{n} waiting on one more detail from you.',
  'dash.applications': 'Applications in progress',
  'dash.applicationsHint': '{approved} approved · {rejected} not successful',
  /* Shown instead when there is nothing to count. "0 approved · 0 not
   * successful" under a 0 is the same nothing said three times, and the word
   * "successful" is the last one a student needs on their first visit. */
  'dash.applicationsNone': 'Nothing sent yet.',
  'dash.documents': 'Documents verified',
  'dash.documentsHint': 'Checked once. Used for every application.',
  'dash.funding': 'Received so far',
  'dash.fundingHint': '{sanctioned} sanctioned in total.',
  'dash.recent': 'Recent applications',
  'dash.noApplications': 'No applications yet',
  'dash.noApplicationsHint': 'Anything you apply for will show up here.',
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
  'dash.draftsTitle': '{n} application not sent | {n} applications not sent',
  /* No pronoun to disagree with the count, and plainer than "a started
   * application is not a submitted one" — which is a sentence you have to read
   * twice to find the verb in. */
  'dash.draftsBody': 'Starting an application does not send it. Finish before the scholarship closes.',
  'dash.draftsAction': 'Finish now',
  'dash.expiringTitle': '{n} document expiring soon | {n} documents expiring soon',
  'dash.expiringBody': 'Replace it now so it works for every application. | Replace them now so they work for every application.',
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
  /* Said on the code screen, once the number has been recognised or not. The
     flow checks before sending the code so a student is told which of the two
     is happening rather than discovering it afterwards. */
  'auth.welcomeBack': 'Welcome back. Enter the code to sign in.',
  'auth.newHere': 'We will create your account once you enter the code.',
  'auth.codeTitle': 'Enter the code we sent',
  'auth.code': '6-digit code',
  'auth.codeHint': 'The message usually arrives within a few seconds.',
  'auth.noCode': 'No message yet? Try another way:',
  'auth.verify': 'Verify',
  'auth.resend': 'Send it again',
  'auth.resent': 'Sent. It can take a moment to arrive.',
  /* Three ways to receive the code, and three confirmations that name the one
     used. "Sent." alone cannot tell a student whether their choice of WhatsApp
     took effect, which leaves them watching the wrong app. */
  'auth.viaSms': 'Send by SMS',
  'auth.viaWhatsapp': 'Send on WhatsApp',
  'auth.viaVoice': 'Call me with the code',
  'auth.resentVia.sms': 'Sent by SMS. It can take a moment to arrive.',
  'auth.resentVia.whatsapp': 'Sent on WhatsApp. Check WhatsApp for the message.',
  'auth.resentVia.voice': 'Calling you now with the code. Answer to hear it.',
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
  /* The other list's heading. It had none: the cards are h3, so under the page
     h1 they skipped h2 entirely, and a screen reader moving by heading went
     from the page title straight into a scheme name with nothing saying which
     of the two groups it belonged to — while "Not open to you" below did have
     its heading. Both lists are named now. */
  'match.actionable': 'Open to you',
  'match.actionableHelp': 'Some may still need a document before you can apply.',
  'match.ineligible': 'Not open to you',
  'match.eligibleHelp': 'Everything we checked is verified.',
  'match.likelyHelp': 'Based on what you told us. Getting it verified makes your application stronger.',
  'match.blockedHelp': 'You are close. Do this and you can apply.',
  'match.ineligibleHelp': 'This scheme asks for something you cannot change.',
  'match.apply': 'Apply',
  'match.applied': 'You have applied',
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
  /* The working label. Without it the button changed nothing at all while
     the request ran, which is what a flashing bar was invented to cover. */
  'doc.removing': 'Removing…',

  'apply.title': 'Apply',
  'apply.consent': 'Share my details with this provider',
  'apply.consentBody': 'They will see only what this scholarship needs to make a decision: {fields}. You can see who looked at your documents at any time.',
  'apply.submit': 'Send my application',
  'apply.submitting': 'Sending…',
  'apply.blocked': 'You cannot apply yet',
  'apply.needProfile': 'Your profile comes first',
  'apply.needProfileHint': 'An application is sent from your profile, so we need that before you can apply. It takes a few minutes, and anything you have already told us is filled in.',
  'apply.elsewhereTitle': 'This one is applied for on the sponsor\u2019s own site',
  'apply.elsewhereBody': 'We list this scholarship so you can find it, but we do not run it, so an application cannot be sent from here. Everything you have already told us stays saved for the ones we do run.',
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
  'privacy.withdrawing': 'Withdrawing…',
  'privacy.export': 'Download everything we hold',
  /* Not "Downloading…": nothing is coming down the wire yet. The server is
     assembling the copy, and saying so is the difference between a wait that
     makes sense and one that looks stuck. */
  'privacy.exporting': 'Preparing your copy…',
  'privacy.exportBody': 'A complete machine-readable copy of your data.',
  'privacy.erase': 'Delete my data',
  'privacy.erasing': 'Requesting…',
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
  /* What the same line says when the directory is empty.
   *
   * It rendered "0 scholarships open right now" — directly under a headline
   * promising every scholarship you are eligible for. A count is the right
   * thing to show when there is one; zero is not a count, it is a different
   * situation, and the honest version of it says so and says what to expect. */
  'home.openNone': 'No scholarships are listed here yet.',
  'home.openNoneBody': 'The directory is being filled now. Nothing here sits behind an account — when schemes are listed you will see them without signing in.',

  /* The seven steps of registering, in the order they happen on screen.
   *
   * This section used to describe the product — check, see, apply. That answers
   * "what is this site", and the question people actually arrive with is
   * procedural: what do I press, what will it ask me for, and how far in am I.
   * Most of this audience reaches the portal from a forwarded message that
   * walks through exactly that, so the walkthrough is here too, in the same
   * order and as close to the same words as the screen allows — a student told
   * to "enter the 6-digit OTP" should meet the same phrase where they land.
   *
   * Step 1 is the one line that could not carry over unchanged. The message
   * says "open the link and tap Sign in"; by the time this is being read the
   * link is open, and a step describing something already done reads as a step
   * that was somehow missed. So it names the button and where it is instead,
   * in the masthead's own word — see nav.signin.
   *
   * The heading is still "How it works", because the masthead links to it by
   * that name and a destination that repeats the link is how a visitor knows
   * they arrived. What changed under it is the answer, not the question. */
  'home.how': 'How it works',
  'home.howLede': 'Registering takes a mobile number and the code we send to it. There is no password, and no sign-up form to fill in first.',
  'home.step1': 'Tap Sign in',
  'home.step1Body': 'At the top of this page. The same button signs you in and creates your account, so there is nothing else to find first.',
  'home.step2': 'Enter your mobile number',
  'home.step2Body': 'Ten digits, with +91 already filled in. A 6-digit code goes to that number.',
  'home.step3': 'Enter the code',
  'home.step3Body': 'Type the six digits and you are in. If no message arrives, ask for the code on WhatsApp instead, or have us call and read it out.',
  'home.step4': 'Fill in your details',
  'home.step4Body': 'Your name, your certificate and where you study — one question at a time, and every answer is saved as you give it.',
  'home.step5': 'Upload your documents',
  'home.step5Body': 'Disability certificate, UDID card, income certificate and the rest. Once each, not once for every scholarship.',
  'home.step6': 'See your matches',
  'home.step6Body': 'My matches lists the scholarships you qualify for — and where one is closed to you, it says why.',
  'home.step7': 'Apply',
  'home.step7Body': 'Choose the ones you want. Your details and your documents go with the application.',

  /* Three reasons not to stop, level with the steps rather than under them.
   *
   * Each answers a different reason this audience abandons a sign-up: a
   * password to invent and then remember, a form standing between them and the
   * thing they came for, and not enough time today to finish. An answer that
   * arrives after the decision is worth nothing, which is the whole argument
   * for where they sit. */
  'home.assure': 'Good to know',
  'home.assure1': 'No password to remember',
  'home.assure2': 'No separate registration form',
  'home.assure3': 'You can stop and finish later',

  /* The helpline, in the one place on this page that asks somebody to do seven
   * things in a row. "Stuck on a step" rather than "contact us": a general
   * invitation to get in touch is not what a person halfway through a code
   * screen is looking for, and naming the trouble is what makes the number
   * findable at the moment it is needed. */
  'home.help': 'Stuck on a step?',
  'home.helpBody': 'Call and someone will take you through it.',
  'home.helpCall': 'Call {number}',

  'home.closing': 'Closing soon',
  'home.closingLede': 'Apply to these first.',
  'home.browse': 'Browse by',
  'home.browseWho': 'Who offers it',
  'home.browseLevel': 'Your level of study',

  'home.cta': 'Ready to see your matches?',
  'home.ctaBody': 'Creating an account takes a mobile number or an email address. Nothing else.',
  'home.ctaButton': 'Create an account',
  'home.signedInCta': 'See what you qualify for',

  /* --- the registration form ---------------------------------------------
   * One screen, three sections, nine questions. The copy carries the two
   * things the form's shape cannot: which answers are required, and why the
   * button at the bottom will not move until the code has been checked. */
  'reg.title': 'Register to find scholarships',
  'reg.editTitle': 'Update your details',
  /* True of every required question now, which it was not before.
   *
   * The sentence is the old one; what changed is that the star it promises is
   * actually on all eleven. It used to be on three — the two chip groups and
   * the programme picker, which draw their own labels — while the other eight
   * came from Field, which showed nothing and marked required for a screen
   * reader only. A sighted reader was told to look for a mark that most of the
   * required questions did not have, and could only read their silence as
   * optional. Field draws the star now, so adding a required field cannot
   * reintroduce that gap. */
  'reg.requiredNote': 'All fields marked with * are required.',

  'reg.personal': 'Personal details',
  'reg.disability': 'Disability details',
  'reg.education': 'Education details',

  'reg.name': 'Full name',
  'reg.namePlaceholder': 'Enter your full name',
  'reg.phoneHint': 'We send a 6-digit code to this number. The same number signs you in every time.',
  'reg.sendOtp': 'Send OTP',
  'reg.otpPlaceholder': 'Enter 6-digit OTP',
  'reg.verified': 'Phone number verified',
  'reg.verifyFirst': 'Verify your phone number to finish registering.',
  'reg.email': 'Email',
  'reg.emailHint': 'So we can send you a deadline reminder. We never share it.',
  'reg.emailPlaceholder': 'your.email@example.com',

  'reg.gender': 'Gender',
  'reg.genderHint': '(some scholarships are for women or transgender students only)',
  'reg.udid': 'UDID number',
  'reg.udidHint': 'The number on your UDID (Unique Disability ID) card.',
  'reg.udidPlaceholder': 'Enter your UDID number',
  'reg.certificate': 'Upload UDID certificate',
  'reg.certificateHint': 'PDF or image, 5 MB or smaller.',
  'reg.fileType': 'That file must be a PDF, a JPEG or a PNG.',
  'reg.fileSize': 'That file is larger than 5 MB. A photo taken on a phone is usually smaller if you scan it rather than photograph it.',
  /* Said instead of an error, because the profile did save. The registration
     is not undone by a certificate that has to be retried. */
  'reg.fileLater': 'You are registered, and your details are saved. The certificate did not upload — add it from My documents and nothing else needs doing again.',
  'reg.disabilityType': 'Disability type',
  'reg.selectAll': '(select all that apply)',
  'reg.percent': 'Disability percentage',
  'reg.percentHint': 'The figure on your certificate. Many scholarships need 40% or more.',
  'reg.percentPlaceholder': 'e.g. 40',
  'reg.percentRange': 'A certificate percentage is a whole number between 0 and 100.',

  'reg.state': 'State',
  'reg.statePlaceholder': 'Type to search your state…',
  'reg.program': 'Select your program',
  'reg.graduation': 'Graduation',
  'reg.postgraduation': 'Post-Graduation / Masters',
  'reg.year': 'Select year',
  'reg.yearAfterProgram': 'choose your program first',
  'reg.institution': 'School / College name',
  'reg.institutionPlaceholder': 'Enter your institution name',

  'reg.required': 'This one is needed.',
  'reg.fix': 'A few answers need attention. The first one is focused below.',
  'reg.cta': 'Register and find scholarships',
  'reg.saveChanges': 'Save changes',
  'reg.saving': 'Saving…',
  'reg.done': 'Registered. Finding your scholarships.',
  'reg.doneTitle': 'You are registered',
  'reg.already': 'Already registered?',
  'reg.login': 'Login with OTP',

  /* The masthead's account door, and the profile view's one button. */
  'nav.registerLogin': 'Register / Login',
  'profile.edit': 'Update your details',

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
