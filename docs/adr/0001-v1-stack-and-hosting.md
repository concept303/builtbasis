# ADR 0001 — v1 stack and hosting

> **Status:** Accepted (2026-10-02)

## Context

BuiltBasis v1 must become operational quickly for one owner, with read-only sharing for others, on hosting the owner already has (Hetzner Webhosting L, which supports persistent Node.js applications per domain).

## Decision

- **React/Vite** front end, **Fastify/TypeScript** back end, **SQLite** database in every environment (separate development and production files).
- Hosted as a normal web application at **`builtbasis.ktimanet.com`**, a Hetzner addon domain with Node.js enabled for that domain only; `ktimanet.com` (WordPress) is untouched.
- Production data lives in a data folder outside the application folder; deployments never touch it.
- No Python, PostgreSQL or offline support in v1.

## Alternatives considered

Django as the primary back end (rejected: product screens are custom React anyway); local editor with static publishing (dropped once Webhosting L supported Node.js); PostgreSQL from the start (deferred until there is a real need).

## Consequences

- One language (TypeScript) across browser and server; shared domain code.
- Moving to PostgreSQL, a VPS, Python services or offline clients later is a deliberate migration, paid for when needed.
- Hosting limits (memory, Chromium for PDF, filesystem type for SQLite) are checked in a test deployment before implementation is committed.
