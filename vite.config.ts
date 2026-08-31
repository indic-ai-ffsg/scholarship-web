import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/* The API target has to come from loadEnv, not process.env.
 *
 * Vite reads .env into import.meta.env for client code, but it does not put it
 * into process.env — a config file that reaches for process.env.VITE_API_TARGET
 * gets undefined unless the variable happened to be exported in the shell. A
 * proxy with an undefined target does not fail loudly at startup; it answers
 * every /api call with a 502, which reads in the browser as the API being down
 * when the API is perfectly healthy.
 *
 * The empty third argument loads every variable regardless of prefix, so this
 * keeps working if the target is ever renamed without a VITE_ prefix. */

/* Tunnelled hosts are allowed through the dev server's host check.
 *
 * Firebase phone auth will only run on a domain listed in the project's
 * authorised domains, and a tunnel is the usual way to give a local dev server
 * one without exposing it. Vite blocks any Host header it does not recognise,
 * so without this the tunnel answers "Blocked request" and the sign-in flow is
 * never reached.
 *
 * A leading dot matches subdomains, so this covers whichever tunnel gets
 * allocated rather than one hard-coded name. Dev server only — `vite preview`
 * and the production build are unaffected. */
const allowedHosts = ['.devtunnels.ms', '.ngrok-free.app', '.trycloudflare.com']

export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').VITE_API_TARGET

  if (!target) {
    // Loud at startup beats a 502 per request. Without this the only symptom is
    // an error message in the browser blaming the API.
    throw new Error(
      'VITE_API_TARGET is not set. Copy .env.example to .env, or export it, ' +
      'or every /api call from the dev server will fail with a 502.',
    )
  }

  const proxy = {
    '/api': { target, changeOrigin: true },
    '/healthz': { target, changeOrigin: true },
    '/readyz': { target, changeOrigin: true },
  }

  return {
    plugins: [react()],
    // Both server and preview: vite preview reads its own proxy config, and
    // without it a production build answers every API call with the static
    // server's 404, which looks like a broken build rather than a missing proxy.
    server: { port: 5173, proxy, allowedHosts },
    preview: { port: 5173, proxy },
  }
})
