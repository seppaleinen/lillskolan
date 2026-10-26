# PR Description: LessonBridge Changes

## Summary
Brief description of changes to LessonBridge or related SDK files.

## Changes
- Type of change: feat / fix / docs / test / refactor
- Files modified in `packages/lesson-sdk`

## Testing
- [ ] Build passes
- [ ] Tests pass (21 tests)
- [ ] Type check passes
- [ ] Lint clean

## Verification
How to verify changes work:
1. Start Hub and lesson dev servers
2. Send progress message from lesson to hub
3. Verify hub receives and displays correct payload
4. Test origin validation rejects unauthorized origins
5. Verify standalone mode no-ops messages

## Breaking Changes
None / Describe backward-incompatible changes

## Security Review
- [ ] Origin validation works in production
- [ ] Message structure validated
- [ ] No console warnings in production
