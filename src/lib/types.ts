/* The slice of the API contract this portal uses. */

export interface Envelope<T> {
  data: T
  meta?: { page: number; page_size: number; total: number; has_more: boolean }
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
    request_id?: string
  }
}

export interface Context {
  role: string
  organisation_id?: string
  profile_id?: string
}

export interface LoginResult {
  token: {
    access_token: string
    token_type: string
    expires_in: number
    expires_at: string
  }
  contexts: Context[]
  active_context: Context
  /** Students are not required to hold a second factor; staff are. */
  mfa_required?: boolean
  language?: string
}

export type EligibilityState = 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'BLOCKED' | 'NOT_ELIGIBLE'

/** One reason behind a classification, already written for the student to read. */
export interface Reason {
  field: string
  message: string
  document?: string
  expected?: string
  actual?: string
  recoverable: boolean
}

/* Enough of a Listing to draw a panel before the full one arrives.
 *
 * The sheet opens from a row that is already on screen, and the whole reason it
 * opens in place is that there is no wait between the press and the content. So
 * it renders from whatever the list already had and lets the detail request
 * fill in the rest.
 *
 * Which fields "the rest" covers depends on which list you came from: the
 * directory's rows are Listings and carry everything, a matched row carries
 * what the matcher needed and not `tags`, `opens_at` or `is_renewable`. Naming
 * the identifying half as required and the rest as optional is what lets one
 * panel take a seed from either without either list inventing a value it does
 * not have.
 */
export type SchemeSeed =
  & Pick<Listing,
    'scholarship_id' | 'slug' | 'title' | 'summary'
    | 'organisation_name' | 'org_type' | 'currency'>
  & Partial<Listing>

export interface Match {
  scholarship_id: string
  slug: string
  title: string
  summary: string
  organisation_name: string
  org_type: string
  /* Whose mark to draw, when there is one. Absent for a curated listing, which
     has no organisation row — its logo hangs off the scholarship instead, and
     the absence is what tells OrgMark which address to ask. */
  organisation_id?: string
  /* Absent when the award is not money â a laptop, a bicycle, fees paid
     directly. `benefit_summary` says what it is instead; see format.awardLabel.
     A NULL here crashed the whole directory once, so it is a pointer on the
     server and optional here rather than coalesced to 0: "₹0" on a
     scholarship card is worse than saying nothing. */
  award_amount?: number
  benefit_summary?: string
  currency: string
  /* Both optional since backend 0043: a curated listing is allowed to have no
     window, and the directory now shows those rather than hiding them. Absent
     means open-ended â NOT closing today, which is what a 0 would read as. */
  closes_at?: string
  days_remaining?: number
  /* Where pressing Apply on this card goes (backend 0054).
   *
   * This payload had neither, and the matched list is where their absence cost
   * the most: MatchCard drew one button, `/apply/:id`, for every scheme the
   * student was eligible for. For one applied for off-site that button led to
   * the internal form, which answers with a panel explaining that no
   * application can be made here — so a student's own matched list handed them
   * a door onto a refusal, and read as a student reads it, that is an
   * application that failed.
   *
   * listing_kind is deliberately absent. A card has one line for the sponsor
   * and it already carries the name; whether we hold an account for them is
   * about our contracts, not this student's next step. */
  apply_mode?: 'INTERNAL' | 'EXTERNAL'
  external_url?: string
  state: EligibilityState
  score: number
  missing?: Reason[]
  failures?: Reason[]
  unverified?: Reason[]
  /** The single thing to do about this scheme. */
  next_action?: string
  already_applied: boolean
  application_id?: string
}

