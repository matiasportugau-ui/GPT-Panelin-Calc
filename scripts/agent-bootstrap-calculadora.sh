#!/usr/bin/env bash
set -euo pipefail

echo "[agent-bootstrap] Repo: $(pwd)"
echo "[agent-bootstrap] Target: calculadora/"

if [ ! -d "calculadora" ]; then
  echo "[agent-bootstrap] ERROR: no existe directorio calculadora/"
  exit 1
fi

cd calculadora

echo "[agent-bootstrap] Node version: $(node -v 2>/dev/null || echo 'node no disponible')"
echo "[agent-bootstrap] NPM version: $(npm -v 2>/dev/null || echo 'npm no disponible')"

echo "[agent-bootstrap] Instalando dependencias (npm install)..."
npm install

echo "[agent-bootstrap] Ejecutando tests (npm test)..."
npm test

echo "[agent-bootstrap] OK: entorno de calculadora listo."
