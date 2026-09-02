/* Replaced at container start by docker-entrypoint.d/17-runtime-config.envsh.
 *
 * This copy is what `npm run dev` and a plain `vite build` serve, and it is
 * deliberately empty: with no runtime values, src/lib/runtime-config.ts falls
 * back to the build-time ones from .env, which is what a developer wants.
 *
 * It exists at all so that the <script src="/config.js"> in index.html does not
 * 404 in development. A 404 here is harmless — window.__ENV__ stays undefined
 * and the fallback still runs — but it puts a red line in the console of every
 * page load, and a real error further down then looks like more of the same. */
window.__ENV__ = {}