export interface Listing {
  scholarship_id: string
  slug: string
  title: string
  summary: string
  summary_hi?: string
  description?: string
  description_hi?: string
  organisation_name: string
  org_type: string
  /* Absent when the award is not money â a laptop, a bicycle, fees paid
     directly. `benefit_summary` says what it is instead; see format.awardLabel.
     A NULL here crashed the whole directory once, so it is a pointer on the
     server and optional here rather than coalesced to 0: "₹0" on a
     scholarship card is worse than saying nothing. */
  award_amount?: number
  /* The spread, when the scheme states one (backend 0047, carried by 0049).
   *
   * "₹20,000 to ₹2,00,000 depending on the course" is the ordinary case on a
   * government notice. award_amount stays the one comparable figure — it is
   * what the server sorts and filters on — and these describe the range around
   * it. A listing may carry either, both or neither; see format.awardLabel,
   * which prefers the range when both ends are present. */
  award_amount_min?: number
  award_amount_max?: number
  benefit_summary?: string
  currency: string
  is_renewable: boolean
  /* Where the student actually applies, and whether it is here.
   *
   * Three fields for two questions, and keeping them apart is the whole of
   * backend 0054:
   *
   *   apply_mode    INTERNAL or EXTERNAL. Where a press ends up. This is the
   *                 one to branch a button on, and lib/apply.ts is the only
   *                 place that should read it.
   *   listing_kind  TENANT or CURATED. Whether we hold an account for the
   *                 sponsor. It decides which explanatory sentence is true, and
   *                 nothing else on this payload.
   *   external_url  The sponsor's own page, guaranteed present whenever
   *                 apply_mode is EXTERNAL (scholarship_apply_destination).
   *
   * listing_kind used to carry both meanings, and the site read it for the
   * destination because for the two shapes that existed the answers happened to
   * agree. A TENANT scheme may now be EXTERNAL — an organisation here that
   * takes applications on its own portal — and for that one the kind says
   * TENANT and the door is still off-site.
   *
   * All optional because a cached or older API response will not have them.
   * lib/apply.ts states the fallbacks and why they lean towards internal. */
  external_url?: string
  listing_kind?: 'TENANT' | 'CURATED'
  apply_mode?: 'INTERNAL' | 'EXTERNAL'
  opens_at: string
  /* Both optional since backend 0043: a curated listing is allowed to have no
     window, and the directory now shows those rather than hiding them. Absent
     means open-ended â NOT closing today, which is what a 0 would read as. */
  closes_at?: string
  days_remaining?: number
  slots_available?: number
  tags: string[]
  criteria?: string[]

  /* The sponsor's mark, when they have uploaded one (backend 0028, carried by
   * 0048). A path on the API, not a full URL — see api.assetUrl.
   *
   * The dimensions are the reason the whole set travels together: they let a
   * card reserve the box before the bytes land, which is what stops fifty rows
   * reflowing as fifty logos arrive. Rendering an <img> without them undoes the
   * point of the server sending them. */
  logo_url?: string
  logo_alt?: string
  logo_width?: number
  logo_height?: number

  /* --- the detail response only ---------------------------------------------
   *
   * Every field below arrives from GET /public/scholarships/{slug} and is
   * absent from the directory's list response, deliberately: they are
   * paragraphs, and fifty of them would be sent to render fifty cards that have
   * no room for any of it.
   *
   * So a component holding a Listing that came out of the directory must treat
   * these as missing rather than as empty — which is what SchemeSheet's
   * `detail ?? seed` is for. The row opens the panel instantly with what the
   * list gave it, and these fill in a moment later.
   *
   * All written by an operator in the admin panel against backend 0027's
   * columns; the platform does not compose any of them. */
  academic_year?: string
  award_basis?: 'MERIT' | 'NEED' | 'MERIT_CUM_MEANS' | 'CATEGORY' | 'OTHER'
  /** The full terms of the award, where benefit_summary is the one-line form. */
  benefit_description?: string
  /** The rules restated as prose. Does not replace `criteria`, which decides. */
  eligibility_summary?: string
  /* What the sponsor will ask for. Free text rather than the platform's own
     document vocabulary, and backend 0027 says why: for a curated listing there
     is no upload and no workflow here, and real schemes ask for things outside
     our list ("caste validity certificate"). Showing these as though they were
     uploads the platform collects would be a promise nothing keeps. */
  documents_required?: string[]
  application_process?: string
  /** Deadlines that are not the deadline, quotas, the year it was suspended. */
  important_notes?: string
}

export interface Facet { value: string; label: string; count: number }

/* One announcement on the landing page, written by the platform in the admin
 * panel. Both languages arrive together â the response is identical for every
 * caller and therefore cacheable â and a slide with no Hindi falls back to the
 * English text rather than disappearing for half the audience. */
export interface Slide {
  slide_id: string
  headline_en: string
  headline_hi?: string
  body_en?: string
  body_hi?: string
  link_url?: string
  link_label_en?: string
  link_label_hi?: string
  /* The picture, when the slide has one. The address carries a version, so a
   * replacement is fetched rather than served from yesterday's cache, and the
   * dimensions are what let the page hold the space before the bytes land. */
  image_url?: string
  image_alt_en?: string
  image_alt_hi?: string
  image_width?: number
  image_height?: number
  /** A link out to a video. The platform hosts none. */
  video_url?: string
  position: number
}

/* --- an anonymous eligibility result ----------------------------------------
 *
 * The screen that rendered these has been removed. The type and the endpoint
 * behind it stay: /public/eligibility-check is still served, and the four
 * states are still the product's vocabulary, so a future caller has something
 * to decode into rather than a shape to reinvent.
 *
 * The same four states a signed-in student sees, computed from answers that
 * were never saved anywhere (FR-17). Field-compatible with Match wherever the
 * two overlap, because one card component renders both â what is absent is what
 * a visitor has no account to have: whether they already applied. */
