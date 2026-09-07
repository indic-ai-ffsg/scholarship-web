/* The answer vocabularies.
 *
 * These were inside the profile wizard, which was the only screen that asked
 * for them. The public eligibility check asks the same questions of somebody
 * who has no account yet, and its answers are handed to the wizard afterwards
 * so nobody types them twice — which makes an exact match between the two lists
 * a correctness requirement rather than tidiness. A course level offered as
 * "UG" on one screen and "UNDERGRADUATE" on the other would silently drop the
 * answer on the way through, and the student would see a question they had
 * already answered with the box empty.
 *
 * The values are the API's enums (see 0001_extensions_and_enums.sql) and are
 * never translated. The labels were bilingual until Hindi came out of the app;
 * the Devanagari halves went with it.
 */

/** The shape both the wizard's ChoiceGroup and a plain <select> can render. */
export interface Choice {
  value: string
  label: string
  sub?: string
}

// The twenty-one conditions recognised by the RPwD Act, 2016, in the order the
// Act lists them.
export const DISABILITY_TYPES = [
  'BLINDNESS', 'LOW_VISION', 'LEPROSY_CURED', 'HEARING_IMPAIRMENT',
  'LOCOMOTOR_DISABILITY', 'DWARFISM', 'INTELLECTUAL_DISABILITY', 'MENTAL_ILLNESS',
  'AUTISM_SPECTRUM_DISORDER', 'CEREBRAL_PALSY', 'MUSCULAR_DYSTROPHY',
  'CHRONIC_NEUROLOGICAL_CONDITION', 'SPECIFIC_LEARNING_DISABILITY',
  'MULTIPLE_SCLEROSIS', 'SPEECH_AND_LANGUAGE_DISABILITY', 'THALASSEMIA',
  'HAEMOPHILIA', 'SICKLE_CELL_DISEASE', 'MULTIPLE_DISABILITIES',
  'ACID_ATTACK_VICTIM', 'PARKINSONS_DISEASE',
] as const

export const DISABILITY_LABELS: Record<string, string> = {
  BLINDNESS: 'Blindness',
  LOW_VISION: 'Low vision',
  LEPROSY_CURED: 'Leprosy (cured)',
  HEARING_IMPAIRMENT: 'Hearing impairment',
  LOCOMOTOR_DISABILITY: 'Locomotor disability',
  DWARFISM: 'Dwarfism',
  INTELLECTUAL_DISABILITY: 'Intellectual disability',
  MENTAL_ILLNESS: 'Mental illness',
  AUTISM_SPECTRUM_DISORDER: 'Autism spectrum disorder',
  CEREBRAL_PALSY: 'Cerebral palsy',
  MUSCULAR_DYSTROPHY: 'Muscular dystrophy',
  CHRONIC_NEUROLOGICAL_CONDITION: 'Chronic neurological condition',
  SPECIFIC_LEARNING_DISABILITY: 'Specific learning disability',
  MULTIPLE_SCLEROSIS: 'Multiple sclerosis',
  SPEECH_AND_LANGUAGE_DISABILITY: 'Speech and language disability',
  THALASSEMIA: 'Thalassemia',
  HAEMOPHILIA: 'Haemophilia',
  SICKLE_CELL_DISEASE: 'Sickle cell disease',
  MULTIPLE_DISABILITIES: 'Multiple disabilities, including deafblindness',
  ACID_ATTACK_VICTIM: 'Acid attack survivor',
  PARKINSONS_DISEASE: "Parkinson's disease",
}

export const STATES: Record<string, string> = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh',
  AS: 'Assam', BR: 'Bihar', CH: 'Chandigarh', CT: 'Chhattisgarh', DL: 'Delhi',
  DN: 'Dadra and Nagar Haveli and Daman and Diu', GA: 'Goa', GJ: 'Gujarat',
  HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand', JK: 'Jammu and Kashmir',
  KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MH: 'Maharashtra',
  ML: 'Meghalaya', MN: 'Manipur', MP: 'Madhya Pradesh', MZ: 'Mizoram', NL: 'Nagaland',
  OR: 'Odisha', PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan', SK: 'Sikkim',
  TG: 'Telangana', TN: 'Tamil Nadu', TR: 'Tripura', UP: 'Uttar Pradesh',
  UT: 'Uttarakhand', WB: 'West Bengal',
}

export const COURSE_LEVELS: { value: string; label: string; sub: string }[] = [
  { value: 'SCHOOL', label: 'School', sub: 'Class 9, Class 10, Class 11, Class 12' },
  { value: 'UNDERGRADUATE', label: 'Undergraduate', sub: 'BA, BSc, BTech and similar' },
  { value: 'POSTGRADUATE', label: 'Postgraduate', sub: 'MA, MSc, MTech and similar' },
  { value: 'DOCTORAL', label: 'Doctoral', sub: 'PhD' },
]

export function disabilityChoices(): Choice[] {
  return DISABILITY_TYPES.map(v => ({ value: v, label: DISABILITY_LABELS[v] }))
}

