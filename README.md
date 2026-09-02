# Student portal and public site

The primary product. React + TypeScript + Vite, talking to the Go API in
`../backend`.

```bash
cd ../backend && make dev     # API + workers
npm run dev                   # this app, on :5173
```

Sign in as `asha@example.org` / `DevPassword123!`, or register a new account —
the verification code is written to the notification table, and `make audit` in
`../backend` will show it while `NOTIFY_ENABLED=false`.

## Two products, one design system

Table 4.1 of the report gives these separate briefs, and the split runs through
the whole app:

| | Brief |
|---|---|
| **Public site** | *"Determine whether help exists."* Plain language, large type, no authentication wall, multilingual |
| **Student portal** | *"Complete one task at a time without anxiety."* Linear and guided, one question per screen, a persistent "what happens next", no dense tables |

This is deliberately the opposite of `../admin`, which is dense and log-heavy.
Same tokens, same components, different product — which is §4.2's argument.

## Landing page and grid

`/` is a landing page, not a redirect to the directory. The directory answers
"what is on offer"; a visitor arriving from a printed notice or a forwarded
message is asking "is any of this for me", and Table 4.1 gives the public site
that job.

The order follows from it: search box above the explanation (somebody who
already knows what they want should not read a pitch first), a **real** count
from the same endpoint the directory uses, schemes closing soonest before ones
merely available, and the invitation to register last — after the answer.

No hero illustration. Every kilobyte is paid for by somebody on a metered
connection.

Scheme cards lay out in a `.card-grid` — `auto-fit` with a 20rem floor, so it
is one column on a phone, two on a tablet, three on a desktop, and back to one
at 200% text zoom without a media query. Still a `<ul>` with `role="list"`:
WebKit drops list semantics when `list-style` is `none`, and iOS Safari with
VoiceOver is a first-class platform here.

Directory filters live in the URL. A filtered directory is the thing people
forward to each other — "the three post-matric schemes open in Bihar" only
works as a link if the address carries the filters.

## Navigation

The bar carries the four places a student moves between while doing the thing
they came to do — find, matches, applications, documents. Everything else
(profile, data rights, the people helping them, language, colours) is account
business and lives behind one labelled `My account` control.

That split exists because the flat version did not survive contact with a
phone: seven destinations plus three controls in one wrapping row filled most of
the screen before any content, which is the opposite of "one task at a time
without anxiety".

It is a `<details>`, not a scripted menu — keyboard-operable, announces its own
state, works before JavaScript arrives. And not a hamburger: hiding the primary
destinations behind an unlabelled icon costs discoverability, and this audience
pays that twice.

**A visitor gets the same one control, and it is labelled in their own script.**
The language buttons and a 176px colour select used to sit open in the bar,
because a visitor has no account to put them behind. Six controls of equal
weight was the result, wrapping into three ragged rows on a phone and answering
nobody's question about which of them mattered. Both settings now live in one
menu — but its visible label is the current language's own code, `EN` or `हि`,
so the control a Hindi reader is looking for is written in the script they read.
A settings menu may hide the colour picker; it must never hide the language.

**The brand is a lockup: the mark over the name.** It read "Scholarships · For
students with disabilities" on one line — a generic product word, and a sentence
the page's own h1 repeats in larger type twenty pixels below. Stacked, the two
lines say whose site this is and what it does, and the block is still 48px tall,
so the bar did not grow to hold it. Below 22rem the name is clipped rather than
removed: the mark's `alt` is empty by design, so deleting the word would leave
the home link with no accessible name at all.

**Three zones, and the middle one is centred.** Identity on the reading edge,
destinations in the centre, the one action at the far edge. Grouping them fixed
the weight problem; centring the middle fixed what was left — the destinations
sat jammed against the brand with a third of a wide window empty before the
controls, which is what read as unfinished. The tagline drops out below 80rem
for the same reason: in the bar it is length without information, and length on
the left pushes the centre off centre.