export interface CheckedScheme {
  scholarship_id: string
  slug: string
  title: string
  summary: string
  summary_hi?: string
  organisation_name: string
  org_type: string
  /* Absent when the award is not money â a laptop, a bicycle, fees paid
     directly. `benefit_summary` says what it is instead; see format.awardLabel.
     A NULL here crashed the whole directory once, so it is a pointer on the
     server and optional here rather than coalesced to 0: "₹0" on a
     scholarship card is worse than saying nothing. */
  award_amount?: number
  benefit_summary?: string
  currency: string
  /* Both optional since backend 0043: a curated listing is allowed to have no
     window, and the directory now shows those rather than hiding them. Absent
     means open-ended â NOT closing today, which is what a 0 would read as. */
  closes_at?: string
  days_remaining?: number
  state: EligibilityState
  score: number
  missing?: Reason[]
  failures?: Reason[]
  unverified?: Reason[]
  next_action?: string
}

export interface CheckResult {
  results: CheckedScheme[]
  /** How many landed in each state, keyed by the state's own name. */
  counts: Partial<Record<EligibilityState, number>>
  /** How many open schemes were checked, so the page can say what it checked. */
  considered: number
  /** How many questions were answered, so a thin answer can explain itself. */
  answered: number
}

export interface Step {
  field: string
  label: string
  weight: number
  message: string
}

export interface Profile {
  profile_id: string
  user_id: string
  full_name: string
  date_of_birth?: string
  gender?: string
  disability_type?: string
  disability_percent?: number
  udid_number?: string
  course_level?: string
  course_name?: string
  institution_id?: string
  institution_name?: string
  admission_year?: number
  current_year?: number
  academic_percentage?: number
  annual_family_income?: number
  social_category?: string
  address_line?: string
  district?: string
  state_code?: string
  pincode?: string
  completeness_score: number
  verified_fields: string[]
  /** What to fill in next, ordered by how many schemes each field unlocks. */
  next_steps?: Step[]
}

export interface Verification {
  verification_id: string
  status: string
  verified_by_organisation?: string
  evidence_considered: string
  valid_from: string
  valid_until: string
  is_live: boolean
  days_to_expiry: number
}

export interface Document {
  document_id: string
  doc_type: string
  status: string
  original_name: string
  size_bytes: number
  uploaded_at: string
  verification?: Verification
}

export interface RequiredDocument {
  doc_type: string
  label: string
  needs_verification: boolean
  document_id?: string
  verification_id?: string
  satisfied: boolean
  reason?: string
}

export interface Application {
  application_id: string
  reference_code: string
  /* Which scheme it is for. On the wire since the endpoint existed; declared
     now because the directory reads it to decide whether a row offers Apply or
     the application itself. */
  scholarship_id?: string
  scholarship_title?: string
  /* Whose scheme it is. Already on the wire and simply not declared here —
     the list uses it to fetch the sponsor's mark from
     /public/organisations/<id>/logo, which needs no other field. */
  organisation_id?: string
  organisation_name?: string
  award_amount?: number
  current_state: string
  state_label: string
  submitted_at?: string
  decided_at?: string
  decision_reason?: string
  info_request_note?: string
  available_actions?: { to: string; label: string; requires_reason: boolean }[]
}

export interface TimelineEvent {
  event_id: string
  from_state?: string
  to_state: string
  label: string
  actor_organisation?: string
  is_system: boolean
  reason?: string
  created_at: string
}

export interface Summary {
  profile_id: string
  completeness_score: number
  matches: { eligible: number; likely_eligible: number; blocked: number }
  applications: { draft: number; in_progress: number; approved: number; rejected: number }
  total_received: number
  total_sanctioned: number
  documents_verified: number
  documents_expiring_soon: number
}

export interface AccessEntry {
  accessed_at: string
  organisation_name?: string
  org_type?: string
  action: string
  action_label: string
  document_name?: string
  purpose?: string
}

export interface Consent {
  consent_id: string
  organisation_name: string
  scholarship_title?: string
  purpose: string
  fields_shared: string[]
  document_types_shared: string[]
  granted_at: string
  withdrawn_at?: string
  active: boolean
}

/* A scheme the platform sent a student to, applied for on the sponsor's site.
 *
 * Not an application and deliberately a different type. An application is
 * observed at every stage; this records one fact the platform saw — that it
 * made the connection — and one the student told us afterwards, if they did.
 * A single type covering both would invite a list that treats them alike, and
 * the difference is the whole honesty of the figure. */
export interface Referral {
  referral_id: string
  scholarship_id: string
  scholarship_title?: string
  organisation_name?: string
  external_url?: string
  referred_at: string
  last_referred_at: string
  /** Repeat visits. One connection, however many times they went back. */
  times: number
  /* The student's own account. Named so a reader cannot mistake it for
     something the platform established. */
  self_reported_outcome?: 'APPLIED' | 'AWARDED' | 'NOT_AWARDED' | 'DID_NOT_APPLY'
  outcome_at?: string
}
