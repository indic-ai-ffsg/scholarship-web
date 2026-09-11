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
  'public.filter.qualification': 'Qualification',
  'public.filter.state': 'Your state',
  'public.filter.provider': 'Who offers it',
  'public.filter.any': 'Any',
  /* Each filter says "any what", because "Any" four times over a column of
     dropdowns tells a reader nothing about which one they are looking at. */
  'public.filter.anyDisability': 'Any disability',
  'public.filter.anyQualification': 'Any qualification',
  'public.filter.allStates': 'All states',
  /* The three filters added on 2026-09-10. "Course" rather than "Subject"
     because that is the word on the sponsors' own pages, and "Where you study"
     rather than "Country" because the choice is India or abroad rather than a
     list of countries — the platform lists no scheme by the country it sends a
     student to. */
  'public.filter.gender': 'Gender',
  'public.filter.anyGender': 'Any gender',
  'public.filter.course': 'Course',
  'public.filter.anyCourse': 'Any course',
  'public.filter.where': 'Where you study',
  'public.filter.anyWhere': 'India or abroad',
  'public.filter.inIndia': 'In India',
  'public.filter.abroad': 'Study abroad',
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
  /* The two states the old two-way split had no words for. "Closing soon" was
     shown for both, and for a scheme that had already closed it was an
     invitation to apply for something nobody can. */
  'public.closesToday': 'Closes today',
  'public.closed': 'Closed',
  'public.award': 'Award',
  'public.renewable': 'Can be renewed each year',
  'public.offeredBy': 'Offered by',

  /* The row card's two section labels, and the sketch's own words.
   *
   * "Eligibility" rather than the scheme page's "Who this is for": on a page of
   * forty rows the label is a column header the eye returns to, and a
   * four-word phrase repeated forty times reads as prose rather than as a
   * heading. The long form stays on the detail page, where there is one of it
   * and it is addressing the reader. */
  /* A lead-in, not a label. "Eligibility" is a filing category — it names the
     kind of information below it and tells the reader nothing they did not
     already know from looking at it. "To be eligible" starts the sentence the
     criteria finish, so the eye goes into the rules rather than past a heading.

     It stops there rather than at "To be eligible, an applicant must:", and the
     schema is the reason. eligibility_rule.description_en carries its own
     instruction (backend 0005):

         "Shown verbatim to the student when the rule is the reason they failed,
          so it must read as a sentence, not as a predicate."

     So a criterion is "This scheme needs a certified disability of 40% or
     more." — a whole sentence, deliberately, because the matcher also prints it
     as the reason somebody was blocked. Hang "an applicant must:" in front of
     that and it reads "an applicant must this scheme needs", and it would do so
     for every scheme on the site, forever, because the sentence form is a
     requirement of the column rather than a habit of one operator. The lead-in
     has to be one that any sentence can follow. */
  'public.eligibility': 'To be eligible',
  'public.benefits': 'Benefits',
  /* Offered only when the criteria are actually cut off — see ListingCard.
     A "Read more" under a rule set that is already complete is a promise of
     something more that the next page does not have. */
  'public.readMore': 'Read more',
  'public.viewDetails': 'View details',
  /* Distinct from 'match.apply' ("Apply"), which sits alone in a panel where
     the scheme is the only subject. Here it is one of two buttons in a rail
     repeated down the page, and the pair has to differ at a glance: "View
     details" reads, "Apply now" acts. */
  'public.applyNow': 'Apply now',
  /* What a visitor without an account sees where "Apply now" would be.
   *
   * Says what the press does. It used to say "Apply now" for everybody, and
   * for a visitor that was a button that lies: /apply is behind a guard, so the
   * press ended at a sign-in screen they had not asked for and had not been
   * warned about. Naming the step costs nothing and removes the surprise. */
  'public.registerToApply': 'Apply',
  'public.registerToApplyHelp': 'Applications are made through your account. Registering also shows you every other scholarship you qualify for.',
  /* Named separately from the closed deadline badge. The badge says when, this
     says what it means for the button that is no longer there. */
  'public.closedNote': 'This scheme is closed',

  /* The panel over the directory.
   *
   * "Close" rather than "Back": it is not a place the reader travelled to, and
   * calling it back would suggest the list is somewhere else. */
  'sheet.close': 'Close',
  'sheet.loading': 'Scholarship details',
  /* The way out of the panel to a real address, for somebody who wants to
     forward, bookmark or print the scheme. A panel has no URL of its own to
     copy, so the offer has to be explicit. */

  /* The panel's sections, from backend 0027's columns.
   *
   * Headed as the questions a student asks rather than as the column names an
   * operator filled in: "What you get" over benefit_description, "How to apply"
   * over application_process. The admin panel may call them what it likes; this
   * side of the wall is written for somebody deciding whether to spend an
   * afternoon on a form. */
  /* The two column headers on the benefits table. "Component" is the sponsor's
     own word for a line of their award — tuition, maintenance, books — and
     "What the student gets" is deliberately not "Amount": the column holds
     "₹1,200 a month for hostelers, ₹650 for day scholars" as often as a figure,
     and a header reading Amount makes that look like bad data. */
  'public.benefitComponent': 'Component',
  'public.benefitAmount': 'What the student gets',
  'public.whatYouGet': 'What you get',
  /* Distinct from 'public.whoFor', which heads the criteria list on the same
     panel. That is the rule set the matcher evaluates; this is the sponsor's
     own prose about it, and where both exist the reader needs to know they are
     not being shown the same thing twice. */
  'public.eligibilityDetail': 'Eligibility in detail',
  'public.documentsRequired': 'Documents required',
  'public.documentsHelp': 'The provider asks for these. You do not upload them here.',
  'public.howToApply': 'How to apply',
  'public.importantNotes': 'Worth knowing',
  'public.academicYear': 'For the year',
  'public.awardBasis': 'Awarded on',
  /* The five values of the award_basis enum (backend 0027), in the words a
     student would use. "Merit cum means" is the phrase every Indian scheme
     prints, so it is kept rather than translated into something clearer that
     nobody would recognise from the notice they are holding. */
  'public.basis.MERIT': 'Merit',
  'public.basis.NEED': 'Financial need',
  'public.basis.MERIT_CUM_MEANS': 'Merit cum means',
  'public.basis.CATEGORY': 'Category',
  'public.basis.OTHER': 'Other',
  'public.cta': 'Find scholarships for you',
  /* Under the Apply button on a scheme page, for somebody who has an account.
     It says the press is safe: the next screen checks the profile and the
     documents and names anything missing, so pressing Apply is not the same as
     sending an application. */
  /* Under the Apply button for a scheme the platform lists but does not run.
     Says plainly that the application is not ours to receive, so a student who
     later cannot find it under "My applications" knows why. */
  /* The off-site button, and it says so in the label.
   *
   * This was "Apply", on the argument that the sentence beneath it carried the
   * explanation and a longer label wrapped to two lines at .wide on a phone.
   * The first half of that turned out not to be true: applyExternalHelp was
   * defined and rendered nowhere, so on the directory card and in the scheme
   * panel the external branch drew `public.applyNow` — the identical label to
   * the internal one — with an arrow and nothing else. Two buttons reading
   * "Apply now", one of which files an application here and one of which hands
   * the student to a stranger's website, told apart by a glyph.
   *
   * So the destination goes in the label, where it cannot be left unrendered,
   * and the sentence is now actually drawn beneath it. "their site" and not the
   * sponsor's name: the name is already on the card twice, Indian scheme
   * sponsors run to "Department of Empowerment of Persons with Disabilities",
   * and a button that reflows to four lines on a 320px screen is its own
   * accessibility problem. Checked at 320px rather than assumed — it holds one
   * line at .wide and wraps to two in the card rail, which is what the arrow
   * and the help line are there to make sense of. */
  'public.applyExternal': 'Apply on their site',
  /* Two sentences for two relationships, and the difference is not pedantic.
   *
   * A CURATED listing is a scheme we found and wrote down for a body that has
   * never heard of us. A TENANT one applied for off-site is a partner with an
   * account, a logo and a contact here who takes applications on the portal
   * they have run for years. Telling a student "we only list this one" about an
   * organisation that is right here is wrong, and it is the kind of wrong a
   * publisher notices about their own scheme. */
  'public.applyExternalHelp': 'We list this scholarship so you can find it. {org} runs it and takes applications on their own website, so it will not appear under your applications here.',
  'public.applyExternalHelpPartner': '{org} takes this application on their own website, so it will not appear under your applications here.',
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

  /* One heading for both, because it is one screen: the number is asked for
     first and the flow only then knows whether it belongs to an account. */
  'auth.title': 'Sign in or sign up',
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
  /* Three ways to receive the code, and three confirmations that name the one
     used. "Sent." alone cannot tell a student whether their choice of WhatsApp
     took effect, which leaves them watching the wrong app. */
  'auth.viaSms': 'Send by SMS',
  'auth.viaWhatsapp': 'Send on WhatsApp',
  'auth.viaVoice': 'Call me with the code',
  'auth.resentVia.sms': 'Sent by SMS. It can take a moment to arrive.',
  'auth.resentVia.whatsapp': 'Sent on WhatsApp. Check WhatsApp for the message.',
  'auth.resentVia.voice': 'Calling you now with the code. Answer to hear it.',
  /* A number to wait against, not a refusal: the three channels stay pressable
     the whole time it runs. "in 30s" is the point at which trying again is
     worth it, not the point at which it becomes allowed. */
  'auth.resendIn': 'Send it again in {n}s',
  'auth.changeNumber': 'Use a different number',

  'profile.complete': '{n}% complete',
  /* The profile review screen. "Change" rather than "edit": the student is not
     editing a record, they are correcting something that has changed. */
  'profile.viewLede': 'Everything you have told us. Change any answer and it is used for every scholarship from then on.',
  'profile.notAnswered': 'Not answered yet',
  'profile.verified': 'Verified',
  'profile.continue': 'Continue where you left off',
  'profile.start': 'Start your profile',
  'profile.saved': 'Saved',

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
  /* The same promise for a scheme that asks for no documents, which is
     ordinary — the sentence above interpolated an empty list and read
     "needs to make a decision: ." */
  'apply.consentBodyNoDocs': 'They will see only what this scholarship needs to make a decision, and nothing else. You can see who looked at your details at any time.',
  'apply.submit': 'Send my application',
  'apply.submitting': 'Sending…',
  'apply.blocked': 'You cannot apply yet',
  'apply.needProfile': 'Your profile comes first',
  'apply.needProfileHint': 'An application is sent from your profile, so we need that before you can apply. It takes a few minutes, and anything you have already told us is filled in.',
  /* The handoff page, and it is a page rather than a warning.
   *
   * These two used to sit inside a Notice \u2014 a bordered interruption panel, in
   * the place a form should have been, using the same component the portal uses
   * to say a submission was blocked. A student who pressed Apply and met that
   * had been told, in the portal's own vocabulary for problems, that their
   * application had gone wrong. It had not; this is simply how most of the
   * money in this catalogue is given away.
   *
   * So the title states what happens next instead of leading with what cannot
   * happen here, and the body's last sentence is the reassurance rather than
   * the caveat. */
  'apply.elsewhereTitle': 'This one is applied for on the sponsor\u2019s website',
  'apply.elsewhereBody': 'We list this scholarship so you can find it, and the sponsor takes the applications themselves. Everything you have told us stays saved, and it is already filled in for the scholarships we do run.',
  /* The partner version. Saying "we only list this one" about an organisation
     that has an account, a logo and a contact here is wrong, and it is the kind
     of wrong the publisher notices about their own scheme. */
  'apply.elsewhereBodyPartner': 'This scholarship is run here, but the sponsor takes the applications on their own website. Everything you have told us stays saved, and it is already filled in for the scholarships we receive directly.',

  /* Taking the documents along.
   *
   * The one part of an external application the platform can actually make
   * easier. The sponsor's form will ask for four certificates that are already
   * here and verified, and without this the student photographs them all again
   * on a phone \u2014 which is both slower and how an unreadable scan reaches a
   * scholarship office. */
  'apply.bundleTitle': 'Take your documents with you',
  'apply.bundleBody': 'We can put the documents this scholarship asks for into one file, ready to upload on their website. It also lists anything they want that we do not have yet.',
  'apply.bundleAction': 'Download my documents',
  'apply.bundleWorking': 'Getting them ready\u2026',
  'apply.bundleDone': 'Your documents have been downloaded.',
  'apply.docs': 'Documents this scholarship needs',

  'appl.title': 'Your applications',
  'appl.none': 'You have not applied to anything yet',
  'appl.noneHint': 'Look at your matches to find scholarships you qualify for.',
  'appl.reference': 'Reference',
  'appl.whatNext': 'What happens next',
  'appl.history': 'History',
  'appl.needsYou': 'They need something from you',

  /* The four steps of the track. Named for what is happening rather than for
     the workflow state — "Checks" covers DOCUMENT_CHECK and VERIFIED, which are
     one wait to the person waiting. */
  'track.label': 'Progress of this application',
  'track.sent': 'Sent',
  'track.checks': 'Checks',
  'track.review': 'Review',
  'track.decision': 'Decision',
  /* Read out after each step's name, so the state is a word and not only a
     shape and a colour. */
  'track.doneSr': 'done',
  'track.currentSr': 'in progress now',
  'track.todoSr': 'not started',

  'appl.sentOn': 'Sent {when}',
  'appl.decidedOn': 'Decided {when}',
  /* Said plainly, and not dressed up. A refusal that arrives as "Update on your
     application" makes somebody read three lines to find out, and they will
     read those three lines every time they open this page. */
  'appl.outcomeApproved': 'Awarded',
  'appl.outcomeRejected': 'Not awarded this time',
  'appl.outcomeWithdrawn': 'You withdrew this',
  'appl.inProgress': 'With the provider',

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
   * in the masthead's own word — which is nav.registerCta, "Register".
   *
   * It said "Tap Sign in" until the masthead became two buttons. There is no
   * "Sign in" up there to tap any more, and a walkthrough naming a control that
   * is not on the screen is worse than no walkthrough: the reader assumes they
   * are on the wrong page. Both buttons are named now, because the pair is the
   * one thing a visitor has to choose between before anything else happens.
   *
   * The heading is still "How it works", because the masthead links to it by
   * that name and a destination that repeats the link is how a visitor knows
   * they arrived. What changed under it is the answer, not the question. */
  'home.how': 'How it works',
  'home.howLede': 'Registering takes a mobile number and the code we send to it. There is no password, and no sign-up form to fill in first.',
  'home.step1': 'Tap Register',
  /* No longer "the same button signs you in and creates your account" — that
     was true of the single Register / Login control and false of the two that
     replaced it. */
  'home.step1Body': 'At the top of this page. If you have been here before, use Login beside it — the same number works either way.',
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

  /* Two headings, because the list is "the three closing soonest" and that is
   * not the same claim as "closing soon".
   *
   * It said "Closing soon / Apply to these first" whatever the dates were, and
   * on a directory whose nearest deadline is twelve days out that is false
   * urgency — with every row underneath it showing a green tick and "Closes in
   * 12 days", which is the panel contradicting itself in the same glance. The
   * urgent pair is used only when something in the list actually is urgent;
   * otherwise the panel says what it is, which is a list of dates.
   *
   * Worth stating plainly: manufactured urgency is a dark pattern anywhere, and
   * on a site whose readers are deciding whether to spend twenty minutes on a
   * form they may not qualify for, it costs trust that is not cheap to get
   * back. */
  'home.closing': 'Closing soon',
  'home.closingLede': 'Apply to these first.',
  'home.closingNext': 'Next deadlines',
  'home.closingNextLede': 'The three closing soonest.',
  /* Its own label, because "Browse all scholarships" already sits in the hero
     four hundred pixels away, pointing at the same page. Two identical buttons
     on one screen read as two different things that happen to share a name. */
  'home.allDeadlines': 'See all scholarships',
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
  /* Two doors, two buttons — see the note at the call site in Layout.
   *
   * "Register" and "Login" rather than "Sign up" and "Sign in": the two words
   * differ in every letter. The in/up pair differs in two, and the note on
   * nav.signin above already records that as a known confusion for readers with
   * dyslexia, having chosen familiarity over distinctness at the time. Split
   * into two adjacent controls the distinctness is worth more — they are now
   * read against each other, an inch apart. */
  'nav.registerCta': 'Register',
  'nav.loginCta': 'Login',
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