**The bar says when it is stuck.** A 3px accent rule across the top, the same
accent that marks the current page and fills the one button, and a shadow that
appears once the document has scrolled under it — toggled from an
IntersectionObserver on a one-pixel sentinel rather than a scroll listener,
because the browser can report that crossing once instead of this doing
arithmetic on every frame of every scroll.

**The bar sticks, and is 64px tall so it can afford to.** Forty results down the
directory, the way back to anywhere was a scroll to the top. It sticks as one
block with the offline banner — two separately sticky elements both claimed
`top: 0` and one covered the other — and `#root` carries `min-height` rather
than `height`, or the bar's own containing block ends after one screen and it
scrolls away on exactly the long pages it exists for.

**The footer holds only what belongs to the footer, in three parts.** The
foundation and its own words on the reading side, its other accounts at the far
side, and the copyright notice centred under both — centred because it belongs
to neither column, being about the whole site rather than about the block above
it. The two columns of destinations and
the language switch came out: every place they pointed at is in the bar at the
top of every page, and a footer that repeats the navigation is a second copy to
keep in step — the day one drifts, the site is telling a student two different
stories about where a thing lives. The link groups were
pushed to the far edge, which on a wide monitor left a third of the band empty
down the middle and read as a layout that had failed rather than one that had
chosen.

**The social marks live in one list, and the files are imported rather than
linked.** `lib/social.ts` holds a name, a URL and an imported icon for each
account — Facebook, Instagram, YouTube, LinkedIn. The files sit in `web/asset/`,
which is **not** `web/public/`, and only the latter is served as-is: a
`src="/asset/social/facebook.svg"` 404s in development and never reaches the
build, which is exactly why the icons did not show at first. Imported, the
bundler resolves and fingerprints each one — all four are small enough that it
inlines them as data URIs, so the row costs no requests at all. A mark whose URL
is still blank is shown as a picture rather than a link; nothing here guesses an
address, because a wrong one points a student at somebody else's page. A guessed handle is a link
to somebody else's account, and the marks are inline SVG rather than five
requests to a sprite host that watches every visitor and shows empty boxes when
it is slow.

## Screens

| Route | Auth | What it does |
|---|---|---|
| `/check` | none | The eligibility check: the four states of Table 4.2 from answers nobody saved |
| `/partner` | none | Why an organisation would run a scheme here, shown rather than claimed, with a four-field enquiry |
| `/impact` | none | What the platform is carrying, counted from the open directory on load |
| `/scholarships` | none | The directory (FR-17). Faceted, and every scheme's criteria in plain sentences |
| `/scholarships/:slug` | none | One scheme in full, so somebody can decide before creating anything |
| `/register` · `/signin` | none | Mobile number **or** email, then a code (FR-01) |
| `/profile` | student | The wizard — one question per screen, resumable, drafts held locally |
| `/matches` | student | The four states of Table 4.2 (FR-04) |
| `/documents` | student | The vault: upload once, reuse everywhere, with expiry warnings |
| `/apply/:id` | student | UC-04 — consent, the document checklist, submit |
| `/applications` | student | What happens next, in words, before the history |
| `/my-data` | student | FR-19 and FR-20: who read your documents, what you shared, export and erasure |

## Decisions worth knowing

**The partner page argues by showing.** Every scholarship platform's partner
page opens with numbers — lives transformed, funds managed, esteemed partners —
and then lists services in the same voice. That works with a decade of numbers
behind it. This platform does not have them, and inventing them on the page that
asks funders for money would be the worst thing on the site. So the page does
what those pages cannot: it renders a real scheme card from the live directory
("your scheme, as a student meets it"), explains the four states a student
actually sees, and prints three counts read from the API two seconds earlier. It
also carries the two sections a claims page never has — what the platform asks of
a partner, and what it does not do. There is no application form: four fields
start a conversation, and the details a real application needs are collected once
there is something to apply for.

