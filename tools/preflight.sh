#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'HELP'
Usage: tools/preflight.sh [--fast | --e2e | --help]
  --fast  Ruff, pytest, frontend tests, temporary Vite build and secret scan (default).
  --e2e   Also start an isolated SQLite backend and preview, then run Playwright.
HELP
}

mode=${1:---fast}
if (( $# > 1 )); then usage >&2; exit 2; fi
case "$mode" in
  --help|-h) usage; exit 0 ;;
  --fast|--e2e) ;;
  *) usage >&2; exit 2 ;;
esac

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
cd "$root"
tmp=$(mktemp -d "${TMPDIR:-/tmp}/travel-preflight.XXXXXXXX")
tmp=$(cd "$tmp" && pwd -P)
backend_pid=''
frontend_pid=''
cleanup() {
  local pid
  for pid in "$frontend_pid" "$backend_pid"; do
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  rm -rf -- "$tmp"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

export PATH="$root/server/.venv/bin:$PATH"
export RUFF_CACHE_DIR="$tmp/ruff"
export APP_ENV=development JWT_SECRET=local-preflight-only JWT_ALGORITHM=HS256
export JWT_EXPIRE_MINUTES=10080 GEMINI_API_KEY='' GOOGLE_PLACES_API_KEY=''
export DATABASE_URL="sqlite+aiosqlite:///$tmp/tests.db"
vite="$root/client/node_modules/.bin/vite"
failures=0
steps=0
SECONDS=0

step() {
  local label=$1 start=$SECONDS rc
  shift
  steps=$((steps + 1))
  if "$@"; then
    printf '✔ %s (%ss)\n' "$label" "$((SECONDS - start))"
  else
    rc=$?
    failures=$((failures + 1))
    printf '✘ %s (%ss, exit %s)\n' "$label" "$((SECONDS - start))" "$rc" >&2
    return "$rc"
  fi
}

in_dir() (cd "$1" && shift && exec "$@")
build_client() {
  in_dir client "$vite" build --configLoader native --outDir "$tmp/dist" --emptyOutDir
}

step 'Ruff lint' in_dir server ruff check app main.py scripts || :
step 'Ruff format' in_dir server ruff format --check app/tests scripts || :
step 'Smoke API redaction' in_dir server python -m doctest scripts/smoke_api.py || :
step 'pytest' in_dir server python -m pytest -q || :
step 'Frontend tests' in_dir client npm test || :
step 'Vite build' build_client || :
if command -v gitleaks >/dev/null 2>&1; then
  step 'Gitleaks (staged)' gitleaks git --staged --config .gitleaks.toml --redact || :
  step 'Gitleaks (commit local)' gitleaks git --log-opts='HEAD --not --remotes=origin' \
    --config .gitleaks.toml --redact || :
else
  printf '⚠ Gitleaks chưa được cài. Bỏ qua bước quét secret local.\n' >&2
fi

choose_ports() {
  local ports
  ports=$(python - <<'PY'
import socket

with socket.socket() as backend, socket.socket() as frontend:
    backend.bind(("127.0.0.1", 0))
    frontend.bind(("127.0.0.1", 0))
    print(backend.getsockname()[1], frontend.getsockname()[1])
PY
  ) || return 1
  read -r backend_port frontend_port <<< "$ports"
  api="http://127.0.0.1:$backend_port"
  preview="http://127.0.0.1:$frontend_port"
}

wait_ready() {
  local pid=$1 url=$2 check=$3 deadline=$((SECONDS + 60))
  while (( SECONDS < deadline )) && kill -0 "$pid" 2>/dev/null; do
    if curl -fs --connect-timeout 1 --max-time 3 "$url" > "$tmp/response" &&
      python -c "$check" < "$tmp/response" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  printf 'Dịch vụ chưa sẵn sàng tại %s\n' "$url" >&2
  return 1
}

start_backend() {
  (cd server && CORS_ORIGINS="$preview" DATABASE_URL="sqlite+aiosqlite:///$tmp/e2e.db" \
    exec python -m uvicorn main:app --host 127.0.0.1 --port "$backend_port") &
  backend_pid=$!
  wait_ready "$backend_pid" "$api/health" \
    'import json, sys; assert json.load(sys.stdin)["status"] == "healthy"' || return 1
  wait_ready "$backend_pid" "$api/api/v1/places/search?limit=1" \
    'import json, sys; d = json.load(sys.stdin); assert d["total"] >= 1 and d["results"][0]["id"]'
}

start_preview() {
  (cd client && exec "$vite" preview --configLoader native --outDir "$tmp/dist" \
    --host 127.0.0.1 --port "$frontend_port" --strictPort) &
  frontend_pid=$!
  wait_ready "$frontend_pid" "$preview/" 'import sys; assert "<div id=\"root\">" in sys.stdin.read()'
}

run_playwright() {
  if [[ ! -x e2e/node_modules/.bin/playwright ]]; then
    # Worktree mới chưa có e2e/node_modules: tự cài đúng lockfile thay vì dừng (lỗi vặt PR #61).
    [[ -L e2e/node_modules ]] && rm e2e/node_modules
    printf 'Chưa có Playwright, đang cài theo e2e/package-lock.json…\n' >&2
    in_dir e2e npm ci --no-audit --no-fund >&2 || return 1
    in_dir e2e npx --no-install playwright install chromium >&2 || return 1
  fi
  CI=1 E2E_BASE_URL="$preview" in_dir e2e npx --no-install playwright test || {
    printf 'Báo cáo: %s/e2e/playwright-report/  |  Trace: %s/e2e/test-results/\n' "$root" "$root" >&2
    return 1
  }
}

if [[ "$mode" == --e2e ]]; then
  if step 'Cổng E2E' choose_ports &&
    step 'Backend E2E' start_backend &&
    VITE_USE_BACKEND=true VITE_API_BASE="$api" step 'Vite build E2E' build_client &&
    step 'Vite preview' start_preview; then
    step 'Playwright' run_playwright || :
  fi
fi

printf 'Preflight %s: %s/%s bước đạt (%ss)\n' "$mode" "$((steps - failures))" "$steps" "$SECONDS"
(( failures == 0 ))
