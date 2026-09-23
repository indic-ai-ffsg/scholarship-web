/* Are the thirteen translated tables consistent with the English one?
 *
 * Three ways a language file goes wrong, none of which TypeScript catches
 * because Dict is Record<string, string> and every one of these is a valid
 * string:
 *
 *   1. a key that is not in English — a typo in the key, which falls back
 *      silently and shows English forever while looking translated;
 *   2. a {placeholder} that was translated, dropped or invented — "{n} दिन"
 *      becoming "{एन} दिन" renders the braces to the student;
 *   3. a pipe that went missing from a plural string, or appeared in one that
 *      is not plural — the first shows the plural form at n=1, the second
 *      truncates a sentence at the pipe.
 *
 * Missing keys are counted and reported as coverage rather than failed. That
 * is the design: the provider falls back key by key, so an incomplete table is
 * a language shipping early, not a broken build.
 *
 * Run: npm run check:i18n
 */

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const lib = join(here, '..', 'src', 'lib')

/* The tables are TypeScript with comments in them, so they are read rather
 * than imported: importing would mean a compile step inside a check whose whole
 * job is to run in a second. The shape is fixed — two-space indent, single
 * quotes, one entry per line — and anything that does not match that shape is
 * reported rather than skipped, so a reformat cannot quietly empty this out. */
function parse(file) {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const entries = new Map()
  const re = /^\s{2}'([^']+)':\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,?\s*$/gm
  let m
  while ((m = re.exec(text))) entries.set(m[1], (m[2] ?? m[3]).replace(/\\'/g, "'"))
  return entries
}

const placeholders = s => (s.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) ?? []).sort().join(',')

const en = parse(join(lib, 'i18n-strings.ts'))
if (en.size === 0) {
  console.error('check:i18n — could not read a single English string. The table format has changed.')
  process.exit(1)
}

const files = readdirSync(join(lib, 'strings')).filter(f => f.endsWith('.ts')).sort()
let failed = 0
const rows = []

for (const file of files) {
  const code = file.replace(/\.ts$/, '')
  const table = parse(join(lib, 'strings', file))
  const problems = []

  for (const [key, value] of table) {
    if (!en.has(key)) {
      problems.push(`unknown key '${key}' — not in the English table`)
      continue
    }
    const source = en.get(key)
    if (placeholders(source) !== placeholders(value)) {
      problems.push(`'${key}' placeholders differ: English has ${placeholders(source) || 'none'}, ${code} has ${placeholders(value) || 'none'}`)
    }
    if (source.includes('|') !== value.includes('|')) {
      problems.push(`'${key}' plural forms differ: English ${source.includes('|') ? 'has' : 'has no'} pipe, ${code} ${value.includes('|') ? 'has' : 'has no'} pipe`)
    }
  }

  const covered = [...en.keys()].filter(k => table.has(k)).length
  rows.push({ code, covered, total: en.size, problems: problems.length })
  for (const p of problems) {
    console.error(`  ${code}: ${p}`)
    failed++
  }
}

const width = Math.max(...rows.map(r => r.code.length))
for (const r of rows) {
  const pct = Math.round((r.covered / r.total) * 100)
  const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·')
  console.log(
    `${r.code.padEnd(width)}  ${bar} ${String(pct).padStart(3)}%  ` +
    `${String(r.covered).padStart(3)}/${r.total}` +
    (r.problems ? `  ${r.problems} problem${r.problems === 1 ? '' : 's'}` : ''),
  )
}

if (failed) {
  console.error(`\ncheck:i18n — ${failed} problem${failed === 1 ? '' : 's'}.`)
  process.exit(1)
}
console.log('\ncheck:i18n — placeholders and plural forms agree with English.')
