#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Vifixa product package check =="

required_paths=(
  "web/package.json"
  "mobile/package.json"
  "supabase/migrations"
  "supabase/functions"
  "docs/NEW_INFRA_CHECKLIST.md"
  "PRODUCT_PACKAGE.md"
  ".env.example"
  "vercel.json"
)

for path in "${required_paths[@]}"; do
  if [ ! -e "$path" ]; then
    echo "Missing required path: $path"
    exit 1
  fi
  echo "OK: $path"
done

echo "Checking for accidentally committed env files..."
if git ls-files | grep -E '(^|/)(\.env|\.env\..*|.*\.local)$' | grep -v '\.env\.example$' >/tmp/vifixa_env_hits.txt; then
  echo "Found env-like tracked files that should be reviewed:"
  cat /tmp/vifixa_env_hits.txt
  exit 1
fi

echo "Checking root package scripts..."
node -e "const p=require('./package.json'); for (const s of ['build','test:web','test:supabase']) { if (!p.scripts?.[s]) { throw new Error('Missing script '+s) } } console.log('OK package scripts')"

echo "Checking web package build script..."
node -e "const p=require('./web/package.json'); if (!p.scripts?.build) throw new Error('web/package.json missing build script'); console.log('OK web build script')"

echo "Checking Supabase income-commerce files..."
test -f supabase/functions/income-commerce/index.ts
test -f supabase/functions/_shared/income-commerce-core.ts
ls supabase/migrations/*income_commerce_core.sql >/dev/null

echo "Checking Vercel config..."
node -e "const v=require('./vercel.json'); if (!String(v.buildCommand||'').includes('web')) throw new Error('vercel.json buildCommand must target web'); console.log('OK vercel config')"

echo "Package check passed."
