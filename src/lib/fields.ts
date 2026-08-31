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
  { value: 'SCHOOL', label: 'School', sub: 'Class 1 to 12' },
  { value: 'UNDERGRADUATE', label: 'Undergraduate', sub: 'BA, BSc, BTech and similar' },
  { value: 'POSTGRADUATE', label: 'Postgraduate', sub: 'MA, MSc, MTech and similar' },
  { value: 'DOCTORAL', label: 'Doctoral', sub: 'PhD' },
]

// These five appear in English on the certificates they come from, and a student
// matching a word on a document against a word on a screen is better served by
// the same word.
export const SOCIAL_CATEGORIES: { value: string; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'EWS', label: 'EWS' },
  { value: 'OBC', label: 'OBC' },
  { value: 'SC', label: 'SC' },
  { value: 'ST', label: 'ST' },
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

export function categoryChoices(): Choice[] {
  return SOCIAL_CATEGORIES.map(c => ({ value: c.value, label: c.label }))
}
