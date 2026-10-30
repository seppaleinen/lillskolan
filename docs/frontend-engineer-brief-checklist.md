# Frontend-Engineer Dispatch Brief — Context Checklist

**Purpose:** Ensure every `frontend-engineer` dispatch includes sufficient context about project conventions, existing patterns, and platform specifics to avoid rework loops.

**Origin:** Post-mortem of Issue #18 — 5 code-reviewer findings requiring rework due to missing context.

---

## Checklist (verify each item before dispatch)

### 1. Tech Stack Specifics
- [ ] **Vite `?raw` import declarations** — Confirm `*.svg?raw`, `*.txt?raw` etc. are declared in `tsconfig.json` or `vite-env.d.ts`. Note exact import syntax used in codebase.
- [ ] **TypeScript config** — Reference `tsconfig.json` location, `strict` mode, `moduleResolution`, `jsx` setting. Note any project references (e.g., `packages/lesson-sdk`).
- [ ] **Testing framework** — Vitest. Note test file naming (`*.test.ts`), `describe`/`it` conventions, jsdom environment, any custom matchers.
- [ ] **Build output** — Vite multi-page output structure, `dist/` locations, base path config.

### 2. Existing Component Patterns
- [ ] **ARIA patterns** — Document the `aria-hidden` + `role="img"` combination used for decorative SVGs (e.g., Mascot). Note any known contradictions and the approved resolution.
- [ ] **Component structure** — Factory functions vs classes, `HTMLElement` extension pattern, event emission style (`CustomEvent` vs callbacks).
- [ ] **State management** — Local component state patterns, no external state library. `LessonBridge` postMessage contract for hub communication.
- [ ] **Styling approach** — CSS modules, inline styles, or global CSS. Note any design tokens / CSS custom properties in use.

### 3. Project-Specific Conventions
- [ ] **Null-safety** — `pickPhrase` and similar utilities require explicit null checks. No optional chaining as sole guard.
- [ ] **Timer type patterns** — Use `ReturnType<typeof setTimeout>` for timer handles, not `number`. Document where this applies.
- [ ] **LessonRoot wipe behavior** — `showCompletion()` wipes `LessonRoot` children. New components appended after must re-attach listeners.
- [ ] **Phoneme engine integration** — `WebAudioPhonemeEngine` API: `loadManifest()`, `playPhoneme()`, `playWord()`, `playBlendedWord()`. Manifest-driven, WAV assets in `public/phonemes/`.
- [ ] **Mascot integration** — `Mascot.ts` factory, poses (`idle`, `cheer`, `celebrate`, `thinking`), Swedish name "Skogslingan", encouragement phrases in `src/utils/mascot.ts`.
- [ ] **Celebration component** — `CelebrationTriggerOptions` includes mascot pose/speech. Triggered on step/word completion.

### 4. Asset & Manifest Conventions
- [ ] **Phoneme manifest** — `public/manifest/phoneme-manifest.json` structure. `onsetContext` field for context-dependent clips.
- [ ] **Audio generation** — Piper TTS, `scripts/generate-full-onset-set.mjs`, 25 canonical clips tracked, rest gitignored.
- [ ] **Binary asset policy** — Files >10 MB → Git LFS. `.gitattributes` covers `*.onnx`, `*.bin`, `*.model`, `*.safetensors`. Pre-commit hook enforces.

### 5. Accessibility & Motion
- [ ] **`prefers-reduced-motion`** — All animations must respect. Decorative only — no meaning conveyed solely by animation.
- [ ] **Tablet-first** — Target iPad / Android 10"+. Touch targets ≥44px. Viewport fit within safe area (see Issue #13).

### 6. Communication Contracts
- [ ] **LessonBridge** — `postMessage` protocol: `LESSON_PROGRESS`, `LESSON_COMPLETE`. Typed in `packages/lesson-sdk`. Hub expects specific payload shapes.
- [ ] **Hub ↔ Lesson** — Iframe sandbox attributes, allowed origins, message validation.

---

## Usage

When dispatching `frontend-engineer`, `dev-team-lead` MUST include a **completed checklist** (or explicit "N/A" with reason) in the dispatch prompt under a `## Context Checklist` section.

Example dispatch prompt snippet:

```
## Context Checklist (from docs/frontend-engineer-brief-checklist.md)

### 1. Tech Stack Specifics
- Vite `?raw` imports: declared in `vite-env.d.ts` — `declare module '*.svg?raw' { const content: string; export default content; }`
- TypeScript: `tsconfig.json` at root, `strict: true`, project references to `packages/lesson-sdk`
- Testing: Vitest, `*.test.ts`, jsdom env

### 2. Existing Component Patterns
- ARIA: decorative SVGs use `aria-hidden="true" role="img"` — see `src/components/Mascot.ts`
- Component: vanilla TS factory functions, `CustomEvent` for internal events
...

### 3. Project-Specific Conventions
- Null-safety: `pickPhrase` requires `if (phrase === null) return fallback;` — no `??` alone
- Timer types: `const timer: ReturnType<typeof setTimeout> = setTimeout(...)`
- LessonRoot wipe: `showCompletion()` clears children — re-bind listeners after
...
```

---

## Maintenance

Update this checklist when:
- New conventions are established (post-mortem findings)
- Stack changes (e.g., ESLint added, testing framework migrated)
- New component patterns emerge (e.g., new ARIA pattern, state approach)

Last updated: 2026-10-30 (Issue #28)