/* The helpline, written once and in both forms it is needed in.
 *
 * Not in the string table, because it is not copy: nothing about it changes
 * with the language, and a translator given a phone number to carry is a
 * translator who can mistype one. The two forms are not interchangeable — a
 * dialler wants +91 and no spaces, a reader wants the grouping printed on a
 * phone bill — and keeping them adjacent is what stops one being updated
 * without the other.
 *
 * Here rather than in the landing page, since the footer offers it too: two
 * copies of a phone number are two places for one of them to go stale.
 *
 * If this number starts changing per deployment, it belongs in runtime-config
 * alongside the widget id rather than in a rebuild. It has not, so it does not. */
export const HELPLINE = { dial: '+917628953752', label: '+91-76289-53752' }
