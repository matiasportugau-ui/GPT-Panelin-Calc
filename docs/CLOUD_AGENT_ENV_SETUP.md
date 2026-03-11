# Cloud Agents - Configuracion base recomendada (BMC Uruguay)

Objetivo: reducir tiempo de arranque para tareas de backend/API/tests en `calculadora`.

## 1) Setup de arranque recomendado

Ejecutar en startup del agente:

```bash
cd /workspace
./scripts/agent-bootstrap-calculadora.sh
```

Alternativa equivalente:

```bash
cd /workspace/calculadora
npm install
npm test
```

## 2) Cache recomendada

Persistir entre sesiones de Cloud Agents:

- `/workspace/calculadora/node_modules`
- `~/.npm`

Esto acelera:

- `npm install`
- ejecucion de `npm test`
- tareas de refactor y QA del backend

## 3) Requisitos de runtime

- Node.js `>= 18` (ideal 18 o 20 LTS)
- npm disponible en PATH

## 4) Comando de verificacion rapida

```bash
cd /workspace/calculadora
npm test
```

Esperado: suites en verde (actualmente 57 tests).

## 5) Prompt sugerido para Env Setup Agent (cursor.com/onboard)

Usar este prompt:

> Revisa este repo y configura el entorno base para cloud agents enfocando `calculadora/`. Necesito: (1) ejecutar `npm install` en startup dentro de `calculadora`, (2) validar `npm test` al arranque para verificar salud del entorno, y (3) habilitar caché persistente de `/workspace/calculadora/node_modules` y `~/.npm` para reducir tiempos de instalación y testing. Mantén Node >=18 y deja fallback claro si falla instalación o tests.

