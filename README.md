# Lillskolan

Lillskolan (Reading Academy) is a Swedish early-literacy helper site for children.

## Monorepo Layout

- `apps/hub`: The main Hub application.
- `apps/lessons/phonics-cvc`: Placeholder lesson for CVC words.
- `packages/lesson-sdk`: Shared SDK for lesson communication.

## Development

```bash
pnpm install
pnpm dev       # Starts Hub (5173) and Lesson (5174)
pnpm build     # Builds all packages
pnpm test      # Runs all tests
```