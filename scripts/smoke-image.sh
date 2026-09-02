#!/bin/sh
# Does the built image actually serve the portal?
#
#   sh scripts/smoke-image.sh indicsign/sp-web:local
#   npm run check:image                      (the same, on the default tag)
#
#   EXPECT_API_VERSION      the version the bundle should call    (default v1)
#   EXPECT_API_TARGET       the API the container should proxy to (default http://api:8080)
#   PORT                    host port to publish on               (default 18173)
#
# CI runs exactly this, rather than a list of inline `docker run` steps, so that
# a failing publish can be reproduced on a laptop with one command instead of
# being read out of a log. Nothing here needs the API, or a network beyond
# localhost: an unreachable API_TARGET is one of the things being checked.
#
# It asserts what a broken build of this image actually looks like, which is
# never a build failure:
#
#   * the config template rendered, and rendered with the address it was given
#   * an address nginx would reject is refused at start-up, by name
#   * the bundle calls the API version it was built for
#   * a deep link reloads as the app, not as a 404
#   * a root-level static file is still served rather than swallowed by that rule
#   * /api is proxied rather than swallowed by the single-page fallback
#   * a fingerprinted asset that does not exist is a 404, not index.html
#   * a platform-assigned PORT is honoured, in the config and on the socket
set -eu