**English only.** Hindi was here from the start — Table 3.3 asks for it — and it
has been removed at the product's request: the toggle, the stored preference, the
`navigator.language` sniff, the Hindi halves of the vocabularies, and the reading
of `summary_hi` / `headline_hi` from the API. What is kept is the indirection:
every string is still looked up by key from one table in `lib/i18n-strings.ts`,
so the copy has one home a reviewer can read end to end, and a second language
is a table away rather than a rewrite of every screen. The API still returns
Hindi columns — they belong to the providers and the operators who write them,
and the admin panel still offers those fields — and this app simply does not read
them.

**The phone bar is four rows, and not sticky.** A visitor has four destinations
and three controls; a 144px lockup, a 92px settings control, a 63px login and an
85px register need 392px of a 350px row. So: identity and settings on the first
row, the destinations two-by-two on the next two, and the two actions last,
nearest the thumb — every label intact and every target still 48px. It stops
being sticky below 44rem, because four rows are affordable when they scroll away
and indefensible sitting on a third of a 640px screen for the whole visit.

**The public pages are two columns, because full width alone made them worse.**
Removing the 52rem cap gave the card grids room and left everything else hugging
the left edge — prose stops at 38rem by design, so a scheme page was three
full-width bands with their content in the first third. Each public page now has
a second column that earns its place: the landing page puts the schemes closing
soonest beside the pitch, a scheme page puts the award, the deadline, the
provider and the one action in a panel that sticks while the criteria scroll,
and the directory puts its filters in a sidebar that stays put instead of a band
that scrolled away the moment results began. All three collapse to one column
below 64rem, and the order they collapse into is deliberate: on a scheme page the
title and summary sit above both columns, so a phone reads the name of the thing
before what it pays.

**The landing page has one editable band.** Everything else on the public site
is compiled copy; the announcements between the hero and "How it works" are rows
written by platform staff in the admin panel (`GET /public/slides`). It carries
what is true only this fortnight — a closing date, a UDID camp, a helpline
closure — and each slide expires on its own date, because the failure mode of
every notice board is the notice nobody came back to take down. It rotates, and
does so under the conditions SC 2.2.2 requires: stopped on hover and on focus,
a visible pause control, never started at all under `prefers-reduced-motion`,
and never in a background tab.

**A slide may carry a picture, and it reverses a decision made here.** The rest
of this app ships no imagery on purpose — every kilobyte is paid for by somebody
on a metered connection — so the upload is capped at 500 KB, JPG and PNG only,
and its dimensions are recorded at upload and written onto the `<img>` so the
band holds its space instead of shoving the page down when the file lands. A
description is required by the API and by a database constraint, not by this
form: an undescribed image on a site whose whole audience has a disability is
not a cosmetic defect. Video is a link out, never a file we host — hosting it
would mean tens of megabytes a view and captions per language under SC 1.2.2.

**The answer comes before the account.** The public flow is check → find →
apply, and only the last step asks for a registration: `/check` posts answers to
`POST /public/eligibility-check`, which runs the same engine the matched list
uses and stores nothing. Pressing Apply on a result carries the scholarship
through registration in a `next` parameter (`lib/next.ts`), the profile wizard
opens pre-filled from the same answers (`lib/draft.ts`), and finishing it hands
the student to the scholarship they chose. The alternative order — nine
questions and a certificate before the first result — asks for twenty minutes
from somebody who does not yet know whether anything here is for them.

**One question per screen, and nearly all of them skippable.** The alternative —
a long form asking for a disability percentage, a family income and a UDID
number at once — is what makes people abandon. Only the name is required,
because an incomplete profile still matches some schemes, and blocking somebody
at question three over a certificate that is at home is how they never come
back.

**Drafts are written to the device before they are sent** (`lib/draft.ts`). The
realistic scenario is a phone on an intermittent connection, and losing eleven
answers to one failed request is how somebody stops using a platform for good.
Cleared as soon as the server has them, and namespaced per account so a shared
family device does not show one sibling's half-finished profile to another.

**BLOCKED is designed as an instruction, not a rejection.** The report calls it
the state carrying the greatest practical value, "since it converts an apparent
dead end into a specific, actionable task". So a blocked scheme shows one
sentence — *"Add your income certificate to check this"* — in the same visual
position as the Apply button on a scheme the student already qualifies for.