export function courseChoices(): Choice[] {
  return COURSE_LEVELS.map(c => ({ value: c.value, label: c.label, sub: c.sub }))
}

export function stateChoices(): Choice[] {
  return Object.entries(STATES).map(([code, name]) => ({ value: code, label: name }))
}

/* --- the registration form's own two vocabularies -----------------------------
 *
 * Programs and years, as chips rather than as the four-value `course_level`
 * chooser above. Both lists come from the client's wireframe (wireframe-v4.html,
 * screen `scr-register`) and its constants.ts, and they are deliberately more
 * specific than the API's enum: a student picks "BE / BTech", not
 * "Undergraduate". Asking the question in the student's words and storing it in
 * the API's is what the mapping functions at the bottom of this file are for.
 *
 * COURSE_LEVELS stays. The profile view still reads it back, and the public
 * eligibility check still asks with it — four large rows is the right control
 * for a visitor answering one question, and forty chips is the right one for
 * somebody filling a whole form in a single pass.
 */

/** Selectable on their own, above the two grouped sets. */
export const PROGRAMS_TOP = ['School', 'Diploma / ITI'] as const

export const PROGRAMS_GRADUATION = [
  'BA', 'BE / BTech', 'BSc', 'BCom', 'BCA', 'BBA', 'BPharm', 'MBBS', 'BSW', 'Others',
] as const

export const PROGRAMS_PG = [
  'MA', 'MTech', 'MSc', 'MCom', 'MCA', 'MBA', 'MPharm', 'MD', 'MSW', 'Others',
] as const

export const PROGRAM_PHD = 'PhD / Doctorate'

/* The postgraduate chips are stored prefixed.
 *
 * "Others" appears in both grouped sets and "MD" is a postgraduate medical
 * degree that would otherwise be indistinguishable from an undergraduate one by
 * its label alone. The prefix is what makes the stored value answer "which
 * group was this chosen from", which is the question programCategory has to
 * answer to pick a course_level and to decide which year chips apply. */
export function pgValue(program: string): string {
  return `PG: ${program}`
}

export type ProgramCategory = 'School' | 'Diploma / ITI' | 'grad' | 'pg' | 'phd' | ''

export function programCategory(program: string | null | undefined): ProgramCategory {
  if (!program) return ''
  if (program === 'School') return 'School'
  if (program === 'Diploma / ITI') return 'Diploma / ITI'
  if (program === PROGRAM_PHD) return 'phd'
  if (program.startsWith('PG:')) return 'pg'
  return 'grad'
}

/* The years, each declaring which programs it belongs to.
 *
 * One list rather than a list per program, and the chips that do not apply are
 * disabled rather than removed. A row that changes length when the program
 * above it changes moves the controls under the student's finger between two
 * taps; a row that stays put and greys four of its eleven chips says the same
 * thing without moving anything.
 *
 * `ordinal` is what reaches the API, and it is the year's position *within its
 * own program* rather than a class number. current_year is validated
 * `gte=1,lte=10` in profile.UpsertInput, so Class 11 and Class 12 cannot be
 * stored as 11 and 12 — they would fail to validate and the whole form would be
 * refused with an error naming a field the student cannot see. Read back
 * against the course_level it was stored with, the ordinal is unambiguous:
 * yearLabel() below is the inverse, and it is the only thing that should ever
 * turn one of these numbers back into words.
 */
export const ALL_YEARS: {
  label: string
  ordinal: number
  cats: ProgramCategory[]
}[] = [
  { label: 'Below 9th class', ordinal: 1, cats: ['School'] },
  { label: 'Class 9', ordinal: 2, cats: ['School'] },
  { label: 'Class 10', ordinal: 3, cats: ['School'] },
  { label: 'Class 11', ordinal: 4, cats: ['School'] },
  { label: 'Class 12', ordinal: 5, cats: ['School'] },
  { label: '1st year', ordinal: 1, cats: ['grad', 'Diploma / ITI'] },
  { label: '2nd year', ordinal: 2, cats: ['grad', 'Diploma / ITI'] },
  { label: '3rd year', ordinal: 3, cats: ['grad', 'Diploma / ITI'] },
  { label: '4th year', ordinal: 4, cats: ['grad'] },
  { label: 'Post-graduate year 1', ordinal: 1, cats: ['pg'] },
  { label: 'Post-graduate year 2', ordinal: 2, cats: ['pg'] },
]

/* --- what the API is actually sent -------------------------------------------
 *
 * course_level is `oneof SCHOOL UNDERGRADUATE POSTGRADUATE DOCTORAL` and the
 * column behind it is an enum, so these four are the only values that can be
 * stored. The specific program the student chose is kept in course_name
 * (max=160, free text) beside it — nothing is discarded, and the profile view
 * shows the student's own answer rather than the bucket it fell into.
 *
 * Diploma / ITI maps to UNDERGRADUATE, which is the closest of the four and not
 * a perfect fit: a polytechnic diploma is post-school and sub-degree, and the
 * enum has no room for that. It matters because a scheme restricted to
 * UNDERGRADUATE will now match a diploma student. That is the more forgiving of
 * the two errors available — the alternative is SCHOOL, which would hide every
 * college-level scheme from them — but it is a choice rather than a truth, and
 * the enum gaining a DIPLOMA label is what would actually fix it.
 */
