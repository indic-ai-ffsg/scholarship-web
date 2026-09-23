/* The answer vocabularies.
 *
 * These were inside the profile wizard, and then shared with a public
 * eligibility check that asked the same questions of somebody with no account
 * and handed the answers on as a draft. Both of those screens have gone: the
 * registration form asks these questions once, of the person who can save the
 * answer.
 *
 * They stay in their own file because two things still read them — the form
 * writes these fields and the profile view renders them back — and because the
 * values are the API's enums (0001_extensions_and_enums.sql). A course level
 * offered as "UG" in one place and "UNDERGRADUATE" in another is an answer
 * silently dropped on the way to the server, which is the failure this file
 * exists to make impossible.
 *
 * The values are the API's enums (see 0001_extensions_and_enums.sql) and are
 * never translated. The labels are, and that is the whole shape of this file:
 * every function below takes `t` and returns the enum in `value` with a
 * translated `label` beside it. Nothing that reaches the API passes through a
 * translation, so a student answering in Odia and a student answering in Tamil
 * store the identical row.
 *
 * Two English strings here are deliberately not translated because they are
 * identities rather than words:
 *
 *   STATES holds the English name districtsFor() looks the district list up by
 *   (lib/districts), so translating it in place would empty every district
 *   picker. stateChoices() below translates the label and keeps the code as the
 *   value, which is what the form and the filter actually send.
 *
 *   ALL_YEARS.label is the <select>'s own value in the registration form, so it
 *   is the identity of the chosen year; `key` beside it is what gets drawn. A
 *   student who changes language mid-form keeps their answer, because the value
 *   never moved.
 *
 * The program chips are not translated at all. BA, BTech, MSc and MBBS are
 * written in Latin on every Indian marksheet and degree certificate, and a
 * student looking for the one that matches their certificate is matching
 * letterforms, not reading a word. They are also stored verbatim as
 * course_name, so translating them would put a different string in the database
 * for the same answer.
 */

/** The lookup every function here takes. Structurally identical to I18n['t'];
 *  named locally so this file does not import a React context to describe a
 *  string function. */
type T = (key: string) => string

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

/* The label for one condition, as the Act words it.
 *
 * The twenty-one English strings that used to sit here are now
 * field.disability.* in the string table, so they translate with everything
 * else. The key is built from the enum, which means a condition added to
 * DISABILITY_TYPES above shows its own enum name until somebody writes the
 * label — loud, and in exactly one place. */
const disabilityLabel = (t: T, value: string) => t(`field.disability.${value}`)

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

export function disabilityChoices(t: T): Choice[] {
  return DISABILITY_TYPES.map(v => ({ value: v, label: disabilityLabel(t, v) }))
}

export function courseChoices(t: T): Choice[] {
  return COURSE_LEVELS.map(c => ({
    value: c.value,
    label: t(`field.level.${c.value}`),
    sub: t(`field.level.${c.value}.sub`),
  }))
}

/* The directory's qualification filter, in the words the register form uses.
 *
 * The same four stored values as COURSE_LEVELS — the directory filters through
 * `scholarship_facet`, whose course_level rows hold the enum and nothing finer
 * — but labelled the way a student describes themselves rather than the way the
 * database does. "Undergraduate" is a word a form uses; "Graduation" is the
 * word on the certificate, and it is what the program chips already say.
 *
 * Diploma and ITI are folded into the graduation row rather than given one of
 * their own, and that is deliberate. courseLevelFor maps both to UNDERGRADUATE,
 * so a separate "Diploma / ITI" option would be a second control returning an
 * identical result set — a filter that appears to narrow and does not is worse
 * than one that does not offer the choice. The sub-line names them instead, so
 * a diploma student can see they are covered. Splitting them properly needs a
 * DIPLOMA value in the course_level enum, which is a migration and a matcher
 * change rather than a label.
 *
 * There is deliberately no year filter beside this. ALL_YEARS is a student's
 * own answer, and `scholarship_facet` carries no current_year rows, so a year
 * control here would either return everything or need a facet that does not
 * exist yet.
 */
export function qualificationChoices(t: T): Choice[] {
  return [
    { value: 'SCHOOL', label: t('field.qual.SCHOOL'), sub: t('field.qual.SCHOOL.sub') },
    {
      value: 'UNDERGRADUATE',
      label: t('field.qual.UNDERGRADUATE'),
      sub: t('field.qual.UNDERGRADUATE.sub'),
    },
    { value: 'POSTGRADUATE', label: t('field.qual.POSTGRADUATE'), sub: t('field.qual.POSTGRADUATE.sub') },
    { value: 'DOCTORAL', label: t('field.qual.DOCTORAL') },
  ]
}

/* The Course filter's vocabulary, mirroring listing_tag's SUBJECT rows.
 *
 * Hand-written rather than read off the facets, for the reason VocabSelect
 * exists: a facet-driven control offers only what today's results happen to
 * carry, so a subject nobody has tagged yet vanishes from the filter and can
 * never be found. These are the values the admin panel offers when tagging a
 * listing, so the two lists are the same question asked from both ends.
 *
 * all-courses is deliberately absent. It is not a subject a student looks for —
 * it is a claim a listing makes about itself, and the directory reads it as
 * "matches every subject" rather than as an option (see publicdir's tags
 * filter). Offering it would ask a student to choose "all" from a control whose
 * blank answer already means all.
 */