**Ineligible schemes are shown, last.** Hiding them leaves a student wondering
whether the platform simply missed something, and the disclosed reason is often
what tells them which certificate to chase for next year.

**Hindi and English** (`lib/i18n-strings.ts`), with the device language as the
first guess and a visible toggle. UI chrome only: anything that carries meaning
— a scheme's criteria, the reason an application was blocked — is written by the
API in the recipient's language and passes through untouched. Translating those
here would put two sources of truth in front of the one sentence a student most
needs to understand.

**No second factor for students.** Mandatory for staff (Table 3.3); extending it
here would be a lockout risk on shared family devices for exactly the people
this platform exists to reach, and a student's account holds their own data
rather than a tenant's applicant pool.

## Accessibility

The entire user base has a disability, so WCAG 2.2 AA is the floor rather than
the target.

- Base type is `1.0625rem` in **rem**, so the browser's own font-size setting —
  which a low-vision user has already configured — is respected. Nothing sets a
  fixed height on a container holding text, so 200% zoom does not clip.
- Targets are 48px, far above the 24×24 minimum (2.5.8), because the audience
  includes people with tremor operating a phone one-handed.
- Focus indicators are 3px, offset, defined once, and never removed.
- The four eligibility states carry a word **and** a distinct mark; colour is the
  third signal, never the only one.
- Async results speak through one live region. Approving, uploading and blocking
  are all silent without it.
- Real `<fieldset>`/`<legend>` and real radios, so a screen reader announces
  "3 of 21" and the arrow keys work.
- Contrast ratios are recorded beside each colour token in `styles.css`.
- The document `lang` attribute follows the language toggle — without it a
  synthesiser reads Devanagari with English phonetics.

Automated checks catch none of the interesting failures. Screen-reader testing
with NVDA and TalkBack is part of the report's definition of done and **has not
been done**.

## Colours

One palette, light. There is no dark theme and no colour setting in the bar —
the device's `prefers-color-scheme` is not consulted, and nothing is stored
about how the page should look.

Worth knowing what that costs, because the override used to be here and was
removed deliberately. Light sensitivity and photophobia make a dark ground far
easier to read for long, and both are common with migraine and with several of
the conditions the RPwD Act recognises. Astigmatism runs the other way. A single
light palette serves the second group and asks the first to use their operating
system's own inversion or a browser extension instead.

The tokens are in `styles.css`, each with its measured contrast ratio recorded
beside it. Nothing under 4.5:1 carries text anywhere, and no state is signalled
by colour alone: each of the four eligibility states pairs its colour with a
text label and an icon shape.

`npm run check:contrast` measures every foreground/background pair the UI uses
against 4.5:1 for text and 3:1 for control boundaries. It exists because the
ratios were originally hand-written into the CSS as comments and two of them
were wrong — a comment claiming 4.6:1 over a colour measuring 4.47:1 is worse
than no comment, because it looks like the check was done.

## Logo and launcher icons

Everything under `public/` that is an icon is **generated**, not committed by
hand:

```bash
python3 scripts/build-icons.py     # after replacing ../logo.png
```

Nine icons cut by hand drift — one gets re-exported at a different crop, another
keeps the old glow, and the set stops looking like one mark at exactly the sizes
where it matters most. The crops are measured from the artwork's own alpha
channel rather than eyeballed.

Two things about the source are worth knowing. Its background is genuinely
transparent, not the black it appears to be, so the mark composites onto the
page's white as readily as onto the near-black launch screen. And its tagline —
"Foundation for social good" — is set at `#d3d3d3`, about 1.6:1 on white, so it
is **cropped out** and set as real text in the footer instead: readable,
translatable to Hindi, and scaling with the reader's own font size.

The masthead carries the tree alone. The artwork stacks a tree over a wordmark
over a tagline, and at the 40px a masthead has to spare the lower two are
unreadable smudges; the full lockup is in the footer where there is room for it.