# The tag to exercise. Defaults to what `docker compose build` produces locally,
# so the common case is `npm run check:image` with no arguments.
IMAGE=${1:-${WEB_IMAGE:-indicsign/sp-web:local}}
EXPECT_API_VERSION=${EXPECT_API_VERSION:-v1}
EXPECT_API_TARGET=${EXPECT_API_TARGET:-http://api:8080}
PORT=${PORT:-18173}

NAME="sp-web-smoke-$$"
FAILED=0

cleanup() { docker rm -f "$NAME" "${NAME}-port" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

pass() { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILED=$((FAILED + 1)); }

# The Host header the entrypoint should derive: the target without its scheme,
# port kept, path dropped.
expect_host=${EXPECT_API_TARGET#*://}
expect_host=${expect_host%%/*}

echo "image:  $IMAGE"
echo "target: $EXPECT_API_TARGET  (Host: $expect_host)"
echo

# --- 1. the configuration template rendered ---------------------------------
#
# `nginx -T` runs the entrypoint first — it renders the template, then execs
# this — so it dumps the configuration the container would really serve.

echo "configuration"
rendered=$(docker run --rm -e API_TARGET="$EXPECT_API_TARGET" "$IMAGE" nginx -T 2>&1) || {
    echo "$rendered"
    fail "nginx rejected its own rendered configuration"
    exit 1
}

if printf '%s' "$rendered" | grep -qF "set \$api ${EXPECT_API_TARGET};"; then
    pass "proxies to $EXPECT_API_TARGET"
else
    fail "the rendered config does not proxy to $EXPECT_API_TARGET"
fi

if printf '%s' "$rendered" | grep -qE "proxy_set_header +Host +${expect_host};"; then
    pass "sends Host: $expect_host upstream"
else
    fail "the rendered config does not send Host: $expect_host"
fi

if printf '%s' "$rendered" | grep -qE '^ *listen +80;'; then
    pass "listens on 80 by default"
else
    fail "the rendered config does not listen on 80"
fi

# Container platforms assign a port through PORT and route only to it. A portal
# listening on 80 there fails its health check with nginx logging nothing wrong.
port_rendered=$(docker run --rm -e API_TARGET="$EXPECT_API_TARGET" -e PORT=8080 "$IMAGE" nginx -T 2>&1) || {
    echo "$port_rendered"
    fail "nginx rejected its configuration with PORT set"
    exit 1
}
if printf '%s' "$port_rendered" | grep -qE '^ *listen +8080;' &&
   ! printf '%s' "$port_rendered" | grep -qE '^ *listen +80;'; then
    pass "PORT=8080 moves the listen directive, and nothing still listens on 80"
else
    printf '%s' "$port_rendered" | grep -nE '^ *listen' || true
    fail "PORT=8080 did not move the listen directive"
fi

# Every IPv6 directive has to carry the same port as its IPv4 pair, or the
# platform routes to a socket nothing is on. Skipped where the kernel running
# this has no IPv6 — the directive is absent by design there.
if printf '%s' "$port_rendered" | grep -qE '^ *listen +\[::\]:'; then
    if printf '%s' "$port_rendered" | grep -qE '^ *listen +\[::\]:8080;'; then
        pass "the IPv6 directive follows PORT too"
    else
        fail "the IPv6 directive is on a different port from the IPv4 one"
    fi
else
    echo "  skip  no IPv6 directive (no /proc/net/if_inet6 in this container)"
fi

# An unsubstituted ${NAME} parses as a literal and silently proxies nowhere, so
# a leftover is a failure even though nginx accepted the file. Only the rendered
# server block is examined: `nginx -T` also dumps mime.types and the stock
# nginx.conf, neither of which is ours.
leftovers=$(printf '%s' "$rendered" | sed -n '/^# configuration file .*default.conf:/,/^# configuration file /p' | grep -c '\${' || true)
if [ "$leftovers" -eq 0 ]; then
    pass "no unsubstituted \${...} left in the rendered config"
else
    fail "$leftovers unsubstituted \${...} in the rendered config"
fi

# --- 2. a target nginx would reject is refused by name -----------------------

if out=$(docker run --rm -e API_TARGET=api.example.org "$IMAGE" nginx -T 2>&1); then
    echo "$out" | tail -3
    fail "a schemeless API_TARGET started anyway"
else
    if printf '%s' "$out" | grep -q 'API_TARGET must start with'; then
        pass "a schemeless API_TARGET is refused, and says so"
    else
        printf '%s\n' "$out" | tail -3
        fail "a schemeless API_TARGET failed for some other reason"
    fi
fi

# --- 4. it serves ------------------------------------------------------------

echo
echo "serving on :$PORT"
docker run -d --name "$NAME" -p "127.0.0.1:${PORT}:80" \
    -e API_TARGET="$EXPECT_API_TARGET" \
    -e API_VERSION="$EXPECT_API_VERSION" \
    -e MSG91_WIDGET_ID="${EXPECT_MSG91_WIDGET:-}" \
    "$IMAGE" >/dev/null

base="http://127.0.0.1:${PORT}"
up=0
i=0
while [ "$i" -lt 30 ]; do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "$base/nginx-alive" || true)" = "204" ]; then
        up=1
        break
    fi
    i=$((i + 1))
    sleep 1
done

if [ "$up" -ne 1 ]; then
    docker logs "$NAME" 2>&1 | tail -20
    fail "the container never answered /nginx-alive"
    exit 1
fi
pass "answers /nginx-alive"

status() { curl -s -o /dev/null -w '%{http_code}' "$base$1"; }

# --- the configuration reached the browser -----------------------------------
#
# This is the assertion the image most needs and did not have.
#
# Nothing about a deployment is compiled into the bundle any more: the container
# writes /config.js at start-up and index.html loads it first. That is a better
# design and it is also a new way to fail silently — a broken entrypoint, a
# missing execute bit, an nginx location that shadows the file, and the portal
# comes up looking perfect with every setting reading as unset. The symptom is a
# sign-in screen that refuses everyone, which is exactly what shipped when this
# configuration travelled by build argument instead.
#
# So: ask the running container what it published, over HTTP, the way a browser
# will.

echo
echo "runtime configuration"

config=$(curl -s "$base/config.js" || true)

if [ -z "$config" ]; then
    fail "/config.js is empty or missing — the bundle will read every setting as unset"
else
    pass "/config.js is served"
fi

# It must never be cached: it is not fingerprinted and it is rewritten on every
# start, so a cached copy is how a browser keeps yesterday's configuration and
# an operator concludes that setting the variable does nothing.
if curl -sI "$base/config.js" | grep -qi 'cache-control:.*no-store'; then
    pass "/config.js is not cacheable"
else
    fail "/config.js may be cached — a configuration change would not reach a returning visitor"
fi

# index.html has to load it, and before the module bundle. Module scripts are
# deferred, so any position in the document works; its absence does not.
if printf '%s' "$(curl -s "$base/")" | grep -qF 'src="/config.js"'; then
    pass "index.html loads /config.js"
else
    fail "index.html does not load /config.js — nothing will populate window.__ENV__"
fi

if printf '%s' "$config" | grep -qF "\"API_VERSION\": \"${EXPECT_API_VERSION}\""; then
    pass "publishes API_VERSION=$EXPECT_API_VERSION"
else
    fail "API_VERSION did not reach /config.js"
fi

# Opt-in: an image run without a widget id is legitimate — the public site is
# unaffected — so only a container that was given one is held to having it.
if [ -n "${EXPECT_MSG91_WIDGET:-}" ]; then
    if printf '%s' "$config" | grep -qF "\"MSG91_WIDGET_ID\": \"${EXPECT_MSG91_WIDGET}\""; then
        pass "publishes the MSG91 widget id"
    else
        fail "the widget id did not reach /config.js — this container cannot sign anybody in by mobile"
    fi
else
    echo "  - phone sign-in not asserted (EXPECT_MSG91_WIDGET unset)"
fi

# Every screen has a real URL here — the portal routes with BrowserRouter, so a
# student can bookmark /scholarships/x, reload it, or open it from a WhatsApp
# message. nginx has to hand all of those to the app; a 404 on reload is the
# classic broken single-page deployment, and on a public site it is also every
# link anybody has ever shared.
#
# The last two are behind RequireAuth. They must still serve the app: the
# redirect to sign-in is the app's decision, made in the browser, and nginx
# knowing nothing about it is the point.
for path in / /scholarships /scholarships/does-not-exist /check /applications /apply/123; do
    code=$(status "$path")
    if [ "$code" = "200" ] && curl -s "$base$path" | grep -q 'id="root"'; then
        pass "GET $path serves the app"
    else
        fail "GET $path answered $code — a deep link must reload as the app"
    fi
done

# Real files at the root must survive that fallback. try_files checks the file
# first, and a rule that swallowed the favicon or the manifest would ship as a
# working portal with a broken browser tab and an uninstallable web app — the
# kind of thing nobody files a bug about and everybody notices.
for f in /favicon.ico /manifest.webmanifest /logo-full.png; do
    code=$(status "$f")
    if [ "$code" = "200" ]; then
        pass "$f is served, not swallowed by the app fallback"
    else
        fail "$f answered $code — the single-page fallback is eating root-level files"
    fi
done

# index.html names the fingerprinted bundles; a cached copy pins the browser to
# filenames the next deploy removes. This has to hold for a deep link too, which
# is served *as* index.html through an internal redirect.
if curl -sI "$base/index.html" | grep -qi 'cache-control: *no-store'; then
    pass "index.html is no-store"
else
    fail "index.html is missing Cache-Control: no-store"
fi

if curl -sI "$base/scholarships" | grep -qi 'cache-control: *no-store'; then
    pass "a deep link is no-store as well"
else
    fail "a deep link is missing Cache-Control: no-store — the fallback is not re-matching = /index.html"
fi

asset=$(curl -s "$base/" | grep -o '/assets/[A-Za-z0-9._-]*\.js' | head -1)
if [ -n "$asset" ]; then
    if [ "$(status "$asset")" = "200" ] && curl -sI "$base$asset" | grep -qi 'immutable'; then
        pass "$asset is served immutable"
    else
        fail "$asset is not served, or not immutable"
    fi
else
    fail "index.html references no /assets/*.js"
fi

# A missing fingerprinted asset must be a 404. Falling through to index.html
# would hand the browser HTML where it asked for JavaScript, and the app would
# fail with a MIME type error that names nothing useful.
code=$(status "/assets/does-not-exist.js")
if [ "$code" = "404" ]; then
    pass "a missing asset is a 404"
else
    fail "a missing asset answered $code"
fi

# The API is not running, and that is the point: a proxied path must fail as a
# gateway error. 200 here would mean /api fell through to the app, which is the
# failure that looks like a working portal until the first request.
code=$(status "/api/${EXPECT_API_VERSION}/scholarships")
case "$code" in
    502|504) pass "/api/$EXPECT_API_VERSION is proxied (upstream unreachable: $code)" ;;
    200)     fail "/api/$EXPECT_API_VERSION answered 200 — it is being served by the app, not proxied" ;;
    *)       pass "/api/$EXPECT_API_VERSION is proxied (upstream answered $code)" ;;
esac

# --- 5. and it serves on a platform-assigned port -----------------------------
#
# The configuration checks above prove the directive moved. This proves the
# socket did, which is the half a platform's health check actually asks about.

echo
echo "serving on a platform-assigned PORT"
alt_name="${NAME}-port"
alt_port=$((PORT + 1))
docker rm -f "$alt_name" >/dev/null 2>&1 || true
docker run -d --name "$alt_name" -p "127.0.0.1:${alt_port}:8080" \
    -e API_TARGET="$EXPECT_API_TARGET" -e PORT=8080 "$IMAGE" >/dev/null

up=0
i=0
while [ "$i" -lt 30 ]; do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${alt_port}/nginx-alive" || true)" = "204" ]; then
        up=1
        break
    fi
    i=$((i + 1))
    sleep 1
done

if [ "$up" -eq 1 ]; then
    pass "PORT=8080 is what the container actually listens on"
else
    docker logs "$alt_name" 2>&1 | tail -20
    fail "nothing answered on the port PORT named"
fi

# The image's HEALTHCHECK resolves the port at run time; on the wrong port it
# reports unhealthy forever and a platform restarts a container that is serving
# perfectly.
health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$alt_name" 2>/dev/null || echo none)
case "$health" in
    unhealthy) fail "the container's own health check calls itself unhealthy on PORT=8080" ;;
    none)      echo "  skip  no health state yet (the check has a start period)" ;;
    *)         pass "the container's own health check is $health on PORT=8080" ;;
esac

docker rm -f "$alt_name" >/dev/null 2>&1 || true

echo
if [ "$FAILED" -eq 0 ]; then
    echo "all checks passed"
else
    echo "$FAILED check(s) failed"
    docker logs "$NAME" 2>&1 | tail -20
    exit 1
fi
