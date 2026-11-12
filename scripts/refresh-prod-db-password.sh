#!/usr/bin/env bash
# Swap a new Neon password into the Postgres URLs in .env.prod.local and test
# the connection. The password is read without echo and never printed.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=.env.prod.local
[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE here"; exit 1; }

read -r -s -p "Paste the Neon password OR the whole connection string (input hidden): " NEW_PW
echo
[ -n "$NEW_PW" ] || { echo "Empty password, nothing changed."; exit 1; }
# Accept a full postgresql://user:password@host/... string: keep just the password.
if [[ "$NEW_PW" == postgres*://* ]]; then
  NEW_PW="${NEW_PW#*://}"; NEW_PW="${NEW_PW#*:}"; NEW_PW="${NEW_PW%%@*}"
  echo "Took the password from the connection string."
fi

cp "$ENV_FILE" "$ENV_FILE.bak"

NEW_PW="$NEW_PW" python3 - "$ENV_FILE" <<'PY'
import os, re, sys
from urllib.parse import quote, unquote
path = sys.argv[1]
new = quote(unquote(os.environ["NEW_PW"]), safe="")
url_re = re.compile(r'^([A-Z_]+)=("?)(postgres(?:ql)?://[^:/@]+:)([^@]*)(@.*?)("?)$')
out, updated, keys = [], [], set()
for line in open(path).read().splitlines():
    m = url_re.match(line)
    if m:
        key, q1, head, _old, tail, q2 = m.groups()
        line = f"{key}={q1}{head}{new}{tail}{q2}"
        updated.append(key)
    keys.add(line.split("=", 1)[0])
    out.append(line)
# Prisma's schema also reads DIRECT_URL: derive it from DATABASE_URL (non-pooler host).
if "DIRECT_URL" not in keys:
    db = next((l for l in out if l.startswith("DATABASE_URL=")), None)
    if db:
        out.append("DIRECT_URL=" + db.split("=", 1)[1].replace("-pooler.", "."))
        updated.append("DIRECT_URL (added)")
if not updated:
    sys.exit("No postgres:// URLs found; nothing changed.")
open(path, "w").write("\n".join(out) + "\n")
print("Updated:", ", ".join(updated))
PY

echo "Testing connection..."
if node --env-file="$ENV_FILE" -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.monitor.count()
  .then((n) => console.log(`Connected. ${n} monitors in production.`))
  .catch((e) => { console.error("Still failing:", e.message.split("\n").filter(Boolean).pop()); process.exit(1); })
  .finally(() => p.$disconnect());
'; then
  rm -f "$ENV_FILE.bak"
  echo "Done."
else
  mv "$ENV_FILE.bak" "$ENV_FILE"
  echo "Restored the previous $ENV_FILE."
  exit 1
fi