## Deployment

One container: the built bundle behind an nginx that also proxies `/api` to the
API, so the browser only ever sees one origin. That is the same arrangement
`npm run dev` uses and for the same reason — the refresh token is an HttpOnly
cookie scoped to `/api/{version}/auth`, and a second origin would mean CORS with
credentials on every call and a `SameSite=None` cookie.

```bash
docker compose up -d --build                       # build this repo and run it
docker compose pull && docker compose up -d        # run the published image

API_TARGET=https://api.example.org docker compose up -d
sh scripts/smoke-image.sh indicsign/sp-web:latest     # or: npm run check:image
```

Settings split by when they are read, and the two halves are not
interchangeable:

| Setting | Read | Why it has to be there |
|---|---|---|
| `VITE_API_VERSION` | at build | Vite substitutes `import.meta.env` into the bundle, so the version every request path is built from is fixed when the image is built. It cannot be changed on a running container. Must match `API_VERSION` on the server |
| `VITE_MSG91_WIDGET_ID`, `VITE_MSG91_TOKEN_AUTH` | at build | What phone sign-in needs, baked in the same way. Public by design — they identify the OTP widget and let it send a code; see `src/lib/otp.ts`, which also names the value that must NOT go here. Both or neither: a partial set initialises and then refuses to send, which reaches the student as a code that never arrives |
| `API_TARGET` | at container start | nginx's proxy target. Deliberately *not* baked in, so one image serves any environment. `scheme://host[:port]`; a trailing slash is stripped, a missing scheme is refused by name, and a path is prefixed to every proxied request and logged as such |

An image built with no MSG91 configuration is a legitimate thing to ship —
every public page works and sign-in reports that the deployment is not
configured, rather than failing silently. Wherever it *is* configured, the
domain the portal is served from must be listed against the widget in the MSG91
dashboard, or the widget refuses to initialise there and no code is ever sent,
no matter what was built in.

`API_TARGET` defaults to `http://api:8080` — the API's service name on the
platform stack's compose network, which is what makes the root compose file work
with no configuration. Deployed, it is the API's own address, and two things
about the container change with it:

- **DNS.** The name is resolved through `DNS_RESOLVER`, which is taken from the
  container's own `/etc/resolv.conf` — Docker's embedded DNS on a compose
  network, the platform's resolver anywhere else. Set it only to override that.
- **`Host`.** nginx sends the API's hostname upstream, not the browser's,
  because a deployed API is reached through something that routes on `Host`.
  The original travels as `X-Forwarded-Host`.

Two more settings exist for the places this gets deployed, and neither needs
touching under compose:

- **`PORT`.** Platforms that assign a port set it and route only to it. The
  image listens on what `PORT` names, or 80, and the `HEALTHCHECK` resolves the
  same value — `LISTEN_PORT` overrides both.
- **`LISTEN_IPV6`.** The container listens on IPv6 wherever the kernel has it.
  Set this empty on a host that reports IPv6 but has it administratively
  disabled, where binding `[::]` stops nginx from starting at all.

The API sets the refresh cookie `Secure` whenever `APP_ENV=production`, so the
portal must be served over HTTPS or the student is signed out by the first token
refresh — and reCAPTCHA needs a real origin in any case. Compose publishes on
loopback for that reason: something that terminates TLS belongs in front of this
container. It must also appear in the API's `HTTP_TRUSTED_PROXIES`, or every
visitor is rate-limited as one client — this container — and the audit trail
names it as the actor behind every request. On a portal open to the public that
limit is reached in minutes and locks everybody out at once.

Unlike the admin panel's image, this one serves deep links: every screen has a
real URL, so `/scholarships/:slug` must reload as the app rather than 404. That
is `try_files $uri $uri/ /index.html` in `nginx.conf.template`, and the smoke
test asserts it — a shared link that 404s is the classic broken single-page
deployment, and on a public site it is also every poster and WhatsApp message
anybody has sent.

`.env.example` documents every setting; compose reads `.env` from this directory.

