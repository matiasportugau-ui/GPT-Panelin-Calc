#!/usr/bin/env bash
# deploy.sh — Deploy calculadora to Vercel production
# Usage: ./scripts/deploy.sh [--token <vercel-token>]
#
# Prerequisites:
#   Option A: Run `npx vercel login` once before using this script
#   Option B: Pass --token <VERCEL_TOKEN> or set VERCEL_TOKEN env var
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CALC_DIR="${REPO_ROOT}/calculadora"

TOKEN_ARG=""
if [[ "${1:-}" == "--token" && -n "${2:-}" ]]; then
  TOKEN_ARG="--token $2"
elif [[ -n "${VERCEL_TOKEN:-}" ]]; then
  TOKEN_ARG="--token ${VERCEL_TOKEN}"
fi

echo "=== Running tests before deploy ==="
cd "${CALC_DIR}"
npx jest --runInBand --forceExit
echo "=== Tests passed ==="

echo "=== Deploying to Vercel (production) ==="
# shellcheck disable=SC2086
npx vercel --prod ${TOKEN_ARG}
echo "=== Deploy complete ==="
