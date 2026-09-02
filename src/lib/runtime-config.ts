/* Configuration read at container start, not at build.
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * Vite folds `import.meta.env.VITE_X` into a literal during the build, so a
 * value supplied that way is frozen into the JavaScript and can only be changed
 * by building a new image. That is a poor fit for how this portal is actually
 * deployed: the image is built once by CI, pushed to a registry, and run by
 * Railway — which is the only place that knows what the widget id or the API
 * version should be, and cannot reach into a compiled bundle to say so.
 *
 * The cost of getting this wrong was not theoretical. The MSG91 widget id was a
 * build argument; it was set on the Railway service, where it did nothing at
 * all, and the deployed portal answered every sign-in attempt with "not set up
 * on this site yet" through several rounds of setting the variable and
 * redeploying. Nothing was broken — the value simply had no path from where it
 * was set to where it was read.
 *
 * So the container writes /config.js at start-up from its own environment, and
 * index.html loads it before the bundle. `API_TARGET` already worked this way
 * (the entrypoint rewrites nginx's config from it); this gives the JavaScript
 * the same property, and the same image now serves compose, staging and
 * production without a rebuild.
 *
 * ---------------------------------------------------------------------------
 * The fallback
 * ---------------------------------------------------------------------------
 *
 * `npm run dev` has no container and no entrypoint, so the build-time values
 * remain as a fallback and .env still works for local development. Runtime wins
 * where both are present, because the container is the more specific statement
 * about where the app is actually running.
 *
 * Nothing secret belongs here either way. /config.js is served to every visitor
 * exactly like the bundle it configures, so this is a rename of the boundary,
 * not a move of it: the MSG91 authkey stays on the API, and the only reason the
 * widget id is safe to publish is that MSG91 gates it on the requesting domain.
 */

declare global {
  interface Window {
    /* Written by docker-entrypoint.d/17-runtime-config.envsh. Absent under
       `npm run dev`, and absent if config.js fails to load — both of which fall
       through to the build-time values below rather than throwing. */
    __ENV__?: Record<string, string | undefined>
  }
}

/* Read as literals, because Vite only substitutes the literal form. An
 * `import.meta.env[key]` lookup is left as a runtime property access on an
 * object that does not exist in the built bundle, which silently yields
 * undefined for everything — a fallback that never falls back. */
const BUILD: Record<string, string | undefined> = {
  API_VERSION: import.meta.env.VITE_API_VERSION,
  MSG91_WIDGET_ID: import.meta.env.VITE_MSG91_WIDGET_ID,
  MSG91_TOKEN_AUTH: import.meta.env.VITE_MSG91_TOKEN_AUTH,
}

/** A configured value, or '' when it is set in neither place. */
export function setting(key: keyof typeof BUILD | string): string {
  // Trimmed, and empty treated as absent: an unset Railway variable arrives as
  // an empty string rather than as a missing key, and `MSG91_WIDGET_ID=""`
  // means "not configured" just as plainly as omitting it.
  const runtime = window.__ENV__?.[key]?.trim()
  if (runtime) return runtime
  return BUILD[key]?.trim() ?? ''
}
