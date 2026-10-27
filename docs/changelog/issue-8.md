## [Unreleased] - Docker Compose Setup (Issue #8)

### Added

- **Docker Compose development setup** (`docker-compose.yml`) - Single command `docker compose up` starts both Hub (port 5173) and lesson app (port 5174) with pnpm dev in Node.js 20 Alpine container
- **Docker Compose production setup** (`docker-compose.prod.yml`) - Multi-stage build with Nginx serving static assets on port 80, Hub at `/` and lessons at `/lesson/`
- **Dockerfile.dev** - Development image with Corepack pnpm, source volume mounting, non-root appuser, and docker-entrypoint.sh for dynamic .env generation
- **Dockerfile.prod** - Production multi-stage build from Node 20 Alpine, builds all workspace apps, serves via nginx:1.27-alpine with custom nginx.conf
- **nginx.conf** - Nginx configuration with SPA fallback for Hub at `/` and lesson at `/lesson/`, static asset caching with immutable Cache-Control, and security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- **docker-entrypoint.sh** - Entrypoint script writing per-app `.env` files from environment variables for development mode
- **.dockerignore** - Excludes node_modules, dist, .git, .env, build artifacts, and documentation from Docker context
- **Vite configuration updates** for Docker compatibility: host binding `host: true` enabled, base path `/lesson/` for production builds in phonics-cvc app
- **Configuration updates** for environment variables: Hub and lesson configs now use `import.meta.env.VITE_*` with fallbacks to localhost ports

### Changed

- **apps/hub/src/config.ts** - `LESSON_ORIGIN` now reads from `VITE_LESSON_ORIGIN` environment variable with localhost fallback
- **apps/lessons/phonics-cvc/src/config.ts** - `HUB_ORIGIN` now reads from `VITE_HUB_ORIGIN` environment variable with localhost fallback
- **apps/lessons/phonics-cvc/vite.config.ts** - Added `host: true` for Docker networking and conditional base path `/lesson/` for production
- **apps/hub/vite.config.ts** - Added `host: true` for Docker networking
- **README.md** - Added Docker section with development, production, and testing instructions in Swedish

### Fixed

- **LessonBridge origin validation** - Production compose uses origin-only URL for `VITE_LESSON_ORIGIN` (https://lillskolan.se) instead of path-prefixed URL, with `VITE_LESSON_ENTRY=/lesson/` separate for path routing
- **Environment file generation** - docker-entrypoint.sh now uses heredoc to overwrite .env files instead of appending, preventing duplicate entries on container restarts

### Security

- **Non-root user** - Dockerfile.dev creates appuser:appgroup (UID/GID 1000) for secure container execution
- **Pinned base images** - Dockerfiles use specific versions node:20.18-alpine3.20 and nginx:1.27-alpine
- **Security headers** - Nginx serves `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` for static assets
- **Git ignore** - Added `apps/**/.env` to .gitignore to prevent committing generated environment files

### Testing

- **Docker testing workflow** - `docker compose run --rm app pnpm test` runs tests inside container environment
- **All existing tests pass** in Dockerized environment: 133 Vitest unit tests + 7 Playwright E2E tests

### Removed

- None

### Documentation

- **ADR 0006** - Docker Compose setup for development and production with path-prefix strategy for same-origin iframe
- **README update** - Swedish Docker instructions for development, production, and testing
