# check=skip=SecretsUsedInArgOrEnv
#
# The line above must be the first in the file — a parser directive is only read
# before any other content — so the reason for it is here: BuildKit lints every
# ARG or ENV whose name looks like a credential, and the six VITE_FIREBASE_*
# below trip it. They are not credentials. A Firebase web apiKey identifies a
# project and authorises nothing (see the block itself, and the header comment
# in src/lib/firebase.ts), and every one of these six values is served to every
# visitor in the bundle. Four warnings on every build teach people to skim
# warnings, which is a worse position than this one line.

# The student portal and public site, built to static files and served by nginx.
#
# nginx is not just a file server here: it also proxies the API, which is what
# makes this image behave like `npm run dev`. See nginx.conf.template.

# --- build -------------------------------------------------------------------

FROM node:22-alpine AS build

WORKDIR /app

# The lockfile first, and `npm ci` rather than `npm install`: ci installs
# exactly what the lockfile pins and fails if the two disagree, so an image
# cannot quietly acquire a different dependency tree than the one tested.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# Vite substitutes import.meta.env at build time, so this is baked into the
# bundle and cannot be changed by an environment variable on the running
# container. It must match API_VERSION on the server; a mismatch sends every
# request to a path the API does not serve.
ARG VITE_API_VERSION=v1
ENV VITE_API_VERSION=${VITE_API_VERSION}

# Firebase phone sign-in — the portal's only front door for students, and the
# one thing here that the admin panel's image has no equivalent of.
#
# These are baked in for the same reason as the version above: Vite folds
# import.meta.env into the bundle. They are public by design — a Firebase web
# apiKey identifies a project, it does not authorise anything, and what actually
# gates phone auth is the project's authorised-domain list and reCAPTCHA, both
# enforced by Google. See the header comment in src/lib/firebase.ts. So an image
# carrying them is not a leaked credential, and the layer history being readable
# on a public registry costs nothing.
#
# The defaults are empty, which is a working image with sign-in switched off:
# src/lib/firebase.ts checks apiKey and projectId when somebody first tries to
# sign in and reports that the deployment is not configured, rather than
# throwing during module load and rendering a blank page. Every public page —
# the landing page, the directory, the eligibility check — works without them,
# which is why an unset value is a warning in CI and not a build failure.
#
# The domain the image is served from must be listed under Authentication >
# Settings > Authorized domains in the Firebase console, or every code request
# fails with auth/captcha-check-failed no matter what is set here.
ARG VITE_FIREBASE_API_KEY=
ARG VITE_FIREBASE_AUTH_DOMAIN=
ARG VITE_FIREBASE_PROJECT_ID=
ARG VITE_FIREBASE_STORAGE_BUCKET=
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=
ARG VITE_FIREBASE_APP_ID=
ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY} \
    VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID} \
    VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET} \
    VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID} \
    VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}

# VITE_API_TARGET is deliberately not set. It configures the Vite dev and
# preview proxy, and neither of those runs in this image — nginx does the
# proxying instead, to API_TARGET below.
RUN npm run build

# --- runtime -----------------------------------------------------------------

FROM nginx:1.27-alpine

# Where the API is. Unlike the VITE_* arguments above this is *not* baked into
# the bundle: it is read at container start, so the same image serves the
# compose stack and a deployment without being rebuilt. The ARG only moves the
# default — anything set on the container overrides it.
#
# The default is the compose service name, which is what makes `docker compose
# up` work with no configuration at all.
ARG API_TARGET=http://api:8080
ENV API_TARGET=${API_TARGET}

# DNS_RESOLVER is deliberately NOT set here. The entrypoint takes it from the
# container's own /etc/resolv.conf, by way of the nginx image's
# 15-local-resolvers.envsh — which is Docker's embedded DNS on a compose network
# and the platform's resolver anywhere else. A default of 127.0.0.11 baked in
# here would be wrong off a user-defined network, where nothing listens there and
# every proxied request answers 502.
#
# That script is opt-in, and this is the opt-in. Its first line is
# `[ "${NGINX_ENTRYPOINT_LOCAL_RESOLVERS:-}" ] || return 0`, so without the flag
# it exports nothing at all and the entrypoint below falls back — reporting
# "resolv.conf named no nameserver" about a file that named one perfectly well.
# That is why every proxied request on Railway was resolved against 127.0.0.11,
# which exists only under Docker.
#
# It also brackets an IPv6 nameserver on the way out ([fd12::10]), which is both
# the form the resolver directive requires and the form a platform with an
# IPv6-only private network hands out.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# envsubst replaces every ${NAME} it is given, and the entrypoint gives it every
# environment variable unless filtered. Unfiltered, a HOSTNAME in the
# environment would rewrite nothing here (nginx's own variables are $host, not
# ${HOST}) — but the failure mode if one ever collided is a config file that
# still parses and quietly proxies somewhere else, so the substitution is
# restricted to the names the template actually uses. That list is
# load-bearing in the other direction too: a ${NAME} in the template that is
# absent from it is copied through verbatim, and nginx then refuses to start
# on a directive containing a literal ${...}. Adding a variable to the
# template means adding it here.
ENV NGINX_ENVSUBST_FILTER='^(API_TARGET|API_HOST|DNS_RESOLVER|LISTEN_PORT|LISTEN_IPV6|RESOLVER_IPV6)$'

# worker_processes auto means one worker per CPU the *host* has, which on a big
# machine is dozens of processes serving one small static site. This makes the
# image's own tuning script read the cgroup CPU quota instead, so the count
# matches what the container was actually given.
ENV NGINX_ENTRYPOINT_WORKER_PROCESSES_AUTOTUNE=1

# Sourced by the image's entrypoint after its own 15-local-resolvers.envsh and
# before the template is rendered — the 16 in the name is what orders it, see the
# script. It fills in the defaults, derives API_HOST, the listen port and the
# IPv6 directive, and refuses to start on an API_TARGET nginx would reject.
# --chmod because a *.envsh without the execute bit is skipped with a log line
# and no error, which would leave the template rendered from an empty
# environment.
COPY --chmod=0755 docker-entrypoint.d/16-api-target.envsh /docker-entrypoint.d/
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# The default port inside the container. Compose publishes it on 5173 to match
# the port `npm run dev` uses, so bookmarks and the API's CORS allow-list hold.
# A platform that assigns a port through PORT is followed instead; EXPOSE is
# documentation and does not need to track it.
EXPOSE 80

# This container's own liveness, deliberately not /healthz: that one proxies to
# the API, so a portal that is serving perfectly in front of a stopped API would
# report itself unhealthy and be restarted for somebody else's outage. It is
# also not / — every unmatched path here serves the app, so a probe on any
# ordinary path answers 200 whether or not this nginx is really working.
# The port is resolved at run time, the same way the entrypoint resolves it, so
# the probe follows a platform-assigned PORT instead of checking a port nginx is
# no longer listening on.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${LISTEN_PORT:-${PORT:-80}}/nginx-alive" || exit 1
