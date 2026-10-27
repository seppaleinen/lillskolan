# PR: Docker Compose Setup for Development and Production (Issue #8)

## Summary

Adds Docker Compose orchestration for Lillskolan monorepo development and production deployment with Nginx-served static assets and same-origin iframe support.

## Changes

### Added
- `docker-compose.yml` - Development composition with volume-mounted source code, pnpm dev on ports 5173/5174
- `docker-compose.prod.yml` - Production composition with multi-stage build serving via Nginx on port 80
- `Dockerfile.dev` - Node 20 Alpine development image with Corepack pnpm, non-root appuser, docker-entrypoint.sh
- `Dockerfile.prod` - Multi-stage production build: Node build stage → nginx:1.27-alpine runtime
- `nginx.conf` - SPA fallback for Hub (`/`) and lesson (`/lesson/`), static asset caching, security headers
- `docker-entrypoint.sh` - Entrypoint writing per-app `.env` files from container environment variables
- `.dockerignore` - Optimized build context excluding node_modules, dist, .git, .env, logs
- Vite config updates: `host: true` for Docker networking, conditional base path `/lesson/` for production
- Config updates: `VITE_*` environment variables for configurable origins in Hub and lesson apps

### Changed
- `apps/hub/src/config.ts` - `LESSON_ORIGIN` now reads from `VITE_LESSON_ORIGIN` env var
- `apps/lessons/phonics-cvc/src/config.ts` - `HUB_ORIGIN` now reads from `VITE_HUB_ORIGIN` env var
- `apps/lessons/phonics-cvc/vite.config.ts` - Added host binding and production base path
- `apps/hub/vite.config.ts` - Added host binding for Docker
- `README.md` - Added Swedish Docker instructions section
- `.gitignore` - Added `apps/**/.env` to prevent committing generated env files

### Security Fixes (fbbd825)
- **Non-root user** - Dockerfile.dev creates appuser:appgroup (UID/GID 1000)
- **Pinned images** - Base images pinned to node:20.18-alpine3.20 and nginx:1.27-alpine
- **Origin validation** - Production compose uses origin-only URL for VITE_LESSON_ORIGIN with separate VITE_LESSON_ENTRY path
- **Security headers** - Nginx serves X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Entrypoint fix** - docker-entrypoint.sh overwrites .env files instead of appending

## Testing

### Automated Tests
```bash
# Tests run inside container
docker compose run --rm app pnpm test
```
Results: 133 Vitest unit tests + 7 Playwright E2E tests all pass

### Manual Verification

1. **Development:**
   ```bash
   docker compose up
   ```
   - Hub accessible at http://localhost:5173
   - Lesson accessible at http://localhost:5174
   - Changes reflected via volume mount

2. **Production:**
   ```bash
   docker compose -f docker-compose.prod.yml up --build
   ```
   - App served at http://localhost (port 80)
   - Hub at `/` with SPA fallback
   - Lesson at `/lesson/` with SPA fallback
   - Static assets cached with immutable headers
   - Security headers present

3. **Environment variables:**
   - Test `VITE_HUB_ORIGIN`, `VITE_LESSON_ORIGIN`, `VITE_LESSON_ENTRY` via compose overrides
   - Verify LessonBridge origin validation works correctly

## Breaking Changes

None. Existing local development (`pnpm dev`) continues to work. Docker adds alternative workflow.

## Security Review

- [x] Non-root user in development container
- [x] Pinned base images to specific versions
- [x] Security headers in Nginx configuration
- [x] X-Frame-Options SAMEORIGIN allows iframe embedding from same origin
- [x] Environment variables not committed (apps/**/.env ignored)
- [x] Build args for production origins prevent secrets in image

## Related Issues

- **Issue #8** - Docker Compose setup for development and production (this PR)
- **Issue #10** - Security fixes for Docker Compose (merged separately)

## Checklist

- [x] `docker compose up` starts dev servers correctly
- [x] `docker compose -f docker-compose.prod.yml up --build` serves production build
- [x] Hub and lesson apps load correctly in same-origin iframe configuration
- [x] LessonBridge postMessage communication works with env var origins
- [x] Nginx SPA fallback works for client-side routing
- [x] Static assets served with caching headers
- [x] Security headers present in production
- [x] Tests pass in Docker environment
- [x] README updated with Swedish Docker instructions
- [x] ADR 0006 created documenting Docker Compose decision
- [x] Non-root user implemented in Dockerfile.dev
- [x] Base images pinned to specific versions
