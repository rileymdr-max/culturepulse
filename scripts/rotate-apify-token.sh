#!/usr/bin/env bash
# Swap a new Apify API token in everywhere CulturePulse uses it:
#   1. checks the token works with Apify,
#   2. updates APIFY_API_TOKEN in Vercel (Production + Preview),
#   3. updates APIFY_API_TOKEN / APIFY_TOKEN in the local .env files,
#   4. redeploys production so the live site picks it up.
# The token is read without echo and never printed.
set -euo pipefail
cd "$(dirname "$0")/.."

VERCEL_AUTH="$HOME/Library/Application Support/com.vercel.cli/auth.json"
TEAM=rileymdr-maxs-projects
PROJECT=culturepulse

[ -f "$VERCEL_AUTH" ] || { echo "Vercel CLI login not found. Run 'npx vercel login' first."; exit 1; }
VT=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['token'])" "$VERCEL_AUTH")

# Prefer the clipboard (copy the token with Apify's copy icon first); fall back to a hidden prompt.
TOKEN="$(pbpaste 2>/dev/null | tr -d '[:space:]' || true)"
if [[ "$TOKEN" =~ ^apify_api_[A-Za-z0-9]+$ ]]; then
  echo "Using the Apify token on your clipboard."
else
  [ -n "$TOKEN" ] && echo "Your clipboard doesn't hold an Apify token (they start with apify_api_)."
  read -r -s -p "Paste the NEW Apify API token (input hidden): " TOKEN
  echo
  TOKEN="$(printf %s "$TOKEN" | tr -d '[:space:]')"
fi
[ -n "$TOKEN" ] || { echo "Empty token, nothing changed."; exit 1; }

echo "1/4 Checking the token with Apify..."
WHO=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.apify.com/v2/users/me |
  python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('data',{}).get('username') or '')")
[ -n "$WHO" ] || { echo "Apify rejected that token. Nothing changed."; exit 1; }
echo "    OK: token belongs to Apify user '$WHO'."

echo "2/4 Updating Vercel..."
TOKEN="$TOKEN" VT="$VT" TEAM="$TEAM" PROJECT="$PROJECT" python3 - <<'PY'
import json, os, urllib.request
vt, team, proj, tok = os.environ["VT"], os.environ["TEAM"], os.environ["PROJECT"], os.environ["TOKEN"]
def call(method, path, body=None):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}{'&' if '?' in path else '?'}slug={team}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {vt}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)
envs = [e for e in call("GET", f"/v9/projects/{proj}/env")["envs"] if e["key"] == "APIFY_API_TOKEN"]
covered = set()
for e in envs:
    call("PATCH", f"/v9/projects/{proj}/env/{e['id']}", {"value": tok})
    covered.update(e["target"])
    print("    updated", "+".join(e["target"]))
missing = [t for t in ("production", "preview") if t not in covered]
if missing:
    call("POST", f"/v10/projects/{proj}/env", {"key": "APIFY_API_TOKEN", "value": tok, "type": "sensitive", "target": missing})
    print("    added", "+".join(missing))
PY

echo "3/4 Updating local .env files..."
for f in .env .env.local .env.prod.local .env.production.local; do
  [ -f "$f" ] || continue
  TOKEN="$TOKEN" python3 - "$f" <<'PY'
import os, re, sys
p = sys.argv[1]
lines = open(p).read().splitlines()
n = 0
for i, l in enumerate(lines):
    m = re.match(r'^(APIFY_API_TOKEN|APIFY_TOKEN)=', l)
    if m:
        lines[i] = f'{m.group(1)}="{os.environ["TOKEN"]}"'
        n += 1
if n:
    open(p, "w").write("\n".join(lines) + "\n")
    print(f"    {p}: {n} line(s)")
PY
done

echo "4/4 Redeploying production..."
VT="$VT" TEAM="$TEAM" PROJECT="$PROJECT" python3 - <<'PY'
import json, os, time, urllib.request
vt, team, proj = os.environ["VT"], os.environ["TEAM"], os.environ["PROJECT"]
def call(method, path, body=None):
    req = urllib.request.Request(
        f"https://api.vercel.com{path}{'&' if '?' in path else '?'}slug={team}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {vt}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)
pid = call("GET", f"/v9/projects/{proj}")["id"]
cur = call("GET", f"/v6/deployments?projectId={pid}&target=production&state=READY&limit=1")["deployments"][0]
new = call("POST", "/v13/deployments?forceNew=1", {"name": proj, "deploymentId": cur["uid"], "target": "production"})
for _ in range(60):
    state = call("GET", f"/v13/deployments/{new['id']}").get("readyState")
    if state in ("READY", "ERROR", "CANCELED"):
        break
    time.sleep(10)
print("    production deploy:", state)
PY

unset TOKEN
echo "Done. Clear the token from your clipboard (copy something else) when you're finished."