/* Named for the tag it filters, not for the control that shows it. `courseChoices`
 * a few lines up is the four-value course_level enum — the LEVEL a student has
 * reached — and two functions called course-something that answer different
 * questions is how the wrong one gets imported. */
const SUBJECTS = [
  'engineering', 'medical', 'management', 'science', 'commerce',
  'arts', 'vocational', 'fellowship', 'talent', 'sports',
] as const

export function subjectChoices(t: T): Choice[] {
  return SUBJECTS.map(v => ({ value: v, label: t(`field.subject.${v}`) }))
}

/* Gender, as the directory filters it.
 *
 * The same four stored values GENDERS carries, minus UNDISCLOSED: a scheme is
 * never restricted to students who declined to say, so offering it here would
 * be a filter with no possible match. A student who declined still sees every
 * unrestricted scheme, because the query treats a scheme naming no gender as
 * open to all.
 */
export function genderFilterChoices(t: T): Choice[] {
  return [
    { value: 'FEMALE', label: t('field.gender.FEMALE') },
    { value: 'MALE', label: t('field.gender.MALE') },
    /* Not field.gender.TRANSGENDER: the filter names the census category a
       scheme is written against, and the profile question asks the student how
       they describe themselves. Same stored value, two different questions. */
    { value: 'TRANSGENDER', label: t('field.genderFilter.TRANSGENDER') },
  ]
}

export function stateChoices(t: T): Choice[] {
  return Object.keys(STATES).map(code => ({ value: code, label: t(`field.state.${code}`) }))
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
 * COURSE_LEVELS stays: it is the enum the API stores and the profile view
 * reads back, and courseLevelFor below is what maps a chip onto it.
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
  /** The <select>'s value, and therefore this year's identity. Never drawn and
   *  never translated — see the header. */
  label: string
  /** What is drawn in its place. */
  key: string
  ordinal: number
  cats: ProgramCategory[]
}[] = [
  { label: 'Below 9th class', key: 'field.year.below9', ordinal: 1, cats: ['School'] },
  { label: 'Class 9', key: 'field.year.c9', ordinal: 2, cats: ['School'] },
  { label: 'Class 10', key: 'field.year.c10', ordinal: 3, cats: ['School'] },
  { label: 'Class 11', key: 'field.year.c11', ordinal: 4, cats: ['School'] },
  { label: 'Class 12', key: 'field.year.c12', ordinal: 5, cats: ['School'] },
  { label: '1st year', key: 'field.year.y1', ordinal: 1, cats: ['grad', 'Diploma / ITI'] },
  { label: '2nd year', key: 'field.year.y2', ordinal: 2, cats: ['grad', 'Diploma / ITI'] },
  { label: '3rd year', key: 'field.year.y3', ordinal: 3, cats: ['grad', 'Diploma / ITI'] },
  { label: '4th year', key: 'field.year.y4', ordinal: 4, cats: ['grad'] },
  { label: 'Post-graduate year 1', key: 'field.year.pg1', ordinal: 1, cats: ['pg'] },
  { label: 'Post-graduate year 2', key: 'field.year.pg2', ordinal: 2, cats: ['pg'] },
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

export function disabilityChips(t: T): Choice[] {
  /* Built from DISABILITY_TYPES rather than from the order list, so a condition
     added to the Act's list still appears — at the end, unordered, rather than
     silently missing because nobody updated two arrays. */
  const ranked = new Map(DISABILITY_CHIP_ORDER.map((v, i) => [v, i]))
  return [...DISABILITY_TYPES]
    .sort((a, b) => (ranked.get(a) ?? 99) - (ranked.get(b) ?? 99))
    .map(v => ({ value: v, label: disabilityLabel(t, v) }))
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
 * That was a real cost, and the form now avoids it by asking a single-choice
 * question: the student picks the condition on their certificate or, for more
 * than one, MULTIPLE_DISABILITIES themselves — so what they chose is what is
 * stored. This function still takes a list, because the chip selector hands
 * one back; with a single choice it returns that choice unchanged. Recording
 * each condition properly means a `student_disability` join table and a
 * matcher that reads a set, which is a backend change.
 */
export function disabilityTypeFor(selected: string[]): string | null {
  if (selected.length === 0) return null
  return selected.length === 1 ? selected[0] : 'MULTIPLE_DISABILITIES'
}

/* Gender, which the profile has always accepted and no screen has ever asked.
 *
 * profile.UpsertInput validates `oneof=MALE FEMALE TRANSGENDER UNDISCLOSED`,
 * the matching engine filters on it (a women-only scheme is an eligibility_rule
 * with field 'gender'), and compute_completeness counts it — so the API can and
 * does answer "Add your gender to your profile" as a student's single most
 * valuable next step. There was no control anywhere in this app to do it. The
 * wizard's question list never included it and neither did the form that
 * replaced the wizard, so the instruction was a wall: the one thing standing
 * between a student and a scholarship, and no way to supply it.
 *
 * UNDISCLOSED is offered as a real answer rather than as the absence of one,
 * and that is the point of including it. Without it the only way past this
 * question is to state something, and a question that cannot be declined is
 * worse than one that can — the enum has always had the value, so declining is
 * a stored answer here rather than a blank the matcher keeps asking about.
 */
export const GENDERS = ['FEMALE', 'MALE', 'TRANSGENDER', 'UNDISCLOSED'] as const

export function genderChoices(t: T): Choice[] {
  return GENDERS.map(v => ({ value: v, label: t(`field.gender.${v}`) }))
}
