# 0006 Docker Compose setup for development and production

Status: Accepted

## Context

Lillskolan needed a reproducible development environment and a straightforward path to self-hosted production deployment. The monorepo contains multiple Vite applications (Hub on port 5173, phonics-cvc lesson on port 5174) with build-time environment variables for origins. Docker Compose was selected to orchestrate dev servers, share node_modules volume for performance, and provide an Nginx-based production image serving static assets from a single origin.

Issue #8 tracked the implementation.

## Decision

1. **Docker Compose with Nginx for production**

   - Use `docker-compose.yml` for development with volume mounts and `pnpm dev` running in a Node.js container
   - Use `docker-compose.prod.yml` with a multi-stage Dockerfile building assets in a Node image and serving via `nginx:1.27-alpine` runtime
   - Multi-stage build copies built `hub/dist` and `lessons/phonics-cvc/dist` to `/usr/share/nginx/html/` and `/usr/share/nginx/html/lesson/` respectively

2. **Path-prefix `/lesson/` for same-origin iframe**

   - Production build uses base path `/lesson/` for phonics-cvc app via Vite config: `base: process.env.NODE_ENV === 'production' ? '/lesson/' : '/'`
   - Nginx serves lesson assets under `/lesson/` location block with SPA fallback to `/lesson/index.html`
   - Enables same-origin iframe embedding without additional CORS configuration

3. **Environment variables for origins**

   - Build-time `VITE_HUB_ORIGIN`, `VITE_LESSON_ORIGIN`, `VITE_LESSON_ENTRY` passed as Docker build args in `docker-compose.prod.yml`
   - Development environment variables in `docker-compose.yml`: `VITE_HUB_ORIGIN=http://localhost:5173`, `VITE_LESSON_ORIGIN=http://localhost:5174`
   - `docker-entrypoint.sh` writes per-app `.env` files from environment variables at container start for development mode
   - Production `.env` files written at build time via `RUN echo ...` in Dockerfile.prod, ensuring origins are baked into the static bundle

4. **Security and hardening**

   - Base images pinned to specific versions: `node:20.18-alpine3.20` and `nginx:1.27-alpine`
   - Non-root user `appuser:appgroup` (UID/GID 1000) created in Dockerfile.dev
   - Security headers added to nginx.conf: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
   - `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.env`, and build artifacts
   - `apps/**/.env` added to `.gitignore` to prevent committing generated environment files

## Consequences

### Positive

- Reproducible development environment across machines without local Node.js/pnpm installation requirements
- Single command `docker compose up` starts both applications with correct host binding (`host: true` in Vite configs)
- Production deployment simplified to `docker compose -f docker-compose.prod.yml up --build` with standard Nginx configuration
- Same-origin iframe embedding reduces security surface compared to cross-origin with CORS
- Build-time environment variables ensure static bundles contain correct origins, avoiding runtime configuration
- Security vulnerabilities addressed via pinned images, non-root user, and security headers

### Negative

- Docker image size increased (~200MB) for development environment
- Build time increased due to multi-stage Docker build for production (~2-3 minutes)
- Volume mounting in development causes file watching latency on macOS compared to native `pnpm dev`
- Environment variables are build-time only; changing origins requires rebuild
- Nginx configuration must be maintained separately from Vite configuration
- Development mode still requires Docker daemon, adding overhead compared to native development

### Follow-up items

- Consider health checks for Compose services
- Add `.dockerignore` optimization for faster builds
- Evaluate using BuildKit cache mounts for `pnpm install` layer caching
- Document production deployment on actual VPS/self-hosted platform