export function courseLevelFor(program: string): string | null {
  switch (programCategory(program)) {
    case 'School': return 'SCHOOL'
    case 'Diploma / ITI': return 'UNDERGRADUATE'
    case 'grad': return 'UNDERGRADUATE'
    case 'pg': return 'POSTGRADUATE'
    case 'phd': return 'DOCTORAL'
    default: return null
  }
}

/** The chip's own words, for course_name. Drops the storage prefix. */
export function courseNameFor(program: string): string {
  return program.startsWith('PG: ') ? program.slice(4) : program
}

export function yearOrdinal(year: string): number | null {
  return ALL_YEARS.find(y => y.label === year)?.ordinal ?? null
}

/* The inverse, for the profile view and for seeding this form from a profile
 * that already exists. A bare ordinal means nothing on its own — 3 is Class 10
 * to a school student and 3rd year to an undergraduate — so the course level has
 * to come with it. */
export function yearLabel(courseLevel: string | undefined, ordinal: number | undefined): string | null {
  if (!courseLevel || !ordinal) return null
  const cat: ProgramCategory =
    courseLevel === 'SCHOOL' ? 'School'
    : courseLevel === 'POSTGRADUATE' ? 'pg'
    : courseLevel === 'DOCTORAL' ? 'phd'
    : 'grad'
  return ALL_YEARS.find(y => y.ordinal === ordinal && y.cats.includes(cat))?.label ?? null
}

/* The disability chips, most commonly held first.
 *
 * DISABILITY_TYPES above is in the order the RPwD Act lists them, which is the
 * right order for a legal reference and the wrong one for a grid of twenty-one
 * chips: it opens on Blindness, Low vision and Leprosy (cured) and buries
 * Locomotor disability — the most common of the twenty-one — in fifth place.
 * The values are untouched; only the reading order changes.
 */
const DISABILITY_CHIP_ORDER = [
  'LOCOMOTOR_DISABILITY', 'HEARING_IMPAIRMENT', 'BLINDNESS', 'LOW_VISION',
  'CEREBRAL_PALSY', 'MUSCULAR_DYSTROPHY', 'DWARFISM', 'INTELLECTUAL_DISABILITY',
  'AUTISM_SPECTRUM_DISORDER', 'SPECIFIC_LEARNING_DISABILITY', 'MENTAL_ILLNESS',
  'SPEECH_AND_LANGUAGE_DISABILITY', 'CHRONIC_NEUROLOGICAL_CONDITION',
  'MULTIPLE_SCLEROSIS', 'PARKINSONS_DISEASE', 'THALASSEMIA', 'HAEMOPHILIA',
  'SICKLE_CELL_DISEASE', 'LEPROSY_CURED', 'ACID_ATTACK_VICTIM',
  'MULTIPLE_DISABILITIES',
]

export function disabilityChips(): Choice[] {
  /* Built from DISABILITY_TYPES rather than from the order list, so a condition
     added to the Act's list still appears — at the end, unordered, rather than
     silently missing because nobody updated two arrays. */
  const ranked = new Map(DISABILITY_CHIP_ORDER.map((v, i) => [v, i]))
  return [...DISABILITY_TYPES]
    .sort((a, b) => (ranked.get(a) ?? 99) - (ranked.get(b) ?? 99))
    .map(v => ({ value: v, label: DISABILITY_LABELS[v] }))
}

/* One enum column, and the form asks for a set.
 *
 * disability_type is a single `disability_type` enum value in the database
 * (0001_extensions_and_enums.sql), and the form asks "select all that apply"
 * because plenty of certificates name two conditions and a student holding one
 * of those cannot answer a single-choice question honestly.
 *
 * MULTIPLE_DISABILITIES is the Act's own label for exactly that case — "multiple
 * disabilities, including deafblindness" is item 20 of the schedule — so a
 * multi-select answer maps onto a real value rather than onto a fudge. What it
 * loses is *which* conditions: a student who picks Blindness and Thalassemia is
 * stored as MULTIPLE_DISABILITIES, and a scheme filtering specifically on
 * Blindness will not match them.
 *
 * That is a real cost and it is the reason this function exists in one place
 * instead of being inlined at the call site. Fixing it properly means a
 * `student_disability` join table and a matcher that reads a set, which is a
 * backend change; until then the single value is what can be stored, and the
 * form says "select all that apply" because the answer is still worth having
 * for the certificate check that happens after a match.
 */
export function disabilityTypeFor(selected: string[]): string | null {
  if (selected.length === 0) return null
  return selected.length === 1 ? selected[0] : 'MULTIPLE_DISABILITIES'
}