### CI

`.github/workflows/web.yml` — at the root of the platform repository, not in
this directory, because Actions only reads workflows from a repository root —
runs **check → image → publish**:

| Stage | Does | Runs on |
|---|---|---|
| `check` | eslint, `tsc -b`, the Vite build, and keeps `dist/` as an artifact | everything |
| `image` | builds the image with its defaults, starts it, and runs `scripts/smoke-image.sh` against it | everything |
| `publish` | rebuilds with the production version, address and MSG91 widget, re-runs the smoke test, pushes `:{sha}` and `:latest` to Docker Hub | `main` |

Only `publish` names the `production` environment. That is deliberate: a job
naming a protected environment waits for its reviewers, so keeping it out of the
first two stages means a pull request gets full lint, build and container
feedback without anybody being asked to approve anything, and the approval sits
where it belongs — on the push.

It is triggered only by changes under `web/` (and to the workflow itself), so a
change to `org/` or to a vendored copy of `admin/` does not republish the
portal. Everything the build needs stays here in `web/`: the workflow sets
`working-directory: web` and builds `./web` as its Docker context, so
`docker build .` in this directory does exactly what CI does.

The environment (Settings → Environments → production) holds:

| Secret | Used for |
|---|---|
| `DOCKER_USERNAME` | the registry login, and the image namespace |
| `DOCKER_PASSWORD` | an access token with **Read & Write** scope. A read-only token logs in successfully and then fails on push |
| `VITE_API_VERSION` | the build argument above |
| `VITE_API_TARGET` | the address baked in as the image's default `API_TARGET` |
| `VITE_MSG91_*` | the two sign-in values, both or neither |

The first two are checked before anything is built, because both fail quietly:
an empty `VITE_API_VERSION` overrides the Dockerfile's default with an empty
string and ships a portal calling `/api/`, and an address without a scheme is a
target nginx rejects. The two MSG91 values are counted rather than validated —
neither is a warning and the build goes ahead, one of the two is an error. The image is
pushed as `${DOCKER_USERNAME}/sp-web`; set the repository **variable**
`IMAGE_NAME` to `namespace/name` for an organisation-owned image, where the
pushing account and the namespace are different names.

The smoke test is a script rather than a list of workflow steps so that a failed
publish is reproducible with one command. It asserts what a broken build of this
image actually looks like — none of which is a build failure: the config
template rendered with the address it was given, an address nginx would reject is
refused by name at start-up, the bundle calls the API version and carries the
OTP widget it was built for, a deep link reloads as the app rather than a
404 while a root-level file is still served rather than swallowed by that rule,
`/api` is proxied rather than answered by the app, a missing fingerprinted asset
is a 404 rather than HTML served where JavaScript was asked for, and a
platform-assigned `PORT` moves both the listen directive and the socket that
answers.

## Checks
```bash
npm run check:responsive   # every layout reflows to 320px (WCAG 2.2 SC 1.4.10)
```

320px is not an arbitrary phone width — it is what a 1280px desktop becomes at
400% zoom, so one check covers the cheapest Android in portrait and a magnified
laptop at once. It reads grid floors, min-widths and inline `minWidth` styles
and fails the build if any of them force horizontal scrolling. Container
context is declared in `tools/check-responsive.py`; a selector with a new
parent needs its entry updated, and an unlisted one is reported as unverified
rather than passed.


```bash
npm run lint
npm run build
npm run check:routes    # every path this app calls exists on the API
npm run check:image     # the built container actually serves the portal
```

`check:contrast` and `check:responsive` read `../tools/`, which belongs to the
platform tree rather than to this repository, and `check:routes` needs the API
running (`cd ../backend && make dev`). CI runs neither for those reasons; it
runs `check:image`, as `scripts/smoke-image.sh`.

## Not built yet

Grievances (FR-18 — the API is there), the guardian/assisted-user flow, bank
details for disbursement, and offline submission queueing. Drafts survive a lost
connection; a *submission* made while offline currently fails rather than
queueing.
