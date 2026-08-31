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

export interface Match {
  scholarship_id: string
  slug: string
  title: string
  summary: string
  organisation_name: string
  org_type: string
  award_amount: number
  currency: string
  closes_at: string
  days_remaining: number
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
  award_amount: number
  currency: string
  is_renewable: boolean
  opens_at: string
  closes_at: string
  days_remaining: number
  slots_available?: number
  tags: string[]
  criteria?: string[]
}

export interface Facet { value: string; label: string; count: number }

/* One announcement on the landing page, written by the platform in the admin
 * panel. Both languages arrive together — the response is identical for every
 * caller and therefore cacheable — and a slide with no Hindi falls back to the
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

/* --- the public eligibility check -------------------------------------------
 *
 * The same four states a signed-in student sees, computed from answers that
 * were never saved anywhere (FR-17). Field-compatible with Match wherever the
 * two overlap, because one card component renders both — what is absent is what
 * a visitor has no account to have: whether they already applied. */
export interface CheckedScheme {
  scholarship_id: string
  slug: string
  title: string
  summary: string
  summary_hi?: string
  organisation_name: string
  org_type: string
  award_amount: number
  currency: string
  closes_at: string
  days_remaining: number
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
  scholarship_title?: string
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

/* --- guardians and assisted use ---------------------------------------------
 *
 * One shape for both sides of the relationship. A student sees the helper's
 * contact; a helper sees the student's name; neither field is filled for the
 * side that would be looking at themselves. */
export interface GuardianLink {
  link_id: string
  relationship: string
  /** Whether they may send an application, as against only prepare one. */
  can_submit: boolean
  guardian_contact?: string
  student_name?: string
  profile_id?: string
  status: 'INVITED' | 'ACTIVE' | 'ENDED'
  invited_at: string
  approved_at?: string
  revoked_at?: string
}
